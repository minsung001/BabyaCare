const mongoose = require('mongoose');

const smartThingsSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true }, // 다시 true!
    userEmail: { type: String, required: true },
    patToken: { type: String, required: true },
    deviceCount: { type: Number, default: 0 },
    updatedAt: { type: Date, default: Date.now }
});

module.exports = mongoose.model('SmartThings', smartThingsSchema);
