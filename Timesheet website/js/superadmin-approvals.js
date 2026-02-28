async function loadApprovals() {
  const res = await authFetch(
    "http://localhost:5000/api/super-admin/approvals"
  );

  const users = await res.json();
  const tbody = document.getElementById("approvalsTableBody");
  tbody.innerHTML = "";

  if (!Array.isArray(users) || users.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="5" style="text-align:center">
          No pending approvals
        </td>
      </tr>
    `;
    return;
  }

  users.forEach(u => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${u.emp_id}</td>
      <td>${u.fname || "-"}</td>
      <td>${u.desg || "-"}</td>
      <td>${u.role}</td>
      <td>
        <button onclick="approveAccount(${u.uid})">Approve</button>
        <button onclick="rejectAccount(${u.uid})">Reject</button>
      </td>
    `;

    tbody.appendChild(tr);
  });
}

async function approveAccount(uid) {
  await authFetch(
    `http://localhost:5000/api/super-admin/approvals/${uid}/approve`,
    { method: "POST" }
  );

  loadApprovals();
  loadApprovalHistory();
  loadApprovalBadge();
}

async function rejectAccount(uid) {
  const reason = prompt("Enter rejection reason:");
  if (!reason) return;

  await authFetch(
    `http://localhost:5000/api/super-admin/approvals/${uid}/reject`,
    {
      method: "POST",
      body: JSON.stringify({ reason })
    }
  );
  loadApprovals();
  loadApprovalHistory();
  loadApprovalBadge();
}

async function loadApprovalHistory() {
  const res = await authFetch(
    "http://localhost:5000/api/super-admin/approvals/history"
  );

  const rows = await res.json();
  const tbody = document.getElementById("approvalHistoryBody");
  tbody.innerHTML = "";

  if (!Array.isArray(rows) || rows.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" style="text-align:center">
          No history available
        </td>
      </tr>
    `;
    return;
  }

  rows.forEach(r => {
    const tr = document.createElement("tr");

    tr.innerHTML = `
      <td>${r.target_emp}</td>
      <td>${r.tar_role}</td>
      <td>${r.action}</td>
      <td>${r.reason || "-"}</td>
      <td>${r.approved_by} (${r.appr_by_role})</td>
      <td>${new Date(r.appr_at).toLocaleString()}</td>
    `;

    tbody.appendChild(tr);
  });
}