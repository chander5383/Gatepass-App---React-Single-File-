/* Gate Pass v3 script
 * - Save posts JSON to your Apps Script URL
 * - Auto local serial with fallback
 * - Dynamic dropdowns: expects Apps Script GET endpoint to return dropdown reference if available
 * - A4 print + PDF via html2pdf
 */

/* ====== CONFIG ====== */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvsZ8xK0zB92FsZRF6d2ko2zn5qv7UuzL28arXuXuWeWJe_1yi5b0ytqLz9EGpkE-kUQ/exec";
// If you have a GET endpoint to fetch reference data (Cluster/District/Location/Godown) use it here.
// Example expected JSON: [{Cluster:"Cluster-1", District:"Dist-A", Location:"Loc", "Name of Godown":"Godown-X"}, ...]
const REF_DATA_URL = ""; // optional - set if you deploy a GET returning JSON of dropdown rows

/* ====== STATE ====== */
let itemCount = 0;
let items = [];
let passKey = "gwtpl_v3_pass_count";

/* ====== DOM ====== */
const gpNoEl = document.getElementById("gpNo");
const gpDateEl = document.getElementById("gpDate");
const gpTypeEl = document.getElementById("gpType");
const clusterEl = document.getElementById("cluster");
const districtEl = document.getElementById("district");
const locationEl = document.getElementById("location");
const godownEl = document.getElementById("godown");
const godownOtherEl = document.getElementById("godownOther");
const itemsTableBody = document.querySelector("#itemsTable tbody");
const totalQtyEl = document.getElementById("totalQty");
const genTimeEl = document.getElementById("genTime");
const qrBox = document.getElementById("qr");

/* ====== INITIALIZE ====== */
document.addEventListener("DOMContentLoaded", async () => {
  // set date/time now
  const now = new Date();
  gpDateEl.value = toDatetimeLocal(now);

  // try to fetch ref data if available
  if (REF_DATA_URL) {
    try {
      const r = await fetch(REF_DATA_URL);
      const data = await r.json();
      populateRefData(data);
    } catch (e) {
      console.warn("Ref data fetch failed:", e);
      fillDefaultRef();
    }
  } else {
    fillDefaultRef();
  }

  // init items with 1 row
  addItemRow();

  // load passCount from localStorage or initialize
  if (!localStorage.getItem(passKey)) {
    localStorage.setItem(passKey, "1");
  }
  generateGatePassNo();

  // set generated time text
  genTimeEl.innerText = formatDateTime(new Date());

  // bind buttons
  document.getElementById("addRow").addEventListener("click", addItemRow);
  document.getElementById("clearItems").addEventListener("click", clearItems);
  document.getElementById("saveBtn").addEventListener("click", saveAndNew);
  document.getElementById("printBtn").addEventListener("click", () => window.print());
  document.getElementById("pdfBtn").addEventListener("click", downloadPdf);

  // cluster change chaining
  clusterEl.addEventListener("change", onClusterChange);
  districtEl.addEventListener("change", onDistrictChange);
  godownEl.addEventListener("change", onGodownChange);
});

/* ====== REF DATA population fallback ====== */
function fillDefaultRef(){
  // fallback clusters/godowns — you can adjust or load REF_DATA_URL
  const rows = [
    {Cluster:"Cluster-1", District:"Abohar", Location:"Abohar", "Name of Godown":"Abohar Godown 1"},
    {Cluster:"Cluster-1", District:"Abohar", Location:"Abohar", "Name of Godown":"Abohar Godown 2"},
    {Cluster:"Cluster-2", District:"Muktsar", Location:"Muktsar", "Name of Godown":"Muktsar Godown 1"},
    {Cluster:"Cluster-3", District:"Malout", Location:"Malout", "Name of Godown":"Malout Godown 1"}
  ];
  populateRefData(rows);
}

function populateRefData(rows){
  // build unique cluster list
  const clusters = [...new Set(rows.map(r => r.Cluster))];
  clusterEl.innerHTML = "<option value=''>--Select Cluster--</option>";
  clusters.forEach(c => clusterEl.appendChild(optionEl(c)));

  // store rows for filtering
  window._refRows = rows;
}

function optionEl(val){ const o = document.createElement("option"); o.value = val; o.textContent = val; return o; }

function onClusterChange(){
  const cl = clusterEl.value;
  districtEl.innerHTML = "<option value=''>--Select District--</option>";
  locationEl.innerHTML = "<option value=''>--Select Location--</option>";
  godownEl.innerHTML = "<option value=''>--Select Godown--</option>";
  godownOtherEl.style.display = "none";

  if (!cl) return;
  const rows = (window._refRows||[]).filter(r=>r.Cluster===cl);
  const districts = [...new Set(rows.map(r=>r.District))];
  districts.forEach(d=>districtEl.appendChild(optionEl(d)));
}

function onDistrictChange(){
  const cl = clusterEl.value, dist = districtEl.value;
  locationEl.innerHTML = "<option value=''>--Select Location--</option>";
  godownEl.innerHTML = "<option value=''>--Select Godown--</option>";
  godownOtherEl.style.display = "none";

  if (!dist) return;
  const rows = (window._refRows||[]).filter(r=>r.Cluster===cl && r.District===dist);
  const locs = [...new Set(rows.map(r=>r.Location))];
  locs.forEach(l=>locationEl.appendChild(optionEl(l)));
}

function onGodownChange(){
  const cl = clusterEl.value, dist = districtEl.value, loc = locationEl.value;
  godownOtherEl.style.display = "none";
  const rows = (window._refRows||[]).filter(r=>r.Cluster===cl && r.District===dist && r.Location===loc);
  const godowns = [...new Set(rows.map(r=>r["Name of Godown"]))];
  godownEl.innerHTML = "<option value=''>--Select Godown--</option>";
  godowns.forEach(g=>godownEl.appendChild(optionEl(g)));
  // add Other option
  const other = optionEl("Other");
  godownEl.appendChild(other);
  godownEl.addEventListener("change", ()=>{
    if (godownEl.value==="Other") godownOtherEl.style.display = "block";
    else godownOtherEl.style.display = "none";
  }, {once:true});
}

/* ====== Item rows handling ====== */
function addItemRow(prefill = {}) {
  itemCount++;
  const tr = document.createElement("tr");
  tr.dataset.idx = itemCount;
  tr.innerHTML = `
    <td class="cell-sr">${itemCount}</td>
    <td><input class="item-desc item-input" placeholder="Item description" value="${escapeHtml(prefill.item||'')}"></td>
    <td><input class="item-qty item-input" type="number" min="0" value="${prefill.qty||''}"></td>
    <td>
      <select class="item-unit item-input">
        <option>Nos</option><option>Kg</option><option>Ltr</option><option>Bag</option><option>Box</option><option>Other</option>
      </select>
    </td>
    <td><input class="item-remarks item-input" placeholder="Remarks (optional)" value="${escapeHtml(prefill.remarks||'')}"></td>
    <td><button type="button" class="remove-btn">Remove</button></td>
  `;
  itemsTableBody.appendChild(tr);

  // bind remove
  tr.querySelector(".remove-btn").addEventListener("click", ()=>{ tr.remove(); renumberItems(); computeTotal(); });

  // update totals on qty change
  tr.querySelector(".item-qty").addEventListener("input", computeTotal);
  renumberItems();
  computeTotal();
}

function renumberItems(){
  let i=1;
  document.querySelectorAll("#itemsTable tbody tr").forEach(tr=>{
    tr.querySelector(".cell-sr").textContent = i++;
  });
  itemCount = i-1;
}

function clearItems(){
  itemsTableBody.innerHTML = "";
  itemCount = 0;
  addItemRow();
  computeTotal();
}

function computeTotal(){
  let sum = 0;
  document.querySelectorAll(".item-qty").forEach(inp=>{
    const v = parseFloat(inp.value) || 0;
    sum += v;
  });
  totalQtyEl.textContent = sum;
}

/* ====== Gate Pass No generation ====== */
function generateGatePassNo(){
  // try to get from localStorage counter
  let cnt = parseInt(localStorage.getItem(passKey) || "1",10);
  const year = new Date().getFullYear();
  const serial = String(cnt).padStart(3,"0");
  gpNoEl.textContent = `GWTPL/ABO/${year}/${serial}`;
}

function incrementLocalPass(){
  let cnt = parseInt(localStorage.getItem(passKey) || "1",10);
  cnt = cnt + 1;
  localStorage.setItem(passKey, String(cnt));
  generateGatePassNo();
}

/* ====== Save -> POST to Apps Script ====== */
async function saveAndNew(){
  // validation
  if (!validateForm()) return;

  // build payload
  const payload = buildPayload();

  // disable save button to prevent double submits
  const saveBtn = document.getElementById("saveBtn");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    // POST to Apps Script (no-cors may return opaque response)
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: { "Content-Type":"application/json" },
      body: JSON.stringify(payload),
      mode: "no-cors"
    });

    // success feedback
    alert("✅ Gate Pass saved to Google Sheet.");
    // increment local serial & reset form
    incrementLocalPass();
    resetForm();
  } catch (err) {
    console.error(err);
    alert("⚠️ Save failed (network). Data saved locally as backup.");
    // save to localStorage backup
    const backup = JSON.parse(localStorage.getItem("gwtpl_v3_backups")||"[]");
    backup.push(payload);
    localStorage.setItem("gwtpl_v3_backups", JSON.stringify(backup));
    incrementLocalPass();
    resetForm();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save & New";
  }
}

function validateForm(){
  // require at least one item with name and qty
  const hasItem = Array.from(document.querySelectorAll("#itemsTable tbody tr")).some(tr=>{
    const name = tr.querySelector(".item-desc").value.trim();
    const qty = tr.querySelector(".item-qty").value.trim();
    return name && qty;
  });
  if (!hasItem){ alert("Please add at least one item with quantity."); return false; }

  if (!clusterEl.value){ if(!confirm("No Cluster selected. Continue?")) return false; }
  if (!godownEl.value && !godownOtherEl.value){ if(!confirm("No Godown selected. Continue?")) return false; }
  return true;
}

function buildPayload(){
  const itemsArr = Array.from(document.querySelectorAll("#itemsTable tbody tr")).map(tr=>{
    return {
      sr: tr.querySelector(".cell-sr").textContent,
      item: tr.querySelector(".item-desc").value.trim(),
      qty: tr.querySelector(".item-qty").value.trim(),
      unit: tr.querySelector(".item-unit").value,
      remarks: tr.querySelector(".item-remarks").value.trim()
    };
  });

  const godownVal = (godownEl.value === "Other") ? (godownOtherEl.value.trim() || "Other") : (godownEl.value || godownOtherEl.value || "");

  const payload = {
    gatePassNo: gpNoEl.textContent,
    dateTime: gpDateEl.value || new Date().toISOString(),
    type: gpTypeEl.value,
    cluster: clusterEl.value || "",
    district: districtEl.value || "",
    location: locationEl.value || "",
    godown: godownVal,
    consignee: document.getElementById("consignee").value,
    vehicleNo: document.getElementById("vehicleNo").value.trim(),
    personName: document.getElementById("personName").value.trim(),
    refNo: document.getElementById("refNo").value.trim(),
    generalRemarks: document.getElementById("generalRemarks").value.trim(),
    items: itemsArr,
    totalQty: totalQtyEl.textContent,
    outwardRegNo: document.getElementById("outwardRegNo").value.trim(),
    outwardDate: document.getElementById("inwardDate").value || "",
    securityName: document.getElementById("securityName").value.trim(),
    issuedBy: document.getElementById("issueName").value.trim(),
    issuedDesg: document.getElementById("issueDesg").value.trim(),
    issueDateTime: document.getElementById("issueDt").value || "",
    generatedAt: new Date().toISOString()
  };

  // set QR
  setQRCode(`${payload.gatePassNo}|${payload.dateTime}|${payload.godown}|${itemsArr.length}`);
  return payload;
}

/* ====== RESET FORM ====== */
function resetForm(){
  // reset items and inputs (keep date)
  clearItems();
  document.getElementById("generalRemarks").value = "";
  document.getElementById("vehicleNo").value = "";
  document.getElementById("personName").value = "";
  document.getElementById("refNo").value = "";
  document.getElementById("outwardRegNo").value = "";
  document.getElementById("inwardDate").value = "";
  document.getElementById("securityName").value = "";
  document.getElementById("issueName").value = "";
  document.getElementById("issueDesg").value = "";
  document.getElementById("issueDt").value = "";
  // regenerate time and gp no shown set by local increment
  gpDateEl.value = toDatetimeLocal(new Date());
  genTimeEl.innerText = formatDateTime(new Date());
  // regenerate QR placeholder
  setQRCode("");
}

/* ====== QR ====== */
function setQRCode(text){
  qrBox.innerHTML = "";
  const qr = new QRious({element: document.createElement("canvas"), value: text || " ", size: 110});
  qrBox.appendChild(qr.element);
}

/* ====== PDF Download (html2pdf) ====== */
function downloadPdf(){
  // print only the gatepass element, single page A4
  const element = document.getElementById("gatepass");
  const opt = {
    margin:       [0.4,0.6,0.4,0.6], // inches approx top,right,bottom,left
    filename:     `${gpNoEl.textContent || 'gatepass'}.pdf`,
    image:        { type: 'jpeg', quality: 0.98 },
    html2canvas:  { scale: 2, useCORS: true },
    jsPDF:        { unit: 'in', format: 'a4', orientation: 'portrait' }
  };
  html2pdf().set(opt).from(element).save();
}

/* ====== HELPERS ====== */
function toDatetimeLocal(date){
  const pad = n => String(n).padStart(2,'0');
  return `${date.getFullYear()}-${pad(date.getMonth()+1)}-${pad(date.getDate())}T${pad(date.getHours())}:${pad(date.getMinutes())}`;
}
function formatDateTime(d){
  if(!d) return "";
  return `${d.toLocaleDateString()} ${d.toLocaleTimeString()}`;
}
function escapeHtml(s){ return (s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;'); }
