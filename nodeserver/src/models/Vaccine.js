const mongoose = require('mongoose');

const scheduleSchema = new mongoose.Schema({
    dose: Number,
    targetMonthString: String,
    minMonth: Number,
    maxMonth: Number
}, { _id: false });

const vaccineSchema = new mongoose.Schema({
    vaccineCode: String,
    vaccineName: String,
    schedule: [scheduleSchema],
    isNationalProgram: Boolean
});

module.exports = mongoose.model('Vaccine', vaccineSchema);