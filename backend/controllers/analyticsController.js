const Subject = require("../models/Subject");
const Topic = require("../models/Topic");

function daysUntil(date) {
  const day = 24 * 60 * 60 * 1000;
  return Math.ceil((new Date(date).setHours(0, 0, 0, 0) - new Date().setHours(0, 0, 0, 0)) / day);
}

exports.summary = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ user: req.user._id }).sort({ examDate: 1 });
    const topics = await Topic.find({ user: req.user._id });

    const totalHours = topics.reduce((sum, topic) => sum + topic.estimatedHours, 0);
    const completedHours = topics
      .filter((topic) => topic.completed)
      .reduce((sum, topic) => sum + topic.estimatedHours, 0);

    const subjectProgress = subjects.map((subject) => {
      const subjectTopics = topics.filter((topic) => String(topic.subject) === String(subject._id));
      const completed = subjectTopics.filter((topic) => topic.completed).length;
      const hardPending = subjectTopics.filter(
        (topic) => topic.difficulty === "Hard" && !topic.completed
      ).length;
      const completion =
        subjectTopics.length === 0 ? 0 : Math.round((completed / subjectTopics.length) * 100);

      return {
        id: subject._id,
        name: subject.name,
        priority: subject.priority,
        examDate: subject.examDate,
        daysLeft: daysUntil(subject.examDate),
        completion,
        hardPending,
      };
    });

    const weakSubjects = subjectProgress
      .filter((subject) => subject.completion < 50 || subject.hardPending > 0)
      .sort((a, b) => a.completion - b.completion || a.daysLeft - b.daysLeft)
      .slice(0, 4);

    res.json({
      stats: {
        totalSubjects: subjects.length,
        totalTopics: topics.length,
        completedTopics: topics.filter((topic) => topic.completed).length,
        totalHours,
        completedHours,
        overallProgress: totalHours === 0 ? 0 : Math.round((completedHours / totalHours) * 100),
        streak: req.user.streak,
      },
      subjectProgress,
      weakSubjects,
      upcomingExams: subjectProgress.slice(0, 5),
    });
  } catch (error) {
    next(error);
  }
};
