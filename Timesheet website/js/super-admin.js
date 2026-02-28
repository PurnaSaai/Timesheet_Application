document.addEventListener("DOMContentLoaded", () => {
  if (localStorage.getItem("role") !== "SUPER_ADMIN") {
    alert("Unauthorized");
    window.location.href = "index.html";
    return;
  }

  const name =
    localStorage.getItem("fname") ||
    localStorage.getItem("emp_id");

  document.getElementById("superAdminTitle").innerText =
    `SUPER ADMIN - ${name}`;
  loadApprovalBadge();
  showSection("timesheets");
});

function showSection(section) {
  document.querySelectorAll(".section").forEach(s =>
    s.classList.add("hidden")
  );

  document.getElementById(section + "Section")
    .classList.remove("hidden");

  if (section === "timesheets") loadSuperAdminTimesheetsSection();
  if (section === "approvals") loadApprovals();
  if (section === "holidays") initSuperAdminHolidays();
}

async function loadApprovalBadge() {
  const res = await authFetch(
    "http://localhost:5000/api/super-admin/approvals/pending-count"
  );

  const data = await res.json();
  const badge = document.getElementById("approvalBadge");

  if (data.count > 0) {
    badge.innerText = data.count;
    badge.style.display = "inline-block";
  } else {
    badge.style.display = "none";
  }
}

function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}