module.exports = function() {

    var mongoose      = require('mongoose');

    var Room = new mongoose.Schema({
        //_id 两种方式：customerId_buyerId, groupId
          _id             : { type: String, index: {unique: true} }
        , title           : { type: String }
        , owner           : { type: String }
        // type: private / group 私聊/群聊
        , type            : { type: String }
        , creationDate    : { type: Date, default: Date.now }
        , messageCount    : {type: Number, default: 0 }
        , usersCount      : {type: Number, default: 0 }
        , users           : { type: String }
    });

    Room.statics.exist = function(roomid, callback) {
        RoomModel.count({_id: roomid}, callback);
    };

    Room.statics.find = function(roomid, callback) {
        RoomModel
        .where('_id', roomid)
        .exec(callback);
    };

    Room.statics.belongsTo = function(userId, type, callback){
        RoomModel
        .where('owner', userId)
        .where('type', type)
        .sort('creationDate')
        .exec(callback);
    }

    Room.statics.allBelongsTo = function(userId, callback){
        RoomModel
        .where('owner', userId)
        .sort('creationDate')
        .exec(callback);
    }

    Room.post('remove', function() {
        var MessageModel = model.mongoose.model('Message');
        var CounterModel = model.mongoose.model('Counter');
        MessageModel.allFrom(this._id, 0, function(err, messages) {
            if(messages != null) {
                messages.forEach(function(msg) {
                    msg.remove();
                });
            }
        });
        CounterModel.reset(this._id, function() {});
    });
    
    var RoomModel = mongoose.model('Room', Room);
    return RoomModel;
}

