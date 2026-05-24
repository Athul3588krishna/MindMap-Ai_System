const jwt = require("jsonwebtoken");
const User = require("../models/User");

const hardcodedUser = {
  _id: process.env.HARDCODED_USER_ID || "65f000000000000000000001",
  name: process.env.HARDCODED_USER_NAME || "MindMap Student",
  email: process.env.HARDCODED_USER_EMAIL || "student@mindmap.local",
  dailyStudyHours: 3,
  streak: 0,
};

function createToken(user) {
  return jwt.sign({ id: user._id, hardcoded: user.hardcoded || false }, process.env.JWT_SECRET || "mindmap-dev-secret", {
    expiresIn: "7d",
  });
}

function publicUser(user) {
  return {
    id: user._id,
    name: user.name,
    email: user.email,
    dailyStudyHours: user.dailyStudyHours,
    streak: user.streak,
  };
}

exports.register = async (req, res, next) => {
  try {
    const { name, email, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({ message: "Name, email and password are required" });
    }

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return res.status(409).json({ message: "Email is already registered" });
    }

    const user = await User.create({ name, email, password });
    res.status(201).json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.login = async (req, res, next) => {
  try {
    const { email, password } = req.body;
    const hardcodedEmail = process.env.HARDCODED_LOGIN_EMAIL || "admin@mindmap.com";
    const hardcodedPassword = process.env.HARDCODED_LOGIN_PASSWORD || "admin123";

    if (email === hardcodedEmail && password === hardcodedPassword) {
      const user = { ...hardcodedUser, email: hardcodedEmail, hardcoded: true };
      return res.json({ token: createToken(user), user: publicUser(user) });
    }

    const user = await User.findOne({ email }).select("+password");

    if (!user || !(await user.comparePassword(password))) {
      return res.status(401).json({ message: "Invalid email or password" });
    }

    res.json({ token: createToken(user), user: publicUser(user) });
  } catch (error) {
    next(error);
  }
};

exports.me = (req, res) => {
  res.json({ user: publicUser(req.user) });
};

exports.updatePreferences = async (req, res, next) => {
  try {
    const { dailyStudyHours } = req.body;
    if (dailyStudyHours) req.user.dailyStudyHours = dailyStudyHours;
    await req.user.save();
    res.json({ user: publicUser(req.user) });
  } catch (error) {
    next(error);
  }
};
