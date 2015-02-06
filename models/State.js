module.exports = function() {

    var mongoose      = require('mongoose');

    var State = new mongoose.Schema({
          userId          : {type: Number}
        , roomId          : {type: String}
        , connectDate     : {type: Date, default: Date.now }
        , disconnectDate  : {type: Date }
    });

    State.statics.of = function(userId, roomId, callback) {
        StateModel.where('userId', userId).where('roomId', roomId).exec(callback);
    };

    State.statics.lastOf = function(userId, callback){
        StateModel
        .where('userId', userId)
        .sort('-disconnectDate')
        .limit(1)
        .exec(callback);
    }

    var StateModel = mongoose.model('State', State);
    return StateModel;
}

