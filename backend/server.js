const express = require("express");
const dotenv = require("dotenv");
const cors = require("cors");
const path = require("path");

dotenv.config({ path: path.join(__dirname, ".env") });

const connectDB = require("./config/db");
const authRoutes = require("./routes/authRoutes");
const subjectRoutes = require("./routes/subjectRoutes");
const plannerRoutes = require("./routes/plannerRoutes");
const analyticsRoutes = require("./routes/analyticsRoutes");
const syllabusRoutes = require("./routes/syllabusRoutes");
const aiRoutes = require("./routes/aiRoutes");

const app = express();

app.use(cors({ origin: process.env.CLIENT_URL || "*" }));
app.use(express.json({ limit: "2mb" }));

app.get("/", (req, res) => {
  res.json({
    name: "MindMap AI API",
    status: "running",
    modules: ["auth", "subjects", "topics", "study-plans", "analytics"],
  });
});

app.use("/api/auth", authRoutes);
app.use("/api/subjects", subjectRoutes);
app.use("/api/planner", plannerRoutes);
app.use("/api/analytics", analyticsRoutes);
app.use("/api/syllabus", syllabusRoutes);
app.use("/api/ai", aiRoutes);

app.use((req, res) => {
  res.status(404).json({ message: "Route not found" });
});

app.use((err, req, res, next) => {
  console.error(err);
  res.status(err.status || 500).json({
    message: err.message || "Something went wrong",
  });
});

const PORT = process.env.PORT || 5000;

async function startServer() {
  await connectDB();

  app.listen(PORT, () => {
    console.log(`MindMap AI API running on port ${PORT}`);
  });
}

startServer();
