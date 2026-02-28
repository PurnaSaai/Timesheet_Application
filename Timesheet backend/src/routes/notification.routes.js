const express = require("express");
const router = express.Router();
const notificationController = require("../controllers/notification.controller");
const { authenticate } = require("../middleware/auth.middleware");

router.get("/", authenticate, notificationController.getNotifications);
router.post("/read/:id", authenticate, notificationController.markNotificationRead);

module.exports = router;
