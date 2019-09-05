const WebSocket = require('ws');

const client = new WebSocket('ws://localhost:8081');

client.on('open', () => {
  console.log('websocket connected');

  client.send(JSON.stringify({op: 'subscribe', channel: 'cats'}));

  setTimeout(function() {
    client.ping(function(){});
  }, 2000);
});

client.on('pong', function() {
  console.log('got pong');
});

client.on('message', message => {
  const data = JSON.parse(message);

  switch(data.type) {
    case 'response':
      handleResponse(data);
    break;
    case 'update':
      handleUpdate(data);
    break;
    default:
      console.log('Unhandled message type', message);
    break;
  }
});

function handleResponse(response) {
  //response is of the format: {type: 'response', success: false|true, op: operation, data: data}
  switch(response.op) {
    case 'subscribe':
      if(response.success) {
        console.log(`Successfully subscribed to channel "${response.data.channel}"`);
      } else {
        console.error(`Could not subscribed to channel "${response.data.channel}"`);
      }
    break;
    case 'unsubscribe':
      if(response.success) {
        console.log(`Successfully unsubscribed from channel "${response.data.channel}"`);
      } else {
        console.error(`Could not unsubscribe from channel "${response.data.channel}"`);
      }
    break;
    default:
      console.log('unhandled response', response);
    break;
  }
}

function handleUpdate(update) {
  //update is of the format {type: 'update', channel: channel, data: data}
  console.log(`Update from channel "${update.channel}"`, update.data);

  if(update.data.age > 10) {
    client.send(JSON.stringify({op: 'unsubscribe', channel: 'cats'}));
  }
}
