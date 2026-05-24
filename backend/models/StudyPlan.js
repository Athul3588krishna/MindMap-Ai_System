const mongoose = require("mongoose");

const studyPlanSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    dailyStudyHours: {
      type: Number,
      required: true,
    },
    generatedFor: {
      type: Date,
      default: Date.now,
    },
    days: [
      {
        date: Date,
        label: String,
        totalHours: Number,
        sessions: [
          {
            subject: String,
            topic: String,
            difficulty: String,
            hours: Number,
            type: {
              type: String,
              enum: ["Study", "Revision"],
              default: "Study",
            },
          },
        ],
      },
    ],
  },
  { timestamps: true }
);

module.exports = mongoose.model("StudyPlan", studyPlanSchema);
