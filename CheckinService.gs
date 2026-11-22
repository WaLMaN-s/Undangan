/**
 * ============================================================================
 * CHECKINSERVICE.GS
 * Verifikasi QR Code Check-in di Lokasi Acara, Pencegahan Check-in Ganda,
 * Pencatatan Waktu & Petugas Check-in, serta Statistik Kehadiran Realtime
 * ============================================================================
 */

/**
 * Mengekstrak token atau guest_id dari string hasil scan QR Code
 * (Mendukung raw token, URL lengkap ?token=..., JSON payload, maupun guest_id)
 */
function parseScannedQrInput(rawScan) {
  var str = String(rawScan || '').trim();
  if (!str) return '';

  // Jika hasil scan berupa URL undangan (?token=XYZ)
  var urlMatch = str.match(/[?&]token=([^&#\s]+)/i);
  if (urlMatch && urlMatch[1]) {
    return decodeURIComponent(urlMatch[1].trim());
  }

  // Jika hasil scan berupa JSON
  if (str.indexOf('{') === 0) {
    try {
      var parsed = JSON.parse(str);
      if (parsed.token) return String(parsed.token).trim();
      if (parsed.guest_id) return String(parsed.guest_id).trim();
    } catch (e) {}
  }

  return str;
}

/**
 * Memverifikasi token QR Code dan mencatat kehadiran tamu (Check-in)
 * KEAMANAN & VALIDASI:
 * - Memeriksa token terhadap token_hash / invitation_token / guest_id di database
 * - Menggunakan LockService untuk mencegah double check-in jika di-scan bersamaan
 * - Jika sudah pernah check-in, menolak duplikasi dan menampilkan waktu check-in sebelumnya
 */
function verifyCheckin(sessionToken, qrInput, checkedByInput) {
  var admin = requireAdmin(sessionToken);
  var tokenOrId = parseScannedQrInput(qrInput);

  if (!tokenOrId) {
    return errorResponse('Kode QR atau Token tidak terbaca. Silakan ulangi pemindaian.', 'CHECKIN_EMPTY_TOKEN');
  }

  var checkedBy = sanitizeString(checkedByInput || admin.username || 'Admin', 60);

  return withScriptLock(function () {
    var matchedGuest = findGuestByRawToken(tokenOrId);

    // Fallback: izinkan pencarian berdasarkan guest_id jika petugas memasukkan ID tamu secara manual
    if (!matchedGuest) {
      var allGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
      for (var i = 0; i < allGuests.length; i++) {
        if (String(allGuests[i].guest_id).toLowerCase() === tokenOrId.toLowerCase()) {
          matchedGuest = allGuests[i];
          break;
        }
      }
    }

    if (!matchedGuest) {
      return errorResponse(
        'QR Code / Token tidak terdaftar dalam database tamu. Pastikan QR berasal dari undangan resmi.',
        'CHECKIN_INVALID_TOKEN'
      );
    }

    var guestId = String(matchedGuest.guest_id);
    var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);
    var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);

    var guestRsvp = null;
    for (var r = 0; r < rsvps.length; r++) {
      if (String(rsvps[r].guest_id) === guestId) {
        guestRsvp = rsvps[r];
        break;
      }
    }

    // Cegah Check-in Ganda
    for (var c = 0; c < checkins.length; c++) {
      if (String(checkins[c].guest_id) === guestId) {
        return {
          success: false,
          error: true,
          code: 'CHECKIN_ALREADY_DONE',
          alreadyCheckedIn: true,
          message:
            'PERINGATAN: Tamu "' +
            matchedGuest.guest_name +
            '" SUDAH melakukan check-in sebelumnya pada ' +
            formatReadableDateTime(checkins[c].checkin_time) +
            ' (oleh ' +
            (checkins[c].checked_by || 'Admin') +
            ').',
          data: {
            checkin: checkins[c],
            guest: {
              guest_id: matchedGuest.guest_id,
              guest_name: matchedGuest.guest_name,
              category: matchedGuest.category || 'Lainnya',
              rsvp_status: guestRsvp ? guestRsvp.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
              guest_count: guestRsvp ? (parseInt(guestRsvp.guest_count, 10) || 1) : 1
            }
          },
          timestamp: nowISO()
        };
      }
    }

    var ts = nowISO();
    var newCheckin = {
      checkin_id: generateId('CHK'),
      guest_id: guestId,
      checkin_time: ts,
      checked_by: checkedBy
    };

    appendRecord(APP_CONFIG.SHEETS.CHECKIN.name, newCheckin);

    return okResponse(
      {
        alreadyCheckedIn: false,
        checkin: newCheckin,
        guest: {
          guest_id: matchedGuest.guest_id,
          guest_name: matchedGuest.guest_name,
          category: matchedGuest.category || 'Lainnya',
          rsvp_status: guestRsvp ? guestRsvp.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
          guest_count: guestRsvp ? (parseInt(guestRsvp.guest_count, 10) || 1) : 1
        }
      },
      'Check-in Berhasil! Selamat datang, ' + matchedGuest.guest_name + '.'
    );
  });
}

/**
 * Mengambil statistik check-in dan daftar riwayat tamu yang sudah check-in
 */
function getCheckinDashboardData(sessionToken) {
  requireAdmin(sessionToken);

  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);
  var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);

  var guestMap = {};
  guests.forEach(function (g) {
    guestMap[String(g.guest_id)] = g;
  });

  var rsvpMap = {};
  var rsvpHadirCount = 0;
  rsvps.forEach(function (r) {
    rsvpMap[String(r.guest_id)] = r;
    if (r.attendance_status === APP_CONFIG.RSVP_STATUS.ATTENDING) {
      rsvpHadirCount++;
    }
  });

  var checkinList = checkins.map(function (c) {
    var g = guestMap[String(c.guest_id)] || {};
    var r = rsvpMap[String(c.guest_id)] || null;
    return {
      checkin_id: c.checkin_id,
      guest_id: c.guest_id,
      guest_name: g.guest_name || '(Tamu Terhapus)',
      whatsapp_number: g.whatsapp_number || '-',
      category: g.category || 'Lainnya',
      rsvp_status: r ? r.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
      guest_count: r ? (parseInt(r.guest_count, 10) || 1) : 1,
      checkin_time: c.checkin_time,
      checked_by: c.checked_by || 'Admin'
    };
  });

  // Urutkan waktu check-in terbaru di atas
  checkinList.sort(function (a, b) {
    return String(b.checkin_time).localeCompare(String(a.checkin_time));
  });

  var totalGuests = guests.length;
  var checkedInCount = checkinList.length;
  var remainingFromTotal = Math.max(0, totalGuests - checkedInCount);
  var checkinRate = totalGuests > 0 ? Math.round((checkedInCount / totalGuests) * 100) : 0;

  return okResponse({
    stats: {
      totalGuests: totalGuests,
      rsvpHadirCount: rsvpHadirCount,
      checkedInCount: checkedInCount,
      remainingGuests: remainingFromTotal,
      checkinPercentage: checkinRate
    },
    checkins: checkinList
  });
}

/**
 * Membatalkan check-in jika terjadi kesalahan scan oleh petugas
 */
function deleteCheckinRecord(sessionToken, checkinId) {
  requireAdmin(sessionToken);
  if (!checkinId) {
    return errorResponse('ID Check-in tidak ditemukan.', 'CHECKIN_MISSING_ID');
  }
  return withScriptLock(function () {
    var deleted = deleteRecordsByIds(APP_CONFIG.SHEETS.CHECKIN.name, 'checkin_id', [checkinId]);
    if (deleted === 0) {
      return errorResponse('Data check-in tidak ditemukan.', 'CHECKIN_NOT_FOUND');
    }
    return okResponse({ deleted: deleted }, 'Data check-in berhasil dibatalkan.');
  });
}
