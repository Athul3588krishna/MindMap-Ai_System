const express = require("express");
const auth = require("../middleware/auth");
const subjectController = require("../controllers/subjectController");

const router = express.Router();

router.use(auth);

router
  .route("/")
  .get(subjectController.listSubjects)
  .post(subjectController.createSubject);

router
  .route("/:subjectId")
  .patch(subjectController.updateSubject)
  .delete(subjectController.deleteSubject);

router.post("/:subjectId/topics", subjectController.createTopic);
router.patch("/:subjectId/topics/:topicId", subjectController.updateTopic);
router.delete("/:subjectId/topics/:topicId", subjectController.deleteTopic);

module.exports = router;
