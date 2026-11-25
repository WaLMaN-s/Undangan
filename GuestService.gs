/**
 * ============================================================================
 * GUESTSERVICE.GS
 * Manajemen Data Tamu: CRUD, Generator Token Personal, Validasi Nomor WA,
 * Deteksi Duplikat, Import CSV & Konversi Excel Google Drive, Bulk Delete
 * ============================================================================
 */

/**
 * Menghasilkan pasangan token undangan acak, hash token, dan URL undangan lengkap
 */
function generateInvitationToken() {
  var rawToken = generateRandomToken(24);
  var tokenHash = hashToken(rawToken);
  var baseUrl = getWebAppBaseUrl();
  var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
  var invitationUrl = baseUrl + separator + 'token=' + encodeURIComponent(rawToken);
  return {
    invitation_token: rawToken,
    token_hash: tokenHash,
    invitation_url: invitationUrl
  };
}

/**
 * Mengambil token mentah dari objek guest (dari kolom invitation_token atau query URL)
 */
function extractRawTokenFromGuest(guest) {
  if (!guest) return '';
  if (guest.invitation_token && String(guest.invitation_token).trim()) {
    return String(guest.invitation_token).trim();
  }
  var url = String(guest.invitation_url || '');
  var match = url.match(/[?&]token=([^&#]+)/);
  return match ? decodeURIComponent(match[1]) : '';
}

/**
 * Mengambil daftar tamu lengkap beserta join status RSVP & Check-in,
 * mendukung pencarian, filter kategori, filter delivery_status, filter rsvp_status, dan pagination.
 */
function getGuests(sessionToken, filters) {
  requireAdmin(sessionToken);
  var params = filters || {};

  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
  var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);
  var settings = getSettingsMap();
  var wedding = getWeddingConfigData(false);
  var activeWeddingId = wedding.wedding_id || 'WED-001';
  var waTemplate = wedding.wa_message_template || settings.wa_message_template || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template;

  // Filter tamu khusus milik klien/wedding aktif (tamu lama tanpa wedding_id dianggap milik WED-001)
  var clientGuests = guests.filter(function (g) {
    var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
    return gWid === activeWeddingId;
  });

  // Buat map RSVP per guest_id
  var rsvpByGuest = {};
  rsvps.forEach(function (r) {
    rsvpByGuest[String(r.guest_id)] = r;
  });

  // Buat map Checkin per guest_id
  var checkinByGuest = {};
  checkins.forEach(function (c) {
    checkinByGuest[String(c.guest_id)] = c;
  });

  var baseUrl = getWebAppBaseUrl();

  // Gabungkan data
  var enriched = clientGuests.map(function (g) {
    var gid = String(g.guest_id);
    var rsvp = rsvpByGuest[gid] || null;
    var checkin = checkinByGuest[gid] || null;
    var rawToken = extractRawTokenFromGuest(g);
    var invUrl = g.invitation_url || (rawToken ? (baseUrl + '?token=' + encodeURIComponent(rawToken)) : '');

    var rsvpStatus = rsvp && rsvp.attendance_status
      ? String(rsvp.attendance_status)
      : APP_CONFIG.RSVP_STATUS.PENDING;

    var deliveryStatus = g.delivery_status || APP_CONFIG.DELIVERY_STATUS.UNSENT;

    // Buat teks pesan WA & link 1-Klik Gratis (wa.me)
    var renderedMsg = renderMessageText(waTemplate, {
      guest_name: g.guest_name,
      category: g.category,
      invitation_url: invUrl
    }, wedding);

    var cleanPhone = normalizeIndonesianPhone(g.whatsapp_number);
    var waMeUrl = cleanPhone
      ? 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(renderedMsg)
      : '';

    return {
      guest_id: gid,
      guest_name: g.guest_name || '',
      whatsapp_number: cleanPhone || g.whatsapp_number || '',
      guest_category: g.category || 'Lainnya',
      category: g.category || 'Lainnya',
      invitation_token: rawToken,
      token_hash: g.token_hash || '',
      invitation_url: invUrl,
      delivery_status: deliveryStatus,
      rsvp_status: rsvpStatus,
      guest_count: rsvp ? (parseInt(rsvp.guest_count, 10) || 0) : 0,
      wishes: rsvp ? (rsvp.wishes || '') : '',
      checked_in: !!checkin,
      checkin_time: checkin ? checkin.checkin_time : '',
      wa_me_url: waMeUrl,
      rendered_message: renderedMsg,
      wedding_id: (g.wedding_id && String(g.wedding_id).trim()) || activeWeddingId,
      locked_theme: (g.locked_theme && String(g.locked_theme).trim()) || '',
      created_at: g.created_at || '',
      updated_at: g.updated_at || g.created_at || ''
    };
  });

  // Urutkan terbaru di atas secara default
  enriched.sort(function (a, b) {
    return String(b.created_at).localeCompare(String(a.created_at));
  });

  // Filter Pencarian Nama / Nomor WA
  var search = String(params.search || '').trim().toLowerCase();
  var catFilter = String(params.category || '').trim();
  var delivFilter = String(params.delivery_status || '').trim();
  var rsvpFilter = String(params.rsvp_status || '').trim();

  var filtered = enriched.filter(function (item) {
    if (search) {
      var nameMatch = String(item.guest_name).toLowerCase().indexOf(search) !== -1;
      var phoneMatch = String(item.whatsapp_number).toLowerCase().indexOf(search) !== -1;
      var idMatch = String(item.guest_id).toLowerCase().indexOf(search) !== -1;
      if (!nameMatch && !phoneMatch && !idMatch) return false;
    }
    if (catFilter && catFilter !== 'ALL' && item.category !== catFilter) {
      return false;
    }
    if (delivFilter && delivFilter !== 'ALL' && item.delivery_status !== delivFilter) {
      return false;
    }
    if (rsvpFilter && rsvpFilter !== 'ALL' && item.rsvp_status !== rsvpFilter) {
      return false;
    }
    return true;
  });

  var totalFiltered = filtered.length;
  var page = Math.max(1, parseInt(params.page, 10) || 1);
  var pageSize = parseInt(params.pageSize, 10) || 25;
  var returnAll = params.all === true;

  var paginatedItems = returnAll
    ? filtered
    : filtered.slice((page - 1) * pageSize, page * pageSize);

  return okResponse({
    guests: paginatedItems,
    allFilteredIds: filtered.map(function (item) { return item.guest_id; }),
    pagination: {
      page: page,
      pageSize: pageSize,
      totalItems: totalFiltered,
      totalPages: Math.max(1, Math.ceil(totalFiltered / pageSize)),
      totalAllGuests: enriched.length
    }
  });
}

/**
 * Menambah data tamu baru dengan validasi nomor WA Indonesia & cek duplikat
 */
function addGuest(sessionToken, guestData) {
  requireAdmin(sessionToken);
  if (!guestData) {
    return errorResponse('Data tamu tidak boleh kosong.', 'GUEST_EMPTY_DATA');
  }

  var guestName = sanitizeString(guestData.guest_name, 120);
  var rawPhone = String(guestData.whatsapp_number || '').trim();
  var normalizedPhone = normalizeIndonesianPhone(rawPhone);
  var category = sanitizeString(guestData.category || guestData.guest_category || 'Lainnya', 50);

  if (!guestName || guestName.length < 2) {
    return errorResponse('Nama tamu wajib diisi (minimal 2 karakter).', 'GUEST_INVALID_NAME');
  }

  if (!isValidIndonesianPhone(normalizedPhone)) {
    return errorResponse(
      'Nomor WhatsApp tidak valid. Gunakan format nomor Indonesia aktif (contoh: 081234567890 atau 6281234567890).',
      'GUEST_INVALID_PHONE'
    );
  }

  if (APP_CONFIG.GUEST_CATEGORIES.indexOf(category) === -1) {
    category = 'Lainnya';
  }

  return withScriptLock(function () {
    var activeWedding = getWeddingConfigData(false);
    var activeWeddingId = activeWedding.wedding_id || 'WED-001';
    var activeTheme = activeWedding.invitation_theme || 'elegant_floral';
    var existingGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);

    // Deteksi nomor telepon duplikat pada klien yang sama
    for (var i = 0; i < existingGuests.length; i++) {
      var gWid = (existingGuests[i].wedding_id && String(existingGuests[i].wedding_id).trim()) || 'WED-001';
      if (gWid !== activeWeddingId) continue;
      var existingPhone = normalizeIndonesianPhone(existingGuests[i].whatsapp_number);
      if (existingPhone === normalizedPhone) {
        return errorResponse(
          'Nomor WhatsApp ' + normalizedPhone + ' sudah terdaftar atas nama "' + existingGuests[i].guest_name + '".',
          'GUEST_DUPLICATE_PHONE'
        );
      }
    }

    var tokenBundle = generateInvitationToken();
    var ts = nowISO();
    var newGuest = {
      guest_id: generateId('GST'),
      guest_name: guestName,
      whatsapp_number: normalizedPhone,
      category: category,
      token_hash: tokenBundle.token_hash,
      invitation_url: tokenBundle.invitation_url,
      delivery_status: APP_CONFIG.DELIVERY_STATUS.UNSENT,
      created_at: ts,
      updated_at: ts,
      invitation_token: tokenBundle.invitation_token,
      wedding_id: activeWeddingId,
      locked_theme: activeTheme
    };

    appendRecord(APP_CONFIG.SHEETS.GUESTS.name, newGuest);

    return okResponse({ guest: newGuest }, 'Tamu "' + guestName + '" berhasil ditambahkan.');
  });
}

/**
 * Mengedit data tamu dan opsional me-regenerate token undangan
 */
function updateGuest(sessionToken, guestData) {
  requireAdmin(sessionToken);
  if (!guestData || !guestData.guest_id) {
    return errorResponse('ID tamu wajib disertakan.', 'GUEST_MISSING_ID');
  }

  var guestId = String(guestData.guest_id).trim();
  var guestName = sanitizeString(guestData.guest_name, 120);
  var normalizedPhone = normalizeIndonesianPhone(guestData.whatsapp_number);
  var category = sanitizeString(guestData.category || guestData.guest_category || 'Lainnya', 50);

  if (!guestName || guestName.length < 2) {
    return errorResponse('Nama tamu minimal 2 karakter.', 'GUEST_INVALID_NAME');
  }

  if (!isValidIndonesianPhone(normalizedPhone)) {
    return errorResponse(
      'Nomor WhatsApp tidak valid. Gunakan format nomor Indonesia (08xx / 628xx).',
      'GUEST_INVALID_PHONE'
    );
  }

  if (APP_CONFIG.GUEST_CATEGORIES.indexOf(category) === -1) {
    category = 'Lainnya';
  }

  return withScriptLock(function () {
    var existingGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    var targetGuest = null;

    for (var i = 0; i < existingGuests.length; i++) {
      var g = existingGuests[i];
      if (String(g.guest_id) === guestId) {
        targetGuest = g;
      } else if (normalizeIndonesianPhone(g.whatsapp_number) === normalizedPhone) {
        return errorResponse(
          'Nomor WhatsApp ' + normalizedPhone + ' sudah digunakan oleh tamu lain ("' + g.guest_name + '").',
          'GUEST_DUPLICATE_PHONE'
        );
      }
    }

    if (!targetGuest) {
      return errorResponse('Data tamu tidak ditemukan.', 'GUEST_NOT_FOUND');
    }

    var updates = {
      guest_name: guestName,
      whatsapp_number: normalizedPhone,
      category: category,
      updated_at: nowISO()
    };

    if (guestData.delivery_status) {
      updates.delivery_status = sanitizeString(guestData.delivery_status, 40);
    }

    if (guestData.regenerateToken === true) {
      var newToken = generateInvitationToken();
      updates.invitation_token = newToken.invitation_token;
      updates.token_hash = newToken.token_hash;
      updates.invitation_url = newToken.invitation_url;
    }

    updateRecordById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestId, updates);

    return okResponse(
      { guest_id: guestId, updates: updates },
      'Data tamu "' + guestName + '" berhasil diperbarui.'
    );
  });
}

/**
 * Menghapus satu tamu beserta data terkait (RSVP, Checkin, Messages)
 */
function deleteGuest(sessionToken, guestId) {
  return bulkDeleteGuests(sessionToken, [guestId]);
}

/**
 * Menghapus banyak tamu sekaligus (Bulk Delete) dengan pembersihan relasi otomatis
 */
function bulkDeleteGuests(sessionToken, guestIds) {
  requireAdmin(sessionToken);
  if (!Array.isArray(guestIds) || guestIds.length === 0) {
    return errorResponse('Pilih minimal satu tamu untuk dihapus.', 'GUEST_EMPTY_SELECTION');
  }

  var cleanIds = guestIds.map(function (id) { return String(id).trim(); }).filter(Boolean);

  return withScriptLock(function () {
    var deletedGuests = deleteRecordsByIds(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', cleanIds);
    deleteRecordsByIds(APP_CONFIG.SHEETS.RSVP.name, 'guest_id', cleanIds);
    deleteRecordsByIds(APP_CONFIG.SHEETS.CHECKIN.name, 'guest_id', cleanIds);
    deleteRecordsByIds(APP_CONFIG.SHEETS.MESSAGES.name, 'guest_id', cleanIds);

    return okResponse(
      { deletedCount: deletedGuests },
      deletedGuests + ' data tamu berhasil dihapus.'
    );
  });
}

/**
 * Mengonversi file Excel (.xlsx / .xls) dalam bentuk Base64 menggunakan Google Drive API
 * menjadi Google Spreadsheet sementara, membaca barisnya, lalu menghapus file sementara tersebut.
 */
function parseExcelViaDriveConversion(base64Data, fileName, mimeType) {
  var bytes = Utilities.base64Decode(base64Data);
  if (bytes.length > APP_CONFIG.MAX_UPLOAD_BYTES) {
    throw new Error('Ukuran file Excel melebihi batas maksimal 5 MB.');
  }

  var oauthToken = ScriptApp.getOAuthToken();
  var metadata = {
    name: 'TEMP_IMPORT_' + (fileName || 'guests.xlsx') + '_' + new Date().getTime(),
    mimeType: 'application/vnd.google-apps.spreadsheet'
  };

  var boundary = '-------WIMSDriveImportBoundary' + new Date().getTime();
  var delimiter = '\r\n--' + boundary + '\r\n';
  var closeDelimiter = '\r\n--' + boundary + '--';

  var contentType = mimeType || 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
  var multipartHeader =
    delimiter +
    'Content-Type: application/json; charset=UTF-8\r\n\r\n' +
    JSON.stringify(metadata) +
    delimiter +
    'Content-Type: ' + contentType + '\r\n' +
    'Content-Transfer-Encoding: base64\r\n\r\n' +
    base64Data +
    closeDelimiter;

  var response = UrlFetchApp.fetch(
    'https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart',
    {
      method: 'post',
      contentType: 'multipart/related; boundary=' + boundary,
      headers: {
        Authorization: 'Bearer ' + oauthToken
      },
      payload: multipartHeader,
      muteHttpExceptions: true
    }
  );

  var statusCode = response.getResponseCode();
  var respBody = JSON.parse(response.getContentText() || '{}');
  if (statusCode < 200 || statusCode >= 300 || !respBody.id) {
    throw new Error(
      'Gagal mengonversi file Excel melalui Google Drive: ' +
        ((respBody.error && respBody.error.message) || response.getContentText())
    );
  }

  var tempSheetId = respBody.id;
  try {
    var tempSS = SpreadsheetApp.openById(tempSheetId);
    var firstSheet = tempSS.getSheets()[0];
    var values = firstSheet.getDataRange().getValues();
    return values;
  } finally {
    // Selalu hapus file konversi sementara dari Google Drive
    try {
      DriveApp.getFileById(tempSheetId).setTrashed(true);
    } catch (cleanupErr) {}
  }
}

/**
 * Import Data Tamu secara Massal dari:
 * 1. Teks CSV (payload.csvText)
 * 2. File Excel via Konversi Google Drive (payload.excelBase64)
 * 3. Array baris terstruktur (payload.rows)
 */
function importGuests(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload) {
    return errorResponse('Data import tidak ditemukan.', 'IMPORT_EMPTY_PAYLOAD');
  }

  var rawRows = [];
  try {
    if (payload.excelBase64) {
      rawRows = parseExcelViaDriveConversion(
        payload.excelBase64,
        payload.fileName || 'import.xlsx',
        payload.mimeType
      );
    } else if (payload.csvText) {
      rawRows = parseCSVText(payload.csvText);
    } else if (Array.isArray(payload.rows)) {
      rawRows = payload.rows;
    } else {
      return errorResponse('Format file import tidak dikenali. Gunakan CSV atau Excel (.xlsx/.xls).', 'IMPORT_INVALID_FORMAT');
    }
  } catch (parseErr) {
    return errorResponse(parseErr.message, 'IMPORT_PARSE_ERROR');
  }

  if (!rawRows || rawRows.length === 0) {
    return errorResponse('File import kosong atau tidak memiliki baris data.', 'IMPORT_NO_ROWS');
  }

  return withScriptLock(function () {
    var activeWedding = getWeddingConfigData(false);
    var activeWeddingId = activeWedding.wedding_id || 'WED-001';
    var activeTheme = activeWedding.invitation_theme || 'elegant_floral';
    var existingGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    var phoneSet = {};
    existingGuests.forEach(function (g) {
      var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
      if (gWid !== activeWeddingId) return;
      var p = normalizeIndonesianPhone(g.whatsapp_number);
      if (p) phoneSet[p] = g.guest_name;
    });

    // Deteksi apakah baris pertama adalah header
    var firstRow = rawRows[0].map(function (c) { return String(c || '').trim().toLowerCase(); });
    var hasHeader =
      firstRow.indexOf('guest_name') !== -1 ||
      firstRow.indexOf('nama') !== -1 ||
      firstRow.indexOf('nama tamu') !== -1 ||
      firstRow.indexOf('name') !== -1 ||
      firstRow.indexOf('whatsapp_number') !== -1 ||
      firstRow.indexOf('whatsapp') !== -1 ||
      firstRow.indexOf('no wa') !== -1;

    var nameIdx = 0;
    var phoneIdx = 1;
    var catIdx = 2;

    if (hasHeader) {
      firstRow.forEach(function (colName, idx) {
        if (colName.indexOf('name') !== -1 || colName.indexOf('nama') !== -1) nameIdx = idx;
        else if (colName.indexOf('wa') !== -1 || colName.indexOf('phone') !== -1 || colName.indexOf('hp') !== -1 || colName.indexOf('telp') !== -1 || colName.indexOf('nomor') !== -1) phoneIdx = idx;
        else if (colName.indexOf('cat') !== -1 || colName.indexOf('kategori') !== -1 || colName.indexOf('grup') !== -1) catIdx = idx;
      });
    }

    var startRowIdx = hasHeader ? 1 : 0;
    var toInsert = [];
    var duplicates = [];
    var invalidRows = [];
    var ts = nowISO();

    for (var r = startRowIdx; r < rawRows.length; r++) {
      var row = rawRows[r];
      var rawName = '';
      var rawPhone = '';
      var rawCat = 'Lainnya';

      if (Array.isArray(row)) {
        rawName = row[nameIdx];
        rawPhone = row[phoneIdx];
        rawCat = row[catIdx] || 'Lainnya';
      } else if (typeof row === 'object' && row !== null) {
        rawName = row.guest_name || row.nama || row.name || '';
        rawPhone = row.whatsapp_number || row.whatsapp || row.phone || '';
        rawCat = row.category || row.guest_category || row.kategori || 'Lainnya';
      }

      var cleanName = sanitizeString(rawName, 120);
      var cleanPhone = normalizeIndonesianPhone(rawPhone);
      var cleanCat = sanitizeString(rawCat, 50);

      if (!cleanName && !cleanPhone) continue;

      if (!cleanName || cleanName.length < 2) {
        invalidRows.push({
          rowNumber: r + 1,
          name: cleanName || '(Kosong)',
          phone: rawPhone || '-',
          reason: 'Nama tamu kosong atau terlalu pendek'
        });
        continue;
      }

      if (!isValidIndonesianPhone(cleanPhone)) {
        invalidRows.push({
          rowNumber: r + 1,
          name: cleanName,
          phone: String(rawPhone || '-'),
          reason: 'Nomor WhatsApp Indonesia tidak valid'
        });
        continue;
      }

      if (phoneSet[cleanPhone]) {
        duplicates.push({
          rowNumber: r + 1,
          name: cleanName,
          phone: cleanPhone,
          existingOwner: phoneSet[cleanPhone]
        });
        continue;
      }

      // Validasi kategori
      var matchedCat = 'Lainnya';
      APP_CONFIG.GUEST_CATEGORIES.forEach(function (validCat) {
        if (validCat.toLowerCase() === cleanCat.toLowerCase()) {
          matchedCat = validCat;
        }
      });

      var tokenObj = generateInvitationToken();
      phoneSet[cleanPhone] = cleanName;

      toInsert.push({
        guest_id: generateId('GST') + '-' + r,
        guest_name: cleanName,
        whatsapp_number: cleanPhone,
        category: matchedCat,
        token_hash: tokenObj.token_hash,
        invitation_url: tokenObj.invitation_url,
        delivery_status: APP_CONFIG.DELIVERY_STATUS.UNSENT,
        created_at: ts,
        updated_at: ts,
        invitation_token: tokenObj.invitation_token,
        wedding_id: activeWeddingId,
        locked_theme: activeTheme
      });
    }

    if (toInsert.length > 0) {
      appendRecordsBatch(APP_CONFIG.SHEETS.GUESTS.name, toInsert);
    }

    return okResponse(
      {
        importedCount: toInsert.length,
        duplicateCount: duplicates.length,
        invalidCount: invalidRows.length,
        duplicates: duplicates.slice(0, 30),
        invalidRows: invalidRows.slice(0, 30)
      },
      'Import selesai: ' +
        toInsert.length +
        ' tamu berhasil ditambahkan, ' +
        duplicates.length +
        ' duplikat dilewati, ' +
        invalidRows.length +
        ' baris tidak valid.'
    );
  });
}

/**
 * Memperbarui semua link undangan tamu jika Base URL Web App berubah setelah deployment baru
 */
function refreshAllGuestInvitationUrls(sessionToken) {
  requireAdmin(sessionToken);
  return withScriptLock(function () {
    var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    var baseUrl = getWebAppBaseUrl();
    var separator = baseUrl.indexOf('?') === -1 ? '?' : '&';
    var patchMap = {};

    guests.forEach(function (g) {
      var rawToken = extractRawTokenFromGuest(g);
      if (!rawToken) {
        rawToken = generateRandomToken(24);
      }
      patchMap[String(g.guest_id)] = {
        invitation_token: rawToken,
        token_hash: hashToken(rawToken),
        invitation_url: baseUrl + separator + 'token=' + encodeURIComponent(rawToken),
        updated_at: nowISO()
      };
    });

    var updated = batchUpdateRecordsById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', patchMap);
    return okResponse({ updatedCount: updated, baseUrl: baseUrl }, updated + ' URL undangan tamu berhasil disinkronkan.');
  });
}
