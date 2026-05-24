const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const StudyPlan = require("../models/StudyPlan");
const { generateStudyPlan } = require("../utils/planner");

exports.generatePlan = async (req, res, next) => {
  try {
    const dailyStudyHours = Number(req.body.dailyStudyHours || req.user.dailyStudyHours || 3);
    const subjects = await Subject.find({ user: req.user._id });
    const topics = await Topic.find({ user: req.user._id });
    const days = generateStudyPlan(subjects, topics, dailyStudyHours);

    const plan = await StudyPlan.create({
      user: req.user._id,
      dailyStudyHours,
      days,
    });

    res.status(201).json({ plan });
  } catch (error) {
    next(error);
  }
};

exports.latestPlan = async (req, res, next) => {
  try {
    const plan = await StudyPlan.findOne({ user: req.user._id }).sort({ createdAt: -1 });
    res.json({ plan });
  } catch (error) {
    next(error);
  }
};
