const {EventEmitter} = require('events');

const {Server, OPEN} = require('ws');

const defaultLogger = require('./lib/logger.js');


module.exports = class Wss extends EventEmitter {

  constructor(config, logger) {
    super();

    this.config = {
      clientTracking: true,
      ...config
    };

    this.logger = logger || defaultLogger;
    this.subscriptions = {};
  }

  async connect() {
    return new Promise((resolve, reject) => {
      this.wss = new Server(this.config, err => {
        if(err) {
          this.logger.error('Could not create server', {category: 'wss', err});
          reject(err);
        } else {
          const {port, host} = this.config;
          this.logger.info('Server listening', {category: 'wss', ...this.wss.address()});
          resolve();
        }
      });

      this.wss.on('connection', (ws, req) => {
        ws.ip = req.connection.remoteAddress;
        this.logger.info('Client connected', {category: 'wss', ip: ws.ip})

        ws.on('message', this._onWsMessage.bind(this, ws));
        ws.on('close', this._onWsClose.bind(this, ws));
        ws.on('error', this._onWsError.bind(this, ws));

        ws.on('pong', this._heartbeat);

        this.emit('connection', ws, req);
      });

      this.wss.on('close', () => this.emit('close'));
      this.wss.on('error', (err) => this.emit('error', err));
      this.wss.on('headers', (headers, req) => this.emit('headers', headers, req));
      this.wss.on('listening', () => this.emit('listening'));

      this._pingInterval = setInterval(this._ping.bind(this), 2000);
    });
  }

  async close() {
    return new Promise((resolve, reject) => {
      this.wss.close(err => {
        if(err) return reject(err);

        resolve();
      });
    });
  }

  publish(channel) {
    if(this.subscriptions[channel]) {
      this.logger.warning('Not publishing channel which was already published previously.', {category: 'wss', channel});
    } else {
      this.logger.info('Channel published', {category: 'wss', channel});
      this.subscriptions[channel] = new Set();
    }
  }

  broadcast(data, channel) {
    if(channel && !this.subscriptions[channel]) {
      this.logger.warning('Trying to broadcast message to channel thath hasn\'t been published yet', {category: 'wss', channel});
      return;
    } else if(channel === undefined && !this.config.clientTracking) {
      this.logger.warning('Client tracking has been disabled, can\'t broadcast to all clients. Please specify a channel to broadcast to', {category: 'wss'});
      return;
    }

    this.logger.debug('Broadcasting message', {category: 'wss', channel, data});

    let clients, message;

    if(channel) {
      clients = this.subscriptions[channel];
      message = {type: 'update', channel, data};
    } else {
      clients = this.wss.clients;
      message = data;
    }

    clients.forEach(client => {
      if(client.readyState === OPEN) {
        client.send(JSON.stringify(message));
      }
    });
  }

  _onWsMessage(ws, message) {
    this.logger.debug('Received message', {category: 'wss', message});

    try {
      const data = JSON.parse(message);

      if(data.op) {
        switch(data.op) {
          case 'subscribe':
            this._onChannelSubscribe(data.channel, ws);
          break;
          case 'unsubscribe':
            this._onChannelUnsubscribe(data.channel, ws);
          break;
          default:
            this.emit('message', data);
          break;
        }
      } else {
        this.emit('message', data);
      }
    } catch(err) {
      this.logger.warning('Could not parse message', {category: 'wss', message});
    }
  }

  _onWsClose(ws) {
    this.logger.info('Connection to client closed', {category: 'wss', ip: ws.ip});
  }

  _onWsError(ws, err) {
    this.logger.error('Client error', {category: 'wss', err});
    ws.terminate();
  }

  _onChannelSubscribe(channel, ws) {
    if(!this.subscriptions[channel]) {
      this.logger.warning('Client tried to subscribe to an unpublished channel', {category: 'wss', channel});
      ws.send(JSON.stringify({type: 'response', success: false, op: 'subscribe', data: {channel}}));
    } else {
      this.logger.debug('Client subscribed to channel', {category: 'wss', channel});
      this.subscriptions[channel].add(ws);
      ws.on('close', () => this.subscriptions[channel].delete(ws));
      ws.send(JSON.stringify({type: 'response', success: true, op: 'subscribe', data: {channel}}));
    }
  }

  _onChannelUnsubscribe(channel, ws) {
    if(!this.subscriptions[channel]) {
      this.logger.warning('Client tried to unsubscribe from an unpublished channel', {category: 'wss', channel});
      ws.send(JSON.stringify({type: 'response', success: false, op: 'unsubscribe', data: {channel}}));
    } else {
      this.logger.debug('Client unsubscribed from channel', {category: 'wss', channel});
      this.subscriptions[channel].delete(ws);
      ws.send(JSON.stringify({type: 'response', success: true, op: 'unsubscribe', data: {channel}}));
    }
  }

  _heartbeat() {
    this.isAlive = true;
  }

  _ping() {
    this.wss.clients.forEach(function each(ws) {
      if(ws.isAlive === false) return ws.terminate();

      ws.isAlive = false;
      ws.ping(function(){});
    });
  }
}
