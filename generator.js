module.exports = {
       /**
        * Before connection (optional, just for faye)
        * @param {client} client connection
        */
       beforeConnect : function(client) {
         // Example:
         // client.setHeader('Authorization', 'OAuth abcd-1234');
         // client.disable('websocket');
         console.log("*******")
         console.log(client)
         console.log("*******")
       },

       /**
        * On client connection (required)
        * @param {client} client connection
        * @param {done} callback function(err) {}
        */
       onConnect : function(client, done) {
         var room = {room_id: "4833_4899", owner: 4899, type: 'private', userName: "123112231212"}
         client.emit('join room', 4899, room, function(data){
          console.log(data)
          });
         // var message ={ fromUserId: '4899', toUserId: '416', userName: '果果', body: '8888', messageType: 0, sendtype: 0 }
         // var res = []
         //  for(var i = 0; i < 100; i++){
            
         //    message["body"] = i.toString()
         //    client.emit('sendMessage', message, function(data){
         //      console.log(data["data"]["body"] +"   " +data["errcode"])
         //    });
         //  }

         done();
       },

       /**
        * Send a message (required)
        * @param {client} client connection
        * @param {done} callback function(err) {}
        */
       sendMessage : function(client, done) {
         // Example:
         var message ={ fromUserId: '4899', toUserId: '4833', userName: '果果', body: '9999', messageType: 0, sendtype: 0 }

         client.emit('sendMessage', message, function(data){
          console.log(data["errcode"])
         });
         // client.publish('/test', { hello: 'world' });
         // client.call('com.myapp.add2', [2, 3]).then(function (res) { });
         done();
       },

       /**
        * WAMP connection options
        */
       options : {
         // realm: 'chat'
       }
    };