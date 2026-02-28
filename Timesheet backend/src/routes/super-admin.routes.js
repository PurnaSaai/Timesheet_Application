const express = require("express");
const router = express.Router();

const { authenticate, authorize } = require("../middleware/auth.middleware");

const {
  getPendingApprovalsCount,
  getPendingApprovals,
  approveAccount,
  rejectAccount,
  getApprovalHistory
} = require("../controllers/super-admin.controller");

//  SUPER ADMIN ONLY
router.use(authenticate, authorize(["SUPER_ADMIN"]));

router.get("/approvals/pending-count", getPendingApprovalsCount);
router.get("/approvals", getPendingApprovals);
router.post("/approvals/:uid/approve", approveAccount);
router.post("/approvals/:uid/reject", rejectAccount);
router.get("/approvals/history", getApprovalHistory);

module.exports = router;