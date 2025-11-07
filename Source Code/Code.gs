// =============================
// ✅ FINAL Code.gs (Sabhi Fixes Ke Saath)
// =============================

/**
 * ✅ YEH NAYA FUNCTION HAI
 * Jab koi aapke Web App URL ko kholega, toh yeh function HTML page dikhayega.
 */
function doGet(e) {
  return HtmlService.createHtmlOutputFromFile('index') // 'index.html' file ko serve karega
      .setTitle("GWTPL Gate Pass")
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper function date format karne ke liye
 */
function toYYYYMMDD(date) {
  if (!date) return "";
  try {
    var d = new Date(date);
    if (isNaN(d.getTime())) return "";
    var year = d.getFullYear();
    var month = String(d.getMonth() + 1).padStart(2, '0');
    var day = String(d.getDate()).padStart(2, '0');
    return [year, month, day].join('-');
  } catch (e) {
    return "";
  }
}

/**
 * ✅ NAYA FUNCTION: AGLA GATE PASS NUMBER FETCH KARNE KE LIYE
 * Is function ko 'index.html' page load hote hi call karega.
 */
function getNextGatePassNumber() {
  try {
    const sheet = SpreadsheetApp.openById("1rt1-OgNmACT4zro2gSZjNDUB83V3hfvDTNMSzEqBFfA").getSheetByName("GatePassLog");
    const prefix = "GWTPL/ABO";
  	const currentYear = new Date().getFullYear(); // e.g., 2025
  	const lastRow = sheet.getLastRow();
  	let nextNum = 1;

  	if (lastRow > 1) {
  	  const lastGP = sheet.getRange(lastRow, 1).getValue(); // e.g., "GWTPL/ABO/2025/0001"
  	  const parts = String(lastGP).split('/');
  	  
      // ✅ GATE PASS LOGIC
  	  if (parts.length === 4 && parseInt(parts[2], 10) === currentYear) {
  		nextNum = parseInt(parts[3], 10) + 1;
  	  }
  	}
  	const newGP = `${prefix}/${currentYear}/${String(nextNum).padStart(4, "0")}`;
    return newGP; // Sirf naya number bhejega

  } catch (e) {
    return "Error: " + e.message;
  }
}


/**
 * ✅ YEH FUNCTION HAI DATA SAVE KARNE KE LIYE
 */
function saveData(data) {
  try {
  	const sheet = SpreadsheetApp.openById("1rt1-OgNmACT4zro2gSZjNDUB83V3hfvDTNMSzEqBFfA").getSheetByName("GatePassLog");

  	const prefix = "GWTPL/ABO";
  	const currentYear = new Date().getFullYear(); // e.g., 2025
  	const lastRow = sheet.getLastRow();
  	let nextNum = 1;

  	if (lastRow > 1) {
  	  const lastGP = sheet.getRange(lastRow, 1).getValue(); 
  	  const parts = String(lastGP).split('/');
  	  if (parts.length === 4 && parseInt(parts[2], 10) === currentYear) {
  		nextNum = parseInt(parts[3], 10) + 1;
  	  }
  	}

  	const newGP = `${prefix}/${currentYear}/${String(nextNum).padStart(4, "0")}`;
  	
    /**
     * ========================================
     * ✅ **BADLAV 1 (GS): Mobile No. save karna**
     * Naya `data.person_mobile` Column L mein save ho raha hai.
     * ========================================
     */
  	const rowData = [
  	  newGP, 					// Column A
  	  data.date || "", 		 	// Column B
  	  data.consignor || "", 	// Column C
  	  data.person_carrying || "", // Column D
  	  data.vehicle_no || "", 	// Column E
  	  data.auth_person || "", 	// Column F
  	  data.type || "", 		 	// Column G
  	  JSON.stringify(data.items || []), // Column H
  	  data.authName1 || "", 	// Column I
  	  data.authDesig1 || "", 	// Column J
  	  data.remarks || "", 	 	// Column K
      data.person_mobile || "", // **NAYA FIELD (Column L)**
  	  new Date() 				// Column M (Timestamp)
  	];

  	sheet.appendRow(rowData);
  	return { success: true, gate_pass_no: newGP };
    
  } catch (err) {
  	return { success: false, error: err.message };
  }
}

/**
 * ✅ YEH FUNCTION HAI PURANA DATA FETCH KARNE KE LIYE
 */
function fetchRecord(gpNo) {
  try {
  	const sheet = SpreadsheetApp.openById("1rt1-OgNmACT4zro2gSZjNDUB83V3hfvDTNMSzEqBFfA").getSheetByName("GatePassLog");

  	if (!gpNo) {
  	  return { success: false, error: "Missing gp_no parameter" };
  	}

  	const data = sheet.getDataRange().getValues();
  	let found = null;

  	for (let i = 1; i < data.length; i++) {
  	  if (String(data[i][0]).trim() === gpNo.trim()) {
  		found = data[i];
  		break;
  	  }
  	}

  	if (!found) {
  	  return { success: false, error: "Record not found" };
  	}

    /**
     * ========================================
     * ✅ **BADLAV 2 (GS): Mobile No. fetch karna**
     * Naya `person_mobile` Column L (index 11) se aa raha hai.
     * ========================================
     */
  	const record = {
  	  gate_pass_no: found[0], 	// Col A
  	  date: toYYYYMMDD(found[1]), // Col B (Bug fixed)
  	  consignor: found[2], 		// Col C
  	  person_carrying: found[3], // Col D
  	  vehicle_no: found[4], 	// Col E
  	  authorised_person: found[5], // Col F
  	  type: found[6], 			// Col G
  	  items: found[7], 			// Col H
	  authName1: found[8] || "", 	// Col I (index 8)
	  authDesig1: found[9] || "", 	// Col J (index 9)
  	  remarks: found[10] || "", 	// Col K (index 10)
      person_mobile: found[11] || "", // **NAYA FIELD (Col L, index 11)**
  	  success: true,
  	};
    
    return record;
    
  } catch (err) {
  	return { success: false, error: err.message };
  }
}