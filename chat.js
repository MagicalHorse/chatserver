var http = require('http');
var request = require("request");
var cookieParser = require('cookie-parser')
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var Status = require('./models/Status')();
var Step = require('step');
var array = require('array');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var mongoose = require('mongoose');
mongoose.connect('mongodb://localhost/chatserver');

var connectRoute = require('connect-route');
    connect = require('connect'),
    app = connect();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = http.createServer(app)
server.listen(8000)
var io = require('socket.io')(server);
var chat = io.of('/chat');

chat.on('connection', function(socket){

  var currentUserId = '',
      roomId = '',
      roomNow = '',
      disconnectionTime = '',
      sessionId = '',
      token = '',
      signValue = '';

  socket.on('join room', function(userId, room) {
    currentUserId = userId;
    roomId = room.room_id;
    roomNow = room;
    sessionId = room.sessionId;
    token = room.token;
    signValue = room.signValue;

    //记录join room time
    Status.of(currentUserId, roomId, function(err, status){
      if(err) {
        console.log(err);
      } else {
        if(status.length > 0) {
          status[0].update({connectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' connect');
            }
          });
        } else {
          status = new Status({userId: currentUserId, roomId: roomId, connectDate: Date.now()});
          status.save(function(err) {
            if(err) {
              console.log(err);
            } else {
              console.log(currentUserId + ' connect this room first time');
            }
          });
        }
      }
    });

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
        socket.to(roomId).emit('broadcast newer', room.userName);
        console.log(currentUserId + ' join');
        this();
      },
      function sendUnreadMessages(){
        Status.of(currentUserId, roomId, function(err, disconnection){
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
    // 客户第一次发消息时，检测买手是否在线
    if (msg.firstMsg == 1 && msg.fromUserType == 'customer'){
      Status.of(msg.toUserId, roomId, function(err, status){
        if (status.length == 0 || (status[0].disconnectDate > status[0].connectDate)){
          var querystring = "sign=" + signValue + '&client_version=2.3&channel=html5&uid=' + sessionId + '&token=' + token;
          var options = {
            uri: 'http://123.57.77.86:8080/api/customer/Detail?' + querystring + '?toUserId=' + msg.toUserId + '?redirect=/buyer',
            method: 'POST',
            multipart: [
              {
                'content-type': 'application/json',
                body: JSON.stringify({})
              }
            ]
          }
          request(options, function(error, response, body){
            res = JSON.parse(response.body).isSuccessful;
            console.log(res);
          });
        }
      });
    }
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
    Status.of(currentUserId, roomId, function(err, status){
      if(err) {
        console.log(err);
      } else {
        if(status.length > 0) {
          status[0].update({disconnectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' disconnect');
            }
          });
        } else {
          status = new Status({userId: currentUserId, roomId: roomId, disconnectDate: Date.now()});
          status.save(function(err) {
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
            Status.of(userId, room._id, this.parallel());
          },
          function(err, lastMessage, disconnect){
            console.log(disconnect);
            if (disconnect.length == 0){
              if (room.owner == userId){
                Message.unreadCount(room._id, '', function(err, count){
                  console.log(count);
                  socket.emit('receive room', room, lastMessage[0], count);
                });
              }
            }else{
              Message.unreadCount(room._id, disconnect[0].disconnectDate, function(err, count){
                console.log(count);
                socket.emit('receive room', room, lastMessage[0], count);
              });
            }
          }
        )
      })
    });
  });


})