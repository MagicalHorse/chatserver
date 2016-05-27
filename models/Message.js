
module.exports = function() {
    
    var mongoose = require('mongoose');
    
    var Message = new mongoose.Schema({
        roomId      : { type: String, index: true }
      , fromUserId  : { type: Number, index: true }
      // 群聊时 toUserId 为空
      , toUserId  : { type: Number, index: true }
      , messageType : { type: Number, index: true }
      // 0 私聊， 1群聊
      , isRead : { type: Number, index: true, default: 0 }
      //0 未读， 1 已读
      // 发消息者的name
      , userName    : String
      , userIp      : String
      , body        : String
      // notice 通知类消息
      , type        : { type: String, default: "" }
      , productId   : Number 
      , sendtype    : Number //买手发送 0， 顾客发送 1
      , data : {}
      , user : {}
      , systemInsteadMessage: {type: Number, index: true , default: 0} //1 系统代发， 0 用户自己发送
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

    Message.statics.changeRead = function(roomid){
      console.log("changeRead : "+ roomid)
      MessageModel.update({roomId: roomid}, {isRead: 1}, { multi: true }, function(err, result){
      })
    }


    // 返回全部数据，慎用
    Message.statics.all = function(roomId, callback) {
      MessageModel
      .where('roomId', roomId)
      .sort('creationDate')
      .exec(callback);
    };

    Message.statics.unreadMessages = function(roomId, callback) {
      MessageModel
      .where('roomId', roomId)
      .where("isRead", 0)
      .where("messageType", 0)
      .sort('creationDate')
      .exec(callback);
    };

    Message.statics.unreadCount = function(roomid, disconnectTime, callback){
      if (disconnectTime == ''){
        MessageModel
        .where('roomId', roomid)
        .count({})
        .exec(callback);
      }else{
        MessageModel
        .where('roomId', roomid)
        .count({})
        .where('creationDate').gte(disconnectTime)
        .exec(callback);
      }
    }

    Message.statics.buyerUnreadCount = function(buyerid, callback){
      MessageModel
      .where('toUserId', buyerid)
      .where('isRead', 0)
      .count({})
      .exec(callback);
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

