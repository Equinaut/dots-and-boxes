const app = require('express')();
const http = require('http');
const server = http.createServer(app);
const io = require('socket.io')(server);
const Game = require("./game.js");

const port = process.env.PORT || 3000;

app.get('/', (req, res) => {
  res.sendFile(__dirname + '/Frontend/index.html');
});

app.listen(port, () => {
  console.log('listening on *:',port);
})
