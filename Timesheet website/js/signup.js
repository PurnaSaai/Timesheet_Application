function goToLogin() {
  window.location.href = "index.html";
}

async function signup() {
  const fname = document.getElementById("fullName").value.trim();
  const emp_id = document.getElementById("employeeId").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const desg = document.getElementById("designation").value.trim();

  if (!desg) {
    alert("Please select a department");
    return;
  }

  try {
    const res = await fetch("http://localhost:5000/api/auth/signup", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        fname,
        emp_id,
        email,
        password,
        desg
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Signup failed");
      return;
    }

    alert(data.message); 
    window.location.href = "index.html";

  } catch (err) {
    alert("Server error during signup");
  }
}
