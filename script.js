const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzvsZ8xK0zB92FsZRF6d2ko2zn5qv7UuzL28arXuXuWeWJe_1yi5b0ytqLz9EGpkE-kUQ/exec";

// Auto gate pass number
function generateGatePass() {
  const prefix = "GWTPL/ABO/2025/";
  const num = Math.floor(Math.random() * 9000 + 1000);
  document.getElementById("gatePassNo").value = prefix + num;
}
generateGatePass();

// Add new item
document.getElementById("addItem").addEventListener("click", () => {
  const div = document.createElement("div");
  div.className = "itemRow";
  div.innerHTML = `
    <input type="text" placeholder="Item Name">
    <input type="number" placeholder="Qty">
    <select>
      <option>Nos</option>
      <option>Kg</option>
      <option>Ltr</option>
    </select>
  `;
  document.getElementById("items").appendChild(div);
});

// Save data to Google Sheet
document.getElementById("saveBtn").addEventListener("click", async () => {
  const data = {
    date: document.getElementById("date").value,
    gatePassNo: document.getElementById("gatePassNo").value,
    type: document.getElementById("voucherType").value,
    cluster: document.getElementById("cluster").value,
    district: document.getElementById("district").value,
    location: document.getElementById("location").value,
    godown: document.getElementById("godown").value,
    itemName: Array.from(document.querySelectorAll("#items .itemRow input:nth-child(1)")).map(i => i.value).join(", "),
    qty: Array.from(document.querySelectorAll("#items .itemRow input:nth-child(2)")).map(i => i.value).join(", "),
    unit: Array.from(document.querySelectorAll("#items .itemRow select")).map(i => i.value).join(", "),
    remarks: document.getElementById("remarks").value,
    vehicleNo: document.getElementById("vehicleNo").value,
    personName: document.getElementById("personName").value,
    issuedBy: document.getElementById("issuedBy").value,
    designation: document.getElementById("designation").value,
    consignorUnit: document.getElementById("godown").value,
    consigneeUnit: "GWTPL ABOHAR"
  };

  await fetch(appsScriptUrl, {
    method: "POST",
    mode: "no-cors",
    body: JSON.stringify(data)
  });

  alert("✅ Data saved to Google Sheet successfully!");
});

// Print gate pass
document.getElementById("printBtn").addEventListener("click", () => {
  window.print();
});

// QR Code
const qr = new QRious({
  element: document.getElementById("qrCode"),
  value: "GWTPL GATE PASS SYSTEM",
  size: 100
});
