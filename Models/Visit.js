const mongoose = require('mongoose');
const visitSchema = new mongoose.Schema({
    visitedAt : {
        type : Date,
        default : Date.now
    },
    ip : String,
})
module.exports = mongoose.model('Visit',visitSchema);