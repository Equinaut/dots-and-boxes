const app = require('express')();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const Game = require("./game.js");

const PORT = process.env.PORT || 3000;

app.get('/index.js', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.js');
});

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.html');
});

server.listen(PORT, () => {
  console.log('listening on *:', PORT);
})
