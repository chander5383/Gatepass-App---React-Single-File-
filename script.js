
// Gatepass app script (vanilla JS)
(function(){
  const prefix = "GWTPL/ABOHAR/2025/";
  const passKey = "gwtpl_pass_count_v1";
  const sheetPublishUrl = "https://docs.google.com/spreadsheets/d/e/2PACX-1vQAXIhKxmeBkMhAPVh24PSbTcfSh-1oBEXBj7OFEnAXx-Uy_PzmL7UZkql3rUUpmHeJRQz5oXCzp8Cy/pubhtml";
  // Note: the published html link cannot accept POST. For real saving use Google Apps Script web app endpoint.
  // The app will try to POST to an Apps Script endpoint if configured in the variable `appsScriptUrl` below.
  const appsScriptUrl = ""; // <-- replace with your Apps Script Web App URL to save rows to Sheet

  function $(id){return document.getElementById(id)}

  // state
  let items = [];

  function getCount(){ return Number(localStorage.getItem(passKey) || 1) }
  function bumpCount(){ localStorage.setItem(passKey, getCount()+1) }

  function genPassNo(){
    return prefix + String(getCount()).padStart(3,"0");
  }

  function refreshPassNo(){ $('passNo').value = genPassNo() }

  function todayISO(){ return new Date().toISOString().split('T')[0] }

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
        <td style="width:70px"><button class='secondary' data-idx='${i}'>Delete</button></td>`;
      tbody.appendChild(tr)
    });
    // attach delete handlers
    tbody.querySelectorAll("button[data-idx]").forEach(btn=>{
      btn.addEventListener("click", ()=>{
        const i = Number(btn.getAttribute("data-idx"))
        items.splice(i,1); renderItems();
      })
    })
  }

  function addItem(){
    const name = $("itemName").value.trim();
    const qty = $("itemQty").value.trim();
    const useSerial = $("useSerial").checked;
    const serial = $("itemSerial").value.trim();
    const tag = $("itemTag").value.trim();
    if(!name||!qty){ alert("Enter item name and qty"); return; }
    items.push({name, qty, serial: useSerial?serial:"", tag: useSerial?tag:""});
    $("itemName").value=""; $("itemQty").value=""; $("itemSerial").value=""; $("itemTag").value=""; $("useSerial").checked=false;
    renderItems();
  }

  function buildPayload(){
    return {
      date: $("date").value||todayISO(),
      passNumber: $("passNo").value,
      category: $("category").value,
      fromSite: $("fromSite").value,
      toSite: $("toSite").value,
      authority: $("authority").value,
      issuedBy: $("issuedBy").value,
      remarks: $("remarks").value,
      items: items
    }
  }

  function saveToLocal(){
    const p = buildPayload();
    const all = JSON.parse(localStorage.getItem("gwtpl_saved")||"[]");
    all.push(p);
    localStorage.setItem("gwtpl_saved", JSON.stringify(all));
    bumpCount(); refreshPassNo();
    alert("Saved locally (browser). To save to Google Sheet, configure an Apps Script endpoint.");
  }

  async function saveToSheet(){
    const payload = buildPayload();
    if(!appsScriptUrl){ saveToLocal(); return; }
    try{
      await fetch(appsScriptUrl, {method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(payload)});
      bumpCount(); refreshPassNo();
      alert("Saved to Google Sheet (Apps Script).");
    }catch(e){
      console.error(e); alert("Save failed, saved locally instead."); saveToLocal();
    }
  }

  function preparePrint(){
    // populate printTemplate
    $("ptCategory").textContent = $("category").value;
    $("ptPassNo").textContent = $("passNo").value;
    $("ptMeta").innerHTML = `<strong>From:</strong> ${$("fromSite").value} &nbsp;&nbsp; <strong>To:</strong> ${$("toSite").value} <br/>
      <strong>Date:</strong> ${$("date").value} &nbsp;&nbsp; <strong>Authority:</strong> ${$("authority").value}`;
    let table = `<thead><tr><th>Sr</th><th>Item</th><th>Qty</th><th>Serial</th><th>Tag</th></tr></thead><tbody>`;
    items.forEach((it,i)=>{
      table += `<tr><td>${i+1}</td><td>${it.name}</td><td style="text-align:center">${it.qty}</td><td>${it.serial||""}</td><td>${it.tag||""}</td></tr>`;
    });
    table += "</tbody>";
    $("ptItems").innerHTML = table;
    // show print template and call print
    const tpl = document.getElementById("printTemplate");
    tpl.style.display = "block";
    window.print();
    tpl.style.display = "none";
  }

  function clearAll(){
    if(!confirm("Clear form and items?")) return;
    items = []; renderItems();
    $("authority").value = ""; $("issuedBy").value=""; $("remarks").value="";
  }

  // init
  window.addEventListener("DOMContentLoaded", ()=>{
    $("date").value = todayISO();
    refreshPassNo();
    renderItems();

    $("addItemBtn").addEventListener("click", addItem);
    $("saveBtn").addEventListener("click", saveToSheet);
    $("printBtn").addEventListener("click", preparePrint);
    $("clearBtn").addEventListener("click", clearAll);
  });

})();
