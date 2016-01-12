module.exports = {
       /**
        * Before connection (optional, just for faye)
        * @param {client} client connection
        */
       beforeConnect : function(client) {
         // Example:
         // client.setHeader('Authorization', 'OAuth abcd-1234');
         // client.disable('websocket');
       },

       /**
        * On client connection (required)
        * @param {client} client connection
        * @param {done} callback function(err) {}
        */
       onConnect : function(client, done) {
         // Faye client
         // client.subscribe('/channel', function(message) { });

         // Socket.io client
         var room = {room_id: "845_30944", owner: 30944, type: 'private', userName: "123112231212"}
         client.emit('join room', 30944, room, function(data){
          console.log(data)
        });
         // client.emit('sendMessage', { fromUserId: '30944',toUserId: '845',userName: '123112231212',body: 'sdfa',messageType: 0 }, function(data){
         //  console.log(data)
         // });

         // Primus client
         // client.write('Sailing the seas of cheese');

         // WAMP session
         // client.subscribe('com.myapp.hello').then(function(args) { });

         done();
       },

       /**
        * Send a message (required)
        * @param {client} client connection
        * @param {done} callback function(err) {}
        */
       sendMessage : function(client, done) {
         // Example:
         client.emit('test', { hello: 'world' });
         client.emit('sendMessage', { fromUserId: '30944',toUserId: '845',userName: '123112231212',body: 'sdfa',messageType: 0 }, function(data){
          console.log(data)
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