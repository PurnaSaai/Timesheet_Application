const db = require("../config/db");

//  Pending approvals count (Admins + Users)
exports.getPendingApprovalsCount = async (req, res) => {
  try {
    const [[row]] = await db.query(`
      SELECT COUNT(*) AS total
      FROM users
      WHERE app_status = 'PENDING'
        AND role IN ('ADMIN', 'USER')
    `);

    res.json({ count: row.total });
  } catch (err) {
    console.error("Pending count error:", err);
    res.status(500).json({ message: "Failed to load pending count" });
  }
};

//  Get all pending approvals
exports.getPendingApprovals = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT uid, emp_id, fname, desg, role, created_at
      FROM users
      WHERE app_status = 'PENDING'
        AND role IN ('ADMIN', 'USER')
      ORDER BY created_at ASC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Load approvals error:", err);
    res.status(500).json({ message: "Failed to load approvals" });
  }
};

//  Approve user/admin
exports.approveAccount = async (req, res) => {
  const { uid } = req.params;

  const [[user]] = await db.query(
    "SELECT role, email FROM users WHERE uid=?",
    [uid]
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  // Update status
  await db.query(
    "UPDATE users SET app_status='APPROVED' WHERE uid=?",
    [uid]
  );

  // Insert into appr_logs
  await db.query(`
    INSERT INTO appr_logs
    (tar_uid, tar_role, action, reason, appr_by, appr_by_role)
    VALUES (?, ?, 'APPROVED', NULL, ?, ?)
  `, [
    uid,
    user.role,
    req.user.uid,
    req.user.role
  ]);

  // Send email (already implemented in your system)
  // sendEmail(...)

  res.json({ message: "Approved successfully" });
};

//  Reject user/admin
exports.rejectAccount = async (req, res) => {
  const { uid } = req.params;
  const { reason } = req.body;

  const [[user]] = await db.query(
    "SELECT role, email FROM users WHERE uid=?",
    [uid]
  );

  if (!user) {
    return res.status(404).json({ message: "User not found" });
  }

  await db.query(
    "UPDATE users SET app_status='REJECTED' WHERE uid=?",
    [uid]
  );

  await db.query(`
    INSERT INTO appr_logs
    (tar_uid, tar_role, action, reason, appr_by, appr_by_role)
    VALUES (?, ?, 'REJECTED', ?, ?, ?)
  `, [
    uid,
    user.role,
    reason || null,
    req.user.uid,
    req.user.role
  ]);

  // sendEmail(...)

  res.json({ message: "Rejected successfully" });
};

exports.getApprovalHistory = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        u.emp_id AS target_emp,
        l.tar_role,
        l.action,
        l.reason,
        a.emp_id AS approved_by,
        l.appr_by_role,
        l.appr_at
      FROM appr_logs l
      JOIN users u ON u.uid = l.tar_uid
      JOIN users a ON a.uid = l.appr_by
      ORDER BY l.appr_at DESC
    `);

    res.json(rows);
  } catch (err) {
    console.error("Approval history error:", err);
    res.status(500).json({ message: "Failed to load approval history" });
  }
};