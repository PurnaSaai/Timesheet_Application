const nodemailer = require("nodemailer");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: process.env.EMAIL_USER,
    pass: process.env.EMAIL_PASS
  }
});

exports.sendOTPEmail = async (to, otp) => {
  await transporter.sendMail({
    from: `"Timesheet System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Password Reset OTP",
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px">
        <h3>Password Reset Request</h3>
        <p>Your OTP for resetting password is:</p>
        <h2 style="letter-spacing:3px">${otp}</h2>
        <p>This OTP is valid for <b>10 minutes</b>.</p>
        <br>
        <p>Regards,<br>Timesheet System</p>
      </div>
    `
  });
};


// APPROVAL EMAIL
exports.sendApprovalEmail = async (to, name) => {
  await transporter.sendMail({
    from: `"Timesheet System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Profile Approved – Timesheet System",
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px">
        <p>Dear ${name || "User"},</p>

        <p>Your profile has been <b>approved</b>.</p>
        <p>You can now log in and start using the Timesheet System.</p>

        <br>
        <p>Regards,<br>Timesheet System</p>
      </div>
    `
  });
};

// REJECTION EMAIL
exports.sendRejectionEmail = async (to, name, reason) => {
  await transporter.sendMail({
    from: `"Timesheet System" <${process.env.EMAIL_USER}>`,
    to,
    subject: "Profile Rejected – Timesheet System",
    html: `
      <div style="font-family:Arial,sans-serif;font-size:14px">
        <p>Dear ${name || "User"},</p>

        <p>Your profile has been <b>rejected</b>.</p>

        <p><b>Reason:</b></p>
        <blockquote>${reason}</blockquote>

        <p>Please contact HR if you need clarification.</p>

        <br>
        <p>Regards,<br>Timesheet System</p>
      </div>
    `
  });
};