const Subject = require("../models/Subject");
const Topic = require("../models/Topic");
const { generateWithGemini } = require("../services/geminiService");

async function getSubjectContext(userId, subjectId) {
  const subject = await Subject.findOne({ _id: subjectId, user: userId });
  if (!subject) return null;

  const topics = await Topic.find({ subject: subject._id, user: userId }).sort({ createdAt: 1 });

  return {
    subject,
    topics,
    topicText: topics.length
      ? topics
          .map(
            (topic, index) =>
              `${index + 1}. ${topic.moduleName || "Module 1"} - ${topic.title} (${topic.difficulty}, ${topic.estimatedHours}h, ${
                topic.completed ? "completed" : "pending"
              })`
          )
          .join("\n")
      : "No topics added yet.",
  };
}

exports.generateNotes = async (req, res, next) => {
  try {
    const { subjectId, topicTitle = "", style = "exam" } = req.body;
    const context = await getSubjectContext(req.user._id, subjectId);

    if (!context) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const prompt = `
Create concise study notes for this subject.

Subject: ${context.subject.name}
Focus topic: ${topicTitle || "overall subject"}
Style: ${style}
Known topics:
${context.topicText}

Return clear student-friendly notes with:
- Key points
- Important definitions
- Exam-focused bullets
- A short revision checklist
Keep it practical and avoid unrelated content.
`;

    const notes = await generateWithGemini(prompt);
    res.json({ notes });
  } catch (error) {
    next(error);
  }
};

exports.solveDoubt = async (req, res, next) => {
  try {
    const { subjectId, question } = req.body;

    if (!question?.trim()) {
      return res.status(400).json({ message: "Question is required" });
    }

    const context = await getSubjectContext(req.user._id, subjectId);

    if (!context) {
      return res.status(404).json({ message: "Subject not found" });
    }

    const prompt = `
You are a patient tutor helping a student.

Subject: ${context.subject.name}
Known topics:
${context.topicText}

Student doubt:
${question}

Answer with:
- Direct answer first
- Step-by-step explanation
- Small example if useful
- Common mistake to avoid
Use simple language and stay within the subject context.
`;

    const answer = await generateWithGemini(prompt);
    res.json({ answer });
  } catch (error) {
    next(error);
  }
};
