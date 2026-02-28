async function resetPassword() {
  const pwd = document.getElementById("newPwd").value.trim();
  const confirm = document.getElementById("confirmPwd").value.trim();
  const rst_token = localStorage.getItem("rst_token");

  if (!pwd || !confirm) {
    alert("All fields required");
    return;
  }

  if (pwd !== confirm) {
    alert("Passwords do not match");
    return;
  }

  if (!rst_token) {
    alert("Session expired. Please restart password reset.");
    window.location.href = "forgot-password.html";
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/reset-password", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        rst_token,
        new_password: pwd
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Password reset failed");
      return;
    }

    alert("Password reset successful");

    localStorage.removeItem("rst_token");
    window.location.href = "index.html";

  } catch (err) {
    console.error(err);
    alert("Server error");
  }
}

function goToLogin() {
  window.location.href = "index.html";
}

