/* v12 script - responsive + QR + print-4 + printed-on + Goods note + Google Sheet */
const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";

document.addEventListener('DOMContentLoaded', boot);
const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

function boot(){
  bind();
  populateDatalist();
  addRow();
  generateLocalGP();
  el('metaDate').value = new Date().toISOString().slice(0,10);
  el('genOn').textContent = new Date().toLocaleString();
  renderPreviewFromForm();
}

/* bind events */
function bind(){
  el('btnAddRow').addEventListener('click', addRow);
  el('btnClearRows').addEventListener('click', clearRows);
  el('saveBtn').addEventListener('click', onSave);
  el('printBtn').addEventListener('click', printFourCopies);
  el('pdfBtn').addEventListener('click', downloadPDFFourCopies);
  el('chkTag').addEventListener('change', toggleColumns);
  el('chkSr').addEventListener('change', toggleColumns);

  el('openHistory').addEventListener('click', ()=> { el('historyPanel').setAttribute('aria-hidden','false'); renderHistory(); });
  el('closeHistory').addEventListener('click', ()=> el('historyPanel').setAttribute('aria-hidden','true'));
  el('clearHistory').addEventListener('click', ()=> { localStorage.removeItem('gwtpl_backup'); renderHistory(); });

  el('godownManual').addEventListener('change', onConsignorChange);
  qAll('input,select,textarea').forEach(i => i.addEventListener('input', ()=> { computeTotal(); renderPreviewFromForm(); }));
  el('itemsBody').addEventListener('input', ()=> { computeTotal(); renderPreviewFromForm(); });
}

/* datalist recent consignors */
function populateDatalist(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns'); ds.innerHTML='';
  Object.keys(map).reverse().forEach(k => { const o=document.createElement('option'); o.value=k; ds.appendChild(o); });
}

/* items logic */
let itemCounter = 0;
function addRow(prefill = {}){
  itemCounter++;
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr"> ${getRowCount()+1} </td>
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
  tr.querySelector('.itm-qty').addEventListener('input', ()=> { computeTotal(); renderPreviewFromForm(); });
  tr.querySelector('.itm-unit').addEventListener('change', ()=> { computeTotal(); renderPreviewFromForm(); });
  renumber(); computeTotal(); toggleColumns(); renderPreviewFromForm();
}
function getRowCount(){ return qAll('#itemsBody tr').length; }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }
function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotal(); renderPreviewFromForm(); }

/* totals & subtotals */
function computeTotal(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,e)=> s + (parseFloat(e.value)||0), 0);
  el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({unit: tr.querySelector('.itm-unit').value, qty: parseFloat(tr.querySelector('.itm-qty').value)||0}));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* toggle Tag/Sr display */
function toggleColumns(){
  const showTag = el('chkTag').checked;
  const showSr = el('chkSr').checked;
  qAll('.itm-tag').forEach(x => x.style.display = showTag ? '' : 'none');
  qAll('.itm-sr').forEach(x => x.style.display = showSr ? '' : 'none');
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
  renderPreviewFromForm();
}

/* GatePass number generator (year reset) */
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

/* validation */
function validateForm(){
  qAll('.error').forEach(e=> e.classList.remove('error'));
  if(!el('godownManual').value.trim()){ el('godownManual').classList.add('error'); el('godownManual').focus(); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({name: tr.querySelector('.itm-name').value.trim(), qty: tr.querySelector('.itm-qty').value.trim()}));
  if(!rows.some(r => r.name && r.qty && Number(r.qty) > 0)){ alert('Add at least one item with valid qty'); return false; }
  return true;
}

/* Save -> Google Sheet + local backup */
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
    unitSub: el('unitSubtotals').textContent.replace('Subtotals — ',''),
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

  // store consignor mapping locally
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
  }

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

/* local backup */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

/* history */
function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList'); container.innerHTML='';
  if(!list.length){ container.innerHTML = '<div style="color:#666;padding:8px">No saved records</div>'; return; }
  list.slice(0,100).forEach((it, idx) => {
    const node = document.createElement('div'); node.className='hist-row'; node.style.padding='8px'; node.style.borderBottom='1px solid #eef6fb';
    node.innerHTML = `<div style="font-weight:700">${it.gatePassNo} • ${it.date}</div>
      <div style="font-size:13px;color:#444">${it.consignor || ''}</div>
      <div style="margin-top:8px">
        <button data-i="${idx}" class="btn muted hist-open">Open</button>
        <button data-i="${idx}" class="btn hist-print">Print</button>
      </div>`;
    container.appendChild(node);
  });
  qAll('.hist-open').forEach(b => b.addEventListener('click', e => openFromHistory(parseInt(e.target.dataset.i,10))));
  qAll('.hist-print').forEach(b => b.addEventListener('click', e => printFromHistory(parseInt(e.target.dataset.i,10))));
}

function openFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  el('metaGpNo').textContent = it.gatePassNo || ''; el('metaDate').value = it.date || '';
  el('godownManual').value = it.consignor || ''; el('consignee').value = it.consignee || '';
  el('vehicleNo').value = it.vehicleNo || ''; el('personCarrying').value = it.personCarrying || ''; el('authorityPerson').value = it.authorityPerson || '';
  el('itemsBody').innerHTML = ''; (it.items||[]).forEach(r => addRow({name:r.name,tag:r.tag,sr:r.srno,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  el('remarks').value = it.remarks || '';
  el('issuedName').value = it.issuedName || ''; el('issuedDesg').value = it.issuedDesg || ''; el('issuedDate').value = it.issuedDate || '';
  el('issueSecName').value = it.issueSecName || ''; el('issueSecReg').value = it.issueSecReg || ''; el('issueSecDate').value = it.issueSecDate || '';
  el('receivedName').value = it.receivedName || ''; el('receivedDesg').value = it.receivedDesg || ''; el('receivedDate').value = it.receivedDate || '';
  el('recSecName').value = it.recSecName || ''; el('recSecReg').value = it.recSecReg || ''; el('recSecDate').value = it.recSecDate || '';
  computeTotal(); renderPreviewFromForm(); el('historyPanel').setAttribute('aria-hidden','true');
}

function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  buildPrintAreaWithFourCopies(it);
  setTimeout(()=> window.print(), 400);
}

/* render preview from form */
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
    vehicleNo: el('vehicleNo').value.trim(),
    personCarrying: el('personCarrying').value.trim(),
    authorityPerson: el('authorityPerson').value.trim(),
    items,
    totalQty: el('totalQty').textContent,
    unitSub: el('unitSubtotals').textContent.replace('Subtotals — ',''),
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

/* build HTML for one copy */
function buildCopyHtml(data, label){
  const itemsHtml = (data.items||[]).map(r => `
    <tr>
      <td style="border:1px solid #e9f4f9;padding:6px">${escapeHTML(r.sr||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px">${escapeHTML(r.name||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px">${escapeHTML(r.tag||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px">${escapeHTML(r.srno||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px;text-align:center">${escapeHTML(r.qty||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px;text-align:center">${escapeHTML(r.unit||'')}</td>
      <td style="border:1px solid #e9f4f9;padding:6px">${escapeHTML(r.remarks||'')}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;color:#666;padding:18px">No items</td></tr>`;

  const header = `
    <div style="display:flex;align-items:center;gap:12px;margin-bottom:6px">
      <img src="${escapeHTML(el('logoImg').src)}" style="width:72px">
      <div style="flex:1;text-align:center">
        <div style="font-weight:800;color:#0a4b76;font-size:16px">GLOBUS WAREHOUSING &amp; TRADING PRIVATE LIMITED</div>
        <div style="font-weight:700;color:#0b4a61;margin-top:4px">ABOHAR</div>
        <div style="font-weight:800;color:#0b4a61;margin-top:6px">STOCK TRANSFER VOUCHER</div>
      </div>
      <div style="width:220px">
        <div style="font-size:12px;color:#666;font-weight:700">${label}</div>
        <div style="font-size:12px;color:#666;margin-top:6px">Gate Pass No</div>
        <div style="border:1px solid #222;padding:8px;font-weight:700;background:#fafafa;margin:6px 0">${escapeHTML(data.gatePassNo||'')}</div>
        <div style="display:flex;gap:6px">
          <div style="flex:1"><div style="font-size:12px;color:#666">Date</div><div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(data.date||'')}</div></div>
          <div style="flex:1"><div style="font-size:12px;color:#666">Type</div><div style="padding:6px;border:1px solid #e6eef5">${escapeHTML(data.type||'')}</div></div>
        </div>
      </div>
    </div>`;

  const details = `
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

  const table = `
    <table style="width:100%;border-collapse:collapse;margin-top:10px">
      <thead>
        <tr style="background:#f7fbfd;color:#12323b;font-weight:800">
          <th style="padding:6px;border:1px solid #e9f4f9;width:6%">Sr</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:44%">Item Description</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:12%">Tag No</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:10%">Sr No</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:8%">Qty</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:8%">Unit</th>
          <th style="padding:6px;border:1px solid #e9f4f9;width:12%">Remarks</th>
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

  const remarks = `
    <div style="display:flex;justify-content:space-between;gap:12px;margin-top:12px">
      <div style="flex:1;border:1px solid #e9f4f9;padding:8px;border-radius:6px">
        <div style="font-weight:700;color:#12323b;margin-bottom:6px">Remarks</div>
        <div style="min-height:40px">${escapeHTML(data.remarks||'')}</div>
        <div style="margin-top:8px;text-align:center;color:#a50000;font-weight:800">Goods are not for sale — only site to site transfer</div>
      </div>
      <div style="width:180px;text-align:center">
        <div style="font-size:12px;color:#666;margin-bottom:8px">Generated on</div>
        <div style="font-size:12px;color:#333">${escapeHTML(data.generatedAt ? (new Date(data.generatedAt)).toLocaleString() : (new Date()).toLocaleString())}</div>
        <div id="qr-placeholder" style="margin-top:8px"></div>
      </div>
    </div>`;

  const signatures = `
    <div style="display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:12px">
      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignee / Issued By</div>
        <div>Name: ${escapeHTML(data.issuedName||'')}</div>
        <div>Designation: ${escapeHTML(data.issuedDesg||'')}</div>
        <div>Date: ${escapeHTML(data.issuedDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp &amp; Sign</div>
      </div>

      <div style="border:1px solid #e9f4f9;padding:10px;border-radius:6px">
        <div style="font-weight:800;color:#0b4a61;margin-bottom:6px">Consignor / Received By</div>
        <div>Name: ${escapeHTML(data.receivedName||'')}</div>
        <div>Designation: ${escapeHTML(data.receivedDesg||'')}</div>
        <div>Date: ${escapeHTML(data.receivedDate||'')}</div>
        <div style="margin-top:8px" class="stamp">Stamp &amp; Sign — Security</div>
      </div>
    </div>`;

  const printedOn = `<div style="text-align:right;font-size:11px;color:#666;margin-top:8px">Printed on: ${formatPrintedOn(new Date())}</div>`;

  return `<div style="position:relative;z-index:1;padding-bottom:18px">${header}${details}${table}${remarks}${signatures}${printedOn}</div>`;
}

/* generate preview for single page */
function renderPreviewFromForm(){
  const data = collectFormData();
  const html = buildCopyHtml(data, 'Office Copy');
  el('previewCopy').innerHTML = html;
  // generate QR in preview
  generateQRCode(el('previewCopy').querySelector('#qr-placeholder'), data);
}

/* build print area with 4 pages and append to body */
function buildPrintAreaWithFourCopies(data){
  const old = document.getElementById('printContainer'); if(old) old.remove();
  const printContainer = document.createElement('div'); printContainer.id = 'printContainer';

  const labels = ['Office Copy','Security Copy','Office Copy','Security Copy'];
  labels.forEach(lbl => {
    const wrapper = document.createElement('div');
    wrapper.style.width = '210mm';
    wrapper.style.minHeight = '297mm';
    wrapper.style.boxSizing = 'border-box';
    wrapper.style.padding = '12mm';
    wrapper.style.border = '1px solid var(--page-border)';
    wrapper.style.background = '#fff';
    wrapper.style.margin = '0';
    wrapper.style.position = 'relative';
    wrapper.style.pageBreakAfter = 'always';
    wrapper.innerHTML = buildCopyHtml(data, lbl);
    // QR
    const ph = wrapper.querySelector('#qr-placeholder');
    if(ph) generateQRCode(ph, data);
    // printed on bottom-right (absolute)
    const pfoot = document.createElement('div');
    pfoot.style.position = 'absolute';
    pfoot.style.right = '12mm';
    pfoot.style.bottom = '12mm';
    pfoot.style.fontSize = '11px';
    pfoot.style.color = '#666';
    pfoot.textContent = `Printed on: ${formatPrintedOn(new Date())}`;
    wrapper.appendChild(pfoot);
    printContainer.appendChild(wrapper);
  });

  // add subtle background logo for print by inline style (so html2canvas picks it)
  printContainer.style.backgroundImage = `url("${escapeHTML(el('logoImg').src)}")`;
  printContainer.style.backgroundRepeat = 'no-repeat';
  printContainer.style.backgroundPosition = 'center';
  printContainer.style.backgroundSize = '60%';
  document.body.appendChild(printContainer);
  return printContainer;
}

/* print action */
function printFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const printArea = buildPrintAreaWithFourCopies(data);
  setTimeout(()=> {
    window.print();
    setTimeout(()=> { printArea.remove(); }, 900);
  }, 400);
}

/* PDF download - render printArea and convert */
async function downloadPDFFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const printArea = buildPrintAreaWithFourCopies(data);
  // html2canvas full
  const canv = await html2canvas(printArea, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  printArea.remove();

  const img = canv.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  const pageW = pdf.internal.pageSize.getWidth();
  const pageH = pdf.internal.pageSize.getHeight();

  // slice the large canvas into A4-height images
  const canvasW = canv.width;
  const canvasH = canv.height;
  const pxPerPage = Math.floor(canvasW * (pageH / pageW));
  let y = 0;
  let page = 0;
  while(y < canvasH){
    const sliceH = Math.min(pxPerPage, canvasH - y);
    const tmp = document.createElement('canvas');
    tmp.width = canvasW;
    tmp.height = sliceH;
    const ctx = tmp.getContext('2d');
    ctx.drawImage(canv, 0, y, canvasW, sliceH, 0, 0, canvasW, sliceH);
    const dataUrl = tmp.toDataURL('image/jpeg', 0.95);
    const hInPdf = (sliceH * pageW) / canvasW;
    if(page>0) pdf.addPage();
    pdf.addImage(dataUrl, 'JPEG', 0, 0, pageW, hInPdf);
    y += sliceH; page++;
  }

  const gp = el('metaGpNo').textContent.replaceAll('/','_') || 'GatePass';
  pdf.save(`GatePass_${gp}.pdf`);
}

/* history print wrapper */
function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  buildPrintAreaWithFourCopies(it);
  setTimeout(()=> window.print(), 400);
}

/* generate QR */
function generateQRCode(targetEl, data){
  if(!targetEl) return;
  targetEl.innerHTML = '';
  const qrText = `GatePass No: ${data.gatePassNo}\nDate: ${data.date}\nConsignor: ${data.consignor}\nTotalQty: ${data.totalQty}`;
  try{
    new QRCode(targetEl, { text: qrText, width: 110, height: 110, colorDark:"#000", colorLight:"#fff", correctLevel: QRCode.CorrectLevel.H });
  }catch(e){ console.warn('QR fail', e); }
}

/* reset */
function resetForm(){
  clearRows();
  ['godownManual','vehicleNo','personCarrying','authorityPerson','remarks',
   'issuedName','issuedDesg','issuedDate','issueSecName','issueSecReg','issueSecDate',
   'receivedName','receivedDesg','receivedDate','recSecName','recSecReg','recSecDate'].forEach(id=>{ if(el(id)) el(id).value=''; });
  el('genOn').textContent = new Date().toLocaleString();
  renderPreviewFromForm();
}

/* utilities */
function escapeHTML(s=''){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function formatPrintedOn(d){
  const dd = String(d.getDate()).padStart(2,'0');
  const mm = String(d.getMonth()+1).padStart(2,'0');
  const yyyy = d.getFullYear();
  let hrs = d.getHours(), mins = String(d.getMinutes()).padStart(2,'0');
  const ampm = hrs>=12?'PM':'AM';
  hrs = hrs % 12; hrs = hrs ? hrs : 12;
  return `${dd}-${mm}-${yyyy} | ${hrs}:${mins} ${ampm}`;
}

/* autofill consignor mapping */
function onConsignorChange(){
  const v = el('godownManual').value.trim();
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  if(map[v]){ el('consignee').value = map[v].consignee || el('consignee').value; el('authorityPerson').value = map[v].authority || el('authorityPerson').value; }
}
