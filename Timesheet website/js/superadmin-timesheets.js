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
      <td>${r.descr || ""}</td>
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