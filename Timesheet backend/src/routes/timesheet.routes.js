const express = require("express");
const router = express.Router();
const timesheetController = require("../controllers/timesheet.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

/* USER */
router.post(
  "/create",
  authenticate,
  authorize(["USER"]),
  timesheetController.createOrGetTimesheet
);

router.post(
  "/entry/:timesheetId",
  authenticate,
  authorize(["USER"]),
  timesheetController.addEntry
);

router.post(
  "/submit/:timesheetId",
  authenticate,
  authorize(["USER"]),
  timesheetController.submitTimesheet
);

router.post(
  "/entry/finish/:entryId",
  authenticate,
  authorize(["USER"]),
  timesheetController.finishEntry
);


/* ADMIN */
router.get(
  "/submitted",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.getSubmittedTimesheets
);

router.post(
  "/approve/:timesheetId",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.approveTimesheet
);

router.post(
  "/reject/:timesheetId",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.rejectTimesheet
);

/* USER MONTHLY TOTAL */
router.get(
  "/monthly-total/:year/:month",
  authenticate,
  authorize(["USER"]),
  timesheetController.getMonthlyTotal
);

router.get(
  "/month/:year/:month",
  authenticate, 
  authorize(["USER"]),
  timesheetController.getMonthlyData
);


router.get(
  "/timesheets",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.getAdminTimesheets
);


router.get(
  "/admin/total-hours/:userId/:year/:month",
  authenticate,
  authorize(["ADMIN","SUPER_ADMIN"]),
  timesheetController.getAdminMonthlyTotal
);

// Duplicate
router.get(
  "/notifications",
  authenticate,
  authorize(["USER"]),
  timesheetController.getUserNotifications
);

router.get(
  "/logs/:timesheetId",
  authenticate,
  authorize(["ADMIN", "SUPER_ADMIN"]),
  timesheetController.getTimesheetLogs
);

module.exports = router;









