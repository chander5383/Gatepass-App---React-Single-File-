/* v13.1 FINAL — Single Preview + Google Sheet + Print 4 + QR + History + Validation
   -------------------------------------------------------------
   ✅ Fixed: Blank Page Issue (Duplicate script removed)
   ✅ Auto Preview works
   ✅ Form Validation improved
   ✅ Local + Sheet Sync correct
*/

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";

document.addEventListener('DOMContentLoaded', boot);
const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

function boot(){
  bind();
  populateDatalist();
  addRow();
  generateLocalGP();
  if(el('metaDate') && !el('metaDate').value) el('metaDate').value = new Date().toISOString().slice(0,10);
  if(el('genOn')) el('genOn').textContent = new Date().toLocaleString();
  renderPreviewFromForm();
}

/* Event Binding */
function bind(){
  if(el('btnAddRow')) el('btnAddRow').addEventListener('click', addRow);
  if(el('btnClearRows')) el('btnClearRows').addEventListener('click', clearRows);
  if(el('saveBtn')) el('saveBtn').addEventListener('click', onSave);
  if(el('printBtn')) el('printBtn').addEventListener('click', printFourCopies);
  if(el('pdfBtn')) el('pdfBtn').addEventListener('click', downloadPDFFourCopies);
  if(el('chkTag')) el('chkTag').addEventListener('change', toggleColumns);
  if(el('chkSr')) el('chkSr').addEventListener('change', toggleColumns);
  if(el('openHistory')) el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  if(el('closeHistory')) el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  if(el('clearHistory')) el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); });
  if(el('godownManual')) el('godownManual').addEventListener('change', onConsignorChange);
  qAll('input,select,textarea').forEach(i => i.addEventListener('input', ()=> { computeTotal(); renderPreviewFromForm(); }));
  if(el('itemsBody')) el('itemsBody').addEventListener('input', ()=> { computeTotal(); renderPreviewFromForm(); });
}

/* Populate datalist (recent consignors) */
function populateDatalist(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns'); if(!ds) return;
  ds.innerHTML='';
  Object.keys(map).reverse().forEach(k => { const o=document.createElement('option'); o.value=k; ds.appendChild(o); });
}

/* Add / Manage items */
function addRow(prefill = {}){
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="itm-name" value="${escapeHTML(prefill.name||'')}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${escapeHTML(prefill.tag||'')}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${escapeHTML(prefill.sr||'')}" placeholder="Sr No"></td>
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
    <td><input class="itm-remarks" value="${escapeHTML(prefill.remarks||'')}" placeholder="Remarks"></td>
    <td><button type="button" class="btn muted rm">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.rm').addEventListener('click', ()=> { tr.remove(); renumber(); computeTotal(); renderPreviewFromForm(); });
  tr.querySelectorAll('input,select').forEach(x=>x.addEventListener('input', ()=>{ computeTotal(); renderPreviewFromForm(); }));
  renumber(); computeTotal(); toggleColumns(); renderPreviewFromForm();
}

function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotal(); renderPreviewFromForm(); }

/* Totals & Subtotals */
function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,e)=> s + (parseFloat(e.value)||0), 0);
  if(el('totalQty')) el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({unit: tr.querySelector('.itm-unit').value, qty: parseFloat(tr.querySelector('.itm-qty').value)||0}));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  if(el('unitSubtotals')) el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* Toggle columns */
function toggleColumns(){
  const showTag = el('chkTag')?.checked;
  const showSr = el('chkSr')?.checked;
  qAll('.itm-tag').forEach(x => x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x => x.style.display = showSr ? '' : 'none');
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
  renderPreviewFromForm();
}

/* GatePass number */
function generateLocalGP(){
  const now = new Date(); const year = now.getFullYear();
  const storedYear = localStorage.getItem('gwtpl_pass_year');
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'0',10);
  if(!storedYear || parseInt(storedYear,10) !== year){
    cnt = 1; localStorage.setItem('gwtpl_pass_year', String(year)); localStorage.setItem('gwtpl_pass', String(cnt));
  }
  const serial = String(cnt).padStart(3,'0');
  if(el('metaGpNo')) el('metaGpNo').textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){ let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'1',10); cnt++; localStorage.setItem('gwtpl_pass', String(cnt)); generateLocalGP(); }

/* Validate form */
function validateForm(){
  if(!el('godownManual').value.trim()){ alert('Consignor (Godown) is required'); return false; }
  if(!el('metaDate').value.trim()){ alert('Date is required'); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({name: tr.querySelector('.itm-name').value.trim(), qty: tr.querySelector('.itm-qty').value.trim()}));
  if(!rows.some(r => r.name && r.qty && Number(r.qty) > 0)){ alert('Add at least one item with valid qty'); return false; }
  return true;
}

/* Save to Sheet + Local */
async function onSave(){
  if(!validateForm()) return;
  const data = collectFormData();
  try{
    const resp = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(data) });
    const j = await resp.json().catch(()=>null);
    if(resp.ok){ saveLocal(data); incrementLocal(); alert('Saved successfully ✅'); resetForm(); renderHistory(); }
    else { saveLocal(data); alert('Server error — saved locally.'); }
  }catch(e){ saveLocal(data); alert('Network error — saved locally.'); }
}

/* Local backup */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

/* History */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const c = el('historyList'); if(!c) return;
  c.innerHTML = !list.length ? '<div style="padding:8px;color:#777">No saved records</div>' : '';
  list.slice(0,100).forEach((it, i) => {
    const row = document.createElement('div');
    row.className='hist-row';
    row.innerHTML = `<div style="font-weight:700">${it.gatePassNo} • ${it.date}</div>
      <div style="font-size:13px">${it.consignor}</div>
      <button class="btn muted" data-i="${i}" onclick="openFromHistory(${i})">Open</button>
      <button class="btn" data-i="${i}" onclick="printFromHistory(${i})">Print</button>`;
    c.appendChild(row);
  });
}

function openFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  ['metaDate','godownManual','consignee','vehicleNo','personCarrying','authorityPerson','remarks'].forEach(id => { if(el(id)) el(id).value = it[id] || ''; });
  el('itemsBody').innerHTML=''; (it.items||[]).forEach(r => addRow(r));
  computeTotal(); renderPreviewFromForm(); el('historyPanel').setAttribute('aria-hidden','true');
}
function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  buildPrintAreaWithFourCopies(it);
  setTimeout(()=> window.print(), 400);
}

/* Collect Form Data */
function collectFormData(){
  const items = qAll('#itemsBody tr').map(tr => ({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  }));
  return {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value,
    type: el('metaType').value,
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    unitSub: el('unitSubtotals').textContent.replace('Subtotals — ',''),
    remarks: el('remarks').value.trim(),
    generatedAt: new Date().toISOString()
  };
}

/* Preview */
function renderPreviewFromForm(){
  const data = collectFormData();
  const html = buildCopyHtml(data, 'Office Copy');
  if(el('previewCopy')) el('previewCopy').innerHTML = html;
  const ph = el('previewCopy') ? el('previewCopy').querySelector('#qr-placeholder') : null;
  generateQRCode(ph, data);
}

/* Build Copy HTML */
function buildCopyHtml(data, label){
  const itemsHtml = (data.items||[]).map(r => `
    <tr><td>${r.sr}</td><td>${r.name}</td><td>${r.tag}</td><td>${r.srno}</td>
    <td>${r.qty}</td><td>${r.unit}</td><td>${r.remarks}</td></tr>
  `).join('') || `<tr><td colspan="7" style="text-align:center">No Items</td></tr>`;
  return `
    <div style="font-family:Arial;border:1px solid #eee;padding:10px;border-radius:10px">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:6px">
        <img src="https://gwtpl.co/logo.png" style="width:70px">
        <div style="text-align:center;flex:1">
          <div style="font-weight:900;color:#0a4b76">GLOBUS WAREHOUSING & TRADING PVT LTD</div>
          <div>ABOHAR</div><div style="font-weight:800">STOCK TRANSFER VOUCHER</div>
        </div>
        <div style="text-align:right">
          <div style="font-weight:600">Gate Pass No</div>
          <div style="border:1px solid #000;padding:4px 8px">${data.gatePassNo}</div>
          <div>Date: ${data.date}</div><div>Type: ${data.type}</div>
        </div>
      </div>
      <table style="width:100%;border-collapse:collapse" border="1">
        <thead><tr><th>Sr</th><th>Item Description</th><th>Tag No</th><th>Sr No</th><th>Qty</th><th>Unit</th><th>Remarks</th></tr></thead>
        <tbody>${itemsHtml}</tbody>
      </table>
      <div style="margin-top:10px;font-weight:700;color:#a50000;text-align:center">
        Goods are not for sale — only site to site transfer
      </div>
      <div style="text-align:center;margin-top:8px">
        <div id="qr-placeholder"></div>
      </div>
    </div>`;
}

/* QR Generator */
function generateQRCode(targetEl, data){
  if(!targetEl) return;
  targetEl.innerHTML='';
  const qrText = `GatePass: ${data.gatePassNo}\nDate:${data.date}\nConsignor:${data.consignor}\nQty:${data.totalQty}`;
  new QRCode(targetEl, { text: qrText, width: 100, height: 100 });
}

/* Print + PDF */
function buildPrintAreaWithFourCopies(data){
  const old = document.getElementById('printContainer'); if(old) old.remove();
  const div = document.createElement('div'); div.id='printContainer';
  const labels = ['Office Copy','Security Copy','Office Copy','Security Copy'];
  labels.forEach(lbl => {
    const wrap = document.createElement('div');
    wrap.style.width='210mm'; wrap.style.minHeight='297mm'; wrap.style.pageBreakAfter='always';
    wrap.innerHTML = buildCopyHtml(data, lbl);
    const ph = wrap.querySelector('#qr-placeholder'); generateQRCode(ph, data);
    div.appendChild(wrap);
  });
  document.body.appendChild(div);
  return div;
}

function printFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const div = buildPrintAreaWithFourCopies(data);
  setTimeout(()=>{ window.print(); setTimeout(()=>div.remove(),800); },300);
}

async function downloadPDFFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const div = buildPrintAreaWithFourCopies(data);
  const canv = await html2canvas(div, { scale:2 });
  div.remove();
  const img = canv.toDataURL('image/jpeg',0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  pdf.addImage(img,'JPEG',0,0,210,297);
  const gp = data.gatePassNo.replaceAll('/','_');
  pdf.save(`GatePass_${gp}.pdf`);
}

/* Utilities */
function escapeHTML(s=''){ return s.replace(/[&<>\"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c])); }
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){ el('consignee').value = map[v].consignee || el('consignee').value; el('authorityPerson').value = map[v].authority || el('authorityPerson').value; }
}
