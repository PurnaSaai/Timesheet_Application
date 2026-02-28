const db = require("../config/db");


exports.createOrGetTimesheet = async (req, res) => {
  try {
    if (!req.user || !req.user.uid) {
      return res.status(401).json({ message: "Invalid token" });
    }

    const uid = req.user.uid;
    const { work_dt } = req.body;

    if (!work_dt) {
      return res.status(400).json({ message: "work_date is required" });
    }

    // BLOCK FUTURE DATES (ADD THIS BLOCK)
    const workDate = new Date(work_dt);
    const today = new Date();

    workDate.setHours(0, 0, 0, 0);
    today.setHours(0, 0, 0, 0);

    if (workDate > today) {
      return res.status(400).json({
        message: "Future timesheets are not allowed"
      });
    }
   

    //  Check existing timesheet
    const [existing] = await db.query(
      "SELECT ts_id FROM timesheets WHERE uid = ? AND work_dt = ?",
      [uid, work_dt]
    );

    if (existing.length > 0) {
      return res.status(200).json({
        ts_id: existing[0].ts_id,
        message: "Timesheet already exists"
      });
    }

    // Create new timesheet
    const [result] = await db.query(
      `INSERT INTO timesheets (uid, work_dt, tot_hrs, status)
       VALUES (?, ?, 0.00, 'DRAFT')`,
      [uid, work_dt]
    );

    return res.status(201).json({
      ts_id: result.insertId,
      message: "Timesheet created"
    });

  } catch (err) {
    console.error("CREATE TIMESHEET ERROR:", err.sqlMessage || err.message);
    return res.status(500).json({
      error: err.sqlMessage || err.message
    });
  }
};


exports.getMonthlyData = async (req, res) => {
  const userId = req.user.uid;
  const { year, month } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
        t.ts_id AS ts_id,
        DATE(t.work_dt) AS work_dt,
        t.status,
        te.te_id,
        te.ur_type,
        te.descr,
        te.start_at,
        te.end_at
      FROM timesheets t
      LEFT JOIN timesheet_entries te 
            ON t.ts_id = te.ts_id
      WHERE t.uid = ?
        AND YEAR(t.work_dt) = ?
        AND MONTH(t.work_dt) = ?
      ORDER BY t.work_dt, te.start_at`,
      [userId, year, month]
    );

    res.json(rows);
  } catch (err) {
    console.error("Monthly load error:", err);
    res.status(500).json({ message: "Failed to load month data" });
  }
};


const toMySQLDateTime = (iso) => {
  if (!iso) return null;
  return new Date(iso)
    .toISOString()
    .slice(0, 19)
    .replace("T", " ");
};

exports.addEntry = async (req, res) => {
  console.log("ADD ENTRY BODY:", req.body);

  const { timesheetId } = req.params;

  let {
    ur_type,
    ur_custom,
    descr,
    start_at: startTime,
    end_at: endTime
  } = req.body;

  if (!ur_custom) ur_custom = null;

  if (!ur_type || !descr) {
    return res.status(400).json({ message: "Invalid entry data" });
  }

  try {
    const [sheet] = await db.query(
      `SELECT status FROM timesheets WHERE ts_id = ?`,
      [timesheetId]
    );

    if (!sheet.length) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    if (sheet[0].status === "APPROVED") {
      return res.status(403).json({
        message: "Approved timesheet cannot be modified"
      });
    }

    let timeSpent = 0;

    if (
      startTime &&
      endTime &&
      !["LEAVE", "HOLIDAY"].includes(ur_type)
    ) {
      const startMs = Date.parse(startTime.replace(" ", "T"));
      const endMs   = Date.parse(endTime.replace(" ", "T"));
      timeSpent = (endMs - startMs) / (1000 * 60 * 60);
    }

    const [result] = await db.query(
      `INSERT INTO timesheet_entries
       (ts_id, ur_type, ur_custom, descr, start_at, end_at, spent_hrs)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        timesheetId,
        ur_type,
        ur_custom,
        descr,
        startTime,
        endTime,
        timeSpent
      ]
    );

    res.status(201).json({
      message: "Entry added successfully",
      te_id: result.insertId   
    });

  } catch (err) {
    console.error("ADD ENTRY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};


exports.finishEntry = async (req, res) => {
  const { entryId } = req.params;
  const { end_at } = req.body;

  try {
      await db.query(
      `
      UPDATE timesheet_entries
      SET 
        end_at = ?,
        spent_hrs = ROUND(
          TIMESTAMPDIFF(MINUTE, start_at, ?) / 60,2
        )
      WHERE te_id = ?
        AND start_at IS NOT NULL
      `,
      [end_at, end_at, entryId]
    );

    res.json({ success: true });
  } catch (err) {
    console.error("FINISH ENTRY ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};




exports.createTodayTimesheetIfNotExists = async (userId) => {
  const today = new Date().toISOString().split("T")[0];

  const [rows] = await db.query(
    `SELECT ts_id FROM timesheets WHERE uid = ? AND work_dt = ?`,
    [userId, today]
  );

  if (rows.length === 0) {
    await db.query(
      `INSERT INTO timesheets (uid, work_dt, status)
       VALUES (?, ?, 'DRAFT')`,
      [userId, today]
    );

    console.log("Auto-created today's timesheet for user:", userId);
  }
};


exports.submitTimesheet = async (req, res) => {
  const { timesheetId } = req.params;
  const userId = req.user.uid;

  try {
    await db.query(
      `UPDATE timesheets 
       SET status = 'SUBMITTED',
           sub_at = NOW()
       WHERE ts_id = ? AND uid = ?`,
      [timesheetId, userId]
    );

    res.json({ message: "Timesheet submitted successfully" });
  } catch (err) {
    res.status(500).json({ message: "Submit failed" });
  }
};



exports.getSubmittedTimesheets = async (req, res) => {
  try {
    const [rows] = await db.query(`
      SELECT 
        t.ts_id,
        u.emp_id,
        t.work_dt,
        t.status,
        COALESCE(SUM(e.spent_hrs), 0) AS total_hours
      FROM timesheets t
      JOIN users u ON t.uid = u.uid
      LEFT JOIN timesheet_entries e ON t.ts_id = e.ts_id
      WHERE t.status = 'SUBMITTED'
      GROUP BY 
        t.ts_id,
        u.emp_id,
        t.work_dt,
        t.status
      ORDER BY t.work_dt DESC
    `);

    res.status(200).json(rows);
  } catch (err) {
    console.error("GET SUBMITTED ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};

exports.approveTimesheet = async (req, res) => {
  const { timesheetId } = req.params;

  try {
    const [[sheet]] = await db.query(
      `SELECT 
         uid,
         DATE_FORMAT(work_dt, '%d %b %Y') AS formatted_date
       FROM timesheets
       WHERE ts_id = ?`,
      [timesheetId]
    );

    if (!sheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    await db.query(
      `UPDATE timesheets
       SET status = 'APPROVED', rej_reason = NULL
       WHERE ts_id = ?`,
      [timesheetId]
    );

    await db.query(
      `INSERT INTO notifications (uid, msg, type, status)
       VALUES (?, ?, 'APPROVED', 'UNREAD')`,
      [
        sheet.uid,
        `✅ Your timesheet for ${sheet.formatted_date} has been approved`
      ]
    );

    res.json({ message: "Timesheet approved" });

  } catch (err) {
    console.error("Approve error:", err);
    res.status(500).json({ message: "Approve failed" });
  }
};

exports.rejectTimesheet = async (req, res) => {
  const { timesheetId } = req.params;
  const { reason } = req.body;

  try {
    const [[sheet]] = await db.query(
      `SELECT 
         uid,
         DATE_FORMAT(work_dt, '%d %b %Y') AS formatted_date
       FROM timesheets
       WHERE ts_id = ?`,
      [timesheetId]
    );

    if (!sheet) {
      return res.status(404).json({ message: "Timesheet not found" });
    }

    await db.query(
      `UPDATE timesheets
       SET status = 'REJECTED', rej_reason = ?
       WHERE ts_id = ?`,
      [reason, timesheetId]
    );

    await db.query(
      `INSERT INTO notifications (uid, msg, type, status)
       VALUES (?, ?, 'REJECTED', 'UNREAD')`,
      [
        sheet.uid,
        `❌ Your timesheet for ${sheet.formatted_date} was rejected: ${reason}`
      ]
    );

    res.json({ message: "Timesheet rejected" });

  } catch (err) {
    console.error("Reject error:", err);
    res.status(500).json({ message: "Reject failed" });
  }
};


exports.getMonthlyTotal = async (req, res) => {
  const userId = req.user.uid; //  FROM TOKEN
  const { year, month } = req.params;

  try {
    const [rows] = await db.query(
      `
      SELECT 
        COALESCE(SUM(e.spent_hrs), 0) AS total_hours
      FROM timesheets t
      JOIN timesheet_entries e ON t.ts_id = e.ts_id
      WHERE t.uid = ?
        AND YEAR(t.work_dt) = ?
        AND MONTH(t.work_dt) = ?
        AND t.status = 'APPROVED'
      `,
      [userId, year, month]
    );

    res.status(200).json(rows[0]);
  } catch (err) {
    console.error("MONTHLY TOTAL ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};



exports.autoSubmitIfNeeded = async (userId) => {
  const today = new Date().toISOString().slice(0, 10); // YYYY-MM-DD

  // Find all past draft days
  const [rows] = await db.query(
    `SELECT ts_id, work_dt 
     FROM timesheets
     WHERE uid = ?
       AND status = 'DRAFT'
       AND work_dt < ?`,
    [userId, today]
  );

  if (!rows.length) return;

  const ids = rows.map(r => r.id);

  await db.query(
    `UPDATE timesheets
     SET status = 'SUBMITTED',
         sub_at = NOW()
     WHERE ts_id IN (?)`,
    [ids]
  );

  console.log("Auto-submitted:", ids);
};

exports.getMonthlyData = async (req, res) => {
  const userId = req.user.uid;
  const { year, month } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT 
         t.ts_id AS ts_id,
         t.work_dt,
         t.status,
         te.te_id,          
         te.ur_type,
         te.descr,
         te.start_at,
         te.end_at,
         te.spent_hrs
       FROM timesheets t
       LEFT JOIN timesheet_entries te 
            ON t.ts_id = te.ts_id
       WHERE t.uid = ?
         AND YEAR(t.work_dt) = ?
         AND MONTH(t.work_dt) = ?
       ORDER BY t.work_dt, te.start_at`,
      [userId, year, month]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ message: "Failed to load month data" });
  }
};


// exports.getAdminTimesheets = async (req, res) => {
//   const { employee, year, month, status } = req.query;
//   const {role,desg}=req.user;

//   try {
//     let sql = `
//       SELECT
//         t.ts_id AS ts_id,
//         u.emp_id,
//         u.fname,
//         t.work_dt,
//         t.status,
//         t.rej_reason,
//           ROUND(
//           SUM(
//             CASE
//               WHEN e.start_at IS NOT NULL AND e.end_at IS NOT NULL
//               THEN TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at)
//               ELSE 0
//             END
//           ) / 60,
//           2
//         ) AS total_hours,
//         GROUP_CONCAT(
//           CONCAT(
//             e.ur_type, ' → ',
//             IFNULL(e.descr, ''),
//             ' (',
//             ROUND(
//               TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at) / 60,
//               2
//             ),
//             'h)'
//           )
//           ORDER BY e.start_at
//           SEPARATOR '<br>'
//         ) AS descr
//       FROM timesheets t
//       JOIN users u ON u.uid = t.uid
//       LEFT JOIN timesheet_entries e 
//         ON t.ts_id = e.ts_id
//       WHERE 1 = 1 AND u.desg=?
//     `;

//     const params = [];
//     if (role === "ADMIN"){
//       sql += " AND u.desg=?";
//       params.push(desg);
//     }

//     if (employee && employee !== "all") {
//       sql += " AND t.uid = ?";
//       params.push(employee);
//     }

//     if (year) {
//       sql += " AND YEAR(t.work_dt) = ?";
//       params.push(year);
//     }

//     if (month) {
//       sql += " AND MONTH(t.work_dt) = ?";
//       params.push(month);
//     }

//     if (status && status !== "all") {
//       sql += " AND t.status = ?";
//       params.push(status);
//     }

//     sql += `
//       GROUP BY 
//         t.ts_id, u.emp_id, u.fname, t.work_dt, 
//         t.status, t.rej_reason
//       ORDER BY t.work_dt DESC
//     `;

//     const [rows] = await db.query(sql, params);
//     res.json(rows);

//   } catch (err) {
//     console.error("Admin timesheet load error:", err);
//     res.status(500).json({ message: "Failed to load admin timesheets" });
//   }
// };
exports.getAdminTimesheets = async (req, res) => {
  const { employee, year, month, status } = req.query;
  const { role, desg } = req.user;

  try {
    let sql = `
      SELECT
        t.ts_id AS ts_id,
        u.emp_id,
        u.fname,
        t.work_dt,
        t.status,
        t.rej_reason,
        ROUND(
          SUM(
            CASE
              WHEN e.start_at IS NOT NULL AND e.end_at IS NOT NULL
              THEN TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at)
              ELSE 0
            END
          ) / 60,
          2
        ) AS total_hours,
        GROUP_CONCAT(
          CONCAT(
            e.ur_type, ' → ',
            IFNULL(e.descr, ''),
            ' (',
            ROUND(
              TIMESTAMPDIFF(MINUTE, e.start_at, e.end_at) / 60,
              2
            ),
            'h)'
          )
          ORDER BY e.start_at
          SEPARATOR '<br>'
        ) AS descr
      FROM timesheets t
      JOIN users u ON u.uid = t.uid
      LEFT JOIN timesheet_entries e 
        ON t.ts_id = e.ts_id
      WHERE 1 = 1
    `;

    const params = [];

    //  Restrict only ADMIN
    if (role === "ADMIN") {
      sql += " AND u.desg = ?";
      params.push(desg);
    }
    // SUPER_ADMIN → no restriction

    if (employee && employee !== "all") {
      sql += " AND t.uid = ?";
      params.push(employee);
    }

    if (year) {
      sql += " AND YEAR(t.work_dt) = ?";
      params.push(year);
    }

    if (month) {
      sql += " AND MONTH(t.work_dt) = ?";
      params.push(month);
    }

    if (status && status !== "all") {
      sql += " AND t.status = ?";
      params.push(status);
    }

    sql += `
      GROUP BY 
        t.ts_id, u.emp_id, u.fname, t.work_dt, 
        t.status, t.rej_reason
      ORDER BY t.work_dt DESC
    `;

    const [rows] = await db.query(sql, params);
    res.json(rows);

  } catch (err) {
    console.error("Admin timesheet load error:", err);
    res.status(500).json({ message: "Failed to load admin timesheets" });
  }
};

exports.getAdminMonthlyTotal = async (req, res) => {
  const { userId, year, month } = req.params;

  try {
    const [[row]] = await db.query(
      `
      SELECT 
        COALESCE(SUM(e.spent_hrs), 0) AS total_hours
      FROM timesheets t
      JOIN timesheet_entries e 
           ON t.ts_id = e.ts_id
      WHERE t.uid = ?
        AND YEAR(t.work_dt) = ?
        AND MONTH(t.work_dt) = ?
        AND t.status = 'APPROVED'
      `,
      [userId, year, month]
    );

    res.json(row);
  } catch (err) {
    console.error("Admin total hours error:", err);
    res.status(500).json({ message: "Failed to load total hours" });
  }
};


// Notification for user
exports.getUserNotifications = async (req, res) => {
  const userId = req.user.uid;

  try {
    const [rows] = await db.query(
      `
      SELECT
        notif_id,
        msg,
        type,
        status,
        created_at
      FROM notifications
      WHERE uid = ?
      ORDER BY created_at DESC
      `,
      [userId]
    );

    res.json(rows);
  } catch (err) {
    console.error("Notifications error:", err);
    res.status(500).json({ message: "Failed to load notifications" });
  }
};


