const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../config/db");
const { autoSubmitIfNeeded } = require("./timesheet.controller");
const { sendOTPEmail } = require("../utils/email");



/* USER SIGNUP */
exports.signup = async (req, res) => {
  const { emp_id, email, password, fname, desg } = req.body;

  try {
    //  Validate input
    if (!emp_id || !email || !password || !fname) {
      return res.status(400).json({ message: "All required fields must be filled" });
    }

    //  Check if user already exists
    const [existing] = await db.query(
      "SELECT uid FROM users WHERE emp_id = ? OR email = ?",
      [emp_id, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "User already exists" });
    }

    //  Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    //  Insert into users table
    const [userResult] = await db.query(
      `
      INSERT INTO users
      (emp_id, email, pwd_hash, role, app_status, fname, desg)
      VALUES (?, ?, ?, 'USER', 'PENDING', ?, ?)
      `,
      [
        emp_id,
        email,
        hashedPassword,
        fname,
        desg || null
      ]
    );


    const userId = userResult.insertId;

    //  Insert into user_profiles table
    await db.query(
      `
      INSERT INTO user_profiles (uid, fname, desg)
      VALUES (?, ?, ?)
      `,
      [userId, fname, desg || null]
    );

    //  Respond success
    res.status(201).json({
      message: "Signup successful. Waiting for admin approval."
    });

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



/* ADMIN SIGNUP */
exports.adminSignup = async (req, res) => {
  const { emp_id, email, password, fname, desg } = req.body;

  try {
    if (!emp_id || !email || !password || !fname || !desg) {
      return res.status(400).json({ message: "All fields are required" });
    }

    const [existing] = await db.query(
      `SELECT uid FROM users WHERE emp_id = ? OR email = ?`,
      [emp_id, email]
    );

    if (existing.length > 0) {
      return res.status(409).json({ message: "Admin already exists" });
    }

    const hash = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      `INSERT INTO users 
       (emp_id, email, pwd_hash, role, app_status, fname, desg)
       VALUES (?, ?, ?, 'ADMIN', 'PENDING', ?, ?)`,
      [emp_id, email, hash, fname, desg]
    );

    await db.query(
      `INSERT INTO user_profiles (uid, fname, desg)
       VALUES (?, ?, ?)`,
      [result.insertId, fname, desg]
    );

    return res.status(201).json({
      message: "Admin registered successfully. Waiting for Super Admin approval."
    });

  } catch (err) {
    console.error("ADMIN SIGNUP ERROR:", err);
    return res.status(500).json({ error: err.message });
  }
};


/* LOGIN */
// exports.login = async (req, res) => {
//   console.log("LOGIN API HIT", req.body); 

//   const { emp_id, password } = req.body;
//   const loginType = req.body.loginType?.toUpperCase();


//   try {
//     const [rows] = await db.query(
//       `SELECT * FROM users WHERE emp_id = ?`,
//       [emp_id]
//     );

//     if (rows.length === 0) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     const user = rows[0];

//     if (loginType !== user.role) {
//       return res.status(403).json({
//         message: `You are not authorized to login as ${loginType}`
//       });
//     }


//     if (user.role === "USER" && user.app_status !== "APPROVED") {
//       return res.status(403).json({
//         message: "Account not approved by admin"
//       });
//     }

//     const isMatch = await bcrypt.compare(password, user.pwd_hash);
//     if (!isMatch) {
//       return res.status(401).json({ message: "Invalid credentials" });
//     }

//     // Auto submit check
//     if (user.role === "USER") {
//       try {
//         await autoSubmitIfNeeded(user.uid);
//         await createTodayTimesheetIfNotExists(user.uid);
//       } catch (err) {
//         console.error("Auto timesheet init failed:", err);
//       }
//     }

// // --------------------------Check-------------------------------
//     const token = jwt.sign(
//       {
//         uid: user.uid,
//         role: user.role,
//         desg:user.desg
//       },
//       process.env.JWT_SECRET,
//       { expiresIn: process.env.JWT_EXPIRES_IN }
//     );

//     res.json({
//       message: "Login successful",
//       token,
//       role: user.role,
//       desg:user.desg || null,
//       fname:user.fname,
//       emp_id:user.emp_id
//     });

//   } catch (err) {
//     res.status(500).json({ error: err.message });
//   }
// };

exports.login = async (req, res) => {
  console.log("LOGIN CONTROLLER STARTED");
  console.log("LOGIN API HIT", req.body);

  const { emp_id, password } = req.body;
  const loginType = req.body.loginType?.toUpperCase();

  if (!loginType) {
    return res.status(400).json({
      message: "Login type is required"
    });
  }

  try {
    const [rows] = await db.query(
      `SELECT * FROM users WHERE emp_id = ?`,
      [emp_id]
    );

    if (rows.length === 0) {
      return res.status(401).json({ message: "Invalid credentials" });
    }

    const user = rows[0];

    // Role validation
    if (loginType !== user.role) {
      console.log("ROLE MISMATCH", loginType, user.role);
      return res.status(403).json({
        message: `You are not authorized to login as ${loginType}`
      });
    }

    // Approval check
    if (
      (user.role === "USER" || user.role === "ADMIN") &&
      user.app_status !== "APPROVED"
    ) {
      return res.status(403).json({
        message: "Account not approved yet"
      });
    }

    // Password check
    const isMatch = await bcrypt.compare(password, user.pwd_hash);
    if (!isMatch) {
      console.log("Password Mismatch");      
      return res.status(401).json({ message: "Invalid credentials" });
    }
    console.log("ABOUT TO SEND LOGIN RESPONSE");
    // Auto timesheet logic (USER only)
    if (user.role === "USER") {
      try {
        await autoSubmitIfNeeded(user.uid);
        await createTodayTimesheetIfNotExists(user.uid);
      } catch (err) {
        console.error("Auto timesheet init failed:", err);
      }
    }

    // JWT
    const token = jwt.sign(
      {
        uid: user.uid,
        role: user.role,
        desg: user.desg
      },
      process.env.JWT_SECRET,
      { expiresIn: process.env.JWT_EXPIRES_IN }
    );

    res.json({
      message: "Login successful",
      token,
      role: user.role,
      desg: user.desg,
      fname: user.fname,
      emp_id: user.emp_id
    });

  } catch (err) {
    res.status(500).json({ error: err.message });
  }
};

exports.getMe = async (req, res) => {
  try {
    const userId = req.user.uid;

    const [rows] = await db.query(
      `SELECT uid,emp_id,email,role,fname,desg
      FROM users WHERE uid = ?`,
      [userId]
    );

    if (rows.length === 0) {
      return res.status(404).json({ message: "User not found" });
    }

    res.json(rows[0]);

  } catch (err) {
    console.error(err);
    res.status(500).json({ error: err.message });
  }
};



// -----------------------------------Forgot password-----------------------------------------

const crypto = require("crypto");
const nodemailer = require("nodemailer");

exports.forgotPassword = async (req, res) => {
  const { emp_id, email } = req.body;

  try {
    const [rows] = await db.query(
      `SELECT uid, email FROM users WHERE emp_id = ?`,
      [emp_id.trim()]
    );

    if (!rows.length) {
      return res.status(404).json({ message: "Employee ID not found" });
    }

    const user = rows[0];

    if (user.email.toLowerCase() !== email.trim().toLowerCase()) {
      return res.status(401).json({ message: "Email does not match our records" });
    }

    // generate otp
    const otp = Math.floor(100000 + Math.random() * 900000).toString();
    const hashedOtp = await bcrypt.hash(otp, 10);
    const expiry = new Date(Date.now() + 10 * 60 * 1000);

    await db.query(`DELETE FROM password_resets WHERE uid = ?`, [user.uid]);

    await db.query(
      `INSERT INTO password_resets (uid, otp_hash, exp_at)
       VALUES (?, ?, ?)`,
      [user.uid, hashedOtp, expiry]
    );

    // send email
    await sendOTPEmail(user.email, otp);

    res.json({ message: "OTP sent to registered email" });

  } catch (err) {
    console.error("Forgot password error:", err);
    res.status(500).json({ message: "Server error" });
  }
};


// Verify OTP

exports.verifyOTP = async (req, res) => {
  try {
    const { emp_id, otp } = req.body;

    const [[user]] = await db.query(
      "SELECT uid FROM users WHERE emp_id = ?",
      [emp_id]
    );

    if (!user) {
      return res.status(404).json({ message: "User not found" });
    }

    const [[row]] = await db.query(
      `SELECT * FROM password_resets
       WHERE uid = ? AND exp_at > NOW()
       ORDER BY pr_id DESC LIMIT 1`,
      [user.uid]
    );

    if (!row) {
      return res.status(400).json({ message: "OTP expired or invalid" });
    }

    const isValid = await bcrypt.compare(otp, row.otp_hash);

    if (!isValid) {
      return res.status(400).json({ message: "Invalid OTP" });
    }

    // Generate secure reset token
    const resetToken = crypto.randomBytes(32).toString("hex");

    await db.query(
      `UPDATE password_resets 
       SET rst_token = ?
       WHERE pr_id = ?`,
      [resetToken, row.pr_id]
    );
    console.log("OTP VERIFIED — issuing reset token:", resetToken);

    return res.json({
      message: "OTP verified successfully",
      rst_token: resetToken
    });

  } catch (err) {
    console.error("Verify OTP error:", err);
    return res.status(500).json({ message: "OTP verification failed" });
  }
};


// --------------------------- Reset Password -------------------------

exports.resetPassword = async (req, res) => {
  try {
    const { rst_token, new_password } = req.body;

    if (!rst_token || !new_password) {
      return res.status(400).json({ message: "Missing reset token or password" });
    }

    console.log("RESET TOKEN RECEIVED FROM CLIENT:", rst_token);

    const [[row]] = await db.query(
      `SELECT uid FROM password_resets
       WHERE rst_token = ? AND exp_at > NOW()
       ORDER BY pr_id DESC LIMIT 1`,
      [rst_token]
    );

    if (!row) {
      return res.status(400).json({ message: "Invalid or expired reset token" });
    }

    const hash = await bcrypt.hash(new_password, 10);

    await db.query(
      `UPDATE users SET pwd_hash = ? WHERE uid = ?`,
      [hash, row.uid]
    );

    await db.query(
      `DELETE FROM password_resets WHERE uid = ?`,
      [row.uid]
    );

    return res.json({ message: "Password reset successful" });

  } catch (err) {
    console.error("Reset password error:", err);
    return res.status(500).json({ message: "Password reset failed" });
  }
};


