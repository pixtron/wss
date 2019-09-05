const Wss = require('../index.js');

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
