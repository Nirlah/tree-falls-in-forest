const uuid = require('short-uuid');
const express = require('express');
const app = express();
const server = require('http').Server(app);
const io = require('socket.io')(server);

server.listen(3000);
app.use(express.static('public'));

const colors = [
  '#673AB7', '#00BCD4', '#FFC107', '#9C27B0', '#03A9F4', '#8BC34A', '#E91E63',
  '#2196F3', '#4CAF50', '#F44336', '#3F51B5', '#009688', '#FF5722', '#607D8B'
];
const icons = [
  'apple', 'bread', 'bug', 'burger', 'cannon', 'cheese', 'cherry', 'crab', 'dog',
  'goat', 'gun', 'horse', 'monkey', 'octopus', 'ox', 'pig', 'pineapple', 'pizza',
  'rabbit', 'rat', 'rifle', 'rooster', 'shrimp', 'snake', 'spider', 'strawberry', 'sword'
];
let colorCounter = 0;
let iconCounter = 0;

io.on('connection', function (socket) {
  socket.emit('id', {
    color: colors[colorCounter++ % colors.length],
    icon: icons[iconCounter++ % icons.length],
    tag: uuid.generate()
  });

  socket.on('circle', function (c) {
    socket.broadcast.emit('circle', c);
  });
});