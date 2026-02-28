/* GLOBAL AUTH HELPERS */
async function authFetch(url, options = {}) {
  const token = localStorage.getItem("token");

  if (!token) {
    throw new Error("No auth token found");
  }

  return fetch(url, {
    ...options,
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`,
      ...(options.headers || {})
    }
  });
}


/*Get stored JWT token*/
function getToken() {
  return localStorage.getItem("token");
}

/*Get logged-in user role*/
function getUserRole() {
  return localStorage.getItem("role");
}

/*Check if user is logged in*/
function isLoggedIn() {
  return !!localStorage.getItem("token");
}

/*Logout user (can be reused everywhere)*/
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}
