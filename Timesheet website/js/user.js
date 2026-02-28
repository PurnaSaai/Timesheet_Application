/* AUTH & ROLE PROTECTION */

if (
  !localStorage.getItem("token") ||
  localStorage.getItem("role") !== "USER"
) {
  window.location.href = "index.html";
}

/* LOGOUT */
function logout() {
  localStorage.clear();
  window.location.href = "index.html";
}

/* GLOBAL STATE */
let activeRow = null;
let timerInterval = null;
let monthlySpentMinutes = 0;
let currentTimesheetId = null;
let dayLocked = false;

function toMySQLLocalDateTime(date) {
  const pad = n => String(n).padStart(2, "0");

  return (
    date.getFullYear() + "-" +
    pad(date.getMonth() + 1) + "-" +
    pad(date.getDate()) + " " +
    pad(date.getHours()) + ":" +
    pad(date.getMinutes()) + ":" +
    pad(date.getSeconds())
  );
}



function formatTime(timeStr) {
  if (!timeStr) return "-";
  return timeStr.substring(11, 16);
}




/* INITIALIZE USER PAGE */
async function initUserPage() {
  if (!localStorage.getItem("token")) {
    window.location.href = "index.html";
    return;
  }
  // 1. Populate month dropdown FIRST
  loadMonths();
  // 2. Calculate expected hours AFTER dropdown exists
  calculateExpectedHours();
  // 3. Initialize totals
  updateSpentHours();
  // 4. Create or fetch timesheet
  const today = new Date().toLocaleDateString("en-CA");

  const res = await authFetch(
    "http://localhost:5000/api/timesheet/create",
    {
      method: "POST",
      body: JSON.stringify({ work_dt: today })
    }
  );

  const data = await res.json();
  currentTimesheetId = data.ts_id;

}




async function loadUserDetails() {
  try {
    const res = await authFetch("http://localhost:5000/api/auth/me");
    const user = await res.json();

    const empIdEl = document.getElementById("empId");
    const empNameEl = document.getElementById("empName");
    const desigEl = document.getElementById("designation");

    if (!empIdEl || !empNameEl || !desigEl) {
      console.error("Employee DOM elements missing");
      return;
    }

    empIdEl.innerText = user.emp_id || "-";
    empNameEl.innerText = user.fname || "Not Assigned";
    desigEl.innerText = user.desg || "Not Assigned";

  } catch (err) {
    console.error("Failed to load user details", err);
  }
}


/* MONTH SETUP */
function loadMonths() {
  const select = document.getElementById("monthSelect");
  if (!select) {
    console.error("monthSelect not found");
    return;
  }
  select.innerHTML = "";
  const now = new Date();
  const year = now.getFullYear();
  for (let i = 0; i < 12; i++) {
    const date = new Date(year, i);
    const option = document.createElement("option");
    option.value = i;
    option.textContent = date.toLocaleString("default", { month: "long" });

    if (i === now.getMonth()) {
      option.selected = true;
    }
    select.appendChild(option);
  }
}

function changePeriod() {
  const year = Number(document.getElementById("yearSelect").value);
  const month = Number(document.getElementById("monthSelect").value) + 1;

  loadMonthlyTimesheets(year, month);
  calculateExpectedHours(year, month);
}


function changeMonth() {
  document.getElementById("tableBody").innerHTML = "";
  document.getElementById("addEntryBox").style.display = "block";
  activeRow = null;
  monthlySpentMinutes = 0;

  updateSpentHours();
  calculateExpectedHours();
  dayLocked = false;

}

// Notification
async function loadNotifications() {
  const res = await authFetch("http://localhost:5000/api/notifications");
  const data = await res.json();

  const box = document.getElementById("notificationBox");
  const count = document.getElementById("notifyCount");

  box.innerHTML = "";

  count.innerText = data.length;
  count.style.display = data.length ? "inline-block" : "none";

  data.forEach(n => {
    const div = document.createElement("div");
    div.className = "notification-item";
    div.innerText = n.msg;
    div.onclick = () => markRead(n.notif_id);
    box.appendChild(div);
  });
}

async function markRead(id) {
  await authFetch(
    `http://localhost:5000/api/notifications/read/${id}`,
    { method: "POST" }
  );

  loadNotifications();
}

function toggleNotifications() {
  const box = document.getElementById("notificationBox");
  box.style.display = box.style.display === "block" ? "none" : "block";
}


// function renderNotifications() {
//   const box = document.getElementById("notifList");
//   box.innerHTML = "";

//   if (!notifications.length) {
//     box.innerHTML = `<div class="notif-item">No notifications</div>`;
//     return;
//   }

//   notifications.forEach(n => {
//     const div = document.createElement("div");
//     div.className = "notif-item " + (!n.is_read ? "notif-unread" : "");
//     div.onclick = () => openNotification(n);

//     div.innerHTML = `
//       <div class="notif-title">${n.title}</div>
//       <div class="notif-msg">${n.message}</div>
//       <div class="notif-time">
//         ${new Date(n.created_at).toLocaleString()}
//       </div>
//     `;

//     box.appendChild(div);
//   });
// }




// Load years

function loadYears() {
  const yearSelect = document.getElementById("yearSelect");

  if (!yearSelect) {
    console.error("yearSelect dropdown not found");
    return;
  }

  const currentYear = new Date().getFullYear();

  for (let y = 2020; y <= currentYear; y++) {
    const opt = document.createElement("option");
    opt.value = y;
    opt.text = y;
    if (y === currentYear) opt.selected = true;
    yearSelect.appendChild(opt);
  }
}



/* EXPECTED HOURS */
async function calculateExpectedHours() {
  const yearEl = document.getElementById("yearSelect");
  const monthEl = document.getElementById("monthSelect");

  if (!yearEl || !monthEl) {
    console.error("Year or Month dropdown missing");
    return;
  }

  const year = Number(yearEl.value);
  const month = Number(monthEl.value) + 1;

  let holidaySet = new Set();

  try {
    const res = await authFetch(
      `http://localhost:5000/api/holidays/month/${year}/${month}`
    );

    const rows = await res.json();
    holidaySet = new Set(rows.map(h => h.hol_dt));
  } catch (err) {
    console.error("Holiday fetch failed:", err);
  }

  const daysInMonth = new Date(year, month, 0).getDate();
  let minutes = 0;

  for (let day = 1; day <= daysInMonth; day++) {
    const date = new Date(year, month - 1, day);
    const weekday = date.getDay();

    // FIXED — LOCAL DATE STRING 
    const dateStr = date.toLocaleDateString("en-CA");

    if (holidaySet.has(dateStr)) continue;

    if (weekday >= 1 && weekday <= 5) minutes += 510;
    else if (weekday === 6) minutes += 360;
  }

  document.getElementById("totalHours").innerText =
    (minutes / 60).toFixed(2);
}


// Get present month data
async function loadMonthlyTimesheets() {
  const year = document.getElementById("yearSelect").value;
  const month = Number(document.getElementById("monthSelect").value) + 1;

  const res = await authFetch(
    `http://localhost:5000/api/timesheet/month/${year}/${month}`
  );


  const rows = await res.json();

  renderMonthlyRows(rows);
}

function addDateHeaderRow(dateStr) {
  const tbody = document.getElementById("tableBody");

  const tr = document.createElement("tr");
  tr.className = "date-header-row";

  tr.innerHTML = `
    <td colspan="7" style="background:#f3f4f6;font-weight:600">
      ${dateStr}
    </td>
  `;

  tbody.appendChild(tr);
}

function renderMonthlyRows(rows) {
  const tbody = document.getElementById("tableBody");
  tbody.innerHTML = "";

  let lastDate = null;
  monthlySpentMinutes = 0;

  activeRow = null;   // reset on every reload

  rows.forEach(r => {
    const displayDate = formatDateOnly(r.work_dt);

    if (displayDate !== lastDate) {
      addDateHeaderRow(displayDate);
      lastDate = displayDate;
    }

    if (!r.te_id) return;

    const tr = document.createElement("tr");

    const isRunning = r.start_at && !r.end_at;

    const hours = isRunning
      ? "Running..."
      : calculateHours(r.start_at, r.end_at);

    tr.dataset.entryId = r.te_id;

    tr.innerHTML = `
      <td>${displayDate}</td>
      <td>${r.ur_type}</td>
      <td>${r.descr}</td>
      <td>-</td>
      <td>
        ${isRunning
          ? `<button onclick="finishExisting(${r.te_id}, this)">Finish</button>`
          : "-"}
      </td>
      <td>
        ${formatTime(r.start_at)}
        ${r.end_at ? " - " + formatTime(r.end_at) : " - Running"}
      </td>
      <td class="time-spent">${hours}</td>
    `;

    tbody.appendChild(tr);

    if (!isRunning) {
      monthlySpentMinutes += Number(hours) * 60;
    }

    // Resume ONLY if DB says running
  if (r.start_at && !r.end_at) {
    activeRow = tr;
    tr.dataset.entryId = r.te_id;
    tr.startTime = parseMySQLDateTime(r.start_at);

    const finishBtn = tr.querySelector("button");
    if (finishBtn) finishBtn.disabled = false;

    lockRowInputs(tr);

    resumeTimer(tr, r.start_at);
  }

  });

  updateSpentHours();
}




async function finishExisting(entryId, btn) {
  const endTime = toMySQLLocalDateTime(new Date());

  await authFetch(
    `http://localhost:5000/api/timesheet/entry/finish/${entryId}`,
    {
      method: "POST",
      body: JSON.stringify({ end_at: endTime })
    }
  );

  clearInterval(timerInterval);
  timerInterval = null;
  activeRow = null;

  loadMonthlyTimesheets();
}


function parseMySQLDateTime(str) {
  const [date, time] = str.split(" ");
  const [y, m, d] = date.split("-");
  const [hh, mm, ss] = time.split(":");
  return new Date(y, m - 1, d, hh, mm, ss);
}


function resumeTimer(row, startTimeStr) {
  activeRow = row;
  row.startTime = parseMySQLDateTime(startTimeStr);

  timerInterval = setInterval(() => {
    const diffMin = (new Date() - row.startTime) / 60000;
    row.querySelector(".time-spent").innerText =
      (diffMin / 60).toFixed(2);
  }, 1000);
}





function lockRowInputs(row) {
  row.querySelectorAll("input, textarea").forEach(el => {
    el.readOnly = true;
    el.style.background = "#f1f5f9";
  });
}


function formatDateOnly(dateStr) {
  return dateStr.split("T")[0];
}



function calculateHours(start, end) {
  const diffMs = new Date(end) - new Date(start);
  const diffMinutes = diffMs / 60000;

  // If less than 1 minute → show 0.00
  if (diffMinutes < 1) return "0.00";

  const hours = diffMinutes / 60;
  return hours.toFixed(2);
}



/* ADD ENTRY */
function handleAddEntry() {
  if (dayLocked) {
    alert("This day is already marked as Leave/Holiday");
    return;
  }
  document.getElementById("addEntryBox").style.display = "none";
  addRow();
}

function addRow() {
  if (activeRow) return;

  const row = document.createElement("tr");

  row.innerHTML = `
    <td>${new Date().toLocaleDateString()}</td>
    <td>
      <div class="uri-wrapper">
        <input oninput="validateRow(this)">
        <div class="uri-dropdown">
          <div onclick="selectURI(this)" style="cursor: pointer">Break</div>
          <div onclick="selectURI(this)" style="cursor: pointer">Meeting</div>
          <div onclick="selectURI(this)" style="cursor: pointer">Leave</div>
          <div onclick="selectURI(this)" style="cursor: pointer">Holiday</div>
          <div onclick="selectURI(this)" style="cursor: pointer">Others</div>
        </div>
      </div>
    </td>
    <td>
      <textarea class="desc-input"
        oninput="autoGrow(this); validateRow(this)">
      </textarea>
    </td>
    <td>
      <button class="start-btn" disabled onclick="startTimer(this)">Start</button>
    </td>
    <td>
      <button class="finish-btn" disabled style="display:none">Finish</button>
    </td>
    <td class="start-finish">—</td>
    <td class="time-spent">0.00</td>
  `;

  const finishBtn = row.querySelector(".finish-btn");
  finishBtn.addEventListener("click", () => finishTimer(finishBtn));

  document.getElementById("tableBody").appendChild(row);
}

/* UI HELPERS */
function autoGrow(el) {
  el.style.height = "auto";
  el.style.height = el.scrollHeight + "px";
}

function validateRow(el) {
  const row = el.closest("tr");

  if (activeRow === row) return;
  if(row.dataset.running === "true") return;

  const uriType =
    row.dataset.uriType ||
    row.querySelector(".uri-wrapper input")?.value?.trim()?.toUpperCase();

  const desc = row.querySelector(".desc-input").value.trim();

  const startBtn = row.querySelector(".start-btn");
  const finishBtn = row.querySelector(".finish-btn");

  startBtn.disabled = true;
  finishBtn.disabled = true;

  if (!uriType) return;

  row.dataset.uriType = uriType;

  // Leave → no timer, description required
  if (uriType === "LEAVE") {
    finishBtn.disabled = !desc;
    return;
  }

  // Holiday → no timer, no description required
  if (uriType === "HOLIDAY") {
    finishBtn.disabled = false;
    return;
  }

  // Normal work entries → need description + uri
  startBtn.disabled = !(desc && uriType);
}




function toggleDropdown(el) {
  const row = el.closest("tr");

  if (row.dataset.completed === "true") return; //  block

  el.nextElementSibling.style.display = "block";
}



function selectURI(el) {
  const row = el.closest("tr");
  const input = row.querySelector(".uri-wrapper input");
  const value = el.innerText.trim();

  el.parentElement.style.display = "none";

  // Store controlled URI type
  row.dataset.uriType = value.toUpperCase();

  if (value === "Others") {
    input.value = "";
    input.readOnly = false;
    input.focus();
  } else {
    input.value = value;
    input.readOnly = true;
  }

  validateRow(input);
}



function completeLeaveRow(row) {
  const desc = row.querySelector(".desc-input").value.trim();

  if (!desc) {
    alert("Please enter description for Leave");
    return;
  }

  row.querySelector(".time-spent").innerText = "0.00";
  row.dataset.completed = "true";
  lockRow(row);
  activeRow = null;
}

async function saveLeaveEntry(row) {
  if (!currentTimesheetId) {
    alert("Timesheet not initialized");
    return;
  }

  const description = row.querySelector(".desc-input").value.trim();

  try {
    await authFetch(
      `http://localhost:5000/api/timesheet/entry/${currentTimesheetId}`,
      {
        method: "POST",
        body: JSON.stringify({
          ur_type: "LEAVE",
          ur_custom: null,
          descr,
          start_at: null,
          end_at: null
        })
      }
    );
  } catch (err) {
    alert("Failed to save Leave entry");
    throw err;
  }
}


/* TIMER */
async function startTimer(btn) {
  if (activeRow) {
    alert("Finish current entry first");
    return;
  }

  const row = btn.closest("tr");
  const uriType = row.dataset.uriType;
  const desc = row.querySelector(".desc-input").value.trim();

  if (!uriType || !desc) {
    alert("Please select URI and enter description");
    return;
  }

  const payload = {
    ur_type: uriType,
    ur_custom: null,
    descr: desc,
    start_at: toMySQLLocalDateTime(new Date()),
    end_at: null
  };

  console.log(" START payload:", payload);

  let res;
  try {
    res = await authFetch(
      `http://localhost:5000/api/timesheet/entry/${currentTimesheetId}`,
      {
        method: "POST",
        body: JSON.stringify(payload)
      }
    );
  } catch (err) {
    console.error(" API CALL FAILED", err);
    alert("Server error — start failed");
    return;
  }

  const data = await res.json();
  console.log(" START response:", data);

  if (!res.ok) {
    alert(data.message || "Failed to start task");
    return;
  }

  if (!data.te_id) {
    alert("Task started but no entry id returned!");
    return;
  }

  row.dataset.entryId = data.te_id;

  row.dataset.running="true";

  activeRow = row;
  row.startTime = new Date();

  btn.disabled = true;
  btn.style.display="none";
  row.querySelector(".finish-btn").disabled = false;
  row.querySelector(".finish-btn").style.display="inline-block";

  lockRowInputs(row);

  timerInterval = setInterval(() => {
    const diffMin = (new Date() - row.startTime) / 60000;
    row.querySelector(".time-spent").innerText =
      (diffMin / 60).toFixed(2);
  }, 1000);
}


async function finishTimer(btn) {
  if (!currentTimesheetId) {
    alert("Timesheet not initialized");
    return;
  }

  const row = btn.closest("tr");
  const uriType = row.dataset.uriType;
  const desc = row.querySelector(".desc-input").value.trim();

  if (!uriType) return;

  // Leave validation
  if (uriType === "LEAVE" && !desc) {
    alert("Please enter description for Leave");
    return;
  }

  let startTime = null;
  let endTime = null;
  let timeSpent = 0;

  if (!["LEAVE", "HOLIDAY"].includes(uriType)) {
    if (!row.startTime) return;

    clearInterval(timerInterval);
    timerInterval = null;

    startTime = row.startTime;
    endTime = new Date();

    const diffMin = (endTime - startTime) / 60000;
    timeSpent = diffMin / 60;

    row.querySelector(".time-spent").innerText = timeSpent.toFixed(2);
    monthlySpentMinutes += diffMin;
    updateSpentHours();

    row.querySelector(".start-finish").innerText +=
      endTime.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
  }
 
  else {
    row.querySelector(".time-spent").innerText = "0.00";
    dayLocked = true;
    document.getElementById("addEntryBox").style.display = "none";
  }


  await authFetch(
    `http://localhost:5000/api/timesheet/entry/${currentTimesheetId}`,
    {
      method: "POST",
      body: JSON.stringify({
        ur_type: uriType,
        ur_custom:
          uriType === "OTHERS"
            ? row.querySelector(".uri-wrapper input").value
            : null,
        descr: desc,
        start_at: startTime ? toMySQLLocalDateTime(startTime) : null,
        end_at: endTime ? toMySQLLocalDateTime(endTime) : null
      })
    }
  );

  row.dataset.completed = "true";
  delete row.dataset.running;
  lockRow(row);
  activeRow = null;

}




/* TOTALS */
function updateSpentHours() {
  document.getElementById("spentHours").innerText =
    (monthlySpentMinutes / 60).toFixed(2);
}

function lockRow(row) {
  row.querySelectorAll("input, textarea, button")
    .forEach(el => el.disabled = true);
}

/* SUBMIT DAY */
async function submitDay() {
  if (!currentTimesheetId) {
    alert("Timesheet not initialized. Please reload.");
    return;
  }

  if (activeRow) {
    alert("Finish current entry first");
    return;
  }

  if (!confirm("Submit today's timesheet?")) return;

  await authFetch(
    `http://localhost:5000/api/timesheet/submit/${currentTimesheetId}`,
    { method: "POST" }
  );

  alert("Timesheet submitted successfully");
}



document.addEventListener("DOMContentLoaded", async () => {

  await loadUserDetails();

  loadYears();
  loadMonths();
  loadNotifications();

  await initUserPage();

  changePeriod();  // ← single controlled data load
});



