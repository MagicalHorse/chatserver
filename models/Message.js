
module.exports = function() {
    
    var mongoose = require('mongoose');
    
    var Message = new mongoose.Schema({
        roomId      : { type: String, index: true }
      , fromUserId  : { type: Number, index: true }
      // 群聊时 toUserId 为空
      , toUserId  : { type: Number, index: true }
      // 发消息者的name
      , userName    : String
      , userIp      : String
      , body        : String
      , creationDate        : { type: Date, default: Date.now }
    },
    {safe: undefined});
    
    Message.statics.allFrom = function(roomid, date, callback) {
      if (date == ''){
        MessageModel
        .where('roomId', roomid)
        .sort('creationDate')
        .exec(callback);
      }else{
        MessageModel
        .where('roomId', roomid)
        .where('creationDate').gte(date)
        .sort('creationDate')
        .exec(callback);
      }
    };

    // 返回全部数据，慎用
    Message.statics.all = function(roomId, callback) {
      MessageModel
      .where('roomId', roomId)
      .sort('creationDate')
      .exec(callback);
    };

    Message.statics.unreadCount = function(roomid, disconnectTime, callback){
      if (disconnectTime == ''){
        MessageModel
        .count({})
        .exec(callback);
      }else{
        MessageModel
        .count({})
        .where('creationDate').gte(disconnectTime)
        .exec(callback);
      }
    }

    Message.statics.buyerUnreadCount = function(buyerid, disconnectTime, callback){
      if (disconnectTime == ''){
        MessageModel
        .where('toUserId', buyerid)
        .count({})
        .exec(callback);
      }else{
        MessageModel
        .where('toUserId', buyerid)
        .where('creationDate').gte(disconnectTime)
        .count({})
        .exec(callback);
      }
    }

    Message.statics.last = function(roomid, Num, callback) {
        MessageModel
        .where('roomId', roomid)
        .limit(Num)
        .sort('-creationDate')
        .exec(callback);
    };

    Message.statics.lastOne = function(roomid, callback) {
       MessageModel
      .where('roomId', roomid)
      .sort('-creationDate')
      .exec('findOne', callback);
    };

    Message.methods.publicFields = function() {
        return {
            userName    : this.userName
          , fromUserId  : this.fromUserId
          , toUserId    : this.toUserId
          , body        : this.body
          , creationDate        : this.creationDate
        };
    };
    
    var MessageModel = mongoose.model('Message', Message);
    return MessageModel;
}

