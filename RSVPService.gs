/**
 * ============================================================================
 * RSVPSERVICE.GS
 * Pengelolaan RSVP & Buku Ucapan: Validasi Token Tamu, Cegah Duplikasi RSVP
 * dengan Upsert Terkunci (LockService), dan Moderasi Admin
 * ============================================================================
 */

/**
 * ENDPOINT PUBLIK: Tamu mengirim atau memperbarui konfirmasi kehadiran (RSVP)
 * KEAMANAN:
 * - Tamu hanya dapat mengubah RSVP miliknya sendiri melalui validasi token_hash
 * - Nama tamu diambil otomatis dari database, tidak bisa dipalsukan dari browser
 * - Cegah duplikasi baris RSVP untuk tamu yang sama (Upsert dengan LockService)
 */
function submitRSVP(rawToken, rsvpPayload) {
  var cleanToken = String(rawToken || '').trim();
  if (!cleanToken) {
    return errorResponse('Token undangan tidak valid.', 'RSVP_MISSING_TOKEN');
  }

  var rl = checkRateLimit('PUB_RSVP_' + cleanToken, 10, 60);
  if (!rl.allowed) {
    return errorResponse(
      'Anda terlalu sering mengirim perubahan RSVP. Silakan tunggu 1 menit.',
      'RSVP_RATE_LIMITED'
    );
  }

  if (!rsvpPayload) {
    return errorResponse('Formulir RSVP tidak boleh kosong.', 'RSVP_EMPTY_PAYLOAD');
  }

  var attendanceStatus = String(rsvpPayload.attendance_status || '').trim();
  if (
    attendanceStatus !== APP_CONFIG.RSVP_STATUS.ATTENDING &&
    attendanceStatus !== APP_CONFIG.RSVP_STATUS.NOT_ATTENDING
  ) {
    return errorResponse('Silakan pilih status kehadiran (Hadir atau Tidak Hadir).', 'RSVP_INVALID_STATUS');
  }

  var guestCount = parseInt(rsvpPayload.guest_count, 10);
  if (attendanceStatus === APP_CONFIG.RSVP_STATUS.NOT_ATTENDING) {
    guestCount = 0;
  } else {
    if (isNaN(guestCount) || guestCount < 1 || guestCount > 10) {
      return errorResponse('Jumlah kehadiran harus antara 1 sampai 10 orang.', 'RSVP_INVALID_COUNT');
    }
  }

  var wishes = sanitizeString(rsvpPayload.wishes || '', 600);
  if (!wishes || wishes.length < 3) {
    return errorResponse('Mohon tuliskan ucapan atau doa restu singkat (minimal 3 karakter).', 'RSVP_EMPTY_WISHES');
  }

  return withScriptLock(function () {
    var matchedGuest = findGuestByRawToken(cleanToken);
    if (!matchedGuest) {
      return errorResponse('Token undangan tidak ditemukan atau tidak valid.', 'RSVP_INVALID_TOKEN');
    }

    var guestId = String(matchedGuest.guest_id);
    var existingRsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
    var existingRecord = null;

    for (var i = 0; i < existingRsvps.length; i++) {
      if (String(existingRsvps[i].guest_id) === guestId) {
        existingRecord = existingRsvps[i];
        break;
      }
    }

    var ts = nowISO();
    var savedRsvp = null;

    if (existingRecord) {
      savedRsvp = {
        rsvp_id: existingRecord.rsvp_id,
        guest_id: guestId,
        attendance_status: attendanceStatus,
        guest_count: guestCount,
        wishes: wishes,
        created_at: existingRecord.created_at || ts,
        updated_at: ts
      };
      updateRecordById(APP_CONFIG.SHEETS.RSVP.name, 'rsvp_id', existingRecord.rsvp_id, savedRsvp);
    } else {
      savedRsvp = {
        rsvp_id: generateId('RSVP'),
        guest_id: guestId,
        attendance_status: attendanceStatus,
        guest_count: guestCount,
        wishes: wishes,
        created_at: ts,
        updated_at: ts
      };
      appendRecord(APP_CONFIG.SHEETS.RSVP.name, savedRsvp);
    }

    return okResponse(
      {
        rsvp: savedRsvp,
        guest_name: matchedGuest.guest_name,
        wishEntry: {
          sender_name: matchedGuest.guest_name,
          attendance_status: attendanceStatus,
          wishes: wishes,
          created_at: ts
        }
      },
      existingRecord
        ? 'Konfirmasi kehadiran & ucapan Anda berhasil diperbarui. Terima kasih!'
        : 'Terima kasih atas konfirmasi kehadiran dan doa restu Anda!'
    );
  });
}

/**
 * ENDPOINT ADMIN: Mengambil daftar seluruh tamu beserta status RSVP, jumlah orang, ucapan, dan waktu konfirmasi
 */
function getRSVPList(sessionToken, filters) {
  requireAdmin(sessionToken);
  var params = filters || {};

  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);

  var rsvpByGuest = {};
  rsvps.forEach(function (r) {
    rsvpByGuest[String(r.guest_id)] = r;
  });

  var combined = guests.map(function (g) {
    var gid = String(g.guest_id);
    var r = rsvpByGuest[gid] || null;
    var status = r && r.attendance_status ? String(r.attendance_status) : APP_CONFIG.RSVP_STATUS.PENDING;
    return {
      rsvp_id: r ? r.rsvp_id : '',
      guest_id: gid,
      guest_name: g.guest_name || '',
      whatsapp_number: g.whatsapp_number || '',
      category: g.category || 'Lainnya',
      attendance_status: status,
      guest_count: r ? (parseInt(r.guest_count, 10) || 0) : 0,
      wishes: r ? (r.wishes || '') : '',
      confirmed_at: r ? (r.updated_at || r.created_at || '') : ''
    };
  });

  // Urutkan yang sudah konfirmasi terbaru di atas
  combined.sort(function (a, b) {
    if (a.confirmed_at && !b.confirmed_at) return -1;
    if (!a.confirmed_at && b.confirmed_at) return 1;
    return String(b.confirmed_at).localeCompare(String(a.confirmed_at));
  });

  var summary = {
    totalGuests: combined.length,
    hadirCount: 0,
    tidakHadirCount: 0,
    belumKonfirmasiCount: 0,
    totalPaxHadir: 0
  };

  combined.forEach(function (item) {
    if (item.attendance_status === APP_CONFIG.RSVP_STATUS.ATTENDING) {
      summary.hadirCount++;
      summary.totalPaxHadir += item.guest_count || 1;
    } else if (item.attendance_status === APP_CONFIG.RSVP_STATUS.NOT_ATTENDING) {
      summary.tidakHadirCount++;
    } else {
      summary.belumKonfirmasiCount++;
    }
  });

  var statusFilter = String(params.status || '').trim();
  var search = String(params.search || '').trim().toLowerCase();

  var filtered = combined.filter(function (item) {
    if (statusFilter && statusFilter !== 'ALL' && item.attendance_status !== statusFilter) {
      return false;
    }
    if (search) {
      var mName = item.guest_name.toLowerCase().indexOf(search) !== -1;
      var mWish = item.wishes.toLowerCase().indexOf(search) !== -1;
      var mCat = item.category.toLowerCase().indexOf(search) !== -1;
      if (!mName && !mWish && !mCat) return false;
    }
    return true;
  });

  return okResponse({
    items: filtered,
    summary: summary
  });
}

/**
 * ENDPOINT ADMIN: Mengubah atau memoderasi status RSVP / ucapan tamu dari Dashboard
 */
function updateRSVPByAdmin(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload || !payload.guest_id) {
    return errorResponse('ID tamu wajib diisi.', 'RSVP_ADMIN_MISSING_GUEST');
  }

  return withScriptLock(function () {
    var guestId = String(payload.guest_id).trim();
    var status = String(payload.attendance_status || APP_CONFIG.RSVP_STATUS.PENDING).trim();
    var count = parseInt(payload.guest_count, 10) || 0;
    if (status === APP_CONFIG.RSVP_STATUS.NOT_ATTENDING || status === APP_CONFIG.RSVP_STATUS.PENDING) {
      count = 0;
    } else if (count < 1) {
      count = 1;
    }
    var wishes = sanitizeString(payload.wishes || '', 600);

    var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
    var existing = null;
    for (var i = 0; i < rsvps.length; i++) {
      if (String(rsvps[i].guest_id) === guestId) {
        existing = rsvps[i];
        break;
      }
    }

    if (status === APP_CONFIG.RSVP_STATUS.PENDING && !wishes) {
      if (existing) {
        deleteRecordsByIds(APP_CONFIG.SHEETS.RSVP.name, 'rsvp_id', [existing.rsvp_id]);
      }
      return okResponse({ guest_id: guestId }, 'Status RSVP direset menjadi Belum Konfirmasi.');
    }

    var ts = nowISO();
    if (existing) {
      updateRecordById(APP_CONFIG.SHEETS.RSVP.name, 'rsvp_id', existing.rsvp_id, {
        attendance_status: status,
        guest_count: count,
        wishes: wishes,
        updated_at: ts
      });
    } else {
      appendRecord(APP_CONFIG.SHEETS.RSVP.name, {
        rsvp_id: generateId('RSVP'),
        guest_id: guestId,
        attendance_status: status,
        guest_count: count,
        wishes: wishes,
        created_at: ts,
        updated_at: ts
      });
    }

    return okResponse({ guest_id: guestId }, 'Data RSVP tamu berhasil diperbarui oleh Admin.');
  });
}
