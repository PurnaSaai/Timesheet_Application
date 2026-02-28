const express = require("express");
const router = express.Router();

const holidayController = require("../controllers/holiday.controller");
const { authenticate, authorize } = require("../middleware/auth.middleware");

router.post(
  "/",
  authenticate,
  authorize(["SUPER_ADMIN"]),
  holidayController.addHoliday
);

router.get(
  "/year/:year",
  authenticate,
  authorize(["SUPER_ADMIN"]),
  holidayController.getHolidaysByYear
);

router.get(
  "/month/:year/:month",
  authenticate,
  authorize(["SUPER_ADMIN","ADMIN","USER"]),
  holidayController.getHolidaysByMonth
);

router.delete(
  "/:id",
  authenticate,
  authorize(["SUPER_ADMIN"]),
  holidayController.deleteHoliday
);

module.exports = router;
