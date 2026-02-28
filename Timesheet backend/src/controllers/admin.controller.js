const db = require("../config/db");
const {
  sendApprovalEmail,
  sendRejectionEmail
} = require("../utils/email");

// GET ALL PENDING USERS 
exports.getUsersByStatus = async (req, res) => {
  const status =
    req.query.status && req.query.status.trim()
      ? req.query.status.trim()
      : "PENDING";

  const adminDept = req.user.desg;

  try {
    const [rows] = await db.query(
      `
      SELECT
        uid,
        emp_id,
        email,
        fname,
        desg,
        role,
        app_status
      FROM users
      WHERE role = 'USER'
        AND app_status = ?
        AND desg = ?
      ORDER BY emp_id
      `,
      [status, adminDept]
    );

    res.json(rows);
  } catch (err) {
    console.error("Get users by status error:", err);
    res.status(500).json({ message: "Failed to load users" });
  }
}; 

// APPROVE USER 

// exports.approveUser = async (req, res) => {
//   const { uid } = req.params;
//   console.log("Approving user:", req.params.uid);


//   try {
//     await db.query(
//       "UPDATE users SET app_status = 'APPROVED' WHERE uid = ?",
//       [uid]
//     );

//     res.json({ message: "User approved" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };


exports.approveUser = async (req, res) => {
  const { uid } = req.params;

  try {
    const [[user]] = await db.query(
      "SELECT email, fname FROM users WHERE uid = ?",
      [uid]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query(
      "UPDATE users SET app_status = 'APPROVED' WHERE uid = ?",
      [uid]
    );

    // Send approval email
    await sendApprovalEmail(user.email, user.fname);

    res.json({ message: "User approved and email sent" });
  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ message: "Approval failed" });
  }
};

// REJECT USER 
// exports.rejectUser = async (req, res) => {
//   const { uid } = req.params;

//   try {   
//     await db.query(
//       "UPDATE users SET app_status = 'REJECTED' WHERE uid = ?",
//       [uid]
//     );

//     res.json({ message: "User rejected" });
//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };
exports.rejectUser = async (req, res) => {
  const { uid } = req.params;
  const { reason } = req.body;

  if (!reason || !reason.trim()) {
    return res.status(400).json({ message: "Rejection reason required" });
  }

  try {
    const [[user]] = await db.query(
      "SELECT email, fname FROM users WHERE uid = ?",
      [uid]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    await db.query(
      "UPDATE users SET app_status = 'REJECTED' WHERE uid = ?",
      [uid]
    );

    // Send rejection email with reason
    await sendRejectionEmail(user.email, user.fname, reason);

    res.json({ message: "User rejected and email sent" });
  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Rejection failed" });
  }
};

exports.getEmployees = async (req, res) => {
  const { department } = req.query;

  let sql = `
    SELECT uid, emp_id, fname
    FROM users
    WHERE role = 'USER'
      AND app_status = 'APPROVED'
  `;

  const params = [];

  // ADMIN → own department only
  if (req.user.role === "ADMIN") {
    sql += " AND desg = ?";
    params.push(req.user.desg);
  }

  // SUPER ADMIN → department filter optional
  if (
    req.user.role === "SUPER_ADMIN" &&
    department &&
    department !== "all"
  ) {
    sql += " AND desg = ?";
    params.push(department);
  }

  sql += " ORDER BY emp_id";

  try {
    const [rows] = await db.query(sql, params);
    res.json(rows);
  } catch (err) {
    console.error("Get employees error:", err);
    res.status(500).json({ message: "Failed to load employees" });
  }
};

// exports.getEmployees = async (req, res) => {
//   const [rows] = await db.query(
//     "SELECT uid, emp_id, email FROM users WHERE role='USER' AND app_status='APPROVED'"
//   );
//   res.json(rows);
// };
