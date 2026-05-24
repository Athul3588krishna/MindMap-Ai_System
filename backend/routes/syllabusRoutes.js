const express = require("express");
const auth = require("../middleware/auth");
const syllabusController = require("../controllers/syllabusController");

const router = express.Router();

router.use(auth);

router.post("/preview", syllabusController.preview);
router.post("/import", syllabusController.importTopics);

module.exports = router;
