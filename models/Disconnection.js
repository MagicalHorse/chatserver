module.exports = function() {

    var mongoose      = require('mongoose');

    var Disconnection = new mongoose.Schema({
          _id             : {type: String, index: {unique: true} }
        , userId          : {type: String}
        , roomId          : {type: String}
        , disconnectDate  : {type: Date, default: Date.now }
    });

    Disconnection.statics.of = function(userId, roomId, callback) {
        DisconnectionModel.where('userId', userId).where('roomId', roomId).exec(callback);
    };

    var DisconnectionModel = mongoose.model('Disconnection', Disconnection);
    return DisconnectionModel;
}

