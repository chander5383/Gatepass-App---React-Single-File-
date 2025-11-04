import React, { useState, useEffect, useRef } from "react";

// GatepassApp.jsx
// Single-file React component. TailwindCSS classes used for styling.
// Default export a React component so it can be previewed in the canvas.
// -------------------------------------------
// Features implemented:
// - Two gatepass categories (Stock Transfer Voucher / Stock Voucher (Returnable Stock))
// - Add items (name + qty) via input and via a small checklist
// - Items appear in the list with ability to remove
// - Auto-generated gatepass number (serial stored in localStorage) with site code + date
// - Save action posts payload to a configurable Google Apps Script Web App endpoint (SEE COMMENTS)
// - Prints nicely; print CSS adds company logo as background watermark
// - Simple professional layout with Tailwind utility classes
// -------------------------------------------

// --- How to connect to Google Sheets (quick setup):
// Option A (recommended for non-auth serverless):
// 1. Open Google Sheets -> Extensions -> Apps Script
// 2. Replace Code.gs with a handler that accepts POST and writes rows to the sheet.
//    Example Apps Script snippet (paste into Apps Script editor):
/*
function doPost(e) {
  var ss = SpreadsheetApp.openById("YOUR_SHEET_ID");
  var sheet = ss.getSheetByName("Sheet1");
  var data = JSON.parse(e.postData.contents);
  // push a row: [timestamp, gatepass_no, category, date, from, to, itemsJSON, issued_by, authorised_by]
  sheet.appendRow([new Date(), data.gatepassNo, data.category, data.date, data.fromSite, data.toSite, JSON.stringify(data.items), data.issuedBy, data.authorisedBy]);
  return ContentService.createTextOutput(JSON.stringify({ status: 'ok' }));
}
*/
// 3. Deploy -> New deployment -> Web app -> Execute as: Me, Who has access: Anyone (or Anyone with link)
// 4. Copy the Web App URL and paste into the REACT_APP_SHEET_URL variable below or directly replace the placeholder.

// Note: Using a public Apps Script URL means data is public to that endpoint. For production, secure access and validation.

const REACT_APP_SHEET_URL = "https://script.google.com/macros/s/YOUR_DEPLOYED_WEBAPP_ID/exec"; // <-- replace

export default function GatepassApp() {
  const [category, setCategory] = useState("Stock Transfer Voucher");
  const [fromSite, setFromSite] = useState("");
  const [toSite, setToSite] = useState("");
  const [date, setDate] = useState(() => new Date().toISOString().slice(0, 10));
  const [items, setItems] = useState([]);
  const [itemName, setItemName] = useState("");
  const [itemQty, setItemQty] = useState("");
  const [issuedBy, setIssuedBy] = useState("");
  const [authorisedBy, setAuthorisedBy] = useState("");
  const [remarks, setRemarks] = useState("");
  const [saving, setSaving] = useState(false);
  const printRef = useRef();

  // Simple auto serial generator stored in localStorage
  useEffect(() => {
    if (!localStorage.getItem("gatepassSerial")) localStorage.setItem("gatepassSerial", "1");
  }, []);

  const getGatepassNo = () => {
    // Format: GWPTPL/ABO/20251103/0001 (Company/Site/DATE/serial)
    const dt = date.replace(/-/g, "");
    const serial = String(localStorage.getItem("gatepassSerial") || "1").padStart(4, "0");
    const siteCode = fromSite ? fromSite.split(" ").slice(0,1).join("").toUpperCase() : "NA";
    return `GWPTPL/${siteCode}/${dt}/${serial}`;
  };

  const incrementSerial = () => {
    const s = parseInt(localStorage.getItem("gatepassSerial") || "1", 10) + 1;
    localStorage.setItem("gatepassSerial", String(s));
  };

  function addItem() {
    if (!itemName || !itemQty) return;
    setItems((prev) => [...prev, { name: itemName, qty: itemQty }]);
    setItemName("");
    setItemQty("");
  }

  function removeItem(index) {
    setItems((prev) => prev.filter((_, i) => i !== index));
  }

  async function handleSaveAndPrint() {
    if (!fromSite || !toSite || items.length === 0) {
      alert("Please fill From, To and add at least one item.");
      return;
    }
    const payload = {
      gatepassNo: getGatepassNo(),
      category,
      date,
      fromSite,
      toSite,
      items,
      issuedBy,
      authorisedBy,
      remarks,
    };

    setSaving(true);
    try {
      // Post to Apps Script URL
      if (REACT_APP_SHEET_URL.includes("YOUR_DEPLOYED_WEBAPP_ID")) {
        console.warn("Replace REACT_APP_SHEET_URL with your Apps Script web app URL to save to Google Sheets.");
      } else {
        await fetch(REACT_APP_SHEET_URL, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
      }
    } catch (err) {
      console.error(err);
      alert("Warning: could not save to Google Sheets. Check console and Apps Script URL.");
    } finally {
      setSaving(false);
      incrementSerial();
      // Small delay before printing so serial increments if reliant on localStorage
      setTimeout(() => window.print(), 300);
    }
  }

  // A small sample checklist of common items you might want to add quickly
  const presets = [
    { name: "Stack Card (1 bundle)", qty: 500 },
    { name: "Pallet", qty: 10 },
    { name: "Sample Box", qty: 1 },
  ];

  function togglePreset(p) {
    // If exists remove, else add
    const idx = items.findIndex((it) => it.name === p.name && it.qty == p.qty);
    if (idx >= 0) removeItem(idx);
    else setItems((prev) => [...prev, { name: p.name, qty: p.qty }]);
  }

  return (
    <div className="min-h-screen p-6 bg-gray-50 font-sans">
      <div className="max-w-5xl mx-auto bg-white shadow-lg rounded-2xl overflow-hidden">
        <header className="p-6 border-b">
          <div className="flex items-center gap-4">
            <div className="w-16 h-16 bg-white rounded-lg flex items-center justify-center border">
              {/* Replace with your company logo image element if available */}
              <img src="/logo.png" alt="logo" className="w-12 h-12" />
            </div>
            <div>
              <h1 className="text-xl font-bold">GLOBUS WAREHOUSING &amp; TRADING PRIVATE LIMITED</h1>
              <p className="text-sm text-gray-600">Gatepass Generator — Professional Template</p>
            </div>
            <div className="ml-auto text-right">
              <div className="text-xs text-gray-500">Auto Gatepass No.</div>
              <div className="font-mono font-semibold">{getGatepassNo()}</div>
            </div>
          </div>
        </header>

        <main className="p-6 grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Form column */}
          <div className="md:col-span-2 space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Category</label>
                <select value={category} onChange={(e)=>setCategory(e.target.value)} className="mt-1 block w-full rounded border p-2">
                  <option>Stock Transfer Voucher</option>
                  <option>Stock Voucher (Returnable Stock)</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700">Date</label>
                <input type="date" value={date} onChange={(e)=>setDate(e.target.value)} className="mt-1 block w-full rounded border p-2" />
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700">Transferred From</label>
                <input value={fromSite} onChange={(e)=>setFromSite(e.target.value)} placeholder="GWPTPL Abohar" className="mt-1 block w-full rounded border p-2" />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700">Transferred To</label>
                <input value={toSite} onChange={(e)=>setToSite(e.target.value)} placeholder="GWPTPL Muktsar-1" className="mt-1 block w-full rounded border p-2" />
              </div>
            </div>

            <div className="bg-gray-50 p-4 rounded border">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Add Item</div>
                <div className="text-xs text-gray-500">Add single item or tick from presets</div>
              </div>

              <div className="flex gap-2">
                <input value={itemName} onChange={(e)=>setItemName(e.target.value)} placeholder="Item name" className="flex-1 rounded border p-2" />
                <input value={itemQty} onChange={(e)=>setItemQty(e.target.value)} placeholder="Qty" className="w-28 rounded border p-2" />
                <button onClick={addItem} className="px-4 rounded bg-indigo-600 text-white">Add</button>
              </div>

              <div className="mt-3 grid grid-cols-3 gap-2">
                {presets.map((p, idx) => (
                  <label key={idx} className="inline-flex items-center gap-2 p-2 rounded border cursor-pointer">
                    <input type="checkbox" checked={items.some(it => it.name===p.name && it.qty==p.qty)} onChange={()=>togglePreset(p)} />
                    <span className="text-sm">{p.name} — {p.qty}</span>
                  </label>
                ))}
              </div>
            </div>

            <div>
              <div className="text-sm font-medium mb-2">Items to Transfer</div>
              <div className="space-y-2">
                {items.length === 0 && <div className="text-sm text-gray-500">No items added yet.</div>}
                {items.map((it, idx) => (
                  <div key={idx} className="flex items-center gap-3 border rounded p-2">
                    <div className="flex-1">
                      <div className="font-medium">{it.name}</div>
                      <div className="text-xs text-gray-500">Qty: {it.qty}</div>
                    </div>
                    <button onClick={()=>removeItem(idx)} className="text-red-600 text-sm">Remove</button>
                  </div>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <input value={issuedBy} onChange={(e)=>setIssuedBy(e.target.value)} placeholder="Issued By" className="mt-1 block w-full rounded border p-2" />
              <input value={authorisedBy} onChange={(e)=>setAuthorisedBy(e.target.value)} placeholder="Authorised By" className="mt-1 block w-full rounded border p-2" />
            </div>

            <div>
              <textarea value={remarks} onChange={(e)=>setRemarks(e.target.value)} placeholder="Remarks" className="w-full rounded border p-2 mt-2" rows={2} />
            </div>

            <div className="flex gap-3 mt-4">
              <button onClick={handleSaveAndPrint} disabled={saving} className="px-4 py-2 rounded bg-green-600 text-white font-semibold">{saving ? 'Saving...' : 'Save & Print'}</button>
              <button onClick={()=>window.print()} className="px-4 py-2 rounded border">Print</button>
              <button onClick={()=>{
                // quick reset
                setItems([]); setFromSite(''); setToSite(''); setIssuedBy(''); setAuthorisedBy(''); setRemarks('');
              }} className="px-4 py-2 rounded border">Clear</button>
            </div>

          </div>

          {/* Preview/Printable column */}
          <aside className="md:col-span-1">
            <div ref={printRef} className="p-4 border rounded h-full relative bg-white">
              <div className="text-right text-xs text-gray-500">{date}</div>
              <h3 className="text-center font-bold mt-2">STOCK TRANSFER / GATE PASS</h3>
              <div className="mt-2 text-sm">
                <div><span className="font-semibold">Gatepass No: </span> {getGatepassNo()}</div>
                <div><span className="font-semibold">Category: </span> {category}</div>
                <div className="mt-2"><span className="font-semibold">From: </span> {fromSite}</div>
                <div><span className="font-semibold">To: </span> {toSite}</div>
              </div>

              <table className="w-full mt-3 border-collapse text-sm">
                <thead>
                  <tr>
                    <th className="border p-2 text-left">Sr.</th>
                    <th className="border p-2 text-left">Item Name</th>
                    <th className="border p-2 text-left">Qty</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, i) => (
                    <tr key={i}>
                      <td className="border p-2 align-top">{i+1}</td>
                      <td className="border p-2">{it.name}</td>
                      <td className="border p-2">{it.qty}</td>
                    </tr>
                  ))}
                </tbody>
              </table>

              <div className="mt-4 text-sm">
                <div><span className="font-semibold">Issued By: </span> {issuedBy}</div>
                <div><span className="font-semibold">Authorised By: </span> {authorisedBy}</div>
              </div>

              <div className="absolute bottom-4 left-4 text-xs text-gray-400">{remarks}</div>

            </div>
          </aside>
        </main>

        <footer className="p-4 text-center text-xs text-gray-500 border-t">Generated by Gatepass App — for internal use</footer>
      </div>

      {/* Print styles: watermark and page layout */}
      <style>{`
        @media print {
          body * { visibility: hidden; }
          .min-h-screen, .min-h-screen * { visibility: visible; }
          .min-h-screen { position: relative; }
          .min-h-screen > .max-w-5xl { width: 100%; }

          /* add watermark background using the company's logo - replace path if needed */
          @page { size: auto; margin: 12mm; }
          .max-w-5xl::before {
            content: "";
            position: fixed;
            top: 20%; left: 15%;
            width: 70%; height: 70%;
            background-image: url('/logo.png');
            background-repeat: no-repeat;
            background-position: center;
            background-size: contain;
            opacity: 0.08;
            z-index: -1;
          }
        }
      `}</style>
    </div>
  );
}
