const difficultyWeight = {
  Easy: 1,
  Medium: 1.25,
  Hard: 1.6,
};

const priorityWeight = {
  Low: 1,
  Medium: 1.2,
  High: 1.5,
};

function daysBetween(start, end) {
  const day = 24 * 60 * 60 * 1000;
  return Math.max(1, Math.ceil((end.setHours(0, 0, 0, 0) - start.setHours(0, 0, 0, 0)) / day));
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function generateStudyPlan(subjects, topics, dailyStudyHours) {
  const today = new Date();
  const queue = topics
    .filter((topic) => !topic.completed)
    .map((topic) => {
      const subject = subjects.find((item) => String(item._id) === String(topic.subject));
      const examDate = subject ? new Date(subject.examDate) : addDays(today, 30);
      const urgency = 1 / daysBetween(new Date(), new Date(examDate));
      const score =
        (difficultyWeight[topic.difficulty] || 1) *
        (priorityWeight[subject?.priority] || 1) *
        (1 + urgency * 20);

      return {
        subject: subject?.name || "General",
        moduleName: topic.moduleName || "Module 1",
        topic: topic.title,
        difficulty: topic.difficulty,
        remainingHours: Number(topic.estimatedHours),
        score,
        examDate,
      };
    })
    .sort((a, b) => b.score - a.score || a.examDate - b.examDate);

  const planDays = [];
  let dayIndex = 0;

  while (queue.some((item) => item.remainingHours > 0) && dayIndex < 90) {
    let capacity = Number(dailyStudyHours);
    const sessions = [];

    for (const item of queue) {
      if (capacity <= 0 || item.remainingHours <= 0) continue;

      const hours = Math.min(capacity, item.remainingHours, item.difficulty === "Hard" ? 2 : 1.5);
      item.remainingHours = Number((item.remainingHours - hours).toFixed(2));
      capacity = Number((capacity - hours).toFixed(2));

      sessions.push({
        subject: item.subject,
        moduleName: item.moduleName,
        topic: item.topic,
        difficulty: item.difficulty,
        hours,
        type: "Study",
      });
    }

    if (dayIndex > 0 && dayIndex % 3 === 0 && sessions.length > 0) {
      sessions.push({
        subject: "Revision",
        topic: "Review completed sessions and active recall notes",
        difficulty: "Medium",
        hours: Math.min(1, Number(dailyStudyHours)),
        type: "Revision",
      });
    }

    if (sessions.length > 0) {
      const date = addDays(today, dayIndex);
      planDays.push({
        date,
        label: dayIndex === 0 ? "Today" : `Day ${dayIndex + 1}`,
        totalHours: sessions.reduce((sum, item) => sum + item.hours, 0),
        sessions,
      });
    }

    dayIndex += 1;
  }

  return planDays;
}

module.exports = { generateStudyPlan };
