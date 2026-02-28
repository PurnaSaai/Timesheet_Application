const db = require("../config/db");

/* GET holidays by year */
exports.getHolidaysByYear = async (req, res) => {
  const { year } = req.params;

  try {
    const [rows] = await db.query(
    `SELECT 
        h_id, 
        DATE_FORMAT(hol_dt, '%Y-%m-%d') AS hol_dt,
        descr
    FROM holidays 
    WHERE YEAR(hol_dt) = ?`,
    [year]
    );

    res.json(rows);
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};


exports.getHolidaysByMonth = async (req, res) => {
  const { year, month } = req.params;

  try {
    const [rows] = await db.query(
      `SELECT DATE_FORMAT(hol_dt, '%Y-%m-%d') AS hol_dt
       FROM holidays
       WHERE YEAR(hol_dt) = ?
         AND MONTH(hol_dt) = ?`,
      [year, month]
    );

    res.json(rows);
  } catch (err) {
    console.error("GET HOLIDAYS ERROR:", err);
    res.status(500).json({ error: err.message });
  }
};




/* ADD holiday */
exports.addHoliday = async (req, res) => {
  const { hol_dt, descr } = req.body;

  const holidayYear = new Date(hol_dt).getFullYear();
  const currentYear = new Date().getFullYear();
  if (holidayYear < currentYear) {
    return res.status(400).json({
      message: "Cannot add holidays for past years"
    });
  }


  if (!hol_dt) {
    return res.status(400).json({ message: "Holiday date is required" });
  }

  try {
    await db.query(
      `INSERT INTO holidays (hol_dt, descr)
      VALUES (?, ?)`,
      [hol_dt, descr || null]
    );

    res.status(201).json({ message: "Holiday added successfully" });
  } catch (err) {
    if (err.code === "ER_DUP_ENTRY") {
      return res.status(409).json({ message: "Holiday already exists" });
    }
    res.status(500).json({ error: err.message });
  }
};

/* DELETE holiday */
exports.deleteHoliday = async (req, res) => {
  const { id } = req.params;

  // Fetch holiday date
  const [[holiday]] = await db.query(
    "SELECT hol_dt FROM holidays WHERE h_id = ?",
    [id]
  );

  if (!holiday) {
    return res.status(404).json({ message: "Holiday not found" });
  }

  const holidayYear = new Date(holiday.hol_dt).getFullYear();
  const currentYear = new Date().getFullYear();

  if (holidayYear < currentYear) {
    return res.status(400).json({
      message: "Cannot delete holidays from past years"
    });
  }

  await db.query("DELETE FROM holidays WHERE h_id = ?", [id]);

  res.json({ message: "Holiday removed" });
};
