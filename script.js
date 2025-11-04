/* GWTPL Gate Pass v13.2 – FINAL
   ✅ Fixed blank preview issue
   ✅ Single live preview
   ✅ Proper print (4 copies)
   ✅ PDF download works
   ✅ Google Sheet + Local backup functional
*/

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";
const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  bind();
  populateDatalist();
  addRow();
  generateLocalGP();
  if(el("metaDate")) el("metaDate").value = new Date().toISOString().slice(0,10);
  if(el("genOn")) el("genOn").textContent = new Date().toLocaleString();
  renderPreview();
});

/* Event Bindings */
function bind() {
  el("btnAddRow").onclick = addRow;
  el("btnClearRows").onclick = clearRows;
  el("saveBtn").onclick = onSave;
  el("printBtn").onclick = printFourCopies;
  el("pdfBtn").onclick = downloadPDFFourCopies;
  el("chkTag").onchange = el("chkSr").onchange = toggleColumns;
  el("openHistory").onclick = () => { el("historyPanel").setAttribute("aria-hidden","false"); renderHistory(); };
  el("closeHistory").onclick = () => el("historyPanel").setAttribute("aria-hidden","true");
  el("clearHistory").onclick = () => { localStorage.removeItem("gwtpl_backup"); renderHistory(); };
  el("godownManual").onchange = onConsignorChange;

  qAll("input,select,textarea").forEach(inp =>
    inp.addEventListener("input", () => { computeTotal(); renderPreview(); })
  );
}

/* Populate Datalist (Consignors) */
function populateDatalist(){
  const ds = el("recentGodowns"); if(!ds) return;
  const map = JSON.parse(localStorage.getItem("gwtpl_godown_map") || "{}");
  ds.innerHTML = Object.keys(map).reverse().map(k => `<option value="${k}">`).join("");
}

/* Item Handling */
function addRow(prefill={}) {
  const tb = el("itemsBody");
  const tr = document.createElement("tr");
  tr.innerHTML = `
    <td class="sr">${tb.children.length + 1}</td>
    <td><input class="itm-name" value="${prefill.name||''}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${prefill.tag||''}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${prefill.srno||''}" placeholder="Sr No"></td>
    <td><input class="itm-qty" type="number" min="0" value="${prefill.qty||''}"></td>
    <td>
      <select class="itm-unit">
        <option${prefill.unit==='Nos'?' selected':''}>Nos</option>
        <option${prefill.unit==='Kg'?' selected':''}>Kg</option>
        <option${prefill.unit==='Ltr'?' selected':''}>Ltr</option>
        <option${prefill.unit==='Bag'?' selected':''}>Bag</option>
        <option${prefill.unit==='Box'?' selected':''}>Box</option>
        <option${prefill.unit==='Other'?' selected':''}>Other</option>
      </select>
    </td>
    <td><input class="itm-remarks" value="${prefill.remarks||''}" placeholder="Remarks"></td>
    <td><button class="btn muted rm">X</button></td>
  `;
  tb.appendChild(tr);
  tr.querySelector(".rm").onclick = () => { tr.remove(); renumber(); computeTotal(); renderPreview(); };
  qAll("input,select", tr).forEach(x => x.addEventListener("input", () => { computeTotal(); renderPreview(); }));
  renumber(); computeTotal(); toggleColumns(); renderPreview();
}

function clearRows(){ el("itemsBody").innerHTML=''; addRow(); computeTotal(); renderPreview(); }
function renumber(){ qAll("#itemsBody tr").forEach((tr,i)=> tr.querySelector(".sr").textContent = i+1); }

/* Totals */
function computeTotal(){
  const qtys = qAll(".itm-qty").map(x => parseFloat(x.value) || 0);
  const total = qtys.reduce((a,b)=>a+b,0);
  el("totalQty").textContent = total;
  const subs = {};
  qAll("#itemsBody tr").forEach(tr=>{
    const unit = tr.querySelector(".itm-unit").value;
    const qty = parseFloat(tr.querySelector(".itm-qty").value)||0;
    subs[unit]=(subs[unit]||0)+qty;
  });
  const text = Object.entries(subs).map(([u,q])=>`${u}: ${q}`).join(" | ");
  el("unitSubtotals").textContent = text ? "Subtotals — "+text : "";
}

/* Toggle Tag/Sr columns */
function toggleColumns(){
  const tag = el("chkTag").checked;
  const sr = el("chkSr").checked;
  qAll(".itm-tag").forEach(x=>x.style.display=tag?"":"none");
  qAll(".itm-sr").forEach(x=>x.style.display=sr?"":"none");
  if(el("thTag")) el("thTag").style.display=tag?"":"none";
  if(el("thSr")) el("thSr").style.display=sr?"":"none";
}

/* Gate Pass Number */
function generateLocalGP(){
  const now = new Date();
  const year = now.getFullYear();
  let cnt = parseInt(localStorage.getItem("gwtpl_pass")||"0",10);
  const storedYear = localStorage.getItem("gwtpl_pass_year");
  if(!storedYear || storedYear!=year){ cnt=1; localStorage.setItem("gwtpl_pass_year",year); }
  const serial = String(cnt).padStart(3,"0");
  el("metaGpNo").textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){
  let c = parseInt(localStorage.getItem("gwtpl_pass")||"1",10)+1;
  localStorage.setItem("gwtpl_pass",c);
  generateLocalGP();
}

/* Validate */
function validateForm(){
  if(!el("godownManual").value.trim()){ alert("Consignor (Godown) required"); return false; }
  if(!el("metaDate").value.trim()){ alert("Date required"); return false; }
  const rows = qAll("#itemsBody tr").map(tr=>({n:tr.querySelector(".itm-name").value.trim(),q:tr.querySelector(".itm-qty").value.trim()}));
  if(!rows.some(r=>r.n && r.q && Number(r.q)>0)){ alert("Add at least one valid item"); return false; }
  return true;
}

/* Collect Form Data */
function collectFormData(){
  const items = qAll("#itemsBody tr").map(tr=>({
    sr: tr.querySelector(".sr").textContent,
    name: tr.querySelector(".itm-name").value,
    tag: tr.querySelector(".itm-tag").value,
    srno: tr.querySelector(".itm-sr").value,
    qty: tr.querySelector(".itm-qty").value,
    unit: tr.querySelector(".itm-unit").value,
    remarks: tr.querySelector(".itm-remarks").value
  }));
  return {
    gatePassNo: el("metaGpNo").textContent,
    date: el("metaDate").value,
    type: el("metaType").value,
    consignor: el("godownManual").value,
    consignee: el("consignee").value,
    remarks: el("remarks").value,
    totalQty: el("totalQty").textContent,
    unitSub: el("unitSubtotals").textContent.replace("Subtotals — ",""),
    items
  };
}

/* Preview (Single) */
function renderPreview(){
  const data = collectFormData();
  const rows = data.items.map((r,i)=>`
    <tr><td>${i+1}</td><td>${r.name}</td><td>${r.tag}</td><td>${r.srno}</td><td>${r.qty}</td><td>${r.unit}</td><td>${r.remarks}</td></tr>
  `).join("") || "<tr><td colspan=7>No Items</td></tr>";

  el("previewCopy").innerHTML = `
  <div style="font-family:Arial;padding:6px">
    <div style="display:flex;align-items:center;justify-content:space-between">
      <img src="https://gwtpl.co/logo.png" style="width:70px">
      <div style="text-align:center;flex:1">
        <div style="font-weight:900;color:#0a4b76">GLOBUS WAREHOUSING & TRADING PVT LTD</div>
        <div>ABOHAR</div><div style="font-weight:700">STOCK TRANSFER VOUCHER</div>
      </div>
      <div style="text-align:right">
        <div>Gate Pass No</div>
        <div style="border:1px solid #000;padding:4px 8px">${data.gatePassNo}</div>
        <div>Date: ${data.date}</div><div>Type: ${data.type}</div>
      </div>
    </div>
    <table style="width:100%;border-collapse:collapse;margin-top:6px" border="1">
      <tr style="background:#f7fbfd;font-weight:700">
        <th>Sr</th><th>Item</th><th>Tag</th><th>Sr No</th><th>Qty</th><th>Unit</th><th>Remarks</th>
      </tr>${rows}
    </table>
    <div style="text-align:center;color:#a50000;font-weight:800;margin-top:8px">Goods are not for sale — only site to site transfer</div>
    <div id="qrPrev" style="text-align:center;margin-top:8px"></div>
  </div>`;
  const qr = el("qrPrev"); qr.innerHTML="";
  new QRCode(qr, { text:data.gatePassNo, width:100, height:100 });
}

/* Google Sheet Save + Local Backup */
async function onSave(){
  if(!validateForm()) return;
  const payload = collectFormData();
  try{
    const res = await fetch(APPS_SCRIPT_URL, {method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
    if(res.ok){ saveLocal(payload); incrementLocal(); alert("Saved to Sheet + Local ✅"); resetForm(); renderHistory(); }
    else { saveLocal(payload); alert("Server error — saved locally."); }
  }catch{ saveLocal(payload); alert("Network error — saved locally."); }
}

/* Local Save */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem("gwtpl_backup")||"[]");
  arr.unshift(data);
  if(arr.length>300) arr.pop();
  localStorage.setItem("gwtpl_backup",JSON.stringify(arr));
}

/* History */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem("gwtpl_backup")||"[]");
  const c = el("historyList"); if(!c) return;
  c.innerHTML = list.map((r,i)=>`
    <div class="hist-row" style="border-bottom:1px solid #eee;padding:6px">
      <b>${r.gatePassNo}</b> • ${r.date}<br><small>${r.consignor}</small><br>
      <button class="btn muted" onclick="openFromHistory(${i})">Open</button>
      <button class="btn" onclick="printFromHistory(${i})">Print</button>
    </div>
  `).join("") || "<div>No Records</div>";
}

function openFromHistory(i){
  const list = JSON.parse(localStorage.getItem("gwtpl_backup")||"[]");
  const it = list[i]; if(!it) return;
  el("godownManual").value=it.consignor; el("consignee").value=it.consignee;
  el("metaDate").value=it.date; el("remarks").value=it.remarks;
  el("itemsBody").innerHTML=""; it.items.forEach(r=>addRow(r));
  computeTotal(); renderPreview(); el("historyPanel").setAttribute("aria-hidden","true");
}
function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem("gwtpl_backup")||"[]");
  const it = list[i]; if(!it) return;
  buildPrintAreaWithFourCopies(it);
  setTimeout(()=>window.print(),400);
}

/* Print / PDF */
function buildPrintAreaWithFourCopies(data){
  const old = document.getElementById("printContainer"); if(old) old.remove();
  const div = document.createElement("div"); div.id="printContainer";
  const labels = ["Office Copy","Security Copy","Office Copy","Security Copy"];
  labels.forEach(lbl=>{
    const wrap=document.createElement("div");
    wrap.style="width:210mm;min-height:297mm;padding:10mm;page-break-after:always;";
    wrap.innerHTML=el("previewCopy").innerHTML.replace("Office Copy",lbl);
    div.appendChild(wrap);
  });
  document.body.appendChild(div);
  return div;
}
function printFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const area = buildPrintAreaWithFourCopies(data);
  setTimeout(()=>{window.print(); setTimeout(()=>area.remove(),800);},400);
}
async function downloadPDFFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const area = buildPrintAreaWithFourCopies(data);
  const canv = await html2canvas(area,{scale:2});
  area.remove();
  const img = canv.toDataURL("image/jpeg",0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF("p","mm","a4");
  pdf.addImage(img,"JPEG",0,0,210,297);
  pdf.save(`GatePass_${data.gatePassNo.replaceAll('/','_')}.pdf`);
}

/* Reset */
function resetForm(){
  el("godownManual").value=""; el("remarks").value="";
  el("itemsBody").innerHTML=""; addRow();
  computeTotal(); renderPreview();
}

/* Autofill */
function onConsignorChange(){
  const v = el("godownManual").value.trim();
  const map = JSON.parse(localStorage.getItem("gwtpl_godown_map")||"{}");
  if(map[v]) el("consignee").value = map[v].consignee || el("consignee").value;
}
