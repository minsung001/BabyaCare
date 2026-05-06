const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    dose: { type: Number, required: true },
    recommendedAge: { type: String, required: true } // "출생 시", "2개월"
}, { _id: false });

const vaccineSchema = new mongoose.Schema({
    vaccineCode: { type: String },
    vaccineName: { type: String, required: true },
    schedule: [scheduleSchema],
    isNationalProgram: { type: Boolean, default: false }
});

module.exports = mongoose.model('Vaccine', vaccineSchema);