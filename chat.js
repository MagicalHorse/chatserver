var app = require('http').createServer()
var io = require('socket.io')(app);
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var Disconnection = require('./models/Disconnection')();
var Step = require('step');

app.listen(8000);

// database connection
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/chatserver');


// 群组聊天
var group = io.of('/group');
group.on('connection', function(socket){
  roomId = '';
  userId = '';
  roomNow = '';

  socket.on('join room', function(room) {
    roomNow = room;
    roomId = room.room_id;
    Step(
      function joinRoom(){
        Room.exist(roomId, function(err, count){
          if(count == 0){
            var room = new Room({_id: roomId, title: roomNow.title, owner: roomNow.owner, users: roomNow.users});
            room.save(function(err) {
              if(err) {
                console.log(err);
              } else {
                //console.log(room);
              }
            });
          }else{
            //console.log('join room: ' + roomId)
          }
        })
        socket.join(roomId);
        next(null, roomId)
      },
      function sendMessages() {
        Message.last(roomId, 3, function(err, messages) {
          if(!err && messages) {
            //console.log(messages)
            mess = messages.reverse();
            mess.forEach(function(msg) {
              socket.emit("new message", msg.publicFields()); 
            });
          }
        });
      }
    )
  })

  socket.on('sendMessage', function(msg){
    if (msg.body.length > 0){
      saveMessage(msg, roomId);
      socket.to(roomId).emit('new message', msg);
    }
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



  function saveMessage(msg, roomId){
    var message = new Message({fromUserId: msg.fromUserId, toUserId: msg.toUserId, roomId: roomId, userName: msg.userName, body: msg.body})
    message.save(function(err) {
      if(err) {
        console.log(err);
      } else {
        console.log('save: ' + message.body);
      }
    });
  }

});

// 获取相关信息
var infos = io.of('/infos');
infos.on('connection', function(socket){
  socket.on('room list', function(userId){
    Room.belongsTo(userId, function(err, rooms){
      console.log(rooms);
      socket.emit('receive room list', rooms);
    });
  })
})





