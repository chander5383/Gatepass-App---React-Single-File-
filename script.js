let itemCount = 0;
const appsScriptUrl = "https://script.google.com/macros/s/AKfycbzvsZ8xK0zB92FsZRF6d2ko2zn5qv7UuzL28arXuXuWeWJe_1yi5b0ytqLz9EGpkE-kUQ/exec";

window.onload = () => {
  document.getElementById("date").valueAsDate = new Date();
  generateGatePassNo();
};

function generateGatePassNo() {
  const today = new Date();
  const year = today.getFullYear();
  const count = Math.floor(Math.random() * 900 + 100);
  document.getElementById("gatePassNo").value = `GWTPL/ABO/${year}/${count}`;
}

function changeVoucherType() {
  document.getElementById("voucherType").innerText = document.getElementById("category").value;
}

function addItem() {
  itemCount++;
  const tbody = document.querySelector("#itemTable tbody");
  const row = document.createElement("tr");
  row.innerHTML = `
    <td>${itemCount}</td>
    <td><input type="text" class="itemName"></td>
    <td><input type="text" class="qty"></td>
    <td>
      <select class="unit">
        <option>Kg</option>
        <option>Ltr</option>
        <option>Nos</option>
      </select>
    </td>
    <td><input type="text" class="serialNo"></td>
    <td><input type="text" class="tagNo"></td>
  `;
  tbody.appendChild(row);
}

function saveData() {
  const data = {
    gatePassNo: document.getElementById("gatePassNo").value,
    date: document.getElementById("date").value,
    category: document.getElementById("category").value,
    consignor: document.getElementById("consignor").value,
    consignee: document.getElementById("consignee").value,
    issuedBy: document.getElementById("issuedBy").value,
    designation: document.getElementById("designation").value,
    vehicleNo: document.getElementById("vehicleNo").value,
    person: document.getElementById("person").value,
    remarks: document.getElementById("remarks").value,
    outwardNo: document.getElementById("outwardNo").value,
    outwardDate: document.getElementById("outwardDate").value,
    securityName: document.getElementById("securityName").value,
    items: []
  };

  document.querySelectorAll("#itemTable tbody tr").forEach(row => {
    const item = {
      name: row.querySelector(".itemName").value,
      qty: row.querySelector(".qty").value,
      unit: row.querySelector(".unit").value,
      serialNo: row.querySelector(".serialNo").value,
      tagNo: row.querySelector(".tagNo").value
    };
    data.items.push(item);
  });

  fetch(appsScriptUrl, {
    method: "POST",
    body: JSON.stringify(data)
  })
    .then(res => res.text())
    .then(txt => {
      alert("✅ Data saved successfully!");
      generateGatePassNo();
    })
    .catch(err => alert("Error saving data: " + err));
}
