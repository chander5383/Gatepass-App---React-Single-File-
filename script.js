/* v10 final script
   - Connected to Google Apps Script URL below
   - Auto GatePass numbering, add/remove items, Tag/Sr toggles
   - Save -> Google Sheet + local backup
   - History with Open & Print old GatePass
   - Generate 2 copies in #copyTop and #copyBottom and print/pdf
*/

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";
const APPS_EXPECTS_JSON_RESPONSE = true;

document.addEventListener('DOMContentLoaded', ()=> {
  boot();
});

function el(id){ return document.getElementById(id); }
function qAll(sel){ return Array.from(document.querySelectorAll(sel)); }

function boot(){
  bind();
  populateDatalist();
  addRow();
  generateLocalGP();
  el('genOn').textContent = new Date().toLocaleString();
  renderCopiesFromForm(); // create initial copies for print preview
}

/* Events */
function bind(){
  el('btnAddRow').addEventListener('click', ()=> addRow());
  el('btnClearRows').addEventListener('click', clearRows);
  el('saveBtn').addEventListener('click', onSave);
  el('printBtn').addEventListener('click', ()=> printCurrent());
  el('pdfBtn').addEventListener('click', ()=> exportPDF());
  el('chkTag').addEventListener('change', toggleColumns);
  el('chkSr').addEventListener('change', toggleColumns);

  el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); });

  el('godownManual').addEventListener('change', onConsignorChange);
  el('itemsBody').addEventListener('input', ()=> { computeTotal(); renderCopiesFromForm(); });
  // when most form inputs change, update copies:
  qAll('input,select,textarea').forEach(i => i.addEventListener('input', renderCopiesFromForm));
}

/* Datalist for consignors */
function populateDatalist(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns'); ds.innerHTML = '';
  Object.keys(map).reverse().forEach(k => { const o = document.createElement('option'); o.value = k; ds.appendChild(o); });
}

/* Items table */
let itemCounter = 0;
function addRow(prefill = {}){
  itemCounter++;
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
    <td class="action-col"><button type="button" class="btn muted rm">Remove</button></td>
  `;
  tbody.appendChild(tr);
  tr.querySelector('.rm').addEventListener('click', ()=> { tr.remove(); renumber(); computeTotal(); renderCopiesFromForm(); });
  tr.querySelector('.itm-qty').addEventListener('input', ()=> { computeTotal(); renderCopiesFromForm(); });
  tr.querySelector('.itm-unit').addEventListener('change', ()=> { computeTotal(); renderCopiesFromForm(); });
  renumber(); computeTotal(); toggleColumns(); renderCopiesFromForm();
}

function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotal(); renderCopiesFromForm(); }

function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,e) => s + (parseFloat(e.value)||0), 0);
  el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({unit: tr.querySelector('.itm-unit').value, qty: parseFloat(tr.querySelector('.itm-qty').value)||0}));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* Toggle Tag/Sr columns */
function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x => x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x => x.style.display = showSr ? '' : 'none');
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
  renderCopiesFromForm();
}

/* GatePass numbering: reset per year */
function generateLocalGP(){
  const now = new Date(); const year = now.getFullYear();
  const storedYear = localStorage.getItem('gwtpl_pass_year');
  let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'0',10);
  if(!storedYear || parseInt(storedYear,10) !== year){
    cnt = 1; localStorage.setItem('gwtpl_pass_year', String(year)); localStorage.setItem('gwtpl_pass', String(cnt));
  } else if(cnt < 1) cnt = 1;
  const serial = String(cnt).padStart(3,'0');
  el('metaGpNo').textContent = `GWTPL/ABOHAR/${year}/${serial}`;
}
function incrementLocal(){ let cnt = parseInt(localStorage.getItem('gwtpl_pass')||'1',10); cnt++; localStorage.setItem('gwtpl_pass', String(cnt)); generateLocalGP(); }

/* Validation */
function validateForm(){
  qAll('.error').forEach(e => e.classList.remove('error'));
  if(!el('godownManual').value.trim()){ el('godownManual').classList.add('error'); el('godownManual').focus(); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({name: tr.querySelector('.itm-name').value.trim(), qty: tr.querySelector('.itm-qty').value.trim()}));
  if(!rows.some(r => r.name && r.qty && Number(r.qty) > 0)){ alert('Add at least one item with valid qty'); return false; }
  return true;
}

/* Save to Google Sheet */
async function onSave(){
  if(!validateForm()) return;
  const items = qAll('#itemsBody tr').map(tr => ({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value.trim(),
    tag: tr.querySelector('.itm-tag').value.trim(),
    srno: tr.querySelector('.itm-sr').value.trim(),
    qty: tr.querySelector('.itm-qty').value.trim(),
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value.trim()
  })).filter(r => r.name && r.qty && Number(r.qty) > 0);

  const payload = {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value || new Date().toISOString().slice(0,10),
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    issuedDate: el('issuedDate').value || '',
    issueSecName: el('issueSecName').value.trim(),
    issueSecReg: el('issueSecReg').value.trim(),
    issueSecDate: el('issueSecDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    receivedDate: el('receivedDate').value || '',
    recSecName: el('recSecName').value.trim(),
    recSecReg: el('recSecReg').value.trim(),
    recSecDate: el('recSecDate').value || '',
    remarks: el('remarks').value.trim(),
    generatedAt: new Date().toISOString()
  };

  // save mapping
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
  }

  // attempt server save
  try{
    const resp = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await resp.json().catch(()=>null);
    if(j && j.nextSerial) localStorage.setItem('gwtpl_pass', String(j.nextSerial));
    saveLocal(payload);
    alert('Saved → Google Sheet & Local backup.');
    incrementLocal(); resetForm(); renderHistory();
  }catch(e){
    console.warn('Server save failed', e);
    saveLocal(payload);
    alert('Server error — saved locally.');
    incrementLocal(); resetForm(); renderHistory();
  }
}

/* Local backup */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

/* Load from history and optionally print */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList'); container.innerHTML = '';
  if(!list.length){ container.innerHTML = '<div style="color:#666;padding:8px">No saved records</div>'; return; }
  list.slice(0,100).forEach((it, idx) => {
    const row = document.createElement('div'); row.className = 'hist-row';
    row.style.padding='8px'; row.style.borderBottom='1px solid #eef6fb';
    row.innerHTML = `<div style="font-weight:700">${it.gatePassNo} • ${it.date}</div>
      <div style="font-size:13px;color:#444">${it.consignor || ''}</div>
      <div style="margin-top:8px">
        <button data-i="${idx}" class="btn muted hist-open">Open</button>
        <button data-i="${idx}" class="btn hist-print">Print</button>
      </div>`;
    container.appendChild(row);
  });
  qAll('.hist-open').forEach(b => b.addEventListener('click', e => openFromHistory(parseInt(e.target.dataset.i,10))));
  qAll('.hist-print').forEach(b => b.addEventListener('click', e => printFromHistory(parseInt(e.target.dataset.i,10))));
}

function openFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  // populate form
  el('metaGpNo').textContent = it.gatePassNo || '';
  el('metaDate').value = it.date || '';
  el('godownManual').value = it.consignor || '';
  el('consignee').value = it.consignee || '';
  el('vehicleNo').value = it.vehicleNo || '';
  el('personCarrying').value = it.personCarrying || '';
  el('authorityPerson').value = it.authorityPerson || '';
  el('itemsBody').innerHTML = '';
  (it.items||[]).forEach(r => addRow({name:r.name,tag:r.tag,sr:r.srno,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  el('remarks').value = it.remarks || '';
  el('issuedName').value = it.issuedName || ''; el('issuedDesg').value = it.issuedDesg || ''; el('issuedDate').value = it.issuedDate || '';
  el('issueSecName').value = it.issueSecName || ''; el('issueSecReg').value = it.issueSecReg || ''; el('issueSecDate').value = it.issueSecDate || '';
  el('receivedName').value = it.receivedName || ''; el('receivedDesg').value = it.receivedDesg || ''; el('receivedDate').value = it.receivedDate || '';
  el('recSecName').value = it.recSecName || ''; el('recSecReg').value = it.recSecReg || ''; el('recSecDate').value = it.recSecDate || '';
  computeTotal(); renderCopiesFromForm();
  el('historyPanel').setAttribute('aria-hidden','true');
}

/* Print an old record directly (without loading to edit form) */
function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  // render copies with the record data and print
  renderCopiesFromData(it);
  setTimeout(()=> { window.print(); }, 500);
}

/* Render two copies on screen from current form values */
function renderCopiesFromForm(){
  const data = collectFormData();
  renderCopiesFromData(data);
}

/* Render two copies from given data object */
function renderCopiesFromData(data){
  // build HTML for a single copy
  const copyHtml = buildCopyHtml(data);
  el('copyTop').innerHTML = copyHtml;
  el('copyBottom').innerHTML = copyHtml;
}

/* Build single copy HTML (invoice-like) */
function buildCopyHtml(data){
  const itemsHtml = (data.items||[]).map(r => `
    <tr>
      <td class="sr">${escapeHTML(r.sr||'')}</td>
      <td>${escapeHTML(r.name||'')}</td>
      <td>${escapeHTML(r.tag||'')}</td>
      <td>${escapeHTML(r.srno||'')}</td>
      <td class="text-center">${escapeHTML(r.qty||'')}</td>
      <td class="text-center">${escapeHTML(r.unit||'')}</td>
      <td>${escapeHTML(r.remarks||'')}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#666;padding:18px">No items</td></tr>`;

  const headerHtml = `
    <div class="header-top" style="display:flex;align-items:center;gap:12px;margin-bottom:8px">
      <img src="https://gwtpl.co/logo.png" style="width:80px;height:auto;margin-right:12px">
      <div style="flex:1;text-align:center">
        <div style="font-weight:800;color:${'#0a4b76'};font-size:18px">GLOBUS WAREHOUSING &amp; TRADING PRIVATE LIMITED</div>
        <div style="font-weight:700;color:#0b4a61;margin-top:4px">ABOHAR</div>
        <div style="font-weight:800;color:#0b4a61;margin-top:8px">STOCK TRANSFER VOUCHER</div>
      </div>
      <div style="width:260px">
        <div style="font-size:12px;color:#666">Gate Pass No</div>
        <div style="border:1px solid #222;padding:8px;font-weight:800;background:#fafafa;margin-bottom:6px">${escapeHTML(data.gatePassNo||'')}</div>
        <div style="display:flex;gap:8px">
          <div style="flex:1">
            <div style="font-size:12px;color:#666">Date</div>
            <div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(data.date||'')}</div>
          </div>
          <div style="flex:1">
            <div style="font-size:12px;color:#666">Type</div>
            <div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(data.type||'')}</div>
          </div>
        </div>
      </div>
    </div>`;

  const detailsHtml = `
    <table style="width:100%;border-collapse:collapse;margin-top:6px">
      <tr>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="font-weight:700;color:#12323b;margin-bottom:6px">Consignor (Godown)</div>
          <div>${escapeHTML(data.consignor||'')}</div>
        </td>
        <td style="width:33%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="font-weight:700;color:#12323b;margin-bottom:6px">Consignee Unit</div>
          <div>${escapeHTML(data.consignee||'')}</div>
        </td>
        <td style="width:34%;vertical-align:top;padding:8px;border:1px solid #e9f4f9">
          <div style="display:flex;gap:8px">
            <div style="flex:1"><div style="font-weight:700;color:#12323b">Vehicle No</div><div>${escapeHTML(data.vehicleNo||'')}</div></div>
            <div style="flex:1"><div style="font-weight:700;color:#12323b">Person Carrying</div><div>${escapeHTML(data.personCarrying||'')}</div></div>
          </div>
        </td>
      </tr>
    </table>`;

  const tableHtml = `
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead>
        <tr style="background:#f7fbfd;color:#12323b;font-weight:800">
          <th style="border:1px solid #e9f4f9;padding:8px;width:6%">Sr</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:44%">Item Description</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:12%">Tag No</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:10%">Sr No</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:8%">Qty</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:8%">Unit</th>
          <th style="border:1px solid #e9f4f9;padding:8px;width:12%">Remarks</th>
        </tr>
      </thead>
      <tbody>${itemsHtml}</tbody>
      <tfoot>
        <tr>
          <td colspan="4" style="text-align:right;border:1px solid #e9f4f9;padding:8px;font-weight:700">Total Qty</td>
          <td style="border:1px solid #e9f4f9;padding:8px;text-align:center;font-weight:700">${escapeHTML(data.totalQty||'0')}</td>
          <td colspan="2" style="border:1px solid #e9f4f9;padding:8px"></td>
        </tr>
        <tr>
          <td colspan="7" style="padding:8px;border:1px solid #e9f4f9;color:#12323b">Subtotals — ${escapeHTML(data.unitSub||'')}</td>
        </tr>
      </tfoot>
    </table>`;

  const remarksHtml = `
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:12px">
      <div style="flex:1;border:1px solid #e9f4f9;padding:8px;border-radius:6px">
        <div style="font-weight:700;color:#12323b;margin-bottom:6px">Remarks</div>
        <div style="min-height:40px">${escapeHTML(data.remarks||'')}</div>
      </div>
      <div style="width:160px;text-align:center">
        <div style="font-size:12px;color:#666;margin-bottom:8px">Generated on</div>
        <div style="font-size:12px;color:#333">${escapeHTML(data.generatedAt? (new Date(data.generatedAt)).toLocaleString() : (new Date()).toLocaleString())}</div>
      </div>
    </div>`;

  const signatureHtml = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignee / Issued By</div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <div style="font-weight:700">For Authorised Person</div>
            <div>Name: ${escapeHTML(data.issuedName||'')}</div>
            <div>Designation: ${escapeHTML(data.issuedDesg||'')}</div>
            <div>Date: ${escapeHTML(data.issuedDate||'')}</div>
            <div style="margin-top:8px" class="stamp">Stamp &amp; Sign</div>
          </div>
          <div style="flex:1">
            <div style="font-weight:700">For Security</div>
            <div>Name: ${escapeHTML(data.issueSecName||'')}</div>
            <div>Register Sr: ${escapeHTML(data.issueSecReg||'')}</div>
            <div>Date: ${escapeHTML(data.issueSecDate||'')}</div>
            <div style="margin-top:8px" class="stamp">Stamp (Security)</div>
          </div>
        </div>
      </div>

      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignor / Received By</div>
        <div style="display:flex;gap:12px">
          <div style="flex:1">
            <div style="font-weight:700">For Authorised Person</div>
            <div>Name: ${escapeHTML(data.receivedName||'')}</div>
            <div>Designation: ${escapeHTML(data.receivedDesg||'')}</div>
            <div>Date: ${escapeHTML(data.receivedDate||'')}</div>
            <div style="margin-top:8px" class="stamp">Stamp &amp; Sign</div>
          </div>
          <div style="flex:1">
            <div style="font-weight:700">For Security</div>
            <div>Name: ${escapeHTML(data.recSecName||'')}</div>
            <div>Register Sr: ${escapeHTML(data.recSecReg||'')}</div>
            <div>Date: ${escapeHTML(data.recSecDate||'')}</div>
            <div style="margin-top:8px" class="stamp">Stamp (Security)</div>
          </div>
        </div>
      </div>
    </div>`;

  // put all together
  return `<div style="position:relative;z-index:1">${headerHtml}${detailsHtml}${tableHtml}${remarksHtml}${signatureHtml}</div>`;
}

/* Collect form data */
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
  const unitSub = el('unitSubtotals').textContent.replace('Subtotals — ','');
  return {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value,
    type: el('metaType').value,
    consignor: el('godownManual').value.trim(),
    consignee: el('consignee').value.trim(),
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    unitSub,
    remarks: el('remarks').value.trim(),
    issuedName: el('issuedName').value.trim(),
    issuedDesg: el('issuedDesg').value.trim(),
    issuedDate: el('issuedDate').value || '',
    issueSecName: el('issueSecName').value.trim(),
    issueSecReg: el('issueSecReg').value.trim(),
    issueSecDate: el('issueSecDate').value || '',
    receivedName: el('receivedName').value.trim(),
    receivedDesg: el('receivedDesg').value.trim(),
    receivedDate: el('receivedDate').value || '',
    recSecName: el('recSecName').value.trim(),
    recSecReg: el('recSecReg').value.trim(),
    recSecDate: el('recSecDate').value || '',
    generatedAt: new Date().toISOString()
  };
}

/* Print current form (renders copies then prints) */
function printCurrent(){
  renderCopiesFromForm();
  // small delay to ensure DOM updated
  setTimeout(()=> window.print(), 450);
}

/* Export PDF (one A4 with two copies stacked) */
async function exportPDF(){
  renderCopiesFromForm();
  // render top copy DOM to canvas (full height containing two copies)
  const paper = document.querySelector('.paper');
  // temporarily ensure watermark visible
  el('watermark').style.opacity = '0.06';
  const canvas = await html2canvas(paper, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  el('watermark').style.opacity = '';
  const imgData = canvas.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();
  // scale canvas image to fit a4 width
  pdf.addImage(imgData, 'JPEG', 0, 0, pageW, pageH);
  const gp = el('metaGpNo').textContent.replace(/\s+/g,'_') || 'GatePass';
  pdf.save(`GatePass_${gp}.pdf`);
}

/* Print a specific history record (rendered separately) */
function printFromHistoryRecord(obj){
  renderCopiesFromData(obj);
  setTimeout(()=> window.print(), 300);
}

/* Print from history helper above */
function printFromHistory(i){
  printFromHistory(parseInt(i,10));
}

/* Reset form */
function resetForm(){
  clearRows();
  ['godownManual','vehicleNo','personCarrying','authorityPerson','remarks',
   'issuedName','issuedDesg','issuedDate','issueSecName','issueSecReg','issueSecDate',
   'receivedName','receivedDesg','receivedDate','recSecName','recSecReg','recSecDate'].forEach(id=>{
    if(el(id)) el(id).value='';
  });
  el('genOn').textContent = new Date().toLocaleString();
  renderCopiesFromForm();
}

/* Utility */
function escapeHTML(s=''){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }

/* Autofill consignor mapping */
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  if(!v) return;
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){ el('consignee').value = map[v].consignee || el('consignee').value; el('authorityPerson').value = map[v].authority || el('authorityPerson').value; }
}

/* render copies from data object (helper used by history printing) */
function renderCopiesFromData(data){
  // convert items units subtotal field for display
  data.unitSub = Array.isArray(data.items) ? (() => {
    const s = {};
    data.items.forEach(it => { s[it.unit] = (s[it.unit]||0) + (parseFloat(it.qty)||0); });
    return Object.keys(s).map(u => `${u}: ${s[u]}`).join(' | ');
  })() : '';
  renderCopiesFromForm(); // ensure current form copies updated
  // but we explicitly build copies for given data
  el('copyTop').innerHTML = buildCopyHtml(data);
  el('copyBottom').innerHTML = buildCopyHtml(data);
}

/* Open-from-history printing (wrapper) */
function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  renderCopiesFromData(it);
  setTimeout(()=> window.print(), 400);
}
