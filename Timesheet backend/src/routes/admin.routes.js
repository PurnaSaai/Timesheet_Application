const express = require("express");
const router = express.Router();

const adminController = require("../controllers/admin.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");
const timesheetController = require("../controllers/timesheet.controller");

router.get(
  "/users",
  authenticate,
  authorize(["ADMIN"]),
  adminController.getUsersByStatus
);

// Approve user
router.post(
  "/approve/:uid",
  authenticate,
  authorize(["ADMIN"]),
  adminController.approveUser
);

// Reject user
router.post(
  "/reject/:uid",
  authenticate,
  authorize(["ADMIN"]),
  adminController.rejectUser
);

router.get(
  "/timesheets",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.getAdminTimesheets
);

router.get(
  "/employees",
  authenticate, 
  authorize(["ADMIN","SUPER_ADMIN"]), adminController.getEmployees);



module.exports = router;
