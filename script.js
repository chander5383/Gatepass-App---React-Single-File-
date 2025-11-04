/* script.js - Final Gate Pass v3 behaviour
   Put this file alongside index.html and style.css
   Edit APPS_SCRIPT_URL and REF_DATA_URL as needed.
*/

/* ===== CONFIG ===== */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzvsZ8xK0zB92FsZRF6d2ko2zn5qv7UuzL28arXuXuWeWJe_1yi5b0ytqLz9EGpkE-kUQ/exec";
// Optional: a CSV / JSON endpoint that returns reference rows for dropdowns.
// If you have published the sheet as CSV, set REF_DATA_URL to that csv link.
// Example (replace with your published csv if available):
const REF_DATA_URL = ""; // e.g. "https://docs.google.com/spreadsheets/d/e/XXX/pub?output=csv";

/* ===== STATE ===== */
const PASS_KEY = "gwtpl_v3_pass_count";
let itemIdCounter = 0;
let refRows = []; // will hold objects {Cluster, District, Location, "Name of Godown"}

/* ===== DOM ===== */
const gpNoEl = document.getElementById("gatePassNo");
const issueDateEl = document.getElementById("issueDate");
const clusterEl = document.getElementById("cluster");
const districtEl = document.getElementById("district");
const locationEl = document.getElementById("location");
const consignorEl = document.getElementById("consignor");
const godownOtherEl = document.getElementById("godownOther");
const itemsTbody = document.querySelector("#itemTable tbody");
const includeSerialTagCheckbox = document.getElementById("includeSerialTag");
const serialNoInput = document.getElementById("serialNo");
const tagNoInput = document.getElementById("tagNo");
const qrBox = document.getElementById("qr");

/* ===== INIT ===== */
document.addEventListener("DOMContentLoaded", async () => {
  // set issue date default to today
  const today = new Date();
  issueDateEl.valueAsDate = today;

  // init pass counter if not present
  if (!localStorage.getItem(PASS_KEY)) localStorage.setItem(PASS_KEY, "1");

  // fetch/ref data
  if (REF_DATA_URL) {
    try {
      const res = await fetch(REF_DATA_URL);
      const text = await res.text();
      parseCsvRef(text);
      populateCluster();
    } catch (e) {
      console.warn("REF_DATA_URL fetch failed, using fallback", e);
      useFallbackRef();
      populateCluster();
    }
  } else {
    useFallbackRef();
    populateCluster();
  }

  // initial item row
  addItemRow();

  // initial gp no
  generateGatePassNo();

  // events
  document.getElementById("addItem").addEventListener("click", onAddItemClick);
  document.getElementById("save").addEventListener("click", onSaveClick);
  document.getElementById("print").addEventListener("click", () => window.print());
  includeSerialTagCheckbox && includeSerialTagCheckbox.addEventListener("change", onToggleSerialTag);

  clusterEl.addEventListener("change", onClusterChange);
  districtEl.addEventListener("change", onDistrictChange);
  locationEl.addEventListener("change", onLocationChange);
});

/* ===== REF DATA HELPERS ===== */
function parseCsvRef(csvText) {
  // expects header: Cluster,District,IIFSM NF Code,Location,Name of Godown
  const lines = csvText.trim().split(/\r?\n/).map(l=>l.trim()).filter(Boolean);
  if (lines.length < 2) return useFallbackRef();
  const headers = lines[0].split(",").map(h=>h.trim());
  refRows = lines.slice(1).map(line=>{
    const cols = line.split(",");
    const obj = {};
    headers.forEach((h,i)=> obj[h] = (cols[i]||"").trim());
    // normalize keys if different
    if (!obj["Name of Godown"] && obj["Name_of_Godown"]) obj["Name of Godown"] = obj["Name_of_Godown"];
    return obj;
  });
}

function useFallbackRef(){
  refRows = [
    { Cluster: "Cluster-1", District: "Abohar", "IIFSM NF Code": "", Location: "Abohar", "Name of Godown": "Abohar Godown 1" },
    { Cluster: "Cluster-1", District: "Abohar", "IIFSM NF Code": "", Location: "Abohar", "Name of Godown": "Abohar Godown 2" },
    { Cluster: "Cluster-3", District: "Malout", "IIFSM NF Code": "", Location: "Malout", "Name of Godown": "Malout Godown 1" },
    { Cluster: "Cluster-2", District: "Muktsar", "IIFSM NF Code": "", Location: "Muktsar", "Name of Godown": "Muktsar Godown 1" }
  ];
}

/* ===== DROPDOWN POPULATION ===== */
function populateCluster(){
  const clusters = [...new Set(refRows.map(r=>r.Cluster).filter(Boolean))];
  clusterEl.innerHTML = "<option value=''>-- Select Cluster --</option>";
  clusters.forEach(c => {
    const opt = document.createElement("option"); opt.value = c; opt.textContent = c; clusterEl.appendChild(opt);
  });
  districtEl.innerHTML = "<option value=''>-- Select District --</option>";
  locationEl.innerHTML = "<option value=''>-- Select Location --</option>";
  consignorEl.innerHTML = "<option value=''>-- Select Consignor (Godown) --</option>";
}

/* chain handlers */
function onClusterChange(){
  const c = clusterEl.value;
  districtEl.innerHTML = "<option value=''>-- Select District --</option>";
  locationEl.innerHTML = "<option value=''>-- Select Location --</option>";
  consignorEl.innerHTML = "<option value=''>-- Select Consignor (Godown) --</option>";
  godownOtherEl.style.display = "none";
  if (!c) return;
  const rows = refRows.filter(r=>r.Cluster === c);
  const districts = [...new Set(rows.map(r=>r.District).filter(Boolean))];
  districts.forEach(d=>districtEl.appendChild(createOption(d)));
}

function onDistrictChange(){
  const c = clusterEl.value, d = districtEl.value;
  locationEl.innerHTML = "<option value=''>-- Select Location --</option>";
  consignorEl.innerHTML = "<option value=''>-- Select Consignor (Godown) --</option>";
  godownOtherEl.style.display = "none";
  if (!d) return;
  const rows = refRows.filter(r=>r.Cluster===c && r.District===d);
  const locs = [...new Set(rows.map(r=>r.Location).filter(Boolean))];
  locs.forEach(l=>locationEl.appendChild(createOption(l)));
}

function onLocationChange(){
  const c = clusterEl.value, d = districtEl.value, l = locationEl.value;
  consignorEl.innerHTML = "<option value=''>-- Select Consignor (Godown) --</option>";
  godownOtherEl.style.display = "none";
  if (!l) return;
  const rows = refRows.filter(r=>r.Cluster===c && r.District===d && r.Location===l);
  const gods = [...new Set(rows.map(r=>r["Name of Godown"]).filter(Boolean))];
  gods.forEach(g=>consignorEl.appendChild(createOption(g)));
  // add Other
  const otherOpt = createOption("Other"); otherOpt.value = "Other";
  consignorEl.appendChild(otherOpt);
  consignorEl.addEventListener("change", ()=>{
    if (consignorEl.value === "Other") godownOtherEl.style.display = "block";
    else godownOtherEl.style.display = "none";
  }, { once: true });
}

function createOption(text){ const o = document.createElement("option"); o.value = text; o.textContent = text; return o; }

/* ===== ITEMS table handling ===== */
function onAddItemClick(e){
  addItemRow();
}

function addItemRow(prefill = {}) {
  itemIdCounter++;
  const tr = document.createElement("tr");
  tr.dataset.id = itemIdCounter;
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="inp item-name" value="${escapeHtml(prefill.name||'')}" placeholder="Item description" /></td>
    <td><input class="inp item-qty" type="number" min="0" value="${prefill.qty||''}" /></td>
    <td>
      <select class="item-unit inp">
        <option>Nos</option><option>Kg</option><option>Ltr</option><option>Bag</option><option>Box</option><option>Other</option>
      </select>
    </td>
    <td><input class="inp item-remarks" value="${escapeHtml(prefill.remarks||'')}" placeholder="Remarks (optional)" /></td>
    <td><button type="button" class="remove-row">Remove</button></td>
  `;
  itemsTbody.appendChild(tr);

  // bind remove
  tr.querySelector(".remove-row").addEventListener("click", ()=>{
    tr.remove();
    renumberRows();
  });

  // update total on qty change
  tr.querySelector(".item-qty").addEventListener("input", ()=>{ computeTotal(); });

  renumberRows();
  computeTotal();
}

function getRowCount(){ return itemsTbody.querySelectorAll("tr").length; }
function renumberRows(){
  let i = 1;
  itemsTbody.querySelectorAll("tr").forEach(tr=>{
    tr.querySelector(".sr").textContent = i++;
  });
  computeTotal();
}
function computeTotal(){
  let sum = 0;
  itemsTbody.querySelectorAll(".item-qty").forEach(inp=>{
    const v = parseFloat(inp.value) || 0;
    sum += v;
  });
  document.getElementById("totalQty")?.remove?.();
  // optionally show total elsewhere; in our layout CSS has footer cell id totalQty in earlier code — safe to set if exists
  const tEl = document.getElementById("totalQty");
  if(tEl) tEl.textContent = sum;
}

/* show/hide serial & tag inputs in the inline item add area */
function onToggleSerialTag(){
  const show = includeSerialTagCheckbox.checked;
  serialNoInput.classList.toggle("hidden", !show);
  tagNoInput.classList.toggle("hidden", !show);
}

/* ===== GATEPASS number handling (local) ===== */
function generateGatePassNo(){
  let cnt = parseInt(localStorage.getItem(PASS_KEY) || "1", 10);
  const year = new Date().getFullYear();
  const serial = String(cnt).padStart(3, "0");
  gpNoEl.value = `GWTPL/ABO/${year}/${serial}`;
}

function incrementPass(){
  let cnt = parseInt(localStorage.getItem(PASS_KEY) || "1", 10);
  cnt++;
  localStorage.setItem(PASS_KEY, String(cnt));
  generateGatePassNo();
}

/* ===== QR helper ===== */
function setQR(text){
  if(!qrBox) return;
  const qrUrl = "https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=" + encodeURIComponent(text);
  qrBox.innerHTML = `<img src="${qrUrl}" alt="QR" />`;
}

/* ===== VALIDATION ===== */
function validateForm(){
  // at least one item with name and qty
  const rows = itemsTbody.querySelectorAll("tr");
  if (rows.length === 0) { alert("Please add at least one item."); return false; }
  let ok = false;
  rows.forEach(tr=>{
    const name = tr.querySelector(".item-name").value.trim();
    const qty = tr.querySelector(".item-qty").value.trim();
    if (name && qty && Number(qty) > 0) ok = true;
  });
  if (!ok) { alert("Please enter name and qty for at least one item."); return false; }
  return true;
}

/* ===== BUILD PAYLOAD & SAVE ===== */
function buildPayload(){
  const items = Array.from(itemsTbody.querySelectorAll("tr")).map(tr=>{
    return {
      sr: tr.querySelector(".sr").textContent,
      name: tr.querySelector(".item-name").value.trim(),
      qty: tr.querySelector(".item-qty").value.trim(),
      unit: tr.querySelector(".item-unit").value,
      remarks: tr.querySelector(".item-remarks").value.trim()
    };
  });

  const consignorVal = (consignorEl.value === "Other") ? (godownOtherEl.value.trim() || "Other") : consignorEl.value;

  const payload = {
    gatePassNo: gpNoEl.value,
    issueDate: issueDateEl.value || new Date().toISOString().slice(0,10),
    type: document.getElementById("voucherType")?.textContent || document.getElementById("voucherType")?.value || "",
    cluster: clusterEl.value || "",
    district: districtEl.value || "",
    location: locationEl.value || "",
    consignor: consignorVal || "",
    consignee: document.getElementById("consignee").value || "GWTPL Abohar",
    vehicleNo: document.getElementById("vehicleNo").value.trim(),
    personName: document.getElementById("personName").value.trim(),
    authorityPerson: document.getElementById("authority").value.trim(),
    refNo: document.getElementById("refNo")?.value || "",
    generalRemarks: document.getElementById("remarks")?.value || document.getElementById("generalRemarks")?.value || "",
    items,
    totalQty: items.reduce((s,it)=> s + (parseFloat(it.qty)||0), 0),
    // signatures & registers
    issuedBy: document.getElementById("issuedByName")?.value || "",
    issuedByDesig: document.getElementById("issuedByDesig")?.value || "",
    outwardRegNo: document.getElementById("outwardNo")?.value || "",
    outwardDate: document.getElementById("outwardDate")?.value || "",
    issuedBySecName: document.getElementById("issueSecName")?.value || "",
    issuedBySecNo: document.getElementById("issueSecNo")?.value || "",
    issuedBySecDate: document.getElementById("issueSecDate")?.value || "",
    receivedBy: document.getElementById("receivedByName")?.value || "",
    receivedByDesig: document.getElementById("receivedByDesig")?.value || "",
    inwardRegNo: document.getElementById("inwardNo")?.value || "",
    inwardDate: document.getElementById("inwardDate")?.value || "",
    receivedBySecName: document.getElementById("recSecName")?.value || "",
    receivedBySecNo: document.getElementById("recSecNo")?.value || "",
    receivedBySecDate: document.getElementById("recSecDate")?.value || "",
    generatedAt: new Date().toISOString()
  };

  // generate QR content and set it
  setQR(`${payload.gatePassNo}|${payload.issueDate}|${payload.consignor}|${items.length}`);

  return payload;
}

async function onSaveClick(){
  if (!validateForm()) return;

  const payload = buildPayload();
  const saveBtn = document.getElementById("save");
  saveBtn.disabled = true;
  saveBtn.textContent = "Saving...";

  try {
    // POST
    await fetch(APPS_SCRIPT_URL, {
      method: "POST",
      headers: {"Content-Type":"application/json"},
      body: JSON.stringify(payload),
      mode: "no-cors" // apps script may be set to allow anonymous post; response opaque
    });

    alert("✅ Gate Pass saved successfully.");
    // increment serial, reset form for next
    incrementPass();
    resetForm();
  } catch (err) {
    console.error("Save failed:", err);
    // fallback: store backup locally
    const bk = JSON.parse(localStorage.getItem("gwtpl_v3_backups")||"[]");
    bk.push(payload);
    localStorage.setItem("gwtpl_v3_backups", JSON.stringify(bk));
    alert("⚠️ Save failed — data backed up locally. Next GatePass generated.");
    incrementPass();
    resetForm();
  } finally {
    saveBtn.disabled = false;
    saveBtn.textContent = "Save";
  }
}

/* ===== RESET ===== */
function resetForm(){
  // clear items and inputs (keep issue date as today)
  itemsTbody.innerHTML = "";
  itemIdCounter = 0;
  addItemRow();
  document.getElementById("vehicleNo").value = "";
  document.getElementById("personName").value = "";
  document.getElementById("authority").value = "Sh.";
  document.getElementById("remarks").value = "";
  document.getElementById("outwardNo").value = "";
  document.getElementById("outwardDate").value = "";
  document.getElementById("issueSecName").value = "";
  document.getElementById("issueSecNo").value = "";
  document.getElementById("issueSecDate").value = "";
  document.getElementById("receivedByName").value = "";
  document.getElementById("receivedByDesig").value = "";
  document.getElementById("inwardNo").value = "";
  document.getElementById("inwardDate").value = "";
  document.getElementById("recSecName").value = "";
  document.getElementById("recSecNo").value = "";
  document.getElementById("recSecDate").value = "";
  // reset gp date to today
  issueDateEl.valueAsDate = new Date();
  // clear QR
  qrBox.innerHTML = "";
}

/* ===== UTIL ===== */
function escapeHtml(s){ return String(s||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
