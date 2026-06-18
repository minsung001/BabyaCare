const mongoose = require('mongoose');

const policySchema = new mongoose.Schema({
    서비스명: String,
    서비스요약: String,
    소관부처명: String,
    소관조직명: String,
    서비스URL: String
}, { collection: 'firststep' }); // 컬렉션 이름이 'policy'임을 명시

module.exports = mongoose.model('Policy', policySchema, 'policy');