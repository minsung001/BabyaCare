const Vaccine = require('../models/Vaccine');
const User = require('../models/User');
const dayjs = require('dayjs');

exports.getVaccineSchedule = async (req, res) => {
    try {
        const { userId } = req.params;

        const user = await User.findOne({ username: userId });

        if (!user || !user.babyBirth) {
            return res.status(404).json({
                message: "아이 정보를 찾을 수 없습니다."
            });
        }

        const birth = dayjs(user.babyBirth);
        const today = dayjs();

        console.log("👶 babyBirth:", birth.format('YYYY-MM-DD'));
        console.log("📅 today:", today.format('YYYY-MM-DD'));

        // ✅ .lean() 추가
        const vaccines = await Vaccine.find()
            .select('vaccineName schedule isNationalProgram')
            .lean();

        console.log("💉 백신 수:", vaccines.length);
        // ✅ 첫번째 백신 raw 데이터 확인
        console.log("🔥 첫번째 raw:", JSON.stringify(vaccines[0]));

        let finalSchedule = [];

        vaccines.forEach(v => {
            if (!v.schedule) return;

            v.schedule.forEach(item => {
                const addMonths = item.minMonth;

                console.log(`[${v.vaccineName}] minMonth: ${addMonths}, targetMonthString: ${item.targetMonthString}`);

                if (addMonths === undefined || addMonths === null) return;

                const dueDate = birth.add(addMonths, 'month');
                const dDay = dueDate
                    .startOf('day')
                    .diff(today.startOf('day'), 'day');

                console.log(`  → dueDate: ${dueDate.format('YYYY-MM-DD')}, dDay: ${dDay}`);

                if (dDay >= -30 && dDay <= 180) {
                    finalSchedule.push({
                        id: `${v._id}_${item.dose}_${addMonths}`,
                        name: v.vaccineName,
                        degree: item.dose,
                        dueDate: dueDate.format('YYYY-MM-DD'),
                        dDay,
                        targetMonthString: item.targetMonthString,
                        description: v.isNationalProgram
                            ? "국가무료접종"
                            : "기타접종",
                        status: dDay < 0 ? "지남" : dDay === 0 ? "오늘" : "예정"
                    });
                }
            });
        });

        finalSchedule.sort((a, b) =>
            dayjs(a.dueDate).valueOf() - dayjs(b.dueDate).valueOf()
        );

        console.log(`사용자 ${userId} 일정: ${finalSchedule.length}건`);

        res.status(200).json(finalSchedule);

    } catch (err) {
        console.error(err);
        res.status(500).json({ error: err.message });
    }
};