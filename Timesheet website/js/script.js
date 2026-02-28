/* LOGIN SCRIPT (INDEX PAGE) */

async function login() {
  const emp_id = document.getElementById("empId").value.trim();
  const password = document.getElementById("pwd").value.trim();

  //  Read selected portal (USER / ADMIN)
  const loginType = document.querySelector(
    'input[name="role"]:checked'
  )?.value;

  if (!emp_id || !password) {
    alert("Please enter Employee ID and Password");
    return;
  }

  if (!loginType) {
    alert("Please select User or Admin login");
    return;
  }


  try {
    const res = await fetch("http://localhost:5000/api/auth/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        emp_id,
        password,
        loginType   // send portal type
      })
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Login failed");
      return;
    }

    localStorage.setItem("token", data.token);
    localStorage.setItem("role", data.role);
    localStorage.setItem("desg", data.desg);
    localStorage.setItem("fname", data.fname);
    localStorage.setItem("emp_id", data.emp_id); 


    // Redirect based on REAL role
    if (data.role === "SUPER_ADMIN") {
      window.location.href = "super-admin.html";
    } else if (data.role === "ADMIN") {
      window.location.href = "admin.html";
    } else {
      window.location.href = "user.html";
    }

  } catch (err) {
    console.error("STEP X: fetch error", err);
    console.error(err);
    alert("Server error. Try again.");
  }
}

const roleRadios = document.querySelectorAll('input[name="role"]');
const signupText = document.getElementById("signupText");
const signupLink = document.getElementById("signupLink");

roleRadios.forEach(radio => {
  radio.addEventListener("change", () => {
    const selectedRole = document.querySelector(
      'input[name="role"]:checked'
    ).value;

    if (selectedRole === "ADMIN") {
      signupLink.href = "admin-signup.html";
      signupLink.innerText = "Admin Sign up";
      signupText.style.display = "block";
    } 
    else if (selectedRole === "USER") {
      signupLink.href = "signup.html";
      signupLink.innerText = "Sign up";
      signupText.style.display = "block";
    } 
    else if (selectedRole === "SUPER_ADMIN") {
      signupText.style.display = "none";   
    }
  });
});



