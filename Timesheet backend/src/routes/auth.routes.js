const express = require("express");
const router = express.Router();
const authController = require("../controllers/auth.controller");
const { authenticate } = require("../middleware/auth.middleware");
const {autoSubmitIfNeeded,createTodayTimesheetIfNotExists} = require("../controllers/timesheet.controller");


router.post("/signup", authController.signup);
router.post("/admin-signup", authController.adminSignup);
router.post("/login", authController.login);
router.get("/me", authenticate, authController.getMe);
router.post("/forgot-password", authController.forgotPassword);
router.post("/verify-otp", authController.verifyOTP);
router.post("/reset-password", authController.resetPassword);


module.exports = router;
