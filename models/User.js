
module.exports = function() {
    
    var mongoose = require('mongoose');
    
    var User = new mongoose.Schema({

      userId : { type: Number, index: true },
      nickName : { type: String, index: true },
      name : String,
      logo : String,
      creationDate        : { type: Date, default: Date.now }
    },
    {safe: undefined});
    User.statics.find = function(userId, callback) {
        UserModel
        .where('userId', userId).limit(1)
        .exec(callback);
    };

    
    var UserModel = mongoose.model('User', User);
    return UserModel;
}

