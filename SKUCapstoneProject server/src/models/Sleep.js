const mongoose = require('mongoose');

const sleepSchema = new mongoose.Schema({
    time: String,      // 예: "15:00"
    temp: Number,      // 온도
    noseX: Number,     // 움직임(코 좌표)
    createdAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('Sleep', sleepSchema);