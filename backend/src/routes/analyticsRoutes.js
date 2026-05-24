const express = require("express");
const auth = require("../middleware/auth");
const analyticsController = require("../controllers/analyticsController");

const router = express.Router();

router.use(auth);

router.get("/summary", analyticsController.summary);

module.exports = router;
