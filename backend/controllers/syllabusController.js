const Subject = require("../models/Subject");
const Topic = require("../models/Topic");

const headingPattern = /^(unit|module|chapter|part|section)\s*[-:\d.ivx]*/i;

function cleanLine(line) {
  return line
    .replace(/^[\s\-*•\d.)]+/, "")
    .replace(/\s+/g, " ")
    .trim();
}

function parseTopics(text) {
  const seen = new Set();

  return text
    .split(/\r?\n|[;|]/)
    .map(cleanLine)
    .filter((line) => line.length >= 3)
    .filter((line) => !headingPattern.test(line) || line.length > 12)
    .map((line) => line.replace(headingPattern, "").trim())
    .map((line) => line.replace(/[:\-–—]+$/, "").trim())
    .filter((line) => line.length >= 3)
    .filter((line) => {
      const key = line.toLowerCase();
      if (seen.has(key)) return false;
      seen.add(key);
      return true;
    })
    .slice(0, 80);
}

exports.preview = (req, res) => {
  const topics = parseTopics(req.body.text || "");
  res.json({ topics });
};

exports.importTopics = async (req, res, next) => {
  try {
    const { subjectId, text, moduleName = "Imported syllabus", difficulty = "Medium", estimatedHours = 2 } = req.body;

    if (!subjectId) {
      return res.status(400).json({ message: "Subject is required" });
    }

    const subject = await Subject.findOne({ _id: subjectId, user: req.user._id });
    if (!subject) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const topics = parseTopics(text || "");
    if (topics.length === 0) {
      return res.status(400).json({ message: "No topics found in syllabus text" });
    }

    const existingTopics = await Topic.find({ subject: subject._id, user: req.user._id });
    const existingTitles = new Set(existingTopics.map((topic) => topic.title.toLowerCase()));
    const newTopics = topics
      .filter((title) => !existingTitles.has(title.toLowerCase()))
      .map((title) => ({
        title,
        moduleName,
        difficulty,
        estimatedHours: Number(estimatedHours),
        subject: subject._id,
        user: req.user._id,
      }));

    const createdTopics = newTopics.length ? await Topic.insertMany(newTopics) : [];

    res.status(201).json({
      imported: createdTopics.length,
      skipped: topics.length - createdTopics.length,
      topics: createdTopics,
    });
  } catch (error) {
    next(error);
  }
};
