var app = require('http').createServer()
var io = require('socket.io')(app);
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var Disconnection = require('./models/Disconnection')();

app.listen(8000);

// database connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/chatserver');


// 群组聊天
var group = io.of('/group');
group.on('connection', function(socket){
  roomId = '';
  userId = '';

  socket.on('join room', function(room_id) {
    roomId = room_id;
    joinRoom(roomId);
  })

  socket.on('sendMessage', function(msg){
    saveMessage(msg);
    socket.to(roomId).emit('new message', msg);
  });

  socket.on('disconnect', function(){
    Disconnection.of(userId, roomId, function(err, disconnection){
      if(err) {
        console.log(err);
      } else {
        if(disconnection.length > 0) {
          disconnection[0].update({disconnectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log('updated disconnection');
            }
          });
        } else {
          disconnection = new Disconnection({userId: userId, roomId: roomId, disconnectDate: Date.now()});
          disconnection.save(function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log('save disconnection');
            }
          });
        }
      }
    });
    socket.leave(roomId);
  });

  function joinRoom(room_id){
    Room.exist(room_id, function(err, count){
      if(count == 0){
        var room = new Room({_id: room_id, title: 'test'});
        room.save(function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log(room);
            }
        });
      }else{
        console.log('join exist room: ' + room_id)
      }
    })
    socket.join(room_id);
  }

  function saveMessage(msg){
    var message = new Message({fromUserId: msg.fromUserId, toUserId: msg.toUserId, userName: msg.userName, body: msg.body})
    message.save(function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log('save' + message.body);
      }
    });
  }

});