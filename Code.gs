// ============================================================
//  KKM Switch Deployment — Google Apps Script Backend
//  Paste this entire file into your Apps Script editor
//  Deploy as: Web App → Execute as Me → Anyone can access
// ============================================================

const SHEET_NAME          = 'Deployment';
const ADMIN_PASSWORD      = 'aspek2026!';
const DRIVE_FOLDER_ID     = '1-ORbs-in-ZE8VNdPpsChDFZkthXpVzgh'; // photos folder ID
const UAT_DRIVE_FOLDER_ID = '1760iZECRr8StRBPkyPGWIk8WraFcDxfg';            // UAT documents folder ID

// ── Helpers ───────────────────────────────────────────────────────────────
function corsResponse(data) {
  return ContentService
    .createTextOutput(JSON.stringify(data))
    .setMimeType(ContentService.MimeType.JSON);
}

function getFolder()    { return DriveApp.getFolderById(DRIVE_FOLDER_ID); }
function getUatFolder() { return DriveApp.getFolderById(UAT_DRIVE_FOLDER_ID); }

// ── Sheet init ────────────────────────────────────────────────────────────
function initSheet() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SHEET_NAME);
  if (!sheet) {
    sheet = ss.insertSheet(SHEET_NAME);
    sheet.getRange(1,1,1,13).setValues([['id','state','facility','qty','installed','notes','updated_at','photos_json','uat_json','planned_start','planned_end','actual_start','actual_end']]);
    sheet.getRange(1,1,1,9).setFontWeight('bold').setBackground('#1a4f8a').setFontColor('#ffffff');
    sheet.setFrozenRows(1);
    const LOCS = [
      [1,'WP Putrajaya','Bahagian Pengurusan Maklumat, Kompleks E',17],
      [2,'Selangor','Makmal Kesihatan Awam Kebangsaan Sungai Buloh',11],
      [3,'Selangor','Hospital Banting',13],
      [4,'Selangor','Hospital Tengku Ampuan Rahimah',20],
      [5,'Selangor','Hospital Orang Asli Gombak',5],
      [6,'Johor','Hospital Sultanah Aminah',13],
      [7,'Johor','Hospital Pakar Sultanah Fatimah',9],
      [8,'Johor','Hospital Sultanah Nora Ismail',14],
      [9,'Johor','Hospital Tangkak',8],
      [10,'Johor','Hospital Kota Tinggi',8],
      [11,'Johor','Hospital Permai',10],
      [12,'Johor','Hospital Temenggong Seri Maharaja Tun Ibrahim',10],
      [13,'Kedah','Hospital Kulim',13],
      [14,'Kedah','Hospital Baling',5],
      [15,'Kedah','Hospital Sultanah Maliha, Langkawi',6],
      [16,'Kedah','Pejabat Kesihatan Daerah Kota Setar',3],
      [17,'Kedah','Kolej Kejururawatan Alor Setar',3],
      [18,'Kelantan','Hospital Tanah Merah',2],
      [19,'Kelantan','Hospital Pasir Mas',5],
      [20,'Melaka','Jabatan Kesihatan Negeri Melaka',16],
      [21,'Melaka','Hospital Melaka',19],
      [22,'Melaka','Hospital Alor Gajah',5],
      [23,'Melaka','Hospital Jasin',17],
      [24,'Pahang','Hospital Tengku Ampuan Afzan',15],
      [25,'Pahang','Hospital Bentong',10],
      [26,'Pahang','Hospital Jengka',10],
      [27,'Pahang','Hospital Jerantut',10],
      [28,'Perak','Hospital Raja Perempuan Bainun',4],
      [29,'Perak','Makmal Kesihatan Awam Kebangsaan Ipoh',5],
      [30,'Perak','Kolej Sains Kesihatan Bersekutu Sultan Azlan Shah',11],
      [31,'Perlis','Pejabat Kesihatan Daerah Perlis',2],
      [32,'Pulau Pinang','Hospital Pulau Pinang',13],
      [33,'Pulau Pinang','Hospital Seberang Jaya',8],
    ];
    const rows = LOCS.map(l => [l[0], l[1], l[2], l[3], 0, '', '', '[]', '[]', '', '', '', '']);
    sheet.getRange(2,1,rows.length,9).setValues(rows);
    sheet.setColumnWidth(3, 320); sheet.setColumnWidth(6, 200); sheet.setColumnWidth(10, 120); sheet.setColumnWidth(11, 120);
  } else {
    // Migration: add uat_json col if missing
    const headers = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
    if (!headers.includes('uat_json')) {
      const col = sheet.getLastColumn() + 1;
      sheet.getRange(1, col).setValue('uat_json');
      const lastRow = sheet.getLastRow();
      if (lastRow > 1) sheet.getRange(2, col, lastRow-1, 1).setValues(Array(lastRow-1).fill(['[]']));
    }
    // Migrate date columns
    for (const colName of ['planned_start','planned_end','actual_start','actual_end']) {
      const h = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
      if (!h.includes(colName)) {
        const col = sheet.getLastColumn() + 1;
        sheet.getRange(1, col).setValue(colName);
        const lastRow = sheet.getLastRow();
        if (lastRow > 1) sheet.getRange(2, col, lastRow-1, 1).setValues(Array(lastRow-1).fill(['']));
      }
    }
  }
  return sheet;
}

// ── Column index helper ───────────────────────────────────────────────────
function getColIdx(headers, name) {
  const i = headers.indexOf(name);
  return i >= 0 ? i : null;
}

// ── GET — return all data ─────────────────────────────────────────────────
function doGet(e) {
  // debug endpoint removed
  try {
    const sheet   = initSheet();
    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0];
    const photoCol = getColIdx(headers, 'photos_json');
    const uatCol   = getColIdx(headers, 'uat_json');
    const locations = {};

    for (let i = 1; i < rows.length; i++) {
      const row = rows[i];
      const id  = String(row[0]);

      // Photos
      let photoIds = [];
      if (photoCol !== null) try { photoIds = JSON.parse(row[photoCol] || '[]'); } catch(e) {}
      const photos = photoIds.map(item => {
        const fid  = typeof item === 'object' ? item.id   : item;
        const name = typeof item === 'object' ? item.name : '';
        return { id: fid, name, url: 'https://drive.google.com/file/d/'+fid+'/view', thumb: 'https://drive.google.com/uc?id='+fid+'&export=view' };
      });

      // UAT docs
      let uatRaw = [];
      if (uatCol !== null) try { uatRaw = JSON.parse(row[uatCol] || '[]'); } catch(e) {}
      const uat_docs = uatRaw.map(item => {
        const fid  = typeof item === 'object' ? item.id   : item;
        const name = typeof item === 'object' ? item.name : 'UAT Document';
        return { id: fid, name, view_url: 'https://drive.google.com/file/d/'+fid+'/preview', dl_url: 'https://drive.google.com/uc?export=download&id='+fid };
      });

      const psCol = headers.indexOf('planned_start');
      const peCol = headers.indexOf('planned_end');
      const asCol = headers.indexOf('actual_start');
      const aeCol = headers.indexOf('actual_end');

      locations[id] = {
        installed:     Number(row[4]) || 0,
        notes:         row[5] || '',
        updated_at:    row[6] || '',
        photos,
        uat_docs,
        planned_start: psCol >= 0 ? (row[psCol] || '') : '',
        planned_end:   peCol >= 0 ? (row[peCol] || '') : '',
        actual_start:  asCol >= 0 ? (row[asCol] || '') : '',
        actual_end:    aeCol >= 0 ? (row[aeCol] || '') : ''
      };
    }
    return corsResponse({ ok:true, updated: new Date().toISOString(), updated_by:'Aspek Tumpuan Sdn Bhd', locations });
  } catch(err) {
    return corsResponse({ ok:false, error: err.message });
  }
}

// ── POST — handle all writes ──────────────────────────────────────────────
function doPost(e) {
  // Outer guard — ensures we ALWAYS return JSON, never an HTML error page
  try {
    return doPostInner(e);
  } catch(outerErr) {
    return corsResponse({ ok: false, error: 'Unhandled server error: ' + outerErr.message });
  }
}

function doPostInner(e) {
  try {
    const body = JSON.parse(e.postData.contents);
    if (body.password !== ADMIN_PASSWORD) return corsResponse({ ok:false, error:'Unauthorized' });

    const sheet   = initSheet();
    const rows    = sheet.getDataRange().getValues();
    const headers = rows[0];
    // Column lookups — safe 1-based, 0 means not found
    const photoColIdx = headers.indexOf('photos_json');
    const uatColIdx   = headers.indexOf('uat_json');
    const photoCol = photoColIdx >= 0 ? photoColIdx + 1 : null;
    const uatCol   = uatColIdx   >= 0 ? uatColIdx   + 1 : null;

    // ── Upload photo ──────────────────────────────────────────────────────
    if (body.action === 'upload_photo') {
      if (!photoCol) return corsResponse({ ok:false, error:'photos_json column not found in sheet' });
      const folder   = getFolder();
      const siteId   = Number(body.site_id);
      const fileName = body.file_name || ('photo_site'+siteId+'_'+Date.now()+'.jpg');
      const blob     = Utilities.newBlob(Utilities.base64Decode(body.data), body.mime_type || 'image/jpeg', fileName);
      const file     = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === siteId) {
          let ids = []; try { ids = JSON.parse(rows[i][photoCol-1] || '[]'); } catch(ex) {}
          ids.push({ id: fileId, name: fileName });
          sheet.getRange(i+1, photoCol).setValue(JSON.stringify(ids));
          sheet.getRange(i+1, 7).setValue(new Date().toISOString());
          break;
        }
      }
      return corsResponse({ ok:true, file_id:fileId, url:'https://drive.google.com/file/d/'+fileId+'/view', thumb:'https://drive.google.com/uc?id='+fileId+'&export=view' });
    }

    // ── Delete photo ──────────────────────────────────────────────────────
    if (body.action === 'delete_photo') {
      if (!photoCol) return corsResponse({ ok:false, error:'photos_json column not found in sheet' });
      const siteId = Number(body.site_id), fileId = body.file_id;
      try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === siteId) {
          let ids = []; try { ids = JSON.parse(rows[i][photoCol-1] || '[]'); } catch(ex) {}
          ids = ids.filter(it => (typeof it==='object' ? it.id : it) !== fileId);
          sheet.getRange(i+1, photoCol).setValue(JSON.stringify(ids));
          break;
        }
      }
      return corsResponse({ ok:true });
    }

    // ── Upload UAT document ───────────────────────────────────────────────
    if (body.action === 'upload_uat') {
      if (!body.data) return corsResponse({ ok:false, error:'No file data received' });
      if (!uatCol) return corsResponse({ ok:false, error:'uat_json column not found in sheet' });
      const folder   = getUatFolder();
      const siteId   = Number(body.site_id);
      const origName = body.file_name || ('UAT_site'+siteId+'_'+Date.now()+'.pdf');
      const mimeType = body.mime_type || 'application/pdf';
      const b64clean = body.data.replace(/^data:[^;]+;base64,/, '');
      let decoded;
      try {
        decoded = Utilities.base64Decode(b64clean);
      } catch(decErr) {
        return corsResponse({ ok:false, error:'Base64 decode failed: ' + decErr.message });
      }
      const blob = Utilities.newBlob(decoded, mimeType, origName);
      const file = folder.createFile(blob);
      file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);
      const fileId = file.getId();
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === siteId) {
          let docs = []; try { docs = JSON.parse(rows[i][uatCol-1] || '[]'); } catch(ex) {}
          docs.push({ id: fileId, name: origName });
          sheet.getRange(i+1, uatCol).setValue(JSON.stringify(docs));
          sheet.getRange(i+1, 7).setValue(new Date().toISOString());
          break;
        }
      }
      return corsResponse({ ok:true, file_id:fileId, name:origName, view_url:'https://drive.google.com/file/d/'+fileId+'/preview', dl_url:'https://drive.google.com/uc?export=download&id='+fileId });
    }

    // ── Delete UAT document ───────────────────────────────────────────────
    if (body.action === 'delete_uat') {
      if (!uatCol) return corsResponse({ ok:false, error:'uat_json column not found in sheet' });
      const siteId = Number(body.site_id), fileId = body.file_id;
      try { DriveApp.getFileById(fileId).setTrashed(true); } catch(e) {}
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === siteId) {
          let docs = []; try { docs = JSON.parse(rows[i][uatCol-1] || '[]'); } catch(ex) {}
          docs = docs.filter(it => (typeof it==='object' ? it.id : it) !== fileId);
          sheet.getRange(i+1, uatCol).setValue(JSON.stringify(docs));
          break;
        }
      }
      return corsResponse({ ok:true });
    }

    // ── Update count + notes ──────────────────────────────────────────────
    if (body.action === 'update') {
      const id = Number(body.id);
      for (let i = 1; i < rows.length; i++) {
        if (Number(rows[i][0]) === id) {
          const r = i+1;
          if (body.installed     !== undefined) sheet.getRange(r,5).setValue(Number(body.installed));
          if (body.notes         !== undefined) sheet.getRange(r,6).setValue(body.notes);
          // Date fields — look up column by header
          const hdrs = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
          for (const f of ['planned_start','planned_end','actual_start','actual_end']) {
            if (body[f] !== undefined) { const ci = hdrs.indexOf(f); if (ci>=0) sheet.getRange(r, ci+1).setValue(body[f]); }
          }
          sheet.getRange(r,7).setValue(new Date().toISOString());
          return corsResponse({ ok:true, id });
        }
      }
      return corsResponse({ ok:false, error:'Location not found: '+id });
    }

    // ── Bulk update ───────────────────────────────────────────────────────
    if (body.action === 'bulk_update') {
      const idToRow = {};
      for (let i = 1; i < rows.length; i++) idToRow[Number(rows[i][0])] = i+1;
      for (const u of (body.updates||[])) {
        const r = idToRow[Number(u.id)]; if (!r) continue;
        if (u.installed !== undefined) sheet.getRange(r,5).setValue(Number(u.installed));
        if (u.notes     !== undefined) sheet.getRange(r,6).setValue(u.notes);
        const bhdrs = sheet.getRange(1,1,1,sheet.getLastColumn()).getValues()[0];
        for (const f of ['planned_start','planned_end','actual_start','actual_end']) {
          if (u[f] !== undefined) { const ci = bhdrs.indexOf(f); if (ci>=0) sheet.getRange(r, ci+1).setValue(u[f]); }
        }
        sheet.getRange(r,7).setValue(new Date().toISOString());
      }
      return corsResponse({ ok:true, updated:(body.updates||[]).length });
    }

    return corsResponse({ ok:false, error:'Unknown action' });
  } catch(err) {
    return corsResponse({ ok:false, error: err.message });
  }
}
