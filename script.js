/* ======================================================
   GWTPL Gate Pass — v14.1
   Author: Chander Pal (Custom Version)
   Function: Gate Pass Data Entry + Google Sheet Sync
====================================================== */

let rowCount = 0;

// 🧭 --- CONFIGURATION ---
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/PASTE_YOUR_APPS_SCRIPT_DEPLOYMENT_URL_HERE/exec"; 
// ⬆️ ऊपर अपने Google Apps Script का “Web App URL” डालना है

// 🧩 --- ADD NEW ROW ---
function addRow() {
  const tb = document.getElementById('tbody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td>${++rowCount}</td>
    <td><input placeholder="Item description"></td>
    <td class="col-tag"><input placeholder="Tag No"></td>
    <td class="col-sr"><input placeholder="Sr No"></td>
    <td><input type="number" min="0" value="0" onchange="calcTotal()"></td>
    <td>
      <select>
        <option>Nos</option>
        <option>Kg</option>
        <option>Ltr</option>
      </select>
    </td>
    <td><input placeholder="Remarks"></td>
    <td><button class="btn muted" onclick="removeRow(this)">Remove</button></td>
  `;
  tb.appendChild(tr);
  toggleCols();
  calcTotal();
}

// 🧹 --- REMOVE ROW ---
function removeRow(btn) {
  btn.closest('tr').remove();
  calcTotal();
}

// 👁 --- SHOW / HIDE COLUMNS ---
function toggleCols() {
  const tag = document.getElementById('showTag').checked;
  const sr = document.getElementById('showSr').checked;
  document.querySelectorAll('.col-tag').forEach(c => c.style.display = tag ? '' : 'none');
  document.querySelectorAll('.col-sr').forEach(c => c.style.display = sr ? '' : 'none');
}

// 🔢 --- CALCULATE TOTAL QTY ---
function calcTotal() {
  let t = 0;
  document.querySelectorAll('#tbody tr').forEach(tr => {
    const val = parseFloat(tr.querySelector('td:nth-child(5) input').value) || 0;
    t += val;
  });
  document.getElementById('totalQty').textContent = t;
}

// 🧾 --- COLLECT FORM DATA ---
function collectFormData() {
  const items = [];
  document.querySelectorAll('#tbody tr').forEach(tr => {
    const cells = tr.querySelectorAll('td');
    items.push({
      sr: cells[0].innerText.trim(),
      item: cells[1].querySelector('input').value.trim(),
      tag: cells[2].querySelector('input').value.trim(),
      srno: cells[3].querySelector('input').value.trim(),
      qty: cells[4].querySelector('input').value.trim(),
      unit: cells[5].querySelector('select').value,
      remarks: cells[6].querySelector('input').value.trim()
    });
  });

  return {
    gpNo: document.getElementById('gpNo').value.trim(),
    date: document.getElementById('gpDate').value.trim(),
    type: document.getElementById('gpType').value.trim(),
    consignor: document.getElementById('consignor').value.trim(),
    consignee: document.getElementById('consignee').value.trim(),
    vehicle: document.getElementById('vehicle').value.trim(),
    person: document.getElementById('person').value.trim(),
    authority: document.getElementById('authority').value.trim(),
    remarks: document.getElementById('remarks').value.trim(),
    totalQty: document.getElementById('totalQty').innerText.trim(),
    items,
    savedAt: new Date().toLocaleString()
  };
}

// ✅ --- VALIDATION ---
function validateForm(data) {
  if (!data.consignor) return alert("Please enter Consignor (Godown) name");
  if (!data.date) return alert("Please select Date manually");
  if (data.items.length === 0) return alert("Please add at least one item");
  return true;
}

// 💾 --- SAVE DATA TO GOOGLE SHEET ---
async function saveToSheet() {
  const data = collectFormData();
  if (!validateForm(data)) return;

  try {
    const resp = await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data)
    });

    if (resp.ok) {
      alert("✅ Data Saved to Google Sheet Successfully!");
      saveLocal(data);
      resetForm();
    } else {
      alert("⚠️ Server error — Saved Locally.");
      saveLocal(data);
    }
  } catch (err) {
    console.error("Save failed:", err);
    alert("⚠️ Internet/Server issue — Data saved locally.");
    saveLocal(data);
  }
}

// 💾 --- LOCAL BACKUP ---
function saveLocal(data) {
  const list = JSON.parse(localStorage.getItem("gwtpl_local_backup") || "[]");
  list.unshift(data);
  if (list.length > 100) list.pop();
  localStorage.setItem("gwtpl_local_backup", JSON.stringify(list));
}

// ♻️ --- RESET FORM ---
function resetForm() {
  document.getElementById('consignor').value = '';
  document.getElementById('vehicle').value = '';
  document.getElementById('person').value = '';
  document.getElementById('authority').value = 'Sh.';
  document.getElementById('remarks').value = '';
  document.getElementById('tbody').innerHTML = '';
  rowCount = 0;
  addRow();
  calcTotal();
}

// 🧮 --- DEFAULT INITIALIZATION ---
window.onload = function() {
  addRow();
  document.getElementById('gpDate').value = '';
};

// 🖱 --- OPTIONAL: SAVE BUTTON (Attach this in HTML if needed) ---
// <button class="btn primary" onclick="saveToSheet()">Save to Sheet</button>
