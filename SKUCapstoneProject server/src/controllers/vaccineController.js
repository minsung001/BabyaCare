const Vaccine = require('../models/Vaccine');
const User = require('../models/User');
const dayjs = require('dayjs');

exports.getVaccineSchedule = async (req, res) => {
    try {
        const { userId } = req.params;

        console.log("백신 스케줄 요청 userId:", userId);

        const user = await User.findOne({ username: userId });

        console.log("찾은 유저:", user);

        const birthDate = user?.babyBirth || user?.babyBirthDate;

        if (!user || !birthDate) {
            return res.status(404).json({ message: "아이의 생년월일 정보가 없습니다." });
        }

        const vaccines = await Vaccine.find();

        console.log("백신 데이터 개수:", vaccines.length);

        if (vaccines.length === 0) {
            return res.status(200).json([]);
        }

        const schedule = vaccines.map(v => {
            const birth = dayjs(birthDate);
            const dueDate = birth.add(v.recommendedDays, 'day');

            return {
                id: v._id,
                name: v.name,
                degree: v.degree,
                dueDate: dueDate.format('YYYY-MM-DD'),
                dDay: dueDate.diff(dayjs(), 'day'),
                description: v.description
            };
        });

        schedule.sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate));

        console.log("생성된 스케줄:", schedule);

        res.status(200).json(schedule);
    } catch (err) {
        console.error("백신 스케줄 에러:", err);
        res.status(500).json({ error: err.message });
    }
};