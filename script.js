/* script.js - v13.3 FULL
   Save -> Google Sheet via Apps Script, preview, print/pdf, history, tag/sr toggle
*/

const APPS_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";

const el = id => document.getElementById(id);
const qAll = sel => Array.from(document.querySelectorAll(sel));

document.addEventListener("DOMContentLoaded", () => {
  bind();
  populateDatalist();
  addRow();        // start with one row
  generateLocalGP();
  if (el("metaDate")) el("metaDate").value = new Date().toISOString().slice(0,10);
  if (el("genOn")) el("genOn").textContent = new Date().toLocaleString();
  renderPreview();
});

/* ---------- BIND ---------- */
function bind(){
  if(el("btnAddRow")) el("btnAddRow").onclick = addRow;
  if(el("btnClearRows")) el("btnClearRows").onclick = clearRows;
  if(el("saveBtn")) el("saveBtn").onclick = onSave;
  if(el("printBtn")) el("printBtn").onclick = printFourCopies;
  if(el("pdfBtn")) el("pdfBtn").onclick = downloadPDFFourCopies;
  if(el("chkTag")) el("chkTag").onchange = toggleColumns;
  if(el("chkSr")) el("chkSr").onchange = toggleColumns;
  if(el("openHistory")) el("openHistory").onclick = ()=> { el("historyPanel").setAttribute("aria-hidden","false"); renderHistory(); };
  if(el("closeHistory")) el("closeHistory").onclick = ()=> el("historyPanel").setAttribute("aria-hidden","true");
  if(el("clearHistory")) el("clearHistory").onclick = ()=> { localStorage.removeItem("gwtpl_backup"); renderHistory(); };

  qAll("input,select,textarea").forEach(inp => inp.addEventListener("input", () => { computeTotals(); renderPreview(); }));
}

/* ---------- DATALIST ---------- */
function populateDatalist(){
  const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
  const ds = el('recentGodowns'); if(!ds) return;
  ds.innerHTML = '';
  Object.keys(map).reverse().forEach(k => { const o = document.createElement('option'); o.value = k; ds.appendChild(o); });
}

/* ---------- GATEPASS SERIAL ---------- */
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

/* ---------- ITEMS ---------- */
function addRow(prefill = {}){
  const tbody = el('itemsBody');
  const tr = document.createElement('tr');
  tr.innerHTML = `
    <td class="sr">${tbody.children.length + 1}</td>
    <td><input class="itm-name" placeholder="Item description" value="${escape(prefill.name||'')}"></td>
    <td class="col-tag"><input class="itm-tag" placeholder="Tag No" value="${escape(prefill.tag||'')}"></td>
    <td class="col-sr"><input class="itm-sr" placeholder="Sr No" value="${escape(prefill.srno||'')}"></td>
    <td><input class="itm-qty" type="number" min="0" placeholder="Qty" value="${escape(prefill.qty||'')}"></td>
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
    <td><input class="itm-remarks" placeholder="Remarks" value="${escape(prefill.remarks||'')}"></td>
    <td><button type="button" class="btn muted rm">Remove</button></td>
  `;
  tbody.appendChild(tr);

  // listeners
  tr.querySelector('.rm').addEventListener('click', ()=> { tr.remove(); renumber(); computeTotals(); renderPreview(); });
  tr.querySelectorAll('input,select').forEach(i => i.addEventListener('input', ()=> { computeTotals(); renderPreview(); }));

  renumber(); computeTotals(); toggleColumns(); renderPreview();
}

function clearRows(){ el('itemsBody').innerHTML=''; addRow(); computeTotals(); renderPreview(); }
function renumber(){ qAll('#itemsBody tr').forEach((tr,i)=> tr.querySelector('.sr').textContent = i+1); }

/* ---------- TOTALS ---------- */
function computeTotals(){
  const qtyEls = qAll('.itm-qty');
  const total = qtyEls.reduce((s,e)=> s + (parseFloat(e.value)||0), 0);
  if(el('totalQty')) el('totalQty').textContent = total;
  const rows = qAll('#itemsBody tr').map(tr => ({unit: tr.querySelector('.itm-unit').value, qty: parseFloat(tr.querySelector('.itm-qty').value)||0}));
  const subtotal = {};
  rows.forEach(r => { subtotal[r.unit] = (subtotal[r.unit]||0) + r.qty; });
  const parts = Object.keys(subtotal).map(u => `${u}: ${subtotal[u]}`);
  if(el('unitSubtotals')) el('unitSubtotals').textContent = parts.length ? 'Subtotals — ' + parts.join(' | ') : '';
}

/* ---------- TOGGLE COLUMNS ---------- */
function toggleColumns(){
  const showTag = el('chkTag') && el('chkTag').checked;
  const showSr = el('chkSr') && el('chkSr').checked;
  if(el('thTag')) el('thTag').style.display = showTag ? '' : 'none';
  if(el('thSr')) el('thSr').style.display = showSr ? '' : 'none';
  qAll('.col-tag').forEach(td => td.style.display = showTag ? '' : 'none');
  qAll('.col-sr').forEach(td => td.style.display = showSr ? '' : 'none');
}

/* ---------- VALIDATION ---------- */
function validateForm(){
  if(!el('godownManual') || !el('godownManual').value.trim()){ alert('Consignor (Godown) is required'); if(el('godownManual')) el('godownManual').focus(); return false; }
  if(!el('metaDate') || !el('metaDate').value.trim()){ alert('Date is required'); if(el('metaDate')) el('metaDate').focus(); return false; }
  const rows = qAll('#itemsBody tr').map(tr => ({name: tr.querySelector('.itm-name').value.trim(), qty: tr.querySelector('.itm-qty').value.trim()}));
  if(!rows.some(r => r.name && r.qty && Number(r.qty) > 0)){ alert('Add at least one item with valid qty'); return false; }
  return true;
}

/* ---------- COLLECT DATA ---------- */
function collectFormData(){
  const items = qAll('#itemsBody tr').map(tr => ({
    sr: tr.querySelector('.sr').textContent,
    name: tr.querySelector('.itm-name').value,
    tag: tr.querySelector('.itm-tag').value,
    srno: tr.querySelector('.itm-sr').value,
    qty: tr.querySelector('.itm-qty').value,
    unit: tr.querySelector('.itm-unit').value,
    remarks: tr.querySelector('.itm-remarks').value
  }));
  return {
    gatePassNo: el('metaGpNo').textContent,
    date: el('metaDate').value,
    type: el('metaType').value,
    consignor: el('godownManual').value,
    consignee: el('consignee').value,
    vehicleNo: el('vehicleNo').value,
    personCarrying: el('personCarrying').value,
    authorityPerson: el('authorityPerson').value,
    totalQty: el('totalQty')?el('totalQty').textContent:0,
    unitSub: el('unitSubtotals')?el('unitSubtotals').textContent.replace('Subtotals — ',''):'',
    remarks: el('remarks').value,
    items,
    generatedAt: new Date().toISOString(),
    issuedName: el('issuedName')?el('issuedName').value:'',
    issuedDesg: el('issuedDesg')?el('issuedDesg').value:'',
    receivedName: el('receivedName')?el('receivedName').value:'',
    receivedDesg: el('receivedDesg')?el('receivedDesg').value:'',
  };
}

/* ---------- PREVIEW ---------- */
function renderPreview(){
  const data = collectFormData();
  const itemsHtml = (data.items||[]).map((r,i)=>`
    <tr>
      <td style="padding:6px;border:1px solid #e9f4f9;text-align:center">${i+1}</td>
      <td style="padding:6px;border:1px solid #e9f4f9">${escapeHTML(r.name)}</td>
      <td style="padding:6px;border:1px solid #e9f4f9;text-align:center">${escapeHTML(r.tag)}</td>
      <td style="padding:6px;border:1px solid #e9f4f9;text-align:center">${escapeHTML(r.srno)}</td>
      <td style="padding:6px;border:1px solid #e9f4f9;text-align:center">${escapeHTML(r.qty)}</td>
      <td style="padding:6px;border:1px solid #e9f4f9;text-align:center">${escapeHTML(r.unit)}</td>
      <td style="padding:6px;border:1px solid #e9f4f9">${escapeHTML(r.remarks)}</td>
    </tr>`).join('') || `<tr><td colspan="7" style="text-align:center;padding:12px;color:#666">No items</td></tr>`;

  const html = `
    <div style="font-family:Arial;color:#123;">
      <div style="display:flex;align-items:center;justify-content:space-between;margin-bottom:8px">
        <img src="${escapeHTML(el('logoImg').src)}" style="width:72px">
        <div style="flex:1;text-align:center">
          <div style="font-weight:800;color:#0a4b76">GLOBUS WAREHOUSING & TRADING PVT LTD</div>
          <div style="font-weight:700">ABOHAR</div>
          <div style="font-weight:800;margin-top:6px">STOCK TRANSFER VOUCHER</div>
        </div>
        <div style="width:220px;text-align:right">
          <div style="font-size:12px;color:#666">Gate Pass No</div>
          <div style="border:1px solid #222;padding:6px;font-weight:700;background:#fafafa;margin-top:6px">${escapeHTML(data.gatePassNo)}</div>
          <div style="margin-top:8px">Date: ${escapeHTML(data.date || '')}</div>
          <div>Type: ${escapeHTML(data.type || '')}</div>
        </div>
      </div>

      <table style="width:100%;border-collapse:collapse">
        <thead>
          <tr style="background:#f7fbfd;color:#123;font-weight:800">
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
            <td colspan="4" style="text-align:right;padding:8px;border:1px solid #e9f4f9;font-weight:700">Total Qty</td>
            <td style="padding:8px;border:1px solid #e9f4f9;text-align:center;font-weight:700">${escapeHTML(String(data.totalQty||0))}</td>
            <td colspan="2" style="border:1px solid #e9f4f9"></td>
          </tr>
          <tr><td colspan="7" style="padding:8px;border:1px solid #e9f4f9;color:#123">${escapeHTML('Subtotals — '+ (data.unitSub||''))}</td></tr>
        </tfoot>
      </table>

      <div style="display:flex;justify-content:space-between;margin-top:12px;gap:12px">
        <div style="flex:1;border:1px solid #e9f4f9;padding:8px;border-radius:6px">
          <div style="font-weight:700;margin-bottom:6px">Remarks</div>
          <div>${escapeHTML(data.remarks||'')}</div>
          <div style="margin-top:8px;text-align:center;color:#a50000;font-weight:800">Goods are not for sale — only site to site transfer</div>
        </div>
        <div style="width:180px;text-align:center">
          <div style="font-size:12px;color:#666">Generated on</div>
          <div style="font-size:12px;color:#333;margin-top:6px">${new Date(data.generatedAt).toLocaleString()}</div>
          <div id="qr-placeholder" style="margin-top:8px"></div>
        </div>
      </div>
    </div>
  `;
  if(el('previewCopy')) el('previewCopy').innerHTML = html;

  // generate QR
  const ph = el('previewCopy') ? el('previewCopy').querySelector('#qr-placeholder') : null;
  if(ph){ ph.innerHTML = ''; try { new QRCode(ph, { text: `${data.gatePassNo} | ${data.date} | ${data.consignor}`, width:100, height:100 }); } catch(e){ console.warn(e); } }
}

/* ---------- PRINT AREA (4 copies) ---------- */
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
    wrapper.style.pageBreakAfter = 'always';
    wrapper.innerHTML = el('previewCopy').innerHTML; // use preview HTML
    // replace "Generated on" or label if needed
    // append label as small header
    const header = document.createElement('div');
    header.style.position='absolute'; header.style.left='12mm'; header.style.top='12mm'; header.style.fontSize='12px'; header.style.color='#666';
    header.textContent = lbl;
    wrapper.appendChild(header);

    // ensure QR generated inside wrapper
    const ph = wrapper.querySelector('#qr-placeholder');
    if(ph){ ph.innerHTML = ''; try { new QRCode(ph, { text: `${data.gatePassNo} | ${data.date} | ${data.consignor}`, width:110, height:110 }); } catch(e){} }

    printContainer.appendChild(wrapper);
  });

  // subtle background logo for print
  printContainer.style.backgroundRepeat = 'no-repeat';
  printContainer.style.backgroundPosition = 'center';
  printContainer.style.backgroundSize = '60%';
  document.body.appendChild(printContainer);
  return printContainer;
}

function printFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const area = buildPrintAreaWithFourCopies(data);
  setTimeout(()=>{ window.print(); setTimeout(()=> area.remove(),900); }, 400);
}

/* ---------- PDF ---------- */
async function downloadPDFFourCopies(){
  if(!validateForm()) return;
  const data = collectFormData();
  const area = buildPrintAreaWithFourCopies(data);
  // render to canvas
  const canv = await html2canvas(area, { scale: 2, useCORS: true, backgroundColor: '#ffffff' });
  area.remove();
  // create pdf pages by slicing if large
  const imgData = canv.toDataURL('image/jpeg', 0.95);
  const { jsPDF } = window.jspdf;
  const pdf = new jsPDF('p','mm','a4');
  pdf.addImage(imgData, 'JPEG', 0, 0, pdf.internal.pageSize.getWidth(), pdf.internal.pageSize.getHeight());
  const fileName = `GatePass_${(el('metaGpNo')?el('metaGpNo').textContent.replaceAll('/','_'):'GatePass')}.pdf`;
  pdf.save(fileName);
}

/* ---------- SAVE (Google Sheet via Apps Script) ---------- */
async function onSave(){
  if(!validateForm()) return;
  const payload = collectFormData();

  // save consignor mapping locally
  const consignor = payload.consignor;
  if(consignor){
    const map = JSON.parse(localStorage.getItem('gwtpl_godown_map')||'{}');
    map[consignor] = { consignee: payload.consignee, authority: payload.authorityPerson };
    localStorage.setItem('gwtpl_godown_map', JSON.stringify(map));
  }

  try{
    const resp = await fetch(APPS_SCRIPT_URL, { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify(payload) });
    const j = await resp.json().catch(()=>null);
    // treat as success if response.ok
    if(resp && resp.ok){ saveLocal(payload); // increment local serial only on success
      incrementLocal();
      alert('Saved → Google Sheet & Local backup.');
      resetForm(); renderHistory();
    } else {
      // fallback
      saveLocal(payload);
      alert('Server responded with error — saved locally.');
      resetForm(); renderHistory();
    }
  }catch(e){
    console.warn('Server save failed', e);
    saveLocal(payload);
    alert('Server error — saved locally.');
    resetForm(); renderHistory();
  }
}

/* ---------- LOCAL BACKUP & HISTORY ---------- */
function saveLocal(data){
  const arr = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  arr.unshift(data);
  if(arr.length>500) arr.splice(500);
  localStorage.setItem('gwtpl_backup', JSON.stringify(arr));
}

function renderHistory(){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');
  const container = el('historyList'); if(!container) return;
  container.innerHTML = '';
  if(!list.length){ container.innerHTML = '<div style="padding:8px;color:#666">No saved records</div>'; return; }
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
  if(el('metaGpNo')) el('metaGpNo').textContent = it.gatePassNo || '';
  if(el('metaDate')) el('metaDate').value = it.date || '';
  if(el('godownManual')) el('godownManual').value = it.consignor || '';
  if(el('consignee')) el('consignee').value = it.consignee || '';
  if(el('vehicleNo')) el('vehicleNo').value = it.vehicleNo || '';
  if(el('personCarrying')) el('personCarrying').value = it.personCarrying || '';
  if(el('authorityPerson')) el('authorityPerson').value = it.authorityPerson || '';
  el('itemsBody').innerHTML = ''; (it.items||[]).forEach(r => addRow({name:r.name,tag:r.tag,srno:r.srno,qty:r.qty,unit:r.unit,remarks:r.remarks}));
  if(el('remarks')) el('remarks').value = it.remarks || '';
  computeTotals(); renderPreview(); el('historyPanel').setAttribute('aria-hidden','true');
}

function printFromHistory(i){
  const list = JSON.parse(localStorage.getItem('gwtpl_backup')||'[]'); const it = list[i]; if(!it) return;
  buildPrintAreaWithFourCopies(it);
  setTimeout(()=> window.print(), 400);
}

/* ---------- RESET ---------- */
function resetForm(){
  if(el('godownManual')) el('godownManual').value = '';
  if(el('consignee')) el('consignee').value = 'GWTPL Abohar';
  if(el('vehicleNo')) el('vehicleNo').value = '';
  if(el('personCarrying')) el('personCarrying').value = '';
  if(el('authorityPerson')) el('authorityPerson').value = 'Sh.';
  if(el('remarks')) el('remarks').value = '';
  el('itemsBody').innerHTML = ''; addRow();
  if(el('genOn')) el('genOn').textContent = new Date().toLocaleString();
  renderPreview();
}

/* ---------- UTIL ---------- */
function escapeHTML(s=''){ return (''+s).replaceAll('&','&amp;').replaceAll('<','&lt;').replaceAll('>','&gt;').replaceAll('"','&quot;'); }
function escape(s=''){ return (''+s).replace(/"/g,'&quot;').replace(/'/g,"&#39;"); }
function escapeHTMLAttr(s=''){ return (''+s).replaceAll('"','&quot;'); }
function escapeHTMLText(s=''){ return escapeHTML(s); }
function escapeUnicode(s=''){ return s; }
function escapeForTemplate(s=''){ return s; }
function escapeInput(s=''){ return s; }

function escapeHTMLSimple(s=''){ return s ? String(s).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c])) : ''; }
function escapeHTMLFinal(s=''){ return escapeHTMLSimple(s); }
function escapeHTMLsafe(s=''){ return escapeHTMLSimple(s); }

// Utility used in preview
function escapeHTML(u){ return escapeHTMLsafe(u); }
function formatPrintedOn(d){ const dd=String(d.getDate()).padStart(2,'0'); const mm=String(d.getMonth()+1).padStart(2,'0'); const yyyy=d.getFullYear(); let hrs=d.getHours(); let mins=String(d.getMinutes()).padStart(2,'0'); const ampm=hrs>=12?'PM':'AM'; hrs=hrs%12||12; return `${dd}-${mm}-${yyyy} | ${hrs}:${mins} ${ampm}`; }

/* (NO EXTRA BRACKETS HERE) */
