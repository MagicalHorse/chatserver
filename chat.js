var http = require('http');
var request = require("request");
var cookieParser = require('cookie-parser')
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var State = require('./models/State')();
var Step = require('step');
var array = require('array');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var url = require('url');
var mongoose = require('mongoose');
var nconf = require('nconf');
var redis  = require('socket.io-redis');


nconf.argv().env();
console.log('NODE_ENV: ' + nconf.get('ENV'));

if(nconf.get('ENV') == 'production'){
  mongoose.connect('mongodb://123.57.48.42/chatserver');
}else{
  mongoose.connect('mongodb://Mhdev:Mhdev_123@182.92.7.70:27017/chatserver');
}

var connectRoute = require('connect-route');
    connect = require('connect'),
    app = connect();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(connectRoute(function (router) {
  //某人某房间的未读消息数
  router.get('/unreadCount', function (req, res, next) {
    var url_parts = url.parse(req.url, true);
    params = url_parts.query;
    State.of(params.user_id, params.room_id, function(err, state){
      if(err) {
        console.log(err);
      } else {
        if(state.length > 0) {
          Message.unreadCount(params.room_id, state[0].disconnectDate, function(err, count){
            res.end(count.toString());
          })
        } else {
          Message.unreadCount(params.room_id, '', function(err, count){
            res.end(count.toString());
          })
        }
      }
    });
  });
  //某人所有未读消息数
  router.get('/totalUnreadCount', function (req, res, next) {
    var url_parts = url.parse(req.url, true);
    params = url_parts.query;
    State.lastOf(params.user_id, function(err, state){
      console.log(state)
      if(err){
        console.log(err)
      }else{
        if(state.length > 0) {
          Message.buyerUnreadCount(params.user_id, state[0].disconnectDate, function(err, count){
            res.end(count.toString());
          });
        } else {
          Message.buyerUnreadCount(params.user_id, '', function(err, count){
            res.end(count.toString());
          });
        }
      }
    });
  });
  //最后一人留言
  router.get('/lastMsg', function (req, res, next) {
    var url_parts = url.parse(req.url, true);
    params = url_parts.query;
    Message.lastOne(params.room_id, function(err, msg){
      if (msg != null){
        result = {userName: msg.userName, body: msg.body, time: msg.creationDate};
        res.writeHead(200, { "Content-Type": "application/json" });
        res.write(JSON.stringify(result));
        res.end();
      }
    });
  });

}));
var server = http.createServer(app)
server.listen(8000)
var io = require('socket.io')(server);

io.adapter(redis({ host: 'localhost', port: 6379 }));

var chat = io.of('/chat');

chat.on('connection' ,function(socket){
  console.log(socket["nsp"]["adapter"]["rooms"])
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
    State.of(currentUserId, roomId, function(err, state){
      if(err) {
        console.log(err);
      } else {
        if(state.length > 0) {
          state[0].update({connectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' connect');
            }
          });
        } else {
          state = new State({userId: currentUserId, roomId: roomId, connectDate: Date.now()});
          state.save(function(err) {
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
        socket.join(roomId);
        socket.join("online_user_"+userId)
        // 广播新人加入
        socket.to(roomId).emit('broadcast newer', room.userName);
        console.log(currentUserId + ' join');
        this();
      }

    )//end of step
  });
  socket.on('sendMessage', function(msg){
    // 客户第一次发消息时，检测买手是否在线

    if (msg.body.length > 0){
      var message = new Message({  fromUserId: msg.fromUserId,
                                   toUserId: msg.toUserId,
                                   roomId: roomId.toString(),
                                   userName: msg.userName,
                                   type: msg.type,
                                   productId: msg.productId,
                                   body: msg.body});
      message.save(function(err) {
        if(err) {
          console.log(err);
        } else {
          console.log(msg.fromUserId + ' : ' + message.body);
          socket.to(roomId).emit('new message', message);//发送给在当前房间用户
          // socket["nsp"]["adapter"]["rooms"][""]
          Room.find(roomId, function(err, res){
            console.log("*************sss")
            console.log(roomId)
            console.log(res)
            room = res[0]
            if(room){
              room.users.forEach(function(user_id){
                if(currentUserId != user_id){
                  if(socket["nsp"]["adapter"]["rooms"]["online_user_"+user_id] != null){
                    socket.to("online_user_"+user_id).emit("room message", message)
                  }
                  else{
                    redis.set("room_message_"+message._id, message)
                  }
                }
              })
            }
          })
        }
      });
    }
  });
  socket.on('leaveRoom', function(){
        console.log("in leaveRoom action")
    State.of(currentUserId, roomId, function(err, state){
      if(err) {
        console.log(err);
      } else {
        if(state.length > 0) {
          state[0].update({disconnectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' disconnect');
            }
          });
        } else {
          state = new State({userId: currentUserId, roomId: roomId, disconnectDate: Date.now()});
          state.save(function(err) {
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
  socket.on('disconnect', function(){
    State.of(currentUserId, roomId, function(err, state){
      if(err) {
        console.log(err);
      } else {
        if(state.length > 0) {
          state[0].update({disconnectDate: Date.now()}, function(err){
            if(err) {
              console.log('update err: ' + err);
            } else {
              console.log(currentUserId + ' disconnect');
            }
          });
        } else {
          state = new State({userId: currentUserId, roomId: roomId, disconnectDate: Date.now()});
          state.save(function(err) {
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
            State.of(userId, room._id, this.parallel());
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

  socket.on('last msg', function(room_id){
    Message.lastOne(room_id, function(err, msg){
      if (msg != null){
        socket.emit('receive last msg', msg);
      }
    });
  });

  socket.on('unreadCount', function(user_id, room_id){
    State.of(user_id, room_id, function(err, state){
      if(err) {
        console.log(err);
      } else {
        if(state.length > 0) {
          Message.unreadCount(room_id, state[0].disconnectDate, function(err, count){
            socket.emit('receive msg count',room_id, count.toString());
          })
        } else {
          Message.unreadCount(room_id, '', function(err, count){
            socket.emit('receive msg count', room_id, count.toString());
          })
        }
      }
    });
  });

  socket.on('totalUnreadCount', function(user_id){
    State.lastOf(user_id, function(err, state){
      console.log(state)
      if(err){
        console.log(err)
      }else{
        if(state.length > 0) {
          Message.buyerUnreadCount(user_id, state[0].disconnectDate, function(err, count){
            socket.emit('receive total count', count.toString());
          });
        } else {
          Message.buyerUnreadCount(user_id, '', function(err, count){
            socket.emit('receive total count', count.toString());
          });
        }
      }
    });
  });
})