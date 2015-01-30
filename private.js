var io = require('socket.io')(app);
var Step = require('step');

// 私聊
var chat = io.of('/chat');
chat.on('connection', function(socket){
  roomId = '';
  roomNow = '';
  disconnectionTime = '';
  socket.on('join room', function(userId, room) {
    roomId = room.room_id;
    roomNow = room;
    disconnectionTime = '';
    Disconnection.of(userId, roomId, function(err, disTime){
      console.log(disTime);
      disconnectionTime = disTime;
    })
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
      function sendMessages(){
        // 发送未读消息
        Message.allFrom(roomId, disconnectionTime, function(err, messages) {
          if(!err && messages) {
            //console.log(messages)
            mess = messages.reverse();
            mess.forEach(function(msg) {
              socket.emit("new message", msg.publicFields()); 
            });
          } else {
            // 发送最后几条聊天记录
            Message.last(roomId, 5, function(err, messages) {
              if(!err && messages) {
                //console.log(messages)
                mess = messages.reverse();
                mess.forEach(function(msg) {
                  socket.emit("new message", msg.publicFields()); 
                });
              }
            });
          }
        });
      }
    )//end of step
  });
  
});