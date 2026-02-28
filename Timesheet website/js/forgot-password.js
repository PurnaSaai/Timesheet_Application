let otpCooldown = false;
let otpTimer = null;

async function generateOTP() {
  if (otpCooldown) return;

  const empId = document.getElementById("employeeId").value.trim();
  const email = document.getElementById("email").value.trim();
  const btn = document.getElementById("sendOtpBtn");

  if (!empId || !email) {
    alert("Please enter Employee ID and Email");
    return;
  }

  try {
    otpCooldown = true;
    btn.disabled = true;
    btn.innerText = "Sending...";

    const res = await fetch("http://localhost:5000/api/auth/forgot-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId, email })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Failed to send OTP");
      resetOtpButton(btn);
      return;
    }

    alert("OTP sent to your email");

    document.getElementById("otp").style.display = "block";
    document.getElementById("verifyBtn").style.display = "block";

    startOTPCooldown(btn);

  } catch (err) {
    console.error(err);
    alert("Server error");
    resetOtpButton(btn);
  }
}


function startOTPCooldown(btn) {
  let seconds = 30;
  btn.innerText = `Resend in ${seconds}s`;

  otpTimer = setInterval(() => {
    seconds--;
    btn.innerText = `Resend in ${seconds}s`;

    if (seconds <= 0) {
      clearInterval(otpTimer);
      resetOtpButton(btn);
    }
  }, 1000);
}

function resetOtpButton(btn) {
  otpCooldown = false;
  btn.disabled = false;
  btn.innerText = "Send OTP";
}



async function verifyOTP() {
  const empId = document.getElementById("employeeId").value.trim();
  const otp = document.getElementById("otp").value.trim();

  if (!otp) {
    alert("Enter OTP");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/verify-otp", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emp_id: empId, otp })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Invalid OTP");
      return;
    }

    // Save temporary reset token
    localStorage.setItem("rst_token", data.rst_token);

    window.location.href = "reset-password.html";


  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

function goToLogin() {
  window.location.href = "index.html";
}
