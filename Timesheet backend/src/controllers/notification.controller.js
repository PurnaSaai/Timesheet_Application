const db = require("../config/db");

exports.getNotifications = async (req, res) => {
  const userId = req.user.uid;

  const [rows] = await db.query(
    `SELECT * FROM notifications 
     WHERE uid = ? AND status = 'UNREAD'
     ORDER BY created_at DESC`,
    [userId]
  );

  res.json(rows);
};

exports.markNotificationRead = async (req, res) => {
  const { id } = req.params;

  await db.query(
    `UPDATE notifications SET status = 'READ' WHERE notif_id = ?`,
    [id]
  );

  res.json({ message: "Notification marked as read" });
};
