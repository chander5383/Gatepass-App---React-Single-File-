const APPS_SCRIPT_URL = ""; 
let itemCounter = 0;
document.addEventListener("DOMContentLoaded", () => {
  document.getElementById('genOn').textContent = new Date().toLocaleString();
  addRow();
  bindButtons();
  generateLocalGP();
});

function bindButtons(){
  document.getElementById('btnAddRow').addEventListener('click', addRow);
  document.getElementById('btnClearRows').addEventListener('click', clearRows);
  document.getElementById('saveBtn').addEventListener('click', onSave);
  document.getElementById('printBtn').addEventListener('click', ()=>window.print());
  document.getElementById('pdfBtn').addEventListener('click', downloadPDF);
}

function addRow(prefill={}){
  const tbody=document.getElementById('itemsBody');
  const tr=document.createElement('tr');
  tr.innerHTML=`<td class="sr">${getRowCount()+1}</td>
  <td><input class="itm-name" value="${prefill.name||''}" placeholder="Item description"></td>
  <td><input class="itm-tag" value="${prefill.tag||''}" placeholder="Tag No"></td>
  <td><input class="itm-qty" type="number" min="0" value="${prefill.qty||''}"></td>
  <td><select class="itm-unit"><option>Nos</option><option>Kg</option><option>Ltr</option><option>Bag</option><option>Box</option><option>Other</option></select></td>
  <td><input class="itm-remarks" value="${prefill.remarks||''}" placeholder="Remarks"></td>
  <td class="print-hidden"><button type="button" class="rm">Remove</button></td>`;
  tbody.appendChild(tr);
  tr.querySelector('.rm').addEventListener('click',()=>{tr.remove();renumber();computeTotal();});
  tr.querySelector('.itm-qty').addEventListener('input',computeTotal);
  renumber();computeTotal();
}
function getRowCount(){return document.querySelectorAll('#itemsBody tr').length;}
function renumber(){document.querySelectorAll('#itemsBody tr').forEach((tr,i)=>tr.querySelector('.sr').textContent=i+1);}
function clearRows(){document.getElementById('itemsBody').innerHTML='';addRow();computeTotal();}
function computeTotal(){const sum=Array.from(document.querySelectorAll('.itm-qty')).reduce((s,i)=>s+(parseFloat(i.value)||0),0);document.getElementById('totalQty').textContent=sum;}

function generateLocalGP(){
  let cnt=parseInt(localStorage.getItem('gwtpl_pass')||'1',10);
  const year=new Date().getFullYear();
  const serial=String(cnt).padStart(3,'0');
  document.getElementById('metaGpNo').textContent=`GWTPL/ABO/${year}/${serial}`;
}
function incrementLocal(){let cnt=parseInt(localStorage.getItem('gwtpl_pass')||'1',10);cnt++;localStorage.setItem('gwtpl_pass',String(cnt));generateLocalGP();}

function setQR(text){
  const box=document.getElementById('qrBox');
  if(!text){box.innerHTML='';return;}
  box.innerHTML=`<img src="https://chart.googleapis.com/chart?chs=150x150&cht=qr&chl=${encodeURIComponent(text)}" alt="QR">`;
}

async function onSave(){
  const rows=Array.from(document.querySelectorAll('#itemsBody tr')).map(tr=>({
    sr:tr.querySelector('.sr').textContent,
    name:tr.querySelector('.itm-name').value.trim(),
    tag:tr.querySelector('.itm-tag').value.trim(),
    qty:tr.querySelector('.itm-qty').value.trim(),
    unit:tr.querySelector('.itm-unit').value,
    remarks:tr.querySelector('.itm-remarks').value.trim()
  })).filter(r=>r.name && r.qty && Number(r.qty)>0);
  if(rows.length===0){alert('Add at least one item');return;}
  const consignor=document.getElementById('consignorManual').value.trim();
  const vehicle=document.getElementById('vehicleNo').value.trim();
  if(!consignor||!vehicle){alert('Enter Consignor and Vehicle No');return;}

  const payload={
    gatePassNo:document.getElementById('metaGpNo').textContent,
    date:document.getElementById('metaDate').value||new Date().toISOString().slice(0,10),
    type:document.getElementById('metaType').value,
    consignor:consignor,
    consignee:document.getElementById('consignee').value,
    vehicleNo:vehicle,
    personCarrying:document.getElementById('personCarrying').value.trim(),
    authorityPerson:document.getElementById('authorityPerson').value.trim(),
    items:rows,
    totalQty:document.getElementById('totalQty').textContent,
    remarks:document.getElementById('remarks').value.trim(),
    issueSecName:document.getElementById('issueSecName').value.trim(),
    issueSecReg:document.getElementById('issueSecReg').value.trim(),
    issueSecOutwardReg:document.getElementById('issueSecOutwardReg').value.trim(),
    issueSecDate:document.getElementById('issueSecDate').value,
    recSecName:document.getElementById('recSecName').value.trim(),
    recSecReg:document.getElementById('recSecReg').value.trim(),
    recSecDate:document.getElementById('recSecDate').value.trim(),
    generatedAt:new Date().toISOString()
  };
  setQR(payload.gatePassNo);
  alert('Saved locally. Implement Apps Script for cloud sync.');
  const bk=JSON.parse(localStorage.getItem('gwtpl_backup')||'[]');bk.push(payload);
  localStorage.setItem('gwtpl_backup',JSON.stringify(bk));
  incrementLocal();
}

function downloadPDF(){
  if(typeof html2pdf==='undefined'){alert('html2pdf library not found.');return;}
  html2pdf().from(document.getElementById('sheetRoot')).save('GatePass.pdf');
}
