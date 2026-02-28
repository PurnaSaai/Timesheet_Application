function goToLogin() {
  window.location.href = "index.html";
}

async function adminSignup() {
  
  const fname = document.getElementById("fullName").value.trim();
  const emp_id = document.getElementById("employeeId").value.trim();
  const email = document.getElementById("email").value.trim();
  const password = document.getElementById("password").value.trim();
  const confirmPassword = document.getElementById("confirmPassword").value.trim();
  const desg = document.getElementById("designation").value.trim();


  if (!fname || !emp_id || !email || !password || !confirmPassword || !desg) {
    alert("All fields required");
    return;
  }
  if (!desg) {
    alert("Please select a department");
    return;
  }
  if (password !== confirmPassword){
    alert("Confirm password and password areneed to be same");
    return;
  }

  const res = await fetch("http://localhost:5000/api/auth/admin-signup", {
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
  console.log("ADMIN SIGNUP BODY:", res.body);

  const data = await res.json();

  if (!res.ok) {
    alert(data.message || "Admin signup failed");
    return;
  }

  alert("Admin created successfully");
  window.location.href = "index.html";
}





