// CONFIG
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbzRQnXv5VJe8Io0QSyNEddGvZazOFU_QVLdrT7tCWoP9D_0kIJKR6pXv68bs_6rMotFug/exec";

/* DOM refs */
const gpNoEl = document.getElementById('gpNo');
const qrcodeEl = document.getElementById('qrcode');
const previewCopyBadge = document.getElementById('previewCopyBadge');
const itemsHead = document.getElementById('itemsHead');
const itemsBody = document.getElementById('itemsBody');
const toggleTag = document.getElementById('toggleTag');
const toggleSr = document.getElementById('toggleSr');
const toggleRemarks = document.getElementById('toggleRemarks');
const addItemBtn = document.getElementById('addItem');
const savePrintBtn = document.getElementById('savePrint');
const downloadPdfBtn = document.getElementById('downloadPdf');
const fetchDuplicateBtn = document.getElementById('fetchDuplicate');
const duplicateInput = document.getElementById('duplicateGPNo');
const printedInfoEl = document.getElementById('printedInfo');
const gpDateEl = document.getElementById('gpDate');
const subTotalsEl = document.getElementById('subTotals');
const unitTotalsEl = document.getElementById('unitTotals');
const printMrPrefixCheckbox = document.getElementById('printMrPrefix');

let items = [];
let enableTag = false, enableSr = false, enableRemarksFlag = true;

/* helpers */
function pad(n,len=4){ return String(n).padStart(len,'0'); }
function todayISO(){ const d=new Date(); return d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'); }
function formatDateDDMMMYYYY(iso){ if(!iso) return ''; const d=new Date(iso); const pad2=s=>String(s).padStart(2,'0'); const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${pad2(d.getDate())}-${m[d.getMonth()]}-${d.getFullYear()}`; }
function nowStamp(){ const d=new Date(); const pad2=s=>String(s).padStart(2,'0'); const m=['Jan','Feb','Mar','Apr','May','Jun','Jul','Aug','Sep','Oct','Nov','Dec']; return `${pad2(d.getDate())}-${m[d.getMonth()]}-${d.getFullYear()} ${pad2(d.getHours())}:${pad2(d.getMinutes())}:${pad2(d.getSeconds())}`; }
function showToast(msg,ms=2000){ const t=document.getElementById('toast'); t.textContent=msg; t.classList.add('show'); setTimeout(()=>t.classList.remove('show'),ms); }
function escapeHtml(s=''){ return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;'); }
function normalizeText(s=''){ return String(s||'').trim().replace(/\s+/g,' ').split(' ').map(w=>w ? (w.charAt(0).toUpperCase() + w.slice(1).toLowerCase()) : '').join(' '); }

/* Mr. prefix helper */
function addMr(name){
  const mrEnabled = printMrPrefixCheckbox && printMrPrefixCheckbox.checked;
  if(!name) return '';
  const clean = normalizeText(name);
  return mrEnabled ? (/^mr\.?\s/i.test(clean) ? clean : 'Mr. ' + clean) : clean;
}

/* QR */
function generateQR(text){
  qrcodeEl.innerHTML='';
  const box = document.createElement('div'); qrcodeEl.appendChild(box);
  try{ new QRCode(box,{text:text||'',width:90,height:90,correctLevel:QRCode.CorrectLevel.H}); }catch(e){ qrcodeEl.textContent='QR'; }
}
function getQrDataUrl(){
  const img = qrcodeEl.querySelector('img');
  if(img && img.src) return img.src;
  const canvas = qrcodeEl.querySelector('canvas');
  if(canvas) return canvas.toDataURL('image/png');
  return '';
}

/* render table head */
function renderHead(){
  itemsHead.innerHTML='';
  const tr = document.createElement('tr');
  tr.innerHTML = `<th class="col-sr">Sr</th><th class="col-desc">Item Description</th><th class="col-qty">Qty</th><th class="col-unit">Unit</th>`;
  if(enableTag) tr.insertAdjacentHTML('beforeend','<th class="col-tag">Tag No</th>');
  if(enableSr) tr.insertAdjacentHTML('beforeend','<th class="col-srno">SR No</th>');
  if(enableRemarksFlag) tr.insertAdjacentHTML('beforeend','<th class="col-remark">Remarks</th>');
  tr.insertAdjacentHTML('beforeend','<th class="col-sr">Action</th>');
  itemsHead.appendChild(tr);
}

/* auto-resize */
function autoResizeTextarea(el){ if(!el) return; el.style.height = 'auto'; const h = el.scrollHeight; el.style.height = (h + 2) + 'px'; }

/* render items */
function renderItems(){
  itemsBody.innerHTML='';
  items.forEach((it, idx)=>{
    const tr = document.createElement('tr');
    tr.innerHTML = `
      <td class="col-sr">${idx+1}</td>
      <td class="col-desc"><textarea data-i="${idx}" data-f="desc" placeholder="Item description">${escapeHtml(it.desc||'')}</textarea></td>
      <td class="col-qty"><input type="number" min="0" step="any" data-i="${idx}" data-f="qty" value="${it.qty||''}" placeholder="0"></td>
      <td class="col-unit">
        <select data-i="${idx}" data-f="unit">
          <option${it.unit==='nos'?' selected':''}>nos</option>
          <option${it.unit==='kg'?' selected':''}>kg</option>
          <option${it.unit==='ltr'?' selected':''}>ltr</option>
          <option${it.unit==='box'?' selected':''}>box</option>
          <option${it.unit==='set'?' selected':''}>set</option>
        </select>
      </td>
    `;
    if(enableTag) tr.insertAdjacentHTML('beforeend', `<td class="col-tag"><input data-i="${idx}" data-f="tag" value="${escapeHtml(it.tag||'')}" placeholder="Tag No"></td>`);
    if(enableSr) tr.insertAdjacentHTML('beforeend', `<td class="col-srno"><input data-i="${idx}" data-f="sr" value="${escapeHtml(it.sr||'')}" placeholder="SR No"></td>`);
    if(enableRemarksFlag) tr.insertAdjacentHTML('beforeend', `<td class="col-remark"><textarea data-i="${idx}" data-f="remark" placeholder="Remarks">${escapeHtml(it.remark||'')}</textarea></td>`);
    tr.insertAdjacentHTML('beforeend', `<td class="col-sr"><button class="remove-btn" data-i="${idx}">Remove</button></td>`);
    itemsBody.appendChild(tr);
  });

  itemsBody.querySelectorAll('textarea[data-f], input[data-f], select[data-f]').forEach(el=>{
    el.oninput = ()=>{
      const i = Number(el.dataset.i), f = el.dataset.f;
      let v = el.value;
      if(f === 'qty'){ v = v.replace(/[^0-9.]/g,''); el.value = v; }
      items[i][f] = v;
      if(el.tagName.toLowerCase() === 'textarea') autoResizeTextarea(el);
      computeTotals();
      updateQRFromFields(); // keep QR live updated
    };
    if(el.tagName.toLowerCase() === 'textarea') { autoResizeTextarea(el); }
  });

  itemsBody.querySelectorAll('.remove-btn').forEach(b=> b.onclick = ()=>{
    const i = Number(b.dataset.i);
    items.splice(i,1);
    renderHead(); renderItems(); computeTotals(); updateQRFromFields();
  });

  computeTotals();
}

/* totals */
function computeTotals(){
  const map = {};
  items.forEach(it=>{
    const u = it.unit || 'nos';
    const q = Number(it.qty) || 0;
    map[u] = (map[u] || 0) + q;
  });
  const parts = Object.keys(map).map(k=>`${k}: ${map[k]}`).join(' | ');
  subTotalsEl.textContent = parts || 'Subtotal: -';
  unitTotalsEl.textContent = Object.keys(map).length ? `Unit totals: ${parts}` : 'Unit totals: -';
}

/* add item */
addItemBtn.onclick = ()=> {
  items.push({desc:'',qty:'',unit:'nos',tag:'',sr:'',remark:''});
  renderHead(); renderItems();
  setTimeout(()=> {
    const last = document.querySelector('textarea[data-f="desc"][data-i="'+(items.length-1)+'"]');
    if(last) last.focus();
  },50);
};

/* toggles */
if(toggleTag) toggleTag.onchange = e => { enableTag = e.target.checked; if(!enableTag) items = items.map(it=>({...it,tag:''})); renderHead(); renderItems(); updateQRFromFields(); };
if(toggleSr) toggleSr.onchange = e => { enableSr = e.target.checked; if(!enableSr) items = items.map(it=>({...it,sr:''})); renderHead(); renderItems(); updateQRFromFields(); };
if(toggleRemarks) toggleRemarks.onchange = e => { enableRemarksFlag = e.target.checked; document.getElementById('remarks').style.display = enableRemarksFlag ? 'block' : 'none'; renderHead(); renderItems(); updateQRFromFields(); };

/* smart caps */
function attachSmartCaps(){
  ['consignor','personCarrying','vehicleNo','authPerson','authName1','authDesig1','authName2','authDesig2','outward1','outward2'].forEach(id=>{
    const el = document.getElementById(id);
    if(!el) return;
    el.addEventListener('blur', ()=>{ el.value = normalizeText(el.value); updateQRFromFields(); });
  });
}

/* init */
(function init(){
  gpDateEl.max = todayISO();
  gpDateEl.value = '';
  const preview = generatePreviewGP();
  gpNoEl.textContent = preview;
  items = [{desc:'',qty:'',unit:'nos',tag:'',sr:'',remark:''}];
  renderHead(); renderItems();
  attachSmartCaps();
  if(toggleRemarks){ toggleRemarks.checked = true; enableRemarksFlag = true; }
  previewCopyBadge.innerHTML = '<span class="label-text">[ OFFICE COPY ]</span>';
  updateQRFromFields();
})();

function generatePreviewGP(){
  const y = new Date().getFullYear();
  const cnt = Number(localStorage.getItem('gwtpl_preview')||0) + 1;
  return `GWTPL/ABO/${y}/${pad(cnt,4)}`;
}

/* reset */
document.getElementById('resetBtn').onclick = ()=> { if(confirm('Reset form?')) location.reload(); };

/* duplicate fetch */
fetchDuplicateBtn.onclick = async ()=>{
  const oldNo = duplicateInput.value.trim();
  if(!oldNo){ showToast('Enter Gate Pass No.'); duplicateInput.focus(); return; }
  showToast('Fetching record...');
  try{
    const resp = await fetch(GOOGLE_SCRIPT_URL + '?gp_no=' + encodeURIComponent(oldNo));
    const json = await resp.json();
    if(!json.success){ alert('No record found for ' + oldNo); return; }

    gpNoEl.textContent = json.gate_pass_no + ' (Duplicate)';
    document.getElementById('gpDate').value = json.date || '';
    document.getElementById('consignor').value = json.consignor || '';
    document.getElementById('personCarrying').value = json.person_carrying || '';
    document.getElementById('vehicleNo').value = json.vehicle_no || '';
    document.getElementById('authPerson').value = json.authorised_person || '';
    document.getElementById('remarks').value = json.remarks || '';
    try{ items = JSON.parse(json.items||'[]'); } catch(e){ items = []; }

    enableTag = items.some(it=>it.tag && it.tag.length>0);
    enableSr  = items.some(it=>it.sr && it.sr.length>0);
    if(toggleTag) toggleTag.checked = enableTag; if(toggleSr) toggleSr.checked = enableSr;

    renderHead(); renderItems();
    updateQRFromFields();
    showToast('Duplicate loaded — ready to print');
  }catch(err){ console.error(err); alert('Error fetching duplicate'); }
};

/* save to server */
async function saveToServer(payload){
  try{
    const res = await fetch(GOOGLE_SCRIPT_URL, {
      method:'POST',
      headers:{'Content-Type':'application/json'},
      body: JSON.stringify(payload),
      mode:'cors'
    });
    if(!res.ok) throw new Error('Network');
    return await res.json();
  }catch(err){
    console.warn('Save failed',err);
    return { success:false, error:err.message };
  }
}

/* Build printable HTML (4 copies) */
function makePrintableHTML(labelSuffix='', copyLabel='OFFICE COPY'){
  const gpNo = gpNoEl.textContent;
  const type = document.getElementById('gpType').value;
  const dateIso = document.getElementById('gpDate').value || '';
  const date = formatDateDDMMMYYYY(dateIso);
  const consignor = document.getElementById('consignor').value || '';
  const person = document.getElementById('personCarrying').value || '';
  const vehicle = document.getElementById('vehicleNo').value || '';
  const mrEnabled = printMrPrefixCheckbox && printMrPrefixCheckbox.checked;
  const authRaw = document.getElementById('authPerson').value || '';
  const auth = mrEnabled ? (/^mr\.?\s/i.test(authRaw) ? authRaw : 'Mr. ' + normalizeText(authRaw)) : normalizeText(authRaw);
  const remarks = document.getElementById('remarks').value || '';
  const consigneeUnit = document.getElementById('consignee').value || 'GWTPL Abohar';
  const abo = document.getElementById('aboTitle').textContent || 'Abohar';
  const qrData = getQrDataUrl();
  const hasTag = enableTag;
  const hasSr = enableSr;
  const hasRemarksCol = enableRemarksFlag;

  let itemsRows = items.map((it, idx)=>{
    return `<tr>
      <td>${idx+1}</td>
      <td>${escapeHtml(it.desc||'')}</td>
      <td style="text-align:center">${Number(it.qty)||0}</td>
      <td>${escapeHtml(it.unit||'nos')}</td>
      ${hasTag?`<td>${escapeHtml(it.tag||'')}</td>`:''}
      ${hasSr?`<td>${escapeHtml(it.sr||'')}</td>`:''}
      ${hasRemarksCol?`<td>${escapeHtml(it.remark||'')}</td>`:''}
    </tr>`;
  }).join('');
  if(!itemsRows) itemsRows = `<tr><td colspan="${4 + (hasTag?1:0) + (hasSr?1:0) + (hasRemarksCol?1:0)}">No items</td></tr>`;

  const PRINT_CSS = `
    :root{--border:#cfcfcf;--muted:#6b7280;--accent:#0b5394}
    body{font-family:Inter,Arial,Helvetica;margin:0;color:#06203a}
    @page{size:A4;margin:10mm}
    .paper{width:210mm;box-sizing:border-box;padding:14mm;position:relative;border:1px solid #000}
    .header{display:flex;align-items:center;justify-content:space-between;margin-bottom:6mm}
    .logo img{height:70px;width:70px}
    .title{flex:1;text-align:left;margin-left:8mm}
    .title h1{margin:0;font-size:20px;font-weight:800}
    .title p{margin:0;font-size:15px;font-weight:700;color:#6b7280}
    .qr{width:70px;height:70px;text-align:center}
    table{width:100%;border-collapse:collapse;font-size:12px;margin-top:6mm}
    table thead th{border-bottom:1px solid #ddd;padding:6px;text-align:left;background:#fafafa}
    table td{padding:6px;border-bottom:1px solid #f3f3f3;vertical-align:top}
    .sig-outer{border:2px solid #d1d5db;border-radius:6px;padding:12px;margin-top:8mm}
    .stamp-area{margin-top:8px;border-top:1.5px dashed #cfd8e3;padding-top:12px;height:80px;display:flex;align-items:center;justify-content:center;font-weight:700;background:transparent}
    .footer{margin-top:8mm;text-align:right;font-size:12px;color:#333}
    .copy-label{position:absolute;left:50%;transform:translateX(-50%);top:12mm;font-weight:400;opacity:1;font-size:16px;text-decoration:underline;letter-spacing:0.5px}
    .watermark{position:absolute;left:50%;top:45%;transform:translate(-50%,-50%);opacity:.04;width:62%}
  `;

  function makePage(label){
    return `
      <div class="paper" style="position:relative;">
        <div class="copy-label">${'['+label+']'}<span class="copy-sub"></span></div>
        <div class="watermark"><img src="https://gwtpl.co/logo.png" alt="wm" style="width:100%"></div>

        <div class="header">
          <div class="logo"><img src="https://gwtpl.co/logo.png" alt="logo"></div>
          <div class="title">
            <h1>Globus Warehousing and Trading Pvt. Ltd.</h1>
            <p>${abo}</p>
          </div>
          <div class="qr"><img src="${qrData}" width="70" height="70" alt="qr"><div style="font-weight:400;margin-top:6px;text-decoration:underline">${'['+label+']'}</div></div>
        </div>

        <div style="display:flex;gap:12px;">
          <div style="flex:1">
            <strong>Gate Pass No.</strong><div>${gpNo}</div>
            <div style="margin-top:8px"><strong>Type</strong><div>${type}</div></div>
            <div style="margin-top:8px"><strong>Date</strong><div>${date || '—'}</div></div>
          </div>
          <div style="width:320px">
            <div><strong>Consignor:</strong> ${escapeHtml(normalizeText(consignor))}</div>
            <div style="margin-top:6px"><strong>Consignee Unit:</strong> ${escapeHtml(consigneeUnit)}</div>
            <div style="margin-top:6px"><strong>Vehicle No.:</strong> ${escapeHtml(normalizeText(vehicle))}</div>
            <div style="margin-top:6px"><strong>Person Carrying:</strong> ${escapeHtml(normalizeText(person))}</div>
            <div style="margin-top:6px"><strong>Authorised:</strong> ${escapeHtml(auth)}</div>
          </div>
        </div>

        <table aria-label="items">
          <thead>
            <tr>
              <th style="width:5%">Sr</th>
              <th style="width:45%">Item Description</th>
              <th style="width:10%">Qty</th>
              <th style="width:10%">Unit</th>
              ${hasTag?'<th style="width:12%">Tag No</th>':''}
              ${hasSr?'<th style="width:12%">SR No</th>':''}
              ${hasRemarksCol?'<th style="width:18%">Remarks</th>':''}
            </tr>
          </thead>
          <tbody>${itemsRows}</tbody>
        </table>

        <div style="margin-top:8px;font-weight:700">Unit totals: ${subTotalsEl.textContent.replace('Subtotal: ','')}</div>

        <div class="note">Goods are not for sale — only site to site transfer</div>

        <div class="sig-outer">
          <strong>Consignee / Issued By</strong>
          <div class="sig-row" style="margin-top:10px">
            <div class="sig-block">
              <div><strong>For Security</strong></div>
              <div style="margin-top:6px">Outward Reg. Sr No: ${escapeHtml(document.getElementById('outward1').value || '')}</div>
              <div style="margin-top:6px">Date: ${formatDateDDMMMYYYY(document.getElementById('secDate1').value || '')}</div>
              <div class="stamp-area"></div>
            </div>
            <div class="sig-block">
              <div><strong>For Authorised Person</strong></div>
              <div style="margin-top:6px">Name: ${escapeHtml(normalizeText(document.getElementById('authName1').value||''))}</div>
              <div style="margin-top:6px">Designation: ${escapeHtml(normalizeText(document.getElementById('authDesig1').value||''))}</div>
              <div class="stamp-area"></div>
            </div>
          </div>
        </div>

        <div class="sig-outer" style="margin-top:8mm">
          <strong>Consignee / Received By</strong>
          <div class="sig-row" style="margin-top:10px">
            <div class="sig-block">
              <div><strong>For Security</strong></div>
              <div style="margin-top:6px">Outward Reg. Sr No: ${escapeHtml(document.getElementById('outward2').value||'')}</div>
              <div style="margin-top:6px">Date: ${formatDateDDMMMYYYY(document.getElementById('secDate2').value || '')}</div>
              <div class="stamp-area"></div>
            </div>
            <div class="sig-block">
              <div><strong>For Authorised Person</strong></div>
              <div style="margin-top:6px">Name: ${escapeHtml(normalizeText(document.getElementById('authName2').value||''))}</div>
              <div style="margin-top:6px">Designation: ${escapeHtml(normalizeText(document.getElementById('authDesig2').value||''))}</div>
              <div class="stamp-area"></div>
            </div>
          </div>
        </div>

        <div style="margin-top:8px"><strong>Remarks:</strong> ${escapeHtml(remarks)}</div>

        <div class="footer">Printed On: ${nowStamp()} — GP: ${gpNo}</div>
      </div>
    `;
  }

  const pages = [
    makePage('OFFICE COPY' + labelSuffix),
    makePage('OFFICE COPY' + labelSuffix),
    makePage('SECURITY COPY' + labelSuffix),
    makePage('SECURITY COPY' + labelSuffix)
  ];

  return `<!doctype html><html><head><meta charset="utf-8"><title>Gate Pass ${gpNo}</title><style>${PRINT_CSS}</style></head><body>${pages.join('<div style="page-break-after:always"></div>')}</body></html>`;
}

/* Print flow */
savePrintBtn.onclick = async ()=>{
  if(!gpDateEl.value){ alert('Please select Date'); gpDateEl.focus(); return; }

  const payload = {
    gate_pass_no: '', // server side generate
    date: gpDateEl.value,
    consignor: normalizeText(document.getElementById('consignor').value||''),
    person_carrying: normalizeText(document.getElementById('personCarrying').value||''),
    vehicle_no: normalizeText(document.getElementById('vehicleNo').value||''),
    auth_person: normalizeText(document.getElementById('authPerson').value||''),
    type: document.getElementById('gpType').value,
    items: items,
    remarks: document.getElementById('remarks').value||''
  };

  savePrintBtn.disabled = true; savePrintBtn.textContent = 'Saving...';
  showToast('Saving...');

  const res = await saveToServer(payload);
  if(res && res.success && res.gate_pass_no){
    gpNoEl.textContent = res.gate_pass_no;
  } else {
    gpNoEl.textContent = generateLocalGP();
  }
  generateQR(buildQrString()); // refresh QR with final gp no
  printedInfoEl.textContent = `Printed On: ${nowStamp()} | GP: ${gpNoEl.textContent}`;

  const finalHTML = makePrintableHTML('','OFFICE COPY');
  const w = window.open('','_blank');
  w.document.open();
  w.document.write(finalHTML);
  w.document.close();
  setTimeout(()=>{ w.focus(); w.print(); showToast('Print dialog opened'); savePrintBtn.disabled=false; savePrintBtn.textContent='Save & Print'; }, 900);
};

/* Local GP generator fallback */
function generateLocalGP(){
  const y = new Date().getFullYear();
  const cnt = Number(localStorage.getItem('gwtpl_local_counter')||0) + 1;
  localStorage.setItem('gwtpl_local_counter', cnt);
  return `GWTPL/ABO/${y}/${pad(cnt,4)}`;
}

/* Download PDF */
downloadPdfBtn.onclick = async ()=>{
  const gpNo = gpNoEl.textContent || generateLocalGP();
  const filename = gpNo.replace(/\//g,'-') + '.pdf';
  showToast('Generating PDF...');
  const finalHTML = makePrintableHTML('','OFFICE COPY');
  const container = document.createElement('div');
  container.style.position='fixed'; container.style.left='-9999px'; container.style.top='-9999px';
  container.innerHTML = finalHTML;
  document.body.appendChild(container);

  const opt = { margin: [10,10,10,10], filename: filename, image: {type:'jpeg', quality:0.98}, html2canvas: {scale: 2, useCORS: true, logging:false}, jsPDF: {unit:'mm', format:'a4', orientation:'portrait'} };

  const imgs = container.querySelectorAll('img');
  const prom = [];
  imgs.forEach(img=>{
    if(img.complete) return;
    prom.push(new Promise(r=>img.onload = img.onerror = r));
  });
  await Promise.all(prom);

  html2pdf().from(container).set(opt).save().then(()=>{
    showToast('PDF saved: ' + filename, 2200);
    document.body.removeChild(container);
  }).catch(err=>{
    console.error(err);
    showToast('PDF generation failed');
    document.body.removeChild(container);
  });
};

/* keyboard */
document.addEventListener('keydown', e=>{
  if(e.ctrlKey && e.key === 'Enter'){ addItemBtn.click(); }
  if(e.key === 'Escape'){ duplicateInput.value=''; }
});

/* QR building util - includes all fields + items summary */
function buildQrString(){
  const gpNo = gpNoEl.textContent || '';
  const date = document.getElementById('gpDate').value || '';
  const type = document.getElementById('gpType').value || '';
  const consignor = document.getElementById('consignor').value || '';
  const person = addMr(document.getElementById('personCarrying').value || '');
  const vehicle = document.getElementById('vehicleNo').value || '';
  const auth = addMr(document.getElementById('authPerson').value || '');
  const auth1 = addMr(document.getElementById('authName1')?.value || '');
  const auth2 = addMr(document.getElementById('authName2')?.value || '');

  let itemsText = items.map((it, idx)=> `${idx+1}. ${it.desc||''} | ${it.qty||0} ${it.unit||''}`).join(' ; ');
  if(!itemsText) itemsText = 'No items';

  const qrData = `Gate Pass No: ${gpNo}
Date: ${date}
Type: ${type}
Consignor: ${consignor}
Person Carrying: ${person}
Vehicle No: ${vehicle}
Authorised Person: ${auth}
Issued By: ${auth1}
Received By: ${auth2}
Items: ${itemsText}`;

  return qrData;
}

/* update QR by reading current fields */
function updateQRFromFields(){
  const qrString = buildQrString();
  generateQR(qrString);
}

/* initial QR render */
updateQRFromFields();

/* expose some functions to console for debugging */
window.gwtpl = { items, updateQRFromFields, buildQrString };

/* initial ready toast */
showToast('Ready — final build',1200);
