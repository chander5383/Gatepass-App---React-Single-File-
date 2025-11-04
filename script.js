/* Gate Pass v5 script
   - Features: PDF export (4 copies per page), GoogleSheet POST (APPS_SCRIPT_URL),
   - Auto-fill last-used mappings, local history, validation, unit subtotals, signature previews
*/

const APPS_SCRIPT_URL = ""; // <-- SET your Google Apps Script Web App URL here (exec)
const APPS_EXPECTS_JSON_RESPONSE = true; // if your Apps Script returns JSON with nextSerial set to true

/* ---------- init ---------- */
let itemCounter = 0;
document.addEventListener('DOMContentLoaded', ()=>{
  initUI();
  bindButtons();
  populateFromLocalFallback();
  addRow();
  generateLocalGP();
  document.getElementById('genOn').textContent = new Date().toLocaleString();
  renderHistory();
});

/* ---------- helpers ---------- */
function el(id){ return document.getElementById(id); }
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

/* ---------- UI binding ---------- */
function bindButtons(){
  el('btnAddRow').addEventListener('click', ()=> addRow());
  el('btnClearRows').addEventListener('click', clearRows);
  el('saveBtn').addEventListener('click', onSave);
  el('printBtn').addEventListener('click', ()=> window.print());
  el('pdfBtn').addEventListener('click', generatePDF);
  el('chkTag').addEventListener('change', toggleColumns);
  el('chkSr').addEventListener('change', toggleColumns);

  // history panel
  el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); alert('Local history cleared'); });

  // signature previews
  ['issuedSignFile','issueSecSignFile','receivedSignFile','recSecSignFile'].forEach(id=>{
    const input = el(id); if(!input) return;
    input.addEventListener('change', (ev)=> previewSig(ev.target, id.replace('File','Preview')));
  });

  // consignor change => autofill
  el('godownManual').addEventListener('change', onConsignorChange);
}

/* ---------- Dropdown/fallback data ---------- */
let REF_MAP = {}; // store mappings: consignor -> {consignee, authority}
function populateFromLocalFallback(){
  // load known mappings from local storage
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  REF_MAP = map;
  refreshDatalist();
}
function refreshDatalist(){
  const ds = el('recentGodowns'); ds.innerHTML = '';
  Object.keys(REF_MAP || {}).slice().reverse().forEach(g=>{
    const o = document.createElement('option'); o.value = g; ds.appendChild(o);
  });
}

/* ---------- itens table ---------- */
function addRow(prefill={}){
  itemCounter++;
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${getRowCount()+1}</td>
    <td><input class="itm-name" value="${escapeHtml(prefill.name||'')}" placeholder="Item description"></td>
    <td><input class="itm-tag" value="${escapeHtml(prefill.tag||'')}" placeholder="Tag No"></td>
    <td><input class="itm-sr" value="${escapeHtml(prefill.sr||'')}" placeholder="Sr No"></td>
    <td><input class="itm-qty" type="number" min="0" value="${prefill.qty||''}"></td>
    <td><select class="itm-unit">
          <option${(prefill.unit==='Nos')?' selected':''}>Nos</option>
          <option${(prefill.unit==='Kg')?' selected':''}>Kg</option>
          <option${(prefill.unit==='Ltr')?' selected':''}>Ltr</option>
          <option${(prefill.unit==='Bag')?' selected':''}>Bag</option>
          <option${(prefill.unit==='Box')?' selected':''}>Box</option>
          <option${(prefill.unit==='Other')?' selected':''}>Other</option>
        </select></td>
    <td><input class="itm-remarks" value="${escapeHtml(prefill.remarks||'')}" placeholder="Remarks"></td>
    <td class="print-hidden"><button type="button" class="rm">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.rm')?.addEventListener('click', ()=>{ tr.remove(); renumber(); computeTotal();});
  tr.querySelector('.itm-qty')?.addEventListener('input', ()=> computeTotal());
  tr.querySelector('.itm-unit')?.addEventListener('change', ()=> computeTotal());
  renumber(); computeTotal(); toggleColumns();
}
function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotal(); }
function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,el)=> s + (parseFloat(el.value)||0), 0);
  el('totalQty').textContent = total;
  // subtotals by unit
  const rows = qAll('#itemsBody tr').map(tr=>({
    unit: tr.querySelector('.itm-unit').value,
    qty: parseFloat(tr.querySelector('.itm-qty').value)||0
  }));
  const subtotal = {};
  rows.forEach(r=> { subtotal[r.unit] = (subtotal[r.unit]||0)+r.qty; });
  const parts = Object.keys(subtotal).map(u=> `${u}: ${subtotal[u]}` );
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* ---------- column toggle ---------- */
function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x=> x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x=> x.style.display = showSr ? '' : 'none');
  // also toggle <th>
  const ths = qAll('#itemsTable thead th');
  if(ths[2]) ths[2].style.display = showTag ? '' : 'none';
  if(ths[3]) ths[3].style.display = showSr ? '' : 'none';
}

/* ---------- GP number local ---------- */
function generateLocalGP(){
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')|| '1',10);
  const year = new Date().getFullYear();
  const serial = String(cnt).padStart(3,'0');
  el('metaGpNo').textContent = `GWTPL/ABO/${year}/${serial}`;
}
function incrementLocal(){
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')|| '1',10);
  cnt++; localStorage.setItem('gwtpl_pass', String(cnt)); generateLocalGP();
}

/* ---------- validation ---------- */
function validateForm(){
  // basic checks
  let ok = true;
  // clear previous
  qAll('.error').forEach(e=> e.classList.remove('error'));
  const items = qAll('#itemsBody tr').map(tr=>({
    name: tr.querySelector('.itm-name').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim()
  }));
  if(!items.some(i=> i.name && i.qty && Number(i.qty)>0)){
    alert('Add at least one item with qty');
    ok = false;
  }
  if(!el('godownManual').value.trim()){
    el('godownManual').classList.add('error'); ok=false;
  }
  // highlight empty important fields
  ['issuedName','receivedName'].forEach(id=>{
    if(!el(id).value.trim()) el(id).classList.add('error');
  });
  return ok;
}

/* ---------- save (local backup + optional Apps Script) ---------- */
async function onSave(){
  if(!validateForm()) return;
  // build rows
  const rows = qAll('#itemsBody tr').map(tr=>({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  })).filter(r=> r.name && r.qty && Number(r.qty)>0);

  const payload = {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value || new Date().toISOString().slice(0,10),
    type: el('metaType').value,
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items: rows,
    totalQty: el('totalQty').textContent,
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    outwardReg: el('outwardReg').value.trim(),
    outwardDate: el('outwardDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    inwardReg: el('inwardReg').value.trim(),
    inwardDate: el('inwardDate').value.trim(),
    remarks: el('remarks').value.trim(),
    generatedAt: new Date().toISOString()
  };

  // save signatures as dataURL (if present)
  ['issuedSigPreview','issueSecSigPreview','receivedSigPreview','recSecSigPreview'].forEach(k=>{
    const img = el(k)?.querySelector('img');
    if(img) payload[k] = img.src;
  });

  // Save mapping for consignor -> consignee, authority
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
    REF_MAP = map; refreshDatalist();
  }

  // attempt to POST to Google Apps Script
  if(APPS_SCRIPT_URL){
    try{
      const resp = await fetch(APPS_SCRIPT_URL, {
        method: 'POST',
        headers: {'Content-Type': 'application/json'},
        body: JSON.stringify(payload)
      });
      // if Apps Script returns json with nextSerial, update local
      if(APPS_EXPECTS_JSON_RESPONSE){
        const j = await resp.json().catch(()=>null);
        if(j && j.nextSerial) localStorage.setItem('gwtpl_pass', String(j.nextSerial));
      }
      // success fallback: save also locally
      saveLocalBackup(payload);
      alert('Saved to Google Sheet (request sent). Local backup also stored.');
      incrementLocal(); resetForm(); renderHistory();
      return;
    }catch(e){
      console.warn('POST failed', e);
      saveLocalBackup(payload);
      alert('Save to Google Sheet failed. Data stored locally as backup.');
      incrementLocal(); resetForm(); renderHistory();
      return;
    }
  } else {
    // just save locally
    saveLocalBackup(payload);
    alert('APPS_SCRIPT_URL not configured. Data saved locally.');
    incrementLocal(); resetForm(); renderHistory();
  }
}

function saveLocalBackup(payload){
  const bk = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  bk.unshift(payload); // newest first
  if(bk.length>200) bk.splice(200); // cap
  localStorage.setItem('gwtpl_backup', JSON.stringify(bk));
}

/* ---------- signature preview ---------- */
function previewSig(inputEl, previewId){
  const file = inputEl.files && inputEl.files[0];
  if(!file) return;
  const reader = new FileReader();
  reader.onload = function(e){
    const container = el(previewId);
    container.innerHTML = `<img src="${e.target.result}" alt="sig">`;
  };
  reader.readAsDataURL(file);
}

/* ---------- consignor autofill ---------- */
function onConsignorChange(){
  const val = el('godownManual').value.trim();
  if(!val) return;
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[val]){
    el('consignee').value = map[val].consignee || el('consignee').value;
    el('authorityPerson').value = map[val].authority || el('authorityPerson').value;
  }
}

/* ---------- history panel ---------- */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList');
  container.innerHTML = '';
  if(list.length===0){ container.innerHTML = '<div>No local backups</div>'; return; }
  list.slice(0,40).forEach((it, idx)=>{
    const div = document.createElement('div');
    div.className = 'hist-item';
    div.innerHTML = `<div><strong>${it.gatePassNo}</strong> — ${it.date} — ${it.consignor || ''}</div>
      <div class="hist-actions" style="margin-top:6px">
        <button data-idx="${idx}" class="hist-open">Open</button>
        <button data-idx="${idx}" class="hist-print">Print</button>
      </div>`;
    container.appendChild(div);
  });
  qAll('.hist-open').forEach(b=>{
    b.addEventListener('click', (e)=>{
      const idx = parseInt(e.target.dataset.idx,10);
      openFromHistory(idx);
    });
  });
  qAll('.hist-print').forEach(b=>{
    b.addEventListener('click', (e)=>{
      const idx = parseInt(e.target.dataset.idx,10);
      openFromHistory(idx, true);
    });
  });
}
function openFromHistory(index, printAfter=false){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const item = list[index];
  if(!item) return alert('Item not found');
  // fill form
  el('metaGpNo').textContent = item.gatePassNo || '';
  el('metaDate').value = item.date || '';
  el('godownManual').value = item.consignor || '';
  el('consignee').value = item.consignee || '';
  el('vehicleNo').value = item.vehicleNo || '';
  el('personCarrying').value = item.personCarrying || '';
  el('authorityPerson').value = item.authorityPerson || '';

  // items
  el('itemsBody').innerHTML = '';
  (item.items||[]).forEach(r=> addRow({name:r.name,tag:r.tag,sr:r.sr,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  el('remarks').value = item.remarks || '';
  el('issuedName').value = item.issuedName || ''; el('issuedDesg').value = item.issuedDesg || '';
  el('outwardReg').value = item.outwardReg || ''; el('outwardDate').value = item.outwardDate || '';
  el('receivedName').value = item.receivedName || ''; el('receivedDesg').value = item.receivedDesg || '';
  el('inwardReg').value = item.inwardReg || ''; el('inwardDate').value = item.inwardDate || '';

  // signatures previews
  if(item.issuedSigPreview) el('issuedSigPreview').innerHTML = `<img src="${item.issuedSigPreview}">`;
  if(item.issueSecSigPreview) el('issueSecSigPreview').innerHTML = `<img src="${item.issueSecSigPreview}">`;
  if(item.receivedSigPreview) el('receivedSigPreview').innerHTML = `<img src="${item.receivedSigPreview}">`;
  if(item.recSecSigPreview) el('recSecSigPreview').innerHTML = `<img src="${item.recSecSigPreview}">`;

  computeTotal();
  if(printAfter) window.print();
  el('historyPanel').setAttribute('aria-hidden','true');
}

/* ---------- PDF generation (4 copies per page) ---------- */
async function generatePDF(){
  // capture sheetRoot as canvas
  const root = el('sheetRoot');
  // temporarily ensure watermark visible for pdf export:
  el('watermark').style.opacity = '0.06';
  const canvas = await html2canvas(root, { scale: 2, useCORS: true, backgroundColor: null });
  // reset watermark
  el('watermark').style.opacity = '';
  const imgData = canvas.toDataURL('image/jpeg', 0.95);

  // create PDF with 2x2 layout per page
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // target image size in mm (fit half-page)
  const margin = 8;
  const cols = 2, rows = 2;
  const imgW = (pageW - margin*2) / cols;
  const imgH = (pageH - margin*2) / rows;

  // place the same image 4 times on first page
  for(let r=0;r<rows;r++){
    for(let c=0;c<cols;c++){
      const x = margin + c*imgW;
      const y = margin + r*imgH;
      pdf.addImage(imgData, 'JPEG', x, y, imgW-4, imgH-6);
    }
  }
  // filename
  const gp = el('metaGpNo').textContent.replace(/\s+/g,'_') || 'GatePass';
  pdf.save(`GatePass_${gp}.pdf`);
}

/* ---------- reset ---------- */
function resetForm(){
  clearRows();
  ['godownManual','vehicleNo','personCarrying','authorityPerson','remarks','issuedName','issuedDesg','outwardReg','outwardDate','receivedName','receivedDesg','inwardReg','inwardDate'].forEach(id=>{
    const e = el(id); if(e) e.value = '';
  });
  // clear signature previews
  ['issuedSigPreview','issueSecSigPreview','receivedSigPreview','recSecSigPreview'].forEach(id => { if(el(id)) el(id).innerHTML=''; });
  el('genOn').textContent = new Date().toLocaleString();
}

/* ---------- utility ---------- */
function escapeHtml(s = ''){ return ('' + s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

