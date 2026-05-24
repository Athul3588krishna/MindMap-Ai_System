const jwt = require("jsonwebtoken");
const User = require("../models/User");

function hardcodedUser() {
  return {
    _id: process.env.HARDCODED_USER_ID || "65f000000000000000000001",
    name: process.env.HARDCODED_USER_NAME || "MindMap Student",
    email: process.env.HARDCODED_LOGIN_EMAIL || "admin@mindmap.com",
    dailyStudyHours: 3,
    streak: 0,
    lastStudiedAt: null,
    save: async () => {},
  };
}

const auth = async (req, res, next) => {
  try {
    const header = req.headers.authorization || "";
    const token = header.startsWith("Bearer ") ? header.slice(7) : null;

    if (!token) {
      return res.status(401).json({ message: "Authentication token required" });
    }

    const decoded = jwt.verify(token, process.env.JWT_SECRET || "mindmap-dev-secret");

    if (decoded.hardcoded) {
      req.user = hardcodedUser();
      return next();
    }

    const user = await User.findById(decoded.id);

    if (!user) {
      return res.status(401).json({ message: "User no longer exists" });
    }

    req.user = user;
    next();
  } catch (error) {
    res.status(401).json({ message: "Invalid or expired token" });
  }
};

module.exports = auth;
