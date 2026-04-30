require('dotenv').config();
const { connectDB } = require('../db');
const Vaccine = require('../models/Vaccine');
const vaccines = [
  { name: 'B형간염', degree: 1, recommendedDays: 0, description: '출생 직후' },
  { name: 'BCG', degree: 1, recommendedDays: 28, description: '생후 4주 이내' },
  { name: 'B형간염', degree: 2, recommendedDays: 30, description: '생후 1개월' },
  { name: 'DTaP', degree: 1, recommendedDays: 60, description: '생후 2개월' },
  { name: '폴리오', degree: 1, recommendedDays: 60, description: '생후 2개월' },
  { name: 'Hib', degree: 1, recommendedDays: 60, description: '생후 2개월' },
  { name: '폐렴구균', degree: 1, recommendedDays: 60, description: '생후 2개월' }
];

connectDB().then(async () => {
  await Vaccine.deleteMany({});
  await Vaccine.insertMany(vaccines);
  console.log('✅ 백신 데이터 저장 완료');
  process.exit();
});