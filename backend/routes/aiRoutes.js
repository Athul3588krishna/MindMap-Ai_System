const express = require("express");
const auth = require("../middleware/auth");
const aiController = require("../controllers/aiController");

const router = express.Router();

router.use(auth);

router.post("/notes", aiController.generateNotes);
router.post("/doubt", aiController.solveDoubt);

module.exports = router;
