/**
 * ============================================================================
 * REPORTSERVICE.GS
 * Statistik Dashboard Overview (Chart.js), Aktivitas Terbaru, Rekap Kategori,
 * dan Export Laporan (CSV & Printable Report)
 * ============================================================================
 */

/**
 * Menghitung seluruh statistik nyata untuk Admin Dashboard Overview & Reports
 * (Tidak ada angka yang di-hardcode; semuanya dihitung real-time dari 8 sheet database)
 */
function getDashboardStats(sessionToken) {
  requireAdmin(sessionToken);

  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
  var messages = getSheetRecords(APP_CONFIG.SHEETS.MESSAGES.name);
  var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);
  var wedding = getWeddingConfigData(false);

  var rsvpByGuest = {};
  rsvps.forEach(function (r) {
    rsvpByGuest[String(r.guest_id)] = r;
  });

  var checkinByGuest = {};
  checkins.forEach(function (c) {
    checkinByGuest[String(c.guest_id)] = c;
  });

  var totalGuests = guests.length;
  var sentCount = 0;
  var unsentCount = 0;
  var queuedCount = 0;
  var failedCount = 0;

  var rsvpHadir = 0;
  var rsvpTidakHadir = 0;
  var rsvpBelumKonfirmasi = 0;
  var totalPaxHadir = 0;

  // Inisialisasi rekap per kategori tamu
  var categoryMap = {};
  APP_CONFIG.GUEST_CATEGORIES.forEach(function (cat) {
    categoryMap[cat] = {
      category: cat,
      totalGuests: 0,
      sent: 0,
      unsent: 0,
      failed: 0,
      rsvpHadir: 0,
      rsvpTidakHadir: 0,
      rsvpPending: 0,
      totalPax: 0,
      checkedIn: 0
    };
  });

  guests.forEach(function (g) {
    var gid = String(g.guest_id);
    var cat = g.category && categoryMap[g.category] ? g.category : 'Lainnya';
    var catStat = categoryMap[cat];
    catStat.totalGuests++;

    // Status pengiriman
    var deliv = String(g.delivery_status || APP_CONFIG.DELIVERY_STATUS.UNSENT);
    if (deliv === APP_CONFIG.DELIVERY_STATUS.SENT) {
      sentCount++;
      catStat.sent++;
    } else if (deliv === APP_CONFIG.DELIVERY_STATUS.FAILED) {
      failedCount++;
      catStat.failed++;
    } else if (deliv === APP_CONFIG.DELIVERY_STATUS.QUEUED) {
      queuedCount++;
      unsentCount++;
      catStat.unsent++;
    } else {
      unsentCount++;
      catStat.unsent++;
    }

    // Status RSVP
    var r = rsvpByGuest[gid];
    var rStatus = r && r.attendance_status ? String(r.attendance_status) : APP_CONFIG.RSVP_STATUS.PENDING;
    if (rStatus === APP_CONFIG.RSVP_STATUS.ATTENDING) {
      rsvpHadir++;
      var pax = parseInt(r.guest_count, 10) || 1;
      totalPaxHadir += pax;
      catStat.rsvpHadir++;
      catStat.totalPax += pax;
    } else if (rStatus === APP_CONFIG.RSVP_STATUS.NOT_ATTENDING) {
      rsvpTidakHadir++;
      catStat.rsvpTidakHadir++;
    } else {
      rsvpBelumKonfirmasi++;
      catStat.rsvpPending++;
    }

    // Status Check-in
    if (checkinByGuest[gid]) {
      catStat.checkedIn++;
    }
  });

  var checkinCount = checkins.length;
  var confirmedTotal = rsvpHadir + rsvpTidakHadir;
  var attendancePercentage = totalGuests > 0 ? Math.round((rsvpHadir / totalGuests) * 100) : 0;
  var rsvpResponseRate = totalGuests > 0 ? Math.round((confirmedTotal / totalGuests) * 100) : 0;
  var checkinPercentage = totalGuests > 0 ? Math.round((checkinCount / totalGuests) * 100) : 0;

  // Susun daftar tamu terbaru (5 tamu terakhir)
  var sortedGuests = guests.slice().sort(function (a, b) {
    return String(b.created_at).localeCompare(String(a.created_at));
  });

  var recentGuests = sortedGuests.slice(0, 6).map(function (g) {
    var r = rsvpByGuest[String(g.guest_id)];
    return {
      guest_id: g.guest_id,
      guest_name: g.guest_name,
      whatsapp_number: g.whatsapp_number,
      category: g.category || 'Lainnya',
      delivery_status: g.delivery_status || APP_CONFIG.DELIVERY_STATUS.UNSENT,
      rsvp_status: r ? r.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
      created_at: g.created_at
    };
  });

  // Susun feed aktivitas terbaru gabungan dari RSVP, Check-in, Pengiriman WA, dan Tambah Tamu
  var guestNameLookup = {};
  guests.forEach(function (g) {
    guestNameLookup[String(g.guest_id)] = g.guest_name;
  });

  var activities = [];

  checkins.forEach(function (c) {
    activities.push({
      type: 'checkin',
      title: (guestNameLookup[String(c.guest_id)] || 'Tamu') + ' melakukan Check-in kehadiran',
      subtitle: 'Diverifikasi oleh ' + (c.checked_by || 'Admin'),
      timestamp: c.checkin_time || ''
    });
  });

  rsvps.forEach(function (r) {
    activities.push({
      type: 'rsvp',
      title:
        (guestNameLookup[String(r.guest_id)] || 'Tamu') +
        ' konfirmasi RSVP: ' +
        (r.attendance_status || 'Hadir') +
        (r.guest_count ? ' (' + r.guest_count + ' org)' : ''),
      subtitle: r.wishes ? '"' + String(r.wishes).substring(0, 70) + '"' : 'Tanpa pesan ucapan',
      timestamp: r.updated_at || r.created_at || ''
    });
  });

  messages.slice(-15).forEach(function (m) {
    if (m.sent_at) {
      activities.push({
        type: 'message',
        title: 'Undangan WhatsApp (' + m.status + ') ke ' + (guestNameLookup[String(m.guest_id)] || 'Tamu'),
        subtitle: m.error_message || ('ID: ' + (m.provider_message_id || '-')),
        timestamp: m.sent_at
      });
    }
  });

  sortedGuests.slice(0, 6).forEach(function (g) {
    activities.push({
      type: 'guest',
      title: 'Tamu ditambahkan: ' + g.guest_name,
      subtitle: 'Kategori: ' + (g.category || 'Lainnya'),
      timestamp: g.created_at || ''
    });
  });

  activities.sort(function (a, b) {
    return String(b.timestamp).localeCompare(String(a.timestamp));
  });

  var categoryList = Object.keys(categoryMap).map(function (k) {
    return categoryMap[k];
  });

  return okResponse({
    overview: {
      totalGuests: totalGuests,
      sentCount: sentCount,
      unsentCount: unsentCount,
      queuedCount: queuedCount,
      failedCount: failedCount,
      rsvpHadir: rsvpHadir,
      rsvpTidakHadir: rsvpTidakHadir,
      rsvpBelumKonfirmasi: rsvpBelumKonfirmasi,
      totalPaxHadir: totalPaxHadir,
      checkinCount: checkinCount,
      totalMessagesLogged: messages.length,
      attendancePercentage: attendancePercentage,
      rsvpResponseRate: rsvpResponseRate,
      checkinPercentage: checkinPercentage
    },
    charts: {
      delivery: {
        labels: ['Terkirim', 'Belum Dikirim', 'Dalam Antrean', 'Gagal Dikirim'],
        values: [sentCount, Math.max(0, unsentCount - queuedCount), queuedCount, failedCount]
      },
      rsvp: {
        labels: ['Hadir', 'Tidak Hadir', 'Belum Konfirmasi'],
        values: [rsvpHadir, rsvpTidakHadir, rsvpBelumKonfirmasi]
      }
    },
    categoryBreakdown: categoryList,
    recentGuests: recentGuests,
    recentActivities: activities.slice(0, 10),
    weddingSummary: {
      couple: wedding.groom_name + ' & ' + wedding.bride_name,
      wedding_date: wedding.wedding_date,
      venue: wedding.venue,
      status: wedding.status
    }
  });
}

/**
 * Menghasilkan file CSV untuk diunduh dari halaman Tamu atau halaman Reports
 * Mendukung reportType: 'guests' | 'rsvp' | 'checkin' | 'messages' | 'categories'
 */
function exportReport(sessionToken, reportType) {
  requireAdmin(sessionToken);
  var type = String(reportType || 'guests').toLowerCase();

  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var rsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
  var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);
  var messages = getSheetRecords(APP_CONFIG.SHEETS.MESSAGES.name);

  var rsvpByGuest = {};
  rsvps.forEach(function (r) {
    rsvpByGuest[String(r.guest_id)] = r;
  });

  var checkinByGuest = {};
  checkins.forEach(function (c) {
    checkinByGuest[String(c.guest_id)] = c;
  });

  var guestById = {};
  guests.forEach(function (g) {
    guestById[String(g.guest_id)] = g;
  });

  var csvString = '';
  var fileName = 'report_' + type + '_' + Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE, 'yyyyMMdd_HHmm') + '.csv';

  if (type === 'categories') {
    var statsResp = getDashboardStats(sessionToken);
    var catRows = (statsResp.data && statsResp.data.categoryBreakdown) || [];
    var headersCat = [
      'category',
      'totalGuests',
      'sent',
      'unsent',
      'failed',
      'rsvpHadir',
      'rsvpTidakHadir',
      'rsvpPending',
      'totalPax',
      'checkedIn'
    ];
    csvString = objectsToCSV(headersCat, catRows);
  } else if (type === 'rsvp') {
    var headersRsvp = [
      'guest_id',
      'guest_name',
      'whatsapp_number',
      'category',
      'attendance_status',
      'guest_count',
      'wishes',
      'confirmed_at'
    ];
    var rowsRsvp = guests.map(function (g) {
      var r = rsvpByGuest[String(g.guest_id)];
      return {
        guest_id: g.guest_id,
        guest_name: g.guest_name,
        whatsapp_number: g.whatsapp_number,
        category: g.category,
        attendance_status: r ? r.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
        guest_count: r ? r.guest_count : 0,
        wishes: r ? r.wishes : '',
        confirmed_at: r ? (r.updated_at || r.created_at) : ''
      };
    });
    csvString = objectsToCSV(headersRsvp, rowsRsvp);
  } else if (type === 'checkin') {
    var headersChk = [
      'checkin_id',
      'guest_id',
      'guest_name',
      'whatsapp_number',
      'category',
      'rsvp_status',
      'guest_count',
      'checkin_time',
      'checked_by'
    ];
    var rowsChk = checkins.map(function (c) {
      var g = guestById[String(c.guest_id)] || {};
      var r = rsvpByGuest[String(c.guest_id)] || {};
      return {
        checkin_id: c.checkin_id,
        guest_id: c.guest_id,
        guest_name: g.guest_name || '',
        whatsapp_number: g.whatsapp_number || '',
        category: g.category || '',
        rsvp_status: r.attendance_status || APP_CONFIG.RSVP_STATUS.PENDING,
        guest_count: r.guest_count || 1,
        checkin_time: c.checkin_time,
        checked_by: c.checked_by
      };
    });
    csvString = objectsToCSV(headersChk, rowsChk);
  } else if (type === 'messages') {
    var headersMsg = [
      'message_id',
      'guest_id',
      'guest_name',
      'whatsapp_number',
      'status',
      'provider_message_id',
      'error_message',
      'sent_at'
    ];
    var rowsMsg = messages.map(function (m) {
      var g = guestById[String(m.guest_id)] || {};
      return {
        message_id: m.message_id,
        guest_id: m.guest_id,
        guest_name: g.guest_name || '',
        whatsapp_number: g.whatsapp_number || '',
        status: m.status,
        provider_message_id: m.provider_message_id,
        error_message: m.error_message,
        sent_at: m.sent_at
      };
    });
    csvString = objectsToCSV(headersMsg, rowsMsg);
  } else {
    // Default: Export Data Tamu Lengkap sesuai spesifikasi kolom Bagian 4.C
    var headersGuests = [
      'guest_id',
      'guest_name',
      'whatsapp_number',
      'guest_category',
      'invitation_token',
      'invitation_url',
      'delivery_status',
      'rsvp_status',
      'guest_count',
      'checked_in',
      'checkin_time',
      'created_at',
      'updated_at'
    ];
    var rowsGuests = guests.map(function (g) {
      var gid = String(g.guest_id);
      var r = rsvpByGuest[gid];
      var c = checkinByGuest[gid];
      return {
        guest_id: gid,
        guest_name: g.guest_name,
        whatsapp_number: g.whatsapp_number,
        guest_category: g.category,
        invitation_token: extractRawTokenFromGuest(g),
        invitation_url: g.invitation_url,
        delivery_status: g.delivery_status || APP_CONFIG.DELIVERY_STATUS.UNSENT,
        rsvp_status: r ? r.attendance_status : APP_CONFIG.RSVP_STATUS.PENDING,
        guest_count: r ? r.guest_count : 0,
        checked_in: c ? 'Ya' : 'Belum',
        checkin_time: c ? c.checkin_time : '',
        created_at: g.created_at,
        updated_at: g.updated_at || g.created_at
      };
    });
    csvString = objectsToCSV(headersGuests, rowsGuests);
  }

  return okResponse(
    {
      fileName: fileName,
      csvContent: csvString,
      reportType: type
    },
    'File laporan CSV berhasil disiapkan.'
  );
}
