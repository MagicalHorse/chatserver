var http = require('http');
var request = require("request");
var cookieParser = require('cookie-parser')
var fs = require('fs');
var Room = require('./models/Room')();
var Message = require('./models/Message')();
var State = require('./models/State')();
var User = require('./models/User')();
var Step = require('step');
var array = require('array');
var bodyParser = require('body-parser');
var crypto = require('crypto');
var url = require('url');
var mongoose = require('mongoose');
var nconf = require('nconf');
var redis_adapter  = require('socket.io-redis');
var redis = require("redis");
var config = require("./config")
nconf.argv().env();
var config_env = config[nconf.get('ENV')]
var debug = config_env.debug;

console.log('NODE_ENV: ' + nconf.get('ENV'));
console.log(config_env)

var redis_client = redis.createClient(config_env.redis.port, config_env.redis.host, { auth_pass: config_env.redis.pwd});

mongoose.connect(config_env.mongodb.host, config_env.mongodb.dbname, config_env.mongodb.port, {"user": config_env.mongodb.username, "pass": config_env.mongodb.password} )

var connectRoute = require('connect-route');
    connect = require('connect'),
    app = connect();

app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());

var server = http.createServer(app)//原生Http服务
server.listen(config_env.socket.port)
var io = require('socket.io')(server, {pingTimeout: 2000, pingInterval:400});//Socket.io服务


// var pub = redis.createClient(config_env.redis.port, config_env.redis.host, { auth_pass: config_env.redis.pwd});
var sub = redis.createClient(config_env.redis.port, config_env.redis.host, {detect_buffers: true, auth_pass: config_env.redis.pwd});
io.adapter(redis_adapter({ pubClient: redis_client, subClient: sub }));

var chat = io.of('/chat');

chat.on('connection' ,function(socket){
  var currentUserId = socket.handshake.query.userid,
      roomId = '',
      roomNow = '',
      disconnectionTime = '',
      sessionId = '';
    socket.userid=socket.handshake.query.userid
    socket.deviceid=socket.handshake.query.deviceid
  Step(function authorization(){
    if(debug == true){
      console.log("socketid-> "+ socket.id)
      console.log(socket.handshake.query)
      console.log("userid : "+socket.handshake.query.userid+"\r\nsign :  "+socket.handshake.query.sign +"\r\ntimestamp:  "+socket.handshake.query.timestamp+"\r\nappid: " +socket.handshake.query.appid +"\r\nappsercet: "+config_env.apps[socket.handshake.query.appid]+"\r\ndeviceid: "+socket.handshake.query.deviceid)
    }
    
    if(socket.handshake.query.userid == null || socket.handshake.query.sign== null || socket.handshake.query.timestamp == null || socket.handshake.query.appid == null ||  config_env.apps[socket.handshake.query.appid] == null || crypto.createHash("md5").update(socket.handshake.query.userid + socket.handshake.query.timestamp + socket.handshake.query.appid + config_env.apps[socket.handshake.query.appid]).digest("hex") != socket.handshake.query.sign ){
      socket.emit("server_notice", {action:"login", type: "failed", errcode: 401})
      socket.disconnect()
      return false;
    }else{
      // Message.buyerUnreadCount(socket.userid , function(err, res){
      //   socket.emit("server_notice", {action:"login", type: "success", errcode: 200, data: {unreadcount: res} })
      // })
      // Message.aggregate([
      //     {$match: {$and : [{toUserId: parseInt(socket.userid)},  {isRead: 0},{messageType: 0}]}},
      //     {$group: {_id: "$roomId", messages: { $push: "$$ROOT" }}},
      //     {$sort:  {creationDate: -1}}
      //   ], function(err, unread_messages){
      //     Room.aggregate([
      //       {$match: {$and : [{owner: (socket.userid).toString()},  {isBase: true}]}},
      //       {$project: {Logo: 1,  lastMessage:{creationDate: 1, fromUserId: 1, toUserId: 1, body:1}}}
      //       ], function(err, baseroom){
      //         socket.emit("server_notice", {action:"login", type: "success", errcode: 200, data: {unread_messages: unread_messages, baseroom: baseroom} })
      //       })
      // })
      Message.aggregate([
          {$match: {$or : [{$and: [{toUserId: parseInt(socket.userid)},  {isRead: 0},{messageType: 0}]},{$and: [{fromUserId: parseInt(socket.userid)},  {systemInsteadMessage: 1}, {systemInsteadMessageIsRead: 0}]}
          ]}},
          {$group: {_id: "$roomId", messages: { $push: "$$ROOT" }}},
          {$sort:  {creationDate: -1}}
        ], function(err, unread_messages){
          Room.aggregate([
            {$match: {$and : [{owner: (socket.userid).toString()},  {isBase: true}]}},
            {$project: {Logo: 1,  lastMessage:{creationDate: 1, fromUserId: 1, toUserId: 1, body:1}}}
            ], function(err, baseroom){
              socket.emit("server_notice", {action:"login", type: "success", errcode: 200, data: {unread_messages: unread_messages, baseroom: baseroom} })
            })
      })

      Message.update({fromUserId: parseInt(socket.userid), systemInsteadMessage: 1, systemInsteadMessageIsRead: 0}, {systemInsteadMessageIsRead: 1}, { multi: true }, function(err, result){
      })      
    }

    redis_client.get("login"+socket.handshake.query.userid, function(err, reply){
      console.log(socket.handshake.query.userid +" get: "+reply);
      if(reply != null){
        
        if(chat.connected[reply]!=null){
          redis_client.get("loginDeviceid"+socket.handshake.query.userid, function(err, deviceid){
            console.log("deviceid : "+ deviceid)
            console.log("socket deviceid: "+ socket.handshake.query.deviceid)
            if( deviceid != null && deviceid!="" && deviceid == socket.handshake.query.deviceid){
              chat.connected[reply].disconnect()
            }else{
              chat.connected[reply].emit("server_notice", {action:"logout", type: "success", message:"Other equipment landing", errcode: 402})
              chat.connected[reply].disconnect()
            }
          })
        }else{
          redis_client.del("login"+socket.handshake.query.userid, function(err, reply){
            console.log("******"+ reply)
          })
        }
      }
      redis_client.set("login"+socket.handshake.query.userid, socket.id, function(err, reply){
      })
      redis_client.set("loginDeviceid"+socket.handshake.query.userid, socket.handshake.query.deviceid, function(err, reply){
      })
    })
  }
  )

  socket.on('join room', function(userId, room, callback) {
    console.log(1)
    currentUserId = socket.userid;
    roomId = room.room_id;
    ids = room.room_id.split("_")
    if(ids.length == 2){
      if(parseInt(ids[0]) < parseInt(ids[1])){
        roomId = ids[0]+'_'+ ids[1]
      }else{
        roomId = ids[1]+'_'+ ids[0]
      }
    }
    if(ids.length == 2 && parseInt(socket.userid) != parseInt(ids[0]) && parseInt(socket.userid) != parseInt(ids[1]) ){
      if(callback){
        callback({action:"join room", type: "failed", message: "can't join private room" , errcode: 408})
      }else{
        socket.emit("server_notice", {action:"join room", type: "failed", message: "can't join private room", errcode: 408 })
      }
      return false
    }
    socket.roomId = roomId

    
    //记录join room time
    State.of(socket.userid, socket.roomId, function(err, state){
      console.log("2")
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
          state = new State({userId: currentUserId, roomId: socket.roomId, connectDate: Date.now()});
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
        console.log(3)
        Room.exist(socket.roomId, function(err, res){
          if(res == 0){
            _room = {}
            if(socket.roomId.split("_").length == 2){
              _room = {_id: socket.roomId, users: JSON.stringify(socket.roomId.split("_")), type:'private', customer_id: socket.roomId.split("_")[0], buyer_id: socket.roomId.split("_")[1]}
              
            }else{
              _room = {_id: socket.roomId, users:JSON.stringify([socket.userid]), type:'group'}
            }
            Room.create(_room, function(err, res){
              })
          }
        })

        redis_client.hmset("RoomOnlineUsers_"+socket.roomId, currentUserId, true)
        socket.join(socket.roomId);
        State.of(socket.userid, socket.roomId, function(err, state){
          var search = []
          if(state.length > 0){
            search =[
                    {$match: {$and : [{roomId: socket.roomId}, {creationDate:{$gt: state[0].disconnectDate} }]}},
                    {$sort:  {creationDate: -1}}
                  ]
          }else{
            search =[
                      {$match: {$and : [{roomId: socket.roomId}]}},
                      {$sort:  {creationDate: -1}}
                  ]
          }
          Message.aggregate( search, function(err, unread_messages){
            room_users = []
            if(socket.roomId.split("_").length == 2){
              User.aggregate([{$match: {$or : [{userId: parseInt(socket.roomId.split("_")[0])},  {userId: parseInt(socket.roomId.split("_")[1])}]}}
                ], function(err, res){
                room_users = res
                if(callback){
                  callback({action:"join room", type: "success", errcode: 200, data:{unread_messages: unread_messages, room_users: room_users}})
                }else{
                  socket.emit("server_notice", {action:"join room", type: "success", errcode: 200, data:{unread_messages: unread_messages, room_users: room_users}})
                }
                console.log(currentUserId + ' join');
              })
            }else{
              if(callback){
                callback({action:"join room", type: "success", errcode: 200, data:{unread_messages: unread_messages, room_users: room_users}})
              }else{
                socket.emit("server_notice", {action:"join room", type: "success", errcode: 200, data:{unread_messages: unread_messages, room_users: room_users}})
              }
              console.log(currentUserId + ' join');
            }
          })
          
          Message.changeRead(socket.roomId)
          // 广播新人加入
          socket.to(socket.roomId).emit('broadcast newer', room.userName);
        })
        
        this();
        
      }

    )//end of step


  });

  socket.on('sendMessage', function(msg, callback){
    if(debug == true){
      console.log("socketid -> "+ socket.id)
      console.log("socketuserid -> "+ socket.userid)
      console.log("action->   sendMessage")
      console.log("data->   ")
      console.log(msg)
    }

    if(msg.roomId == null && parseInt(socket.userid) != 0 && socket.roomId !=null){
      msg.roomId = socket.roomId
    }


    if( (socket.roomId==null || socket.roomId != msg.roomId) && parseInt(socket.userid) != 0){
      console.log("socket.roomId==null")
      if(callback){
        callback({action:"sendMessage", type: "failed", message: "please call join room first" , errcode: 403})
      }else{
        socket.emit("server_notice", {action:"sendMessage", type: "failed", message: "please call join room first", errcode: 403 })
      }
      return false
    }


    if(msg.fromUserId == null || msg.toUserId==null || msg.messageType == null){
      console.log("msg.fromUserId == null || msg.toUserId==null || msg.messageType == null")
      if(callback){
        callback({action:"sendMessage", type: "failed", message: "a parameter is missing", errcode: 404})
      }else{
        socket.emit("server_notice", {action:"sendMessage", type: "failed", message: "a parameter is missing", errcode: 404})
      }
      return false
    }

    
    if (msg.body.length > 0){
      //获取发送者用户信息
      User.find(msg.toUserId, function(err, to_user_info){

        User.find(msg.fromUserId, function(err, user){
          msg.isRead = 0
          if( msg.type ==  null)
          {
            msg.type = ""
          }
          var _systemInsteadMessage = 0
          if(socket.userid == 0 && msg.fromUserId != 0){
            _systemInsteadMessage = 1
          }
          params_message = {systemInsteadMessage: _systemInsteadMessage, sendtype: msg.sendtype, fromUserId: msg.fromUserId, toUserId: msg.toUserId, roomId: msg.roomId, userName: msg.userName, type: msg.type, productId: msg.productId, body: msg.body, messageType: msg.messageType, isRead:msg.isRead, data: msg.data }
          if(parseInt(msg.fromUserId) == 0){
            params_message["roomId"] =  msg.roomId
          }

          var message = new Message(params_message);
          if(user.length > 0){
            message["user"] = user[0]
          }else{
            message["user"] = {}
          }
          if(to_user_info.length > 0){
            message["to_user_info"] = to_user_info[0]
          }else{
            message["to_user_info"] = {}
          }
          message.save(function(err) {
            if(err) {
              console.log(err);
              if(callback){
                callback({action: "sendMessage", type:"failed", message: err, errcode: 405})
              }else{
                socket.emit("server_notice", {action: "sendMessage", type:"failed", message: err, errcode: 405})
              }
            } else {
              if(msg.messageType == 0){
                redis_client.hmget("RoomOnlineUsers_"+msg.roomId, msg.toUserId, function(err, res){
                  if(res[0] == 'true'){
                    message.isRead = 1 
                    message.save()
                  }
                })
              }


              socket.to(msg.roomId).emit('new message', message);//发送给在当前房间用户]

              if(_systemInsteadMessage == 1){
                redis_client.get("login"+msg.fromUserId, function(err, reply){
                  if(reply != null && chat.connected[reply]!=null){
                    chat.connected[reply].emit("room message", message)
                  }
                })
              }

              if(callback){
                callback({action:"sendMessage", type: "success", message: "", data: message, params: msg, errcode: 406 })
              }else{
                socket.emit("server_notice", {action:"sendMessage", type: "success", message: "", data: message, params: msg, errcode: 406 })
              }
              Room.find(msg.roomId, function(err, res){

                room = res[0]
                if(room){
                  room.update({updateTime:  (new Date()).valueOf(), lastMessage: message}, function(err){
                    if(err && debug == true){
                      console.log(err)
                    }
                  })
                  if(room.type == 'private'){
                    redis_client.sadd(config_env.redis.message_queue, JSON.stringify(message))
                  }

                  // if(room.type == 'private'){
                    eval(room.users).forEach(function(user_id){

                      isonline =  false
                      redis_client.hmget("RoomOnlineUsers_"+msg.roomId, user_id, function(err, res){
                        console.log("user_id:   ")
                        console.log(user_id)
                        console.log(res[0])
                        isonline =  res[0]
                        if(socket.userid != user_id && isonline != 'true' ){
                          redis_client.get("login"+user_id, function(err, reply){
                            if(reply != null && chat.connected[reply]!=null){
                              // chat.connected[reply].emit("server_notice", {action:"new message", type: "success", message:"new message", data: message})
                              chat.connected[reply].emit("room message", message)
                            }else{
                              // if(room.type == 'private'){
                              //   redis_client.sadd(config_env.redis.message_queue, JSON.stringify(message))
                              // }
                            }
                          })
                        }
                      })
                    })
                  // }
                  
                }
              })
            }
          });
        })     
      })
    }
  });
  socket.on('leaveRoom', function(callback){
    console.log("in leaveRoom action")
    State.of(currentUserId, socket.roomId, function(err, state){
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
          state = new State({userId: currentUserId, roomId: socket.roomId, disconnectDate: Date.now()});
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
    redis_client.hdel("RoomOnlineUsers_"+socket.roomId, socket.userid)
    socket.leave(socket.roomId);
    socket.roomId = null
    if(callback){
      callback({action:"leaveRoom", type: "success", message: "", errcode: 407  })
    }else{
      socket.emit("server_notice", {action:"leaveRoom", type: "success", message: "", errcode: 407  })
    }

  }); // end of disconnect
  socket.on('disconnect', function(){
    State.of(currentUserId, socket.roomId, function(err, state){
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
          state = new State({userId: currentUserId, roomId: socket.roomId, disconnectDate: Date.now()});
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
    redis_client.hdel("RoomOnlineUsers_"+socket.roomId, socket.userid)
    socket.roomId = null
    redis_client.get("loginDeviceid"+socket.handshake.query.userid, function(err, deviceid){
      if(deviceid == socket.handshake.query.deviceid){
        redis_client.del("login"+socket.userid, function(err, reply){
          console.log(socket.userid + ": logout");
        })
        redis_client.del("loginDeviceid"+socket.userid, function(err, reply){
        })
      }
    })
    socket.leave(socket.roomId);
  }); // end of disconnect
});
