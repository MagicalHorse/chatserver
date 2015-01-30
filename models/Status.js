module.exports = function() {

    var mongoose      = require('mongoose');

    var Status = new mongoose.Schema({
          userId          : {type: Number}
        , roomId          : {type: String}
        , connectDate     : {type: Date, default: Date.now }
        , disconnectDate  : {type: Date }
    });

    Status.statics.of = function(userId, roomId, callback) {
        StatusModel.where('userId', userId).where('roomId', roomId).exec(callback);
    };

    var StatusModel = mongoose.model('Status', Status);
    return StatusModel;
}

