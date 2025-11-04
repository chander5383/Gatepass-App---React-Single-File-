
(function(){
  const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzNTGVczqgRCHVG0-ahE8xytNhCMJWubAu3blkIj25sJ7lATtTQi4l2pAqB-XsizWlaXQ/exec";
  const passKey = "gwtpl_pass_count_v3";

  // Known sites and defaults
  const sites = [
    {code:'ABO', name:'GWTPL Abohar', manager:'Sh. Sandeep Kumar', authority:'Regional Manager'},
    {code:'MUK', name:'GWTPL Muktsar-1', manager:'Sh. Om Prakash', authority:'Station Manager'},
    {code:'MAL', name:'GWTPL Malout', manager:'Sh. Rahul', authority:'Station Manager'}
  ];

  function $(id){return document.getElementById(id)}
  let items = [];

  function getCount(){ return Number(localStorage.getItem(passKey) || 1) }
  function bumpCount(){ localStorage.setItem(passKey, getCount()+1) }
  function yearStr(){ return new Date().getFullYear() }
  function genPassNo(siteCode){ return `GWTPL/${siteCode}/${yearStr()}/${String(getCount()).padStart(3,'0')}` }
  function refreshPassNo(){ const s = $('fromSite').value || 'ABO'; $('passNo').value = genPassNo(s) }

  function todayISO(){ return new Date().toISOString().split('T')[0] }

  function initSites(){
    const sel = $('fromSite');
    sel.innerHTML = '';
    sites.forEach(s=>{ const o = document.createElement('option'); o.value = s.code; o.text = s.name; sel.appendChild(o) });
    // set default and fill manager/authority
    sel.value = 'ABO';
    setSiteDefaults('ABO');
  }

  function setSiteDefaults(code){
    const s = sites.find(x=>x.code===code)||sites[0];
    $('fromSite').value = s.code;
    $('authority').value = s.authority;
    // update pass no
    refreshPassNo();
  }

  function renderItems(){
    const tbody = $("itemsTable").querySelector("tbody");
    tbody.innerHTML = "";
    items.forEach((it,i)=>{
      const tr = document.createElement("tr");
      tr.innerHTML = `<td style="width:40px">${i+1}</td>
        <td>${it.name}</td>
        <td style="width:80px;text-align:center">${it.qty}</td>
        <td class="ser">${it.serial||""}</td>
        <td class="ser">${it.tag||""}</td>
        <td style="text-align:center">${it.returnable? 'Yes': 'No'}</td>
        <td style="width:70px"><button class='secondary' data-idx='${i}'>Delete</button></td>`;
      tbody.appendChild(tr)
    });
    tbody.querySelectorAll("button[data-idx]").forEach(btn=>{
      btn.addEventListener("click", ()=>{ const i = Number(btn.getAttribute("data-idx")); items.splice(i,1); renderItems(); })
    })
    updateQR();
  }

  function addItem(){
    const name = $("itemName").value.trim();
    const qty = $("itemQty").value.trim();
    const useSerial = $("useSerial").checked;
    const serial = $("itemSerial").value.trim();
    const tag = $("itemTag").value.trim();
    const returnable = $("isReturnable").checked;
    if(!name||!qty){ alert("Enter item name and qty"); return; }
    items.push({name, qty, serial: useSerial?serial:"", tag: useSerial?tag:"", returnable});
    $("itemName").value=""; $("itemQty").value=""; $("itemSerial").value=""; $("itemTag").value=""; $("useSerial").checked=false; $("isReturnable").checked=false;
    renderItems();
  }

  function buildPayload(){
    return {
      date: $("date").value||todayISO(),
      passNumber: $("passNo").value,
      category: $("category").value,
      fromSite: $("fromSite").options[$("fromSite").selectedIndex].text,
      fromSiteCode: $("fromSite").value,
      toSite: $("toSite").value,
      vehicleNo: $("vehicleNo").value,
      personName: $("personName").value,
      authority: $("authority").value,
      issuedBy: $("issuedBy").value,
      issuedDesg: $("issuedDesg").value,
      remarks: $("remarks").value,
      items: items
    }
  }

  async function saveToSheet(){
    const payload = buildPayload();
    // Duplicate check in localStorage
    const saved = JSON.parse(localStorage.getItem('gwtpl_saved_v3')||'[]');
    if(saved.some(p=>p.passNumber===payload.passNumber)){
      if(!confirm("Duplicate pass number found locally. Proceed to save?")) return;
    }
    try{
      const res = await fetch(appsScriptUrl, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      // If web app requires CORS, response may be opaque. we'll treat status 0/200 as success.
      if(res.ok || res.status===0){
        saved.push(Object.assign({status:'Issued'}, payload));
        localStorage.setItem('gwtpl_saved_v3', JSON.stringify(saved));
        bumpCount(); refreshPassNo(); renderAdmin();
        alert("Saved to Google Sheet.");
      } else {
        throw new Error('Server error');
      }
    }catch(e){
      // fallback: save locally
      saved.push(Object.assign({status:'Issued', savedAt:new Date().toISOString()}, payload));
      localStorage.setItem('gwtpl_saved_v3', JSON.stringify(saved));
      bumpCount(); refreshPassNo(); renderAdmin();
      alert("Save failed to server; saved locally.");
    }
  }

  function updateQR(){
    const pass = encodeURIComponent($('passNo').value || '');
    if(!pass) return;
    const qrUrl = `https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${pass}`;
    $('qrImage').src = qrUrl;
  }

  function preparePrint(){
    $("ptCategory").textContent = $("category").value;
    $("ptPassNo").textContent = $("passNo").value;
    $("ptDate").textContent = "Date: " + ($("date").value||todayISO());
    $("ptInfo").innerHTML = `<strong>From:</strong> ${$("fromSite").options[$("fromSite").selectedIndex].text} &nbsp;&nbsp; <strong>To:</strong> ${$("toSite").value}
      <br/><strong>Vehicle No:</strong> ${$("vehicleNo").value} &nbsp;&nbsp; <strong>Person:</strong> ${$("personName").value}
      <br/><strong>Issued By:</strong> ${$("issuedBy").value} (${$("issuedDesg").value}) &nbsp;&nbsp; <strong>Authority:</strong> ${$("authority").value}
      <br/><strong>Remarks:</strong> ${$("remarks").value}`;
    let table = `<thead><tr><th>Sr</th><th>Item</th><th>Qty</th><th>Serial</th><th>Tag</th><th>Returnable</th></tr></thead><tbody>`;
    items.forEach((it,i)=>{ table += `<tr><td>${i+1}</td><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td>${it.serial||""}</td><td>${it.tag||""}</td><td style="text-align:center">${it.returnable? 'Yes':''}</td></tr>` });
    table += "</tbody>";
    $("ptItems").innerHTML = table;
    const tpl = document.getElementById("printTemplate"); tpl.style.display = "block"; window.print(); tpl.style.display = "none";
  }

  function renderAdmin(filter=''){
    const tbody = $('adminTable').querySelector('tbody');
    tbody.innerHTML = '';
    const saved = JSON.parse(localStorage.getItem('gwtpl_saved_v3')||'[]').slice().reverse();
    saved.forEach((p,idx)=>{
      if(filter){
        const f = filter.toLowerCase();
        if(!(p.passNumber.toLowerCase().includes(f) || (p.personName||'').toLowerCase().includes(f) || (p.fromSite||'').toLowerCase().includes(f))) return;
      }
      const tr = document.createElement('tr');
      tr.innerHTML = `<td>${p.passNumber}</td><td>${p.date}</td><td>${p.fromSite}</td><td>${p.toSite}</td><td>${p.personName||''}</td><td>${p.status||'Issued'}</td>
        <td><button class="secondary" data-idx="${idx}" data-pass="${p.passNumber}">Mark Returned</button></td>`;
      tbody.appendChild(tr);
    });
    tbody.querySelectorAll('button[data-idx]').forEach(btn=>{
      btn.addEventListener('click', ()=>{
        const pass = btn.getAttribute('data-pass');
        const all = JSON.parse(localStorage.getItem('gwtpl_saved_v3')||'[]');
        const idx = all.findIndex(x=>x.passNumber===pass);
        if(idx>=0){
          all[idx].status = 'Returned';
          localStorage.setItem('gwtpl_saved_v3', JSON.stringify(all));
          renderAdmin($('adminSearch').value);
        }
      })
    });
  }

  function exportCsv(){
    const all = JSON.parse(localStorage.getItem('gwtpl_saved_v3')||'[]');
    if(!all.length){ alert('No records to export'); return; }
    const keys = ['passNumber','date','fromSite','toSite','personName','vehicleNo','status','items'];
    const rows = [keys.join(',')];
    all.forEach(r=>{
      const itemsText = (r.items||[]).map(i=>`${i.name} (${i.qty})`).join('|');
      rows.push([r.passNumber,r.date,r.fromSite,r.toSite,r.personName,r.vehicleNo,r.status,`"${itemsText}"`].join(','));
    });
    const csv = rows.join('\n');
    const blob = new Blob([csv], {type:'text/csv'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href=url; a.download='gwtpl_gatepasses.csv'; a.click();
    URL.revokeObjectURL(url);
  }

  function clearAll(){ if(!confirm('Clear form and items?')) return; items=[]; renderItems(); $('authority').value=''; $('issuedBy').value=''; $('issuedDesg').value=''; $('remarks').value=''; }

  window.addEventListener('DOMContentLoaded', ()=>{
    initSites();
    $('date').value = todayISO();
    refreshPassNo();
    renderItems();
    $('addItemBtn').addEventListener('click', addItem);
    $('saveBtn').addEventListener('click', saveToSheet);
    $('printBtn').addEventListener('click', preparePrint);
    $('clearBtn').addEventListener('click', clearAll);
    $('fromSite').addEventListener('change', ()=>{ refreshPassNo(); setSiteDefaults($('fromSite').value); });
    $('showAdmin').addEventListener('change', ()=>{ $('adminView').style.display = $('showAdmin').checked? 'block':'none'; renderAdmin(); });
    $('adminSearch').addEventListener('input', ()=>{ renderAdmin($('adminSearch').value) });
    $('exportCsv').addEventListener('click', exportCsv);
  });
})();
