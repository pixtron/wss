# @pxtrn/wss

A aimple pub/sub websocket server

## Installation

`npm install --save @pxtrn/wss`

## Usage

### Basic example

```js
const Wss = require('@pxtrn/wss');

async function createServer() {
  const wss = new Wss({host: '127.0.0.1', port: 8081});
  wss.publish('cats');
  wss.publish('dogs');

  await wss.connect();

  return wss;
}

createServer().then(wss => {
  let age = 0;
  const name = 'kitty';

  setInterval(function() {
    // broadcasting a cat to the channel "cats"
    wss.broadcast({age, name}, 'cats');
    age++;
  }, 1000);
}).catch(err => {
  console.error(err);
});
```

### Subscribe and unsubscribe a client to a channel

A more detailed example client, can be found in the [examples](examples)

```js
const WebSocket = require('ws');

const client = new WebSocket('ws://localhost:8081');

client.on('open', () => {
  //subscribe to channel "cats"
  client.send(JSON.stringify({op: 'subscribe', channel: 'cats'}));

  setTimeout(function() {
    client.ping(function(){});
  }, 5000);

  setTimeout(function() {
    //unsubscribe from channel "cats"
    client.send(JSON.stringify({op: 'unsubscribe', channel: 'cats'}));
  }, 3000);
});

client.on('pong', function() {
  console.log('got pong');
});

client.on('message', message => {
  console.log('got message', message);
});
```

## API

### Table of Contents

- [Class: Wss](#class-wss)
  - [new Wss(config[, logger])](#new-wssconfig-logger)
  - [Event: 'close'](#event-close)
  - [Event: 'connection'](#event-connection)
  - [Event: 'error'](#event-error)
  - [Event: 'headers'](#event-headers)
  - [Event: 'listening'](#event-listening)
  - [async server.connect()](#async-serverconnect)
  - [async server.close()](#async-serverclose)
  - [server.publish(channel)](#serverpublishchannel)
  - [server.broadcast(channel)](#serverbroadcastdata-channel)

### Class: Wss

This class represents a websocket server with simple pub/sub. It extends EventEmitter.

#### new Wss(config[, logger])

- `config` {Object}
  [See options for `ws` modules `Class: WebSocket.Server`](https://github.com/websockets/ws/blob/HEAD/doc/ws.md#class-websocketserver)
- `logger` {Object}

  custom logger containing the following methods
  ```js
  const logger = {
    debug: function(message, data) {}
    notice: function(message, data) {}
    info: function(message, data) {}
    warning: function(message, data) {}
    error: function(message, data) {},
  }
  ```

#### Event: 'close'

Emitted when the server closes.

#### Event: 'connection'

- `socket` {WebSocket}
- `request` {http.IncomingMessage}

Emitted when the handshake is complete. `request` is the http GET request sent
by the client. Useful for parsing authority headers, cookie headers, and other
information.

#### Event: 'error'

- `error` {Error}

Emitted when an error occurs on the underlying server.

#### Event: 'headers'

- `headers` {Array}
- `request` {http.IncomingMessage}

Emitted before the response headers are written to the socket as part of the
handshake. This allows you to inspect/modify the headers before they are sent.

#### Event: 'listening'

Emitted when the underlying server has been bound.

#### async server.connect()

Connect the server

#### async server.close()

Close the server

#### server.publish(channel)
- `channel` {String}

Publish a new `channel`. The same channel can only be published once

#### server.broadcast(data[, channel])
- `data` {Object |Array}
- `channel` {String}

Broadcast `data` to all clients in `channel`. If `channel` is undefined,
`data` will be broadcastet to all connected clients.
