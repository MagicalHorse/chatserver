
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
            var room = new Room({_id: roomId, 
                               title: roomNow.title, 
                               owner: roomNow.owner, 
                                type: roomNow.type,
                               users: roomNow.users});
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
        // 发送未读消息，或者最后几条聊天记录
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

});
      /*
      function sendUnreadMessages(){
        State.of(currentUserId, roomId, function(err, disconnection){
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
          */

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