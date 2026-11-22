/**
 * ============================================================================
 * DATABASE.GS
 * Lapisan Akses Database Google Sheets, Batch Read/Write, LockService,
 * dan Inisialisasi Otomatis 8 Sheet Utama
 * ============================================================================
 */

/**
 * Menjalankan callback di dalam LockService untuk mencegah race condition / konflik tulis.
 * Jika dijalankan langsung dari tombol Run di Editor tanpa argumen, otomatis menjalankan initializeDatabase().
 */
function withScriptLock(callback, timeoutMs) {
  if (typeof callback !== 'function') {
    return initializeDatabase();
  }
  var lock = LockService.getScriptLock();
  var waitTime = timeoutMs || 15000;
  if (!lock.tryLock(waitTime)) {
    throw new Error('Server sedang sibuk memproses permintaan lain. Silakan coba beberapa saat lagi.');
  }
  try {
    return callback();
  } finally {
    lock.releaseLock();
  }
}

/**
 * Mendapatkan instance Spreadsheet utama.
 * Urutan resolusi:
 * 1. Script Property SPREADSHEET_ID
 * 2. Active Spreadsheet (jika script terikat pada container)
 * 3. Membuat Spreadsheet baru otomatis jika autoCreate = true
 */
function getSpreadsheet(autoCreate) {
  var propId = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.SPREADSHEET_ID, '');
  if (propId) {
    try {
      return SpreadsheetApp.openById(propId);
    } catch (e) {
      throw new Error('Gagal membuka Spreadsheet dengan ID "' + propId + '". Pastikan ID benar dan akun memiliki akses.');
    }
  }

  try {
    var active = SpreadsheetApp.getActiveSpreadsheet();
    if (active) {
      setScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.SPREADSHEET_ID, active.getId());
      return active;
    }
  } catch (e2) {
    // Abaikan jika standalone script
  }

  if (autoCreate) {
    var created = SpreadsheetApp.create('Wedding Invitation Management System - Database');
    setScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.SPREADSHEET_ID, created.getId());
    return created;
  }

  throw new Error(
    'Database Spreadsheet belum terhubung. Silakan masukkan SPREADSHEET_ID di Script Properties atau jalankan initializeDatabase().'
  );
}

/**
 * Memastikan sheet dengan nama & header tertentu tersedia; jika belum, buat otomatis
 */
function ensureSheetWithHeaders(ss, sheetSpec) {
  var sheet = ss.getSheetByName(sheetSpec.name);
  var headers = sheetSpec.headers;

  if (!sheet) {
    sheet = ss.insertSheet(sheetSpec.name);
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
    return { sheet: sheet, created: true };
  }

  var lastCol = sheet.getLastColumn();
  if (lastCol === 0) {
    sheet.getRange(1, 1, 1, headers.length).setValues([headers]);
    styleHeaderRow(sheet, headers.length);
    return { sheet: sheet, created: true };
  }

  // Pastikan seluruh kolom yang dibutuhkan ada (jika ada kolom baru ditambahkan di masa depan)
  var currentHeaders = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });

  var missingHeaders = [];
  headers.forEach(function (reqHeader) {
    if (currentHeaders.indexOf(reqHeader) === -1) {
      missingHeaders.push(reqHeader);
    }
  });

  if (missingHeaders.length > 0) {
    var startCol = lastCol + 1;
    sheet.getRange(1, startCol, 1, missingHeaders.length).setValues([missingHeaders]);
    styleHeaderRow(sheet, lastCol + missingHeaders.length);
  }

  return { sheet: sheet, created: false };
}

/**
 * Memberi styling rapi pada baris header Spreadsheet
 */
function styleHeaderRow(sheet, colCount) {
  try {
    var headerRange = sheet.getRange(1, 1, 1, colCount);
    headerRange
      .setFontWeight('bold')
      .setBackground('#F8F5EF')
      .setFontColor('#292722');
    sheet.setFrozenRows(1);
  } catch (e) {
    // Styling opsional
  }
}

/**
 * INISIALISASI DATABASE OTOMATIS
 * Membuat 8 sheet wajib beserta header dan data awal (admin default, acara, galeri, settings)
 */
function initializeDatabase() {
  return withScriptLock(function () {
    var ss = getSpreadsheet(true);
    var createdSheets = [];

    var sheetKeys = Object.keys(APP_CONFIG.SHEETS);
    sheetKeys.forEach(function (key) {
      var spec = APP_CONFIG.SHEETS[key];
      var res = ensureSheetWithHeaders(ss, spec);
      if (res.created) {
        createdSheets.push(spec.name);
      }
    });

    // Hapus "Sheet1" bawaan kosong jika sheet utama sudah dibuat
    try {
      var defaultSheet = ss.getSheetByName('Sheet1') || ss.getSheetByName('Lembar1');
      if (defaultSheet && ss.getSheets().length > 1 && defaultSheet.getLastRow() === 0) {
        ss.deleteSheet(defaultSheet);
      }
    } catch (e) {}

    // 1. Seed Admin Default jika Users masih kosong
    var users = getSheetRecords(APP_CONFIG.SHEETS.USERS.name);
    var defaultAdminCreated = false;
    if (users.length === 0) {
      appendRecord(APP_CONFIG.SHEETS.USERS.name, {
        user_id: 'USR-ADMIN-001',
        username: 'admin',
        password_hash: createPasswordHash('Admin123!'),
        role: 'admin',
        active: 'true',
        created_at: nowISO()
      });
      defaultAdminCreated = true;
    }

    // 2. Seed Data Pernikahan Default jika Weddings masih kosong
    var weddings = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
    if (weddings.length === 0) {
      appendRecord(APP_CONFIG.SHEETS.WEDDINGS.name, APP_CONFIG.DEFAULT_WEDDING);
    }

    // 3. Seed Settings Default jika Settings masih kosong
    var existingSettings = getSettingsMap();
    var settingsToInsert = [];
    Object.keys(APP_CONFIG.DEFAULT_SETTINGS).forEach(function (sKey) {
      if (existingSettings[sKey] === undefined) {
        settingsToInsert.push({
          setting_key: sKey,
          setting_value: APP_CONFIG.DEFAULT_SETTINGS[sKey]
        });
      }
    });
    if (settingsToInsert.length > 0) {
      appendRecordsBatch(APP_CONFIG.SHEETS.SETTINGS.name, settingsToInsert);
    }

    // 4. Seed Gallery Default jika Gallery masih kosong
    var gallery = getSheetRecords(APP_CONFIG.SHEETS.GALLERY.name);
    if (gallery.length === 0) {
      appendRecordsBatch(APP_CONFIG.SHEETS.GALLERY.name, APP_CONFIG.DEFAULT_GALLERY);
    }

    // 5. Seed 2 Contoh Tamu awal jika Guests masih kosong agar bisa langsung dites
    var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    if (guests.length === 0) {
      var token1 = generateRandomToken(24);
      var token2 = generateRandomToken(24);
      var baseUrl = getWebAppBaseUrl();
      var ts = nowISO();
      appendRecordsBatch(APP_CONFIG.SHEETS.GUESTS.name, [
        {
          guest_id: 'GST-SAMPLE-001',
          guest_name: 'Budi Santoso',
          whatsapp_number: '6281234567890',
          category: 'Keluarga',
          token_hash: hashToken(token1),
          invitation_url: baseUrl + '?token=' + encodeURIComponent(token1),
          delivery_status: APP_CONFIG.DELIVERY_STATUS.UNSENT,
          created_at: ts,
          updated_at: ts,
          invitation_token: token1
        },
        {
          guest_id: 'GST-SAMPLE-002',
          guest_name: 'Siti Rahmawati',
          whatsapp_number: '6281298765432',
          category: 'Teman',
          token_hash: hashToken(token2),
          invitation_url: baseUrl + '?token=' + encodeURIComponent(token2),
          delivery_status: APP_CONFIG.DELIVERY_STATUS.UNSENT,
          created_at: ts,
          updated_at: ts,
          invitation_token: token2
        }
      ]);

      appendRecord(APP_CONFIG.SHEETS.RSVP.name, {
        rsvp_id: 'RSVP-SAMPLE-001',
        guest_id: 'GST-SAMPLE-001',
        attendance_status: APP_CONFIG.RSVP_STATUS.ATTENDING,
        guest_count: 2,
        wishes: 'Selamat menempuh hidup baru Romeo & Juliet! Semoga menjadi keluarga sakinah, mawaddah, warahmah.',
        created_at: ts,
        updated_at: ts
      });
    }

    clearWeddingCache();

    return {
      spreadsheetId: ss.getId(),
      spreadsheetUrl: ss.getUrl(),
      createdSheets: createdSheets,
      defaultAdminCreated: defaultAdminCreated
    };
  });
}

/**
 * Mengambil seluruh baris pada sebuah sheet dalam 1 operasi batch (getValues)
 * dan memetakannya menjadi array of objects berdasarkan baris header.
 */
function getSheetRecords(sheetName) {
  var ss = getSpreadsheet(true);
  var sheetSpecKey = Object.keys(APP_CONFIG.SHEETS).filter(function (k) {
    return APP_CONFIG.SHEETS[k].name === sheetName;
  })[0];

  var sheet = ss.getSheetByName(sheetName);
  if (!sheet && sheetSpecKey) {
    sheet = ensureSheetWithHeaders(ss, APP_CONFIG.SHEETS[sheetSpecKey]).sheet;
  }
  if (!sheet) {
    throw new Error('Sheet "' + sheetName + '" tidak ditemukan.');
  }

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) {
    return [];
  }

  var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allValues[0].map(function (h) {
    return String(h || '').trim();
  });

  var records = [];
  for (var r = 1; r < allValues.length; r++) {
    var row = allValues[r];
    var isEmpty = true;
    var obj = { _rowNumber: r + 1 };
    for (var c = 0; c < headers.length; c++) {
      var key = headers[c];
      if (!key) continue;
      var val = row[c];
      if (val instanceof Date) {
        val = Utilities.formatDate(val, APP_CONFIG.TIMEZONE || 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ssXXX");
      }
      if (val !== '' && val !== null && val !== undefined) {
        isEmpty = false;
      }
      obj[key] = val !== undefined && val !== null ? val : '';
    }
    if (!isEmpty) {
      records.push(obj);
    }
  }
  return records;
}

/**
 * Menambahkan 1 baris record ke sheet
 */
function appendRecord(sheetName, recordObj) {
  return appendRecordsBatch(sheetName, [recordObj]);
}

/**
 * Menambahkan banyak baris record ke sheet dalam 1 operasi batch (setValues)
 */
function appendRecordsBatch(sheetName, recordsArray) {
  if (!recordsArray || recordsArray.length === 0) return 0;
  var ss = getSpreadsheet(true);
  var sheetSpecKey = Object.keys(APP_CONFIG.SHEETS).filter(function (k) {
    return APP_CONFIG.SHEETS[k].name === sheetName;
  })[0];
  var spec = APP_CONFIG.SHEETS[sheetSpecKey];
  var sheet = ensureSheetWithHeaders(ss, spec).sheet;

  var lastCol = sheet.getLastColumn();
  var headers = sheet.getRange(1, 1, 1, lastCol).getValues()[0].map(function (h) {
    return String(h || '').trim();
  });

  var rowsToAppend = recordsArray.map(function (rec) {
    return headers.map(function (h) {
      var v = rec[h];
      return v !== undefined && v !== null ? v : '';
    });
  });

  var startRow = sheet.getLastRow() + 1;
  sheet.getRange(startRow, 1, rowsToAppend.length, headers.length).setValues(rowsToAppend);
  return rowsToAppend.length;
}

/**
 * Memperbarui baris berdasarkan nilai kolom ID tertentu
 */
function updateRecordById(sheetName, idColumn, idValue, updatesObj) {
  var ss = getSpreadsheet(true);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return false;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return false;

  var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allValues[0].map(function (h) {
    return String(h || '').trim();
  });
  var idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) return false;

  var targetId = String(idValue).trim();
  for (var r = 1; r < allValues.length; r++) {
    if (String(allValues[r][idColIndex]).trim() === targetId) {
      var updatedRow = allValues[r].slice();
      headers.forEach(function (h, idx) {
        if (updatesObj.hasOwnProperty(h) && updatesObj[h] !== undefined) {
          updatedRow[idx] = updatesObj[h];
        }
      });
      sheet.getRange(r + 1, 1, 1, lastCol).setValues([updatedRow]);
      return true;
    }
  }
  return false;
}

/**
 * Memperbarui banyak baris sekaligus dalam 1 operasi batch (sangat cepat untuk antrean WA / bulk update)
 */
function batchUpdateRecordsById(sheetName, idColumn, updatesByIdMap) {
  var ss = getSpreadsheet(true);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return 0;

  var dataRange = sheet.getRange(1, 1, lastRow, lastCol);
  var allValues = dataRange.getValues();
  var headers = allValues[0].map(function (h) {
    return String(h || '').trim();
  });
  var idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) return 0;

  var updatedCount = 0;
  for (var r = 1; r < allValues.length; r++) {
    var rowId = String(allValues[r][idColIndex]).trim();
    if (updatesByIdMap.hasOwnProperty(rowId)) {
      var patch = updatesByIdMap[rowId];
      headers.forEach(function (h, idx) {
        if (patch.hasOwnProperty(h) && patch[h] !== undefined) {
          allValues[r][idx] = patch[h];
        }
      });
      updatedCount++;
    }
  }

  if (updatedCount > 0) {
    dataRange.setValues(allValues);
  }
  return updatedCount;
}

/**
 * Menghapus satu atau banyak baris berdasarkan kumpulan ID dalam 1 operasi batch tulis ulang
 */
function deleteRecordsByIds(sheetName, idColumn, idArray) {
  if (!idArray || idArray.length === 0) return 0;
  var ss = getSpreadsheet(true);
  var sheet = ss.getSheetByName(sheetName);
  if (!sheet) return 0;

  var lastRow = sheet.getLastRow();
  var lastCol = sheet.getLastColumn();
  if (lastRow <= 1 || lastCol === 0) return 0;

  var idLookup = {};
  idArray.forEach(function (id) {
    idLookup[String(id).trim()] = true;
  });

  var allValues = sheet.getRange(1, 1, lastRow, lastCol).getValues();
  var headers = allValues[0].map(function (h) {
    return String(h || '').trim();
  });
  var idColIndex = headers.indexOf(idColumn);
  if (idColIndex === -1) return 0;

  var keptRows = [allValues[0]];
  var deletedCount = 0;

  for (var r = 1; r < allValues.length; r++) {
    var rowId = String(allValues[r][idColIndex]).trim();
    if (idLookup[rowId]) {
      deletedCount++;
    } else {
      keptRows.push(allValues[r]);
    }
  }

  if (deletedCount > 0) {
    sheet.clearContents();
    sheet.getRange(1, 1, keptRows.length, lastCol).setValues(keptRows);
  }
  return deletedCount;
}

/**
 * Mengganti seluruh isi data sheet (selain baris header) secara atomik dalam 1 batch
 */
function replaceSheetRecords(sheetName, recordsArray) {
  var ss = getSpreadsheet(true);
  var sheetSpecKey = Object.keys(APP_CONFIG.SHEETS).filter(function (k) {
    return APP_CONFIG.SHEETS[k].name === sheetName;
  })[0];
  var spec = APP_CONFIG.SHEETS[sheetSpecKey];
  var sheet = ensureSheetWithHeaders(ss, spec).sheet;

  var headers = spec.headers;
  var matrix = [headers];
  (recordsArray || []).forEach(function (rec) {
    matrix.push(
      headers.map(function (h) {
        return rec[h] !== undefined && rec[h] !== null ? rec[h] : '';
      })
    );
  });

  sheet.clearContents();
  sheet.getRange(1, 1, matrix.length, headers.length).setValues(matrix);
  styleHeaderRow(sheet, headers.length);
  return (recordsArray || []).length;
}

/**
 * Membaca seluruh key-value dari sheet Settings menjadi object map
 */
function getSettingsMap() {
  var rows = getSheetRecords(APP_CONFIG.SHEETS.SETTINGS.name);
  var map = {};
  rows.forEach(function (r) {
    var k = String(r.setting_key || '').trim();
    if (k) {
      map[k] = r.setting_value !== undefined && r.setting_value !== null ? String(r.setting_value) : '';
    }
  });
  return map;
}

/**
 * Menyimpan/upsert sekumpulan key-value ke sheet Settings secara batch
 */
function saveSettingsMap(updatesMap) {
  if (!updatesMap) return;
  var currentMap = getSettingsMap();
  Object.keys(updatesMap).forEach(function (k) {
    if (updatesMap[k] !== undefined && updatesMap[k] !== null) {
      currentMap[k] = String(updatesMap[k]);
    }
  });

  var allRows = Object.keys(currentMap).map(function (k) {
    return {
      setting_key: k,
      setting_value: currentMap[k]
    };
  });

  replaceSheetRecords(APP_CONFIG.SHEETS.SETTINGS.name, allRows);
}

/**
 * Menghapus cache konfigurasi undangan saat ada perubahan dari admin
 */
function clearWeddingCache() {
  try {
    CacheService.getScriptCache().remove(APP_CONFIG.WEDDING_CACHE_KEY);
  } catch (e) {}
}
