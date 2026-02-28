
function initSuperAdminHolidays() {
  loadHolidayYears();
  toggleHolidayCreateControls();
  loadHolidays();
}

// Load years
function loadHolidayYears() {
  const select = document.getElementById("holidayYearFilter");
  const currentYear = new Date().getFullYear();

  select.innerHTML = "";

  for (let y = currentYear - 2; y <= currentYear + 2; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.textContent = y;
    select.appendChild(opt);
  }

  select.value = currentYear;
}

// Load Holidays
async function loadHolidays() {
  const yearSelect = document.getElementById("holidayYearFilter");
  const year = yearSelect.value || new Date().getFullYear();

  const res = await authFetch(
    `http://localhost:5000/api/holidays/year/${year}`
  );

  if (!res.ok) {
    console.error("Failed to load holidays");
    return;
  }

  const holidays = await res.json();
  renderHolidayTable(holidays);
}

function formatDate(dateStr) {
  const d = new Date(dateStr);
  return d.toISOString().split("T")[0];  // YYYY-MM-DD
}


function renderHolidayTable(holidays) {
  const tbody = document.getElementById("holidayTableBody");
  tbody.innerHTML = "";

  const selectedYear =
    parseInt(document.getElementById("holidayYearFilter").value);
  const currentYear = new Date().getFullYear();

  if (!Array.isArray(holidays) || holidays.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="3" style="text-align:center">
          No holidays found
        </td>
      </tr>
    `;
    return;
  }

  holidays.forEach(h => {
    const tr = document.createElement("tr");
    const isPastYear = selectedYear < currentYear;

    tr.innerHTML = `
      <td>${new Date(h.hol_dt).toLocaleDateString()}</td>
      <td>${h.descr || ""}</td>
      <td>
        ${
          isPastYear
            ? "<span style='color:#888'>Locked</span>"
            : `<button onclick="deleteHoliday(${h.h_id})">Delete</button>`
        }
      </td>
    `;

    tbody.appendChild(tr);
  });
}


// Add holidays
async function addHoliday() {
  const selectedYear =
    parseInt(document.getElementById("holidayYearFilter").value);
  const currentYear = new Date().getFullYear();

  //  HARD STOP for past years
  if (selectedYear < currentYear) {
    alert("Cannot add holidays for past years");
    return;
  }

  const date = document.getElementById("holidayDate").value;
  const desc = document.getElementById("holidayDesc").value;

  if (!date) {
    alert("Please select a date");
    return;
  }

  // Extra safety: date-year validation
  const dateYear = new Date(date).getFullYear();
  if (dateYear !== selectedYear) {
    alert("Holiday date must match selected year");
    return;
  }

  await authFetch("http://localhost:5000/api/holidays", {
    method: "POST",
    body: JSON.stringify({
      hol_dt: date,
      descr: desc || null
    })
  });

  document.getElementById("holidayDate").value = "";
  document.getElementById("holidayDesc").value = "";

  loadHolidays();
}

// Remove the holiday
async function deleteHoliday(h_id) {
  const selectedYear =
    parseInt(document.getElementById("holidayYearFilter").value);
  const currentYear = new Date().getFullYear();

  if (selectedYear < currentYear) {
    alert("Cannot delete holidays from past years");
    return;
  }

  if (!confirm("Remove this holiday?")) return;

  await authFetch(
    `http://localhost:5000/api/holidays/${h_id}`,
    { method: "DELETE" }
  );

  loadHolidays();
}

function onHolidayYearChange() {
  toggleHolidayCreateControls();
  loadHolidays();
}


function toggleHolidayCreateControls() {
  const selectedYear =
    parseInt(document.getElementById("holidayYearFilter").value);
  const currentYear = new Date().getFullYear();

  const dateInput = document.getElementById("holidayDate");
  const descInput = document.getElementById("holidayDesc");
  const addBtn = document.getElementById("addHolidayBtn");

  if (selectedYear < currentYear) {
    dateInput.disabled = true;
    descInput.disabled = true;
    addBtn.disabled = true;

    dateInput.style.display = "none";
    descInput.style.display = "none";
    addBtn.style.display = "none";
  } else {
    dateInput.disabled = false;
    descInput.disabled = false;
    addBtn.disabled = false;

    dateInput.style.display = "inline-block";
    descInput.style.display = "inline-block";
    addBtn.style.display = "inline-block";
  }
}
