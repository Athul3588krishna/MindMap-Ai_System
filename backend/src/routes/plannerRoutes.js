const express = require("express");
const auth = require("../middleware/auth");
const plannerController = require("../controllers/plannerController");

const router = express.Router();

router.use(auth);

router.get("/latest", plannerController.latestPlan);
router.post("/generate", plannerController.generatePlan);

module.exports = router;
