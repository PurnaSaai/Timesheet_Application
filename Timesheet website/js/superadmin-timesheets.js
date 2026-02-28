async function loadSuperAdminTimesheets() {
  const dept = document.getElementById("saDeptFilter").value;
  const emp = document.getElementById("saEmployeeFilter").value;
  const year = document.getElementById("saYearFilter").value;
  const month = document.getElementById("saMonthFilter").value;
  const status = document.getElementById("saStatusFilter").value;

  const params = new URLSearchParams({
    employee: emp,
    year,
    month,
    status
  });

  // department is OPTIONAL for super admin
  if (dept !== "all") {
    params.append("department", dept);
  }

  const res = await authFetch(
    `http://localhost:5000/api/admin/timesheets?${params}`
  );

  const rows = await res.json();
  renderSuperAdminTimesheets(rows);
}

function renderSuperAdminTimesheets(rows) {
  const tbody = document.getElementById("saTimesheetBody");
  tbody.innerHTML = "";

  if (!rows.length) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">No records found</td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");
    tr.innerHTML = `
      <td>${r.emp_id}</td>
      <td>${r.fname || ""}</td>
      <td>${new Date(r.work_dt).toLocaleDateString()}</td>
      <td>${r.total_hours}</td>
      <td>${r.status}</td>
      <td>${r.descr || "-"}</td>
      <td>
        ${
          r.status === "SUBMITTED"
            ? `
              <button onclick="approveSATimesheet(${r.ts_id})">
                Approve
              </button>
              <button onclick="rejectSATimesheet(${r.ts_id})">
                Reject
              </button>
            `
            : `
              <button id="changeAction" onclick="overrideSATimesheet(${r.ts_id}, '${r.status}')">
                Change Action
              </button>
            `
        }
        <button onclick="viewLogs(${r.ts_id})">
          History
        </button>
      </td>
      <td>${r.rej_reason || "-"}</td>
    `;
    tbody.appendChild(tr);
  });
}

// Employee dropdown
async function loadSuperAdminEmployees() {
  const dept = document.getElementById("saDeptFilter").value;
  const select = document.getElementById("saEmployeeFilter");

  const url =
    dept === "all"
      ? "http://localhost:5000/api/admin/employees"
      : `http://localhost:5000/api/admin/employees?department=${dept}`;

  const res = await authFetch(url);
  const users = await res.json();

  console.log("SUPER ADMIN EMPLOYEES:", users);

  select.innerHTML = `<option value="all">All</option>`;

  users.forEach(u => {
    const opt = document.createElement("option");
    opt.value = u.uid;

    // SAFE LABEL (never blank)
    opt.textContent =
      `${u.emp_id}` + (u.fname ? ` - ${u.fname}` : "");

    select.appendChild(opt);
  });
}


function initYearMonthFilters() {
  const yearSel = document.getElementById("saYearFilter");
  const monthSel = document.getElementById("saMonthFilter");

  const now = new Date();
  const currentYear = now.getFullYear();

  yearSel.innerHTML = "";
  monthSel.innerHTML = "";

  for (let y = currentYear; y >= currentYear - 5; y--) {
    yearSel.innerHTML += `<option value="${y}">${y}</option>`;
  }

  const months = [
    "January", "February", "March", "April",
    "May", "June", "July", "August",
    "September", "October", "November", "December"
  ];

  months.forEach((name, index) => {
    monthSel.innerHTML += `
      <option value="${index + 1}">
        ${name}
      </option>
    `;
  });

  monthSel.value = now.getMonth() + 1;
}

function loadSuperAdminTimesheetsSection() {
  initYearMonthFilters();
  loadSuperAdminEmployees();
  loadSuperAdminTimesheets();
}

async function approveSATimesheet(id) {
  await authFetch(
    `http://localhost:5000/api/timesheet/approve/${id}`,
    { method: "POST" }
  );

  if (!res.ok) {
    const err = await res.json();
    alert(err.message || "Approval failed");
    return;
  }

  alert("Timesheet approved");
  loadSuperAdminTimesheets();
}

async function rejectSATimesheet(id) {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  await authFetch(
    `http://localhost:5000/api/timesheet/reject/${id}`,
    {
      method: "POST",
      body: JSON.stringify({ reason })
    }
  );

  if (!res.ok) {
    const err = await res.json();
    alert(err.message || "Rejection failed");
    return;
  }

  alert("Timesheet rejected");
  loadSuperAdminTimesheets();
}

async function overrideSATimesheet(id, currentStatus) {

  if (currentStatus === "APPROVED") {
    const reason = prompt(
      "This timesheet is APPROVED.\nEnter reason to override and REJECT:"
    );
    if (!reason) return;

    await authFetch(
      `http://localhost:5000/api/timesheet/reject/${id}`,
      {
        method: "POST",
        body: JSON.stringify({ reason })
      }
    );

    alert("Timesheet overridden to REJECTED");

  } else if (currentStatus === "REJECTED") {

    const confirmOverride = confirm(
      "This timesheet is REJECTED.\nOverride and APPROVE?"
    );
    if (!confirmOverride) return;

    await authFetch(
      `http://localhost:5000/api/timesheet/approve/${id}`,
      { method: "POST" }
    );

    alert("Timesheet overridden to APPROVED");
  }

  loadSuperAdminTimesheets();
}

async function viewLogs(id) {
  const res = await authFetch(
    `http://localhost:5000/api/timesheet/logs/${id}`
  );

  if (!res.ok) {
    alert("Failed to load history");
    return;
  }

  const logs = await res.json();

  if (!logs.length) {
    alert("No approval history found.");
    return;
  }

  let message = "Approval History:\n\n";

  logs.forEach(l => {
    message += `${l.action} by ${l.emp_id} (${l.modify_role})\n`;
    message += `On: ${new Date(l.action_at).toLocaleString()}\n`;
    if (l.reason) message += `Reason: ${l.reason}\n`;
    message += "\n";
  });

  alert(message);
}