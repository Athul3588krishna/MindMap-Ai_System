const Subject = require("../models/Subject");
const Topic = require("../models/Topic");

exports.listSubjects = async (req, res, next) => {
  try {
    const subjects = await Subject.find({ user: req.user._id }).sort({ examDate: 1 });
    const topics = await Topic.find({ user: req.user._id });

    const enriched = subjects.map((subject) => {
      const subjectTopics = topics.filter((topic) => String(topic.subject) === String(subject._id));
      const completed = subjectTopics.filter((topic) => topic.completed).length;
      return {
        ...subject.toObject(),
        topics: subjectTopics,
        completion:
          subjectTopics.length === 0 ? 0 : Math.round((completed / subjectTopics.length) * 100),
      };
    });

    res.json({ subjects: enriched });
  } catch (error) {
    next(error);
  }
};

exports.createSubject = async (req, res, next) => {
  try {
    const subject = await Subject.create({ ...req.body, user: req.user._id });
    res.status(201).json({ subject: { ...subject.toObject(), topics: [], completion: 0 } });
  } catch (error) {
    next(error);
  }
};

exports.updateSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndUpdate(
      { _id: req.params.subjectId, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!subject) return res.status(404).json({ message: "Subject not found" });
    res.json({ subject });
  } catch (error) {
    next(error);
  }
};

exports.deleteSubject = async (req, res, next) => {
  try {
    const subject = await Subject.findOneAndDelete({
      _id: req.params.subjectId,
      user: req.user._id,
    });

    if (!subject) return res.status(404).json({ message: "Subject not found" });
    await Topic.deleteMany({ subject: subject._id, user: req.user._id });
    res.json({ message: "Subject and topics deleted" });
  } catch (error) {
    next(error);
  }
};

exports.createTopic = async (req, res, next) => {
  try {
    const subject = await Subject.findOne({ _id: req.params.subjectId, user: req.user._id });
    if (!subject) return res.status(404).json({ message: "Subject not found" });

    const topic = await Topic.create({
      ...req.body,
      subject: subject._id,
      user: req.user._id,
    });

    res.status(201).json({ topic });
  } catch (error) {
    next(error);
  }
};

exports.updateTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOneAndUpdate(
      { _id: req.params.topicId, user: req.user._id },
      req.body,
      { new: true, runValidators: true }
    );

    if (!topic) return res.status(404).json({ message: "Topic not found" });

    if (topic.completed) {
      const today = new Date().toDateString();
      const lastStudied = req.user.lastStudiedAt?.toDateString();
      if (lastStudied !== today) {
        req.user.streak += 1;
        req.user.lastStudiedAt = new Date();
        await req.user.save();
      }
    }

    res.json({ topic });
  } catch (error) {
    next(error);
  }
};

exports.deleteTopic = async (req, res, next) => {
  try {
    const topic = await Topic.findOneAndDelete({ _id: req.params.topicId, user: req.user._id });
    if (!topic) return res.status(404).json({ message: "Topic not found" });
    res.json({ message: "Topic deleted" });
  } catch (error) {
    next(error);
  }
};
