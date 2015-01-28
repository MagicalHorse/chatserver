var http = require('http').createServer()
var io = require('socket.io')(http);
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var Disconnection = require('./models/Disconnection')();
var Step = require('step');
var array = require('array');
http.listen(8000);

var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/chatserver');

// 聊天
var chat = io.of('/chat');
chat.on('connection', function(socket){
  currentUserId = '';
  roomId = '';
  roomNow = '';
  disconnectionTime = '';
  socket.on('join room', function(userId, room) {
    socket.leave(roomId);
    currentUserId = userId;
    roomId = room.room_id;
    roomNow = room;
    Step(
      function joinRoom(){
        Room.find(roomId, function(err, res){
          if(res.length == 0){
            var room = new Room({_id: roomId, 
                               title: roomNow.title, 
                               owner: roomNow.owner, 
                                type: roomNow.type,
                               users: roomNow.users});
            room.save(function(err) {
              if(err) {
                console.log(err);
              } else {
              }
            });
          }else{
            r = res[0]
            if (!array(r.users).has(userId.toString())){
              r.users.push(userId);
              r.save();
            }
          }
        })
        socket.join(roomId);
        // 是否需要广播新人加入
        console.log(currentUserId + ' join');
        this();
      },
      function sendUnreadMessages(){
        Disconnection.of(currentUserId, roomId, function(err, disconnection){
          if(!err && disconnection.length > 0) {
            disconnectionTime = disconnection[0].disconnectDate
            Message.allFrom(roomId, disconnectionTime, function(err, messages) {
              // 发送未读消息
              if(!err && messages && messages.length > 0) {
                //console.log(mess);
                //mess = messages.reverse();
                messages.forEach(function(msg) {
                  socket.emit("new message", msg.publicFields()); 
                });
              } else {
                // 发送最后几条聊天记录
                Message.last(roomId, 5, function(err, messages) {
                  if(!err && messages) {
                    mess = messages.reverse();
                    mess.forEach(function(msg) {
                      socket.emit("new message", msg.publicFields()); 
                    });
                  }
                });
              }
            });
          }else{
            //首次登录
            if (roomNow.owner == currentUserId){
              Message.all(roomId, function(err, messages) {
                messages.forEach(function(msg) {
                  socket.emit("new message", msg.publicFields()); 
                });
              });
            }
          }
        });
      }
    )//end of step
  });
  socket.on('sendMessage', function(msg){
    if (msg.body.length > 0){
      var message = new Message({  fromUserId: msg.fromUserId, 
                                   toUserId: msg.toUserId, 
                                   roomId: roomId, 
                                   userName: msg.userName, 
                                   body: msg.body});
      message.save(function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log(msg.fromUserId + ' : ' + message.body);
          socket.to(roomId).emit('new message', message);
        }
      });
    }
  });
  socket.on('disconnect', function(){
    Disconnection.of(currentUserId, roomId, function(err, disconnection){
      if(err) {
        console.log(err);
      } else {
        if(disconnection.length > 0) {
          disconnection[0].update({disconnectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' disconnect');
            }
          });
        } else {
          disconnection = new Disconnection({userId: currentUserId, roomId: roomId, disconnectDate: Date.now()});
          disconnection.save(function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log(currentUserId + ' disconnect first time');
            }
          });
        }
      }
    });
    socket.leave(roomId);
  }); // end of disconnect
});

// 获取相关信息
var infos = io.of('/infos');
infos.on('connection', function(socket){
  socket.on('private room list', function(userId){
    Room.belongsTo(userId, 'private', function(err, rooms){
      rooms.forEach(function(room){
        Step(
          function(){
            Message.last(room._id, 1, this.parallel());
            Disconnection.of(userId, room._id, this.parallel());
          },
          function(err, lastMessage, disconnect){
            Message.unreadCount(room._id, disconnect[0].disconnectDate, function(err, count){
              console.log(count);
              socket.emit('receive room', room, lastMessage[0], count);
            });
          }
        )
      })
    });
  })
})



