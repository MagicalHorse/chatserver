
module.exports = function() {
    
    var mongoose = require('mongoose');
    
    var Message = new mongoose.Schema({
        roomId      : { type: String, index: true }
      , fromUserId  : { type: Number, index: true }
      , toUserId    : { type: Number, index: true }
      , userName    : String
      , userIp      : String
      , body        : String
      , creationDate        : { type: Date, default: Date.now }
    },
    {safe: undefined});
    
    Message.statics.allFrom = function(roomid, date, callback) {
        MessageModel
        .where('roomid', roomid)
        .where('creationDate').gte(date)
        .sort('creationDate')
        .exec(callback);
    };

    Message.methods.publicFields = function() {
        return {
            num         : this.num
          , username    : this.username
          , body        : this.body
          , creationDate        : this.creationDate
        };
    };
    
    var MessageModel = mongoose.model('Message', Message);
    return MessageModel;
}

