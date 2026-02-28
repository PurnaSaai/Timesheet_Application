/* AUTH GUARD */
if (
  !localStorage.getItem("token") ||
  localStorage.getItem("role") !== "ADMIN"
) {
  window.location.href = "index.html";
}

/* GLOBAL STATE */
let allUsers = [];

/* INIT */
function initAdmin() {
  const titleEl = document.getElementById("adminTitle");

  const dept = localStorage.getItem("desg");   // SOFTWARE, SUPPORT
  const adminName =
    localStorage.getItem("fname") ||
    localStorage.getItem("name") ||
    localStorage.getItem("emp_id") ||
    "Admin";

  if (titleEl && dept) {
    titleEl.innerText = `${formatDept(dept)} HOD - ${adminName}`;
  }

  showTimesheets();

}





function formatDept(dept) {
  return dept
    .toLowerCase()
    .replace(/_/g, " ")
    .replace(/\b\w/g, c => c.toUpperCase());
}


/* LOGOUT */
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* TAB SWITCHING */


function showTimesheets() {
  hideAllAdminSections();
  document.getElementById("timesheetSection").style.display = "block";
  initTimesheetFilters();
}



function showUsers() {
  hideAllAdminSections();
  document.getElementById("userApprovalSection").style.display = "block";
}

function hideAllAdminSections() {
  document.getElementById("timesheetSection").style.display = "none";
  document.getElementById("userApprovalSection").style.display = "none";
}



/* LOAD USERS BY STATUS */
async function loadUsers(status) {
  if (!status) return;

  const res = await authFetch(
    `http://localhost:5000/api/admin/users?status=${status}`
  );

  const users = await res.json();
  renderUsers(users);
}





/* RENDER USERS */
function renderUsers(users) {
  const tbody = document.getElementById("pendingUsersBody");
  tbody.innerHTML = "";

  if (!users.length) {
    tbody.innerHTML =
      `<tr><td colspan="6">No users found</td></tr>`;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${u.emp_id}</td>
      <td>${u.fname}</td>
      <td>${u.email}</td>
      <td>${u.desg || "-"}</td>
      <td>${u.app_status}</td>
      <td>
        ${
          u.app_status === "PENDING"
            ? `
              <button onclick="approveUser(${u.uid})">Approve</button>
              <button onclick="rejectUser(${u.uid})">Reject</button>
            `
            : "-"
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}


/* SEARCH FILTER */
function filterUsers() {
  const query = document
    .getElementById("searchEmployee")
    .value
    .toLowerCase();

  const filtered = allUsers.filter(u =>
    u.emp_id.toLowerCase().includes(query)
  );

  renderUsers(filtered);
}

/* APPROVE / REJECT */
// async function approveUser(uid) {
//   await authFetch(`http://localhost:5000/api/admin/approve/${uid}`, {
//     method: "POST"
//   });
// }

// async function approveUser(uid) {
//   const res = await fetch(
//     `${API_BASE}/admin/approve/${uid}`,
//     {
//       method: "POST",
//       headers: {
//         "Authorization": "Bearer " + localStorage.getItem("token")
//       }
//     }
//   );

//   const data = await res.json();

//   if (!res.ok) {
//     alert(data.message || "Approval failed");
//     return;
//   }

//   alert("User approved successfully");

//   loadUsers();
// }

async function approveUser(uid) {
  try {
    const res = await authFetch(
      `http://localhost:5000/api/admin/approve/${uid}`,
      { method: "POST" }
    );

    const data = await res.json();

    if (!res.ok) {
      alert(data.message || "Approval failed");
      return;
    }

    alert("User approved successfully");

    // Reload users with current filter
    loadUsers(
      document.getElementById("userStatusFilterApproval").value
    );
  } catch (err) {
    console.error("Approve user error:", err);
    alert("Approval failed");
  }
}


async function rejectUser(uid) {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  await authFetch(
    `http://localhost:5000/api/admin/reject/${uid}`,
    {
      method: "POST",
      body: JSON.stringify({ reason })
    }
  );
  loadUsers(
      document.getElementById("userStatusFilterApproval").value
    );
}

// Search using Employee ID
function applyUserSearch() {
  const query = document
    .getElementById("employeeSearch")
    .value
    .toLowerCase();

  const filtered = allUsers.filter(u =>
    u.emp_id.toLowerCase().includes(query)
  );

  renderUsers(filtered);
}


function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];  // YYYY-MM-DD
}


/* =====================
   TIMESHEET FILTER DROPDOWNS
===================== */

async function loadEmployeeFilter() {

  const select = document.getElementById("tsEmployeeFilter");
  if (!select) return;

  const res = await authFetch("http://localhost:5000/api/admin/employees");
  const users = await res.json();


  select.innerHTML = `<option value="all">All</option>`;

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.uid;
    opt.textContent = `${u.emp_id} - ${u.fname || ""}`;
    select.appendChild(opt);
  });
}


function loadMonthFilter() {
  const monthSelect = document.getElementById("tsMonthFilter");
  if (!monthSelect) return;

  monthSelect.innerHTML = "";

  for (let i = 0; i < 12; i++) {
    const date = new Date(2024, i);
    const opt = document.createElement("option");
    opt.value = i + 1;
    opt.textContent = date.toLocaleString("default", { month: "long" });

    if (i === new Date().getMonth()) opt.selected = true;

    monthSelect.appendChild(opt);
  }

}

function loadYearFilter() {
  const yearSelect = document.getElementById("tsYearFilter");
  if (!yearSelect) return;

  yearSelect.innerHTML = "";

  const currentYear = new Date().getFullYear();

  for (let y = 2020; y <= currentYear; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;

    if (y === currentYear) opt.selected = true;

    yearSelect.appendChild(opt);
  }


}


// document.addEventListener("DOMContentLoaded", () => {
//   // Status dropdown
//   const statusSelect = document.getElementById("userStatusFilter");
//   if (!statusSelect) {
//     console.error("Status dropdown not found");
//     return;
//   }

//   statusSelect.value = "SUBMITTED";

//   statusSelect.addEventListener("change", (e) => {
//     loadUsers(e.target.value);
//   });

//   // Search input
//   const searchInput = document.getElementById("employeeSearch");
//   if (searchInput) {
//     searchInput.addEventListener("input", applyUserSearch);
//   }

//   // Initial load
//   loadUsers("SUBMITTED");
// });

document.addEventListener("DOMContentLoaded", () => {
  const statusSelect = document.getElementById("userStatusFilter");


  if (statusSelect) {
    statusSelect.value = "SUBMITTED";
    statusSelect.addEventListener("change", (e) => {
      loadUsers(e.target.value);
    });
    loadUsers("SUBMITTED");
  }

  // ALWAYS initialize admin
  initAdmin();
});


async function initTimesheetFilters() {
  await loadEmployeeFilter();
  loadYearFilter();
  loadMonthFilter();

  document.getElementById("tsStatusFilter").value = "all";

  loadAdminTimesheets();   
}



function renderAdminTable(rows) {
  const tbody = document.getElementById("adminTableBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `<tr><td colspan="7" style="text-align:center">No records found</td></tr>`;
    return;
  }

  rows.forEach(row => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${row.emp_id}</td>
      <td>${row.work_dt}</td>
      <td><b>${Number(row.total_hours || 0).toFixed(2)}</b></td>
      <td>${row.descr || "-"}</td>
      <td><b>${row.status}</b></td>
      <td>${row.status === "REJECTED" ? (row.rej_reason || "—") : "—"}</td>

      <td class="action-cell">${renderActions(row)}</td>
    `;

    tbody.appendChild(tr);
  });

  toggleActionColumn();
}


function formatDate(dateStr) {
  return dateStr.split("T")[0];
}

function formatTime(timeStr) {
  if (!timeStr) return "-";
  return timeStr.substring(11, 16);
}



function calculateHours(start, end) {
  if (!start || !end) return 0;
  return ((new Date(end) - new Date(start)) / 3600000);
}


async function loadAdminTimesheets() {
  const employee = document.getElementById("tsEmployeeFilter").value;
  const year = document.getElementById("tsYearFilter").value;
  const month = document.getElementById("tsMonthFilter").value;
  const status = document.getElementById("tsStatusFilter").value;
  // toggleActionColumn(status === "SUBMITTED");


  try {
    const res = await authFetch(
      `http://localhost:5000/api/admin/timesheets?employee=${employee}&year=${year}&month=${month}&status=${status}`
    );

    const rows = await res.json();

    // document.getElementById("adminTotalBox").style.display = "none";
    // calculateAdminTotal();

    renderAdminTable(rows);
    updateAdminMonthlyTotal(rows);
  } catch (err) {
    console.error(" Failed to load admin timesheets:", err);
  }
}

function updateAdminMonthlyTotal(rows) {
  const employee = document.getElementById("tsEmployeeFilter").value;
  const totalBox = document.getElementById("adminTotalBox");
  const totalText = document.getElementById("adminTotalHours");

  // Show total only when a specific employee is selected
  if (!employee || employee === "all") {
    totalBox.style.display = "none";
    return;
  }

  let total = 0;

  rows.forEach(row => {
    total += Number(row.total_hours || 0);
  });

  totalText.innerText = total.toFixed(2);
  totalBox.style.display = "block";
}

// async function calculateAdminTotal() {
//   const userId = document.getElementById("tsEmployeeFilter").value;
//   const year = document.getElementById("tsYearFilter").value;
//   const month = document.getElementById("tsMonthFilter").value;
//   const status = document.getElementById("tsStatusFilter").value;

  // Only show total when employee selected and status = APPROVED
//   if (!userId || userId === "all") {
//     document.getElementById("adminTotalBox").style.display = "none";
//     return;
//   }

//   const res = await authFetch(
//     `http://localhost:5000/api/admin/monthly-total/${userId}/${year}/${month}`
//   );

//   const data = await res.json();

//   document.getElementById("adminTotalBox").style.display = "block";
//   document.getElementById("adminTotalHours").innerText =
//     Number(data.total_hours || 0).toFixed(2);
// }


function toggleActionColumn() {
  const status = document.getElementById("tsStatusFilter").value;
  const show = status === "SUBMITTED";

  const header = document.getElementById("actionHeader");
  if (header) header.style.display = show ? "" : "none";

  document.querySelectorAll(".action-cell").forEach(td => {
    td.style.display = show ? "" : "none";
  });
}




function renderActions(row) {
  if (row.status === "SUBMITTED") {
    return `
      <button style="margin: 2px; padding:4px 3px; font-weight:700;" onclick="approveTimesheet(${row.ts_id})">Approve</button>
      <button style="margin: 2px; padding:4px 10px; font-weight:700;" onclick="rejectTimesheet(${row.ts_id})">Reject</button>
    `;
  }

  return "-";
}

async function approveTimesheet(id) {
  if (!id) return alert("Invalid timesheet id");
  try{
    await authFetch(`http://localhost:5000/api/timesheet/approve/${id}`, {
      method: "POST"
    });
    alert("Timesheet approved");
    loadAdminTimesheets(); // auto refresh
  }catch (err) {
    alert("Approval failed");
    console.error(err);
  }
}

async function rejectTimesheet(id) {
  if (!id) return alert("Invalid timesheet id");

  const reason = prompt("Enter rejection reason:");
  if (!reason) return;
  try{
    await authFetch(`http://localhost:5000/api/timesheet/reject/${id}`, {
      method: "POST",
      body: JSON.stringify({ reason })
    });
    alert("Timesheet Rejected");
    loadAdminTimesheets();
  }catch (err) {
    alert("Rejection failed");
    console.error(err);
  }
}







