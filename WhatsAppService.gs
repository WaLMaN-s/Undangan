/**
 * ============================================================================
 * WHATSAPPSERVICE.GS
 * Pengelolaan Pesan WhatsApp:
 * 1. Integrasi Resmi WhatsApp Business Platform Cloud API (Meta Graph API)
 *    dengan Antrean Bertahap (Time-driven Triggers) & Penyimpanan Kredensial
 *    di Script Properties.
 * 2. Solusi 1-Klik Kirim WhatsApp Gratis (wa.me Click-to-Chat) dengan
 *    pencatatan riwayat & status otomatis.
 * ============================================================================
 */

/**
 * Mengganti variabel template ({{nama_tamu}}, {{link_undangan}}, dll.) dengan data nyata
 */
function renderMessageText(templateStr, guestObj, weddingObj) {
  var tpl = String(templateStr || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template);
  var guestName = (guestObj && guestObj.guest_name) ? guestObj.guest_name : 'Tamu Kehormatan';
  var invUrl = (guestObj && guestObj.invitation_url) ? guestObj.invitation_url : getWebAppBaseUrl();
  var category = (guestObj && (guestObj.category || guestObj.guest_category)) || 'Tamu Undangan';

  var groom = (weddingObj && weddingObj.groom_name) || APP_CONFIG.DEFAULT_WEDDING.groom_name;
  var bride = (weddingObj && weddingObj.bride_name) || APP_CONFIG.DEFAULT_WEDDING.bride_name;
  var coupleNames = groom + ' & ' + bride;
  var weddingDate = (weddingObj && weddingObj.wedding_date) || APP_CONFIG.DEFAULT_WEDDING.wedding_date;
  var venue = (weddingObj && weddingObj.venue) || APP_CONFIG.DEFAULT_WEDDING.venue;

  return tpl
    .replace(/\{\{\s*nama_tamu\s*\}\}/gi, guestName)
    .replace(/\{\{\s*link_undangan\s*\}\}/gi, invUrl)
    .replace(/\{\{\s*kategori\s*\}\}/gi, category)
    .replace(/\{\{\s*nama_pasangan\s*\}\}/gi, coupleNames)
    .replace(/\{\{\s*tanggal_acara\s*\}\}/gi, weddingDate)
    .replace(/\{\{\s*lokasi_acara\s*\}\}/gi, venue);
}

/**
 * Mengecek apakah kredensial WhatsApp Cloud API resmi sudah terkonfigurasi di Script Properties
 */
function getWhatsAppCloudCredentials() {
  var phoneNumberId = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_PHONE_NUMBER_ID, '');
  var accessToken = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_ACCESS_TOKEN, '');
  var businessAccountId = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_BUSINESS_ACCOUNT_ID, '');
  var apiVersion = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_API_VERSION, APP_CONFIG.WA_DEFAULT_API_VERSION);
  var useTemplateApi = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_USE_TEMPLATE_API, 'false') === 'true';
  var metaTemplateName = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_NAME, '');
  var metaTemplateLang = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_LANG, 'id');

  return {
    configured: !!(phoneNumberId && accessToken),
    phoneNumberId: phoneNumberId,
    accessToken: accessToken,
    businessAccountId: businessAccountId,
    apiVersion: apiVersion || 'v20.0',
    useTemplateApi: useTemplateApi,
    metaTemplateName: metaTemplateName,
    metaTemplateLang: metaTemplateLang || 'id'
  };
}

/**
 * Menyimpan kredensial WhatsApp Cloud API ke Script Properties (bukan di Sheets/Frontend)
 */
function saveWhatsAppCredentials(sessionToken, credsPayload) {
  requireAdmin(sessionToken);
  if (!credsPayload) {
    return errorResponse('Data konfigurasi WhatsApp kosong.', 'WA_EMPTY_CONFIG');
  }

  var updates = {};
  if (credsPayload.phoneNumberId !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_PHONE_NUMBER_ID] = sanitizeTextPlain(credsPayload.phoneNumberId, 80);
  }
  if (credsPayload.accessToken !== undefined && String(credsPayload.accessToken).trim() !== '') {
    // Hanya timpa access token jika diisi baru (bukan placeholder bintang)
    if (String(credsPayload.accessToken).indexOf('***') === -1) {
      updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_ACCESS_TOKEN] = String(credsPayload.accessToken).trim();
    }
  }
  if (credsPayload.clearAccessToken === true) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_ACCESS_TOKEN] = '';
  }
  if (credsPayload.businessAccountId !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_BUSINESS_ACCOUNT_ID] = sanitizeTextPlain(credsPayload.businessAccountId, 80);
  }
  if (credsPayload.apiVersion !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_API_VERSION] = sanitizeTextPlain(credsPayload.apiVersion || 'v20.0', 20);
  }
  if (credsPayload.useTemplateApi !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_USE_TEMPLATE_API] = String(!!credsPayload.useTemplateApi);
  }
  if (credsPayload.metaTemplateName !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_NAME] = sanitizeTextPlain(credsPayload.metaTemplateName, 100);
  }
  if (credsPayload.metaTemplateLang !== undefined) {
    updates[APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_LANG] = sanitizeTextPlain(credsPayload.metaTemplateLang || 'id', 20);
  }

  setScriptPropsBatch(updates);

  if (credsPayload.wa_message_template !== undefined) {
    saveSettingsMap({
      wa_message_template: sanitizeTextPlain(credsPayload.wa_message_template, 2500)
    });
    clearWeddingCache();
  }

  var currentCreds = getWhatsAppCloudCredentials();
  return okResponse(
    {
      configured: currentCreds.configured,
      phoneNumberId: currentCreds.phoneNumberId,
      businessAccountId: currentCreds.businessAccountId,
      apiVersion: currentCreds.apiVersion,
      hasAccessToken: !!currentCreds.accessToken
    },
    'Konfigurasi WhatsApp berhasil disimpan di Script Properties.'
  );
}

/**
 * Mengirim 1 pesan melalui WhatsApp Business Platform Cloud API Resmi (Meta Graph API)
 * JANGAN PERNAH memalsukan keberhasilan jika kredensial belum tersedia!
 */
function dispatchWhatsAppCloudMessage(recipientPhone, messageBodyText, guestObj) {
  var creds = getWhatsAppCloudCredentials();
  if (!creds.configured) {
    return {
      success: false,
      providerMessageId: '',
      errorMessage: 'Kredensial WhatsApp Cloud API (Phone Number ID & Access Token) belum dikonfigurasi di Script Properties.'
    };
  }

  var normalizedPhone = normalizeIndonesianPhone(recipientPhone);
  if (!isValidIndonesianPhone(normalizedPhone)) {
    return {
      success: false,
      providerMessageId: '',
      errorMessage: 'Nomor tujuan tidak valid: ' + recipientPhone
    };
  }

  var endpoint =
    'https://graph.facebook.com/' +
    encodeURIComponent(creds.apiVersion) +
    '/' +
    encodeURIComponent(creds.phoneNumberId) +
    '/messages';

  var payloadObj = null;
  if (creds.useTemplateApi && creds.metaTemplateName) {
    payloadObj = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'template',
      template: {
        name: creds.metaTemplateName,
        language: { code: creds.metaTemplateLang || 'id' },
        components: [
          {
            type: 'body',
            parameters: [
              { type: 'text', text: (guestObj && guestObj.guest_name) || 'Tamu Undangan' },
              { type: 'text', text: (guestObj && guestObj.invitation_url) || getWebAppBaseUrl() }
            ]
          }
        ]
      }
    };
  } else {
    payloadObj = {
      messaging_product: 'whatsapp',
      recipient_type: 'individual',
      to: normalizedPhone,
      type: 'text',
      text: {
        preview_url: true,
        body: messageBodyText
      }
    };
  }

  try {
    var response = UrlFetchApp.fetch(endpoint, {
      method: 'post',
      contentType: 'application/json',
      headers: {
        Authorization: 'Bearer ' + creds.accessToken
      },
      payload: JSON.stringify(payloadObj),
      muteHttpExceptions: true
    });

    var code = response.getResponseCode();
    var body = JSON.parse(response.getContentText() || '{}');

    if (code >= 200 && code < 300 && body.messages && body.messages[0] && body.messages[0].id) {
      return {
        success: true,
        providerMessageId: String(body.messages[0].id),
        errorMessage: ''
      };
    }

    var errMsg =
      (body.error && body.error.message)
        ? ('Meta API (' + (body.error.code || code) + '): ' + body.error.message)
        : ('HTTP Error ' + code + ': ' + response.getContentText().substring(0, 200));

    return {
      success: false,
      providerMessageId: '',
      errorMessage: errMsg
    };
  } catch (fetchErr) {
    return {
      success: false,
      providerMessageId: '',
      errorMessage: 'Koneksi ke Meta Cloud API gagal: ' + fetchErr.message
    };
  }
}

/**
 * Mengirim pesan percobaan (Test Message) via WhatsApp Cloud API resmi
 */
function sendTestWhatsAppMessage(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload || !payload.phone) {
    return errorResponse('Masukkan nomor WhatsApp tujuan untuk pesan percobaan.', 'WA_TEST_MISSING_PHONE');
  }

  var creds = getWhatsAppCloudCredentials();
  if (!creds.configured) {
    return errorResponse(
      'Integrasi WhatsApp Cloud API belum dapat mengirim pesan otomatis karena Phone Number ID dan Access Token belum diisi di Pengaturan > API WhatsApp (Script Properties). Anda tetap dapat menggunakan fitur "1-Klik Kirim WA Gratis (wa.me)" tanpa API key.',
      'WA_CREDENTIALS_NOT_SET'
    );
  }

  var wedding = getWeddingConfigData(false);
  var sampleGuest = {
    guest_name: payload.sampleName || 'Budi Santoso (Test)',
    category: 'Keluarga',
    invitation_url: getWebAppBaseUrl() + '?token=SAMPLE_TOKEN_PREVIEW'
  };

  var template = payload.template || wedding.wa_message_template || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template;
  var renderedText = renderMessageText(template, sampleGuest, wedding);

  var result = dispatchWhatsAppCloudMessage(payload.phone, renderedText, sampleGuest);
  if (!result.success) {
    return errorResponse(result.errorMessage, 'WA_CLOUD_API_FAILED');
  }

  return okResponse(
    {
      providerMessageId: result.providerMessageId,
      recipient: normalizeIndonesianPhone(payload.phone),
      renderedText: renderedText
    },
    'Pesan percobaan berhasil dikirim melalui WhatsApp Cloud API! (ID: ' + result.providerMessageId + ')'
  );
}

/**
 * SOLUSI GRATIS (Rp 0): Mencatat pengiriman 1-Klik WhatsApp Manual (wa.me)
 * ketika Admin menekan tombol "Kirim 1-Klik WA" agar status pengiriman & riwayat tetap tercatat rapi!
 */
function recordManualWhatsAppSend(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload || !payload.guest_id) {
    return errorResponse('ID tamu wajib disertakan.', 'WA_MANUAL_MISSING_GUEST');
  }

  return withScriptLock(function () {
    var guestId = String(payload.guest_id).trim();
    var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    var targetGuest = null;

    for (var i = 0; i < guests.length; i++) {
      if (String(guests[i].guest_id) === guestId) {
        targetGuest = guests[i];
        break;
      }
    }

    if (!targetGuest) {
      return errorResponse('Tamu tidak ditemukan.', 'WA_GUEST_NOT_FOUND');
    }

    var guestWeddingId = (targetGuest.wedding_id && String(targetGuest.wedding_id).trim()) || '';
    var wedding = getWeddingConfigData(false, guestWeddingId);
    var effectiveLockedTheme = (targetGuest.locked_theme && String(targetGuest.locked_theme).trim()) || wedding.invitation_theme || 'elegant_floral';
    var template = payload.template || wedding.wa_message_template || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template;
    var rawToken = extractRawTokenFromGuest(targetGuest);
    var invUrl = targetGuest.invitation_url || (getWebAppBaseUrl() + '?token=' + encodeURIComponent(rawToken));

    var renderedText = renderMessageText(
      template,
      {
        guest_name: targetGuest.guest_name,
        category: targetGuest.category,
        invitation_url: invUrl
      },
      wedding
    );

    var ts = nowISO();
    var msgId = generateId('MSG');

    appendRecord(APP_CONFIG.SHEETS.MESSAGES.name, {
      message_id: msgId,
      guest_id: guestId,
      message_template: renderedText,
      provider_message_id: 'MANUAL_WAME_' + ts.replace(/[^0-9]/g, '').substring(0, 12),
      status: APP_CONFIG.DELIVERY_STATUS.SENT,
      error_message: '',
      sent_at: ts
    });

    updateRecordById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestId, {
      delivery_status: APP_CONFIG.DELIVERY_STATUS.SENT,
      locked_theme: effectiveLockedTheme,
      wedding_id: targetGuest.wedding_id || wedding.wedding_id || 'WED-001',
      updated_at: ts
    });

    var cleanPhone = normalizeIndonesianPhone(targetGuest.whatsapp_number);
    var waMeUrl = 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(renderedText);

    return okResponse(
      {
        message_id: msgId,
        guest_id: guestId,
        delivery_status: APP_CONFIG.DELIVERY_STATUS.SENT,
        wa_me_url: waMeUrl,
        rendered_message: renderedText
      },
      'Status pengiriman untuk "' + targetGuest.guest_name + '" ditandai Terkirim.'
    );
  });
}

/**
 * Membuat Antrean Pengiriman Pesan WhatsApp (Berdasarkan Tamu Tertentu, Kategori, atau Semua Tamu)
 */
function createMessageQueue(sessionToken, queuePayload) {
  requireAdmin(sessionToken);
  if (!queuePayload) {
    return errorResponse('Parameter antrean tidak valid.', 'WA_QUEUE_EMPTY');
  }

  return withScriptLock(function () {
    var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
    var guestWeddingId = (targetGuest.wedding_id && String(targetGuest.wedding_id).trim()) || '';
    var wedding = getWeddingConfigData(false, guestWeddingId);
    var effectiveLockedTheme = (targetGuest.locked_theme && String(targetGuest.locked_theme).trim()) || wedding.invitation_theme || 'elegant_floral';
    var template = sanitizeTextPlain(
      queuePayload.template || wedding.wa_message_template || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template,
      2500
    );

    // Simpan template terbaru jika diubah
    if (queuePayload.template) {
      saveSettingsMap({ wa_message_template: template });
      clearWeddingCache();
    }

    var mode = String(queuePayload.selectionMode || 'selected').toLowerCase(); // 'selected' | 'category' | 'unsent' | 'all'
    var selectedIdsMap = {};
    if (Array.isArray(queuePayload.guestIds)) {
      queuePayload.guestIds.forEach(function (id) {
        selectedIdsMap[String(id).trim()] = true;
      });
    }
    var targetCategory = String(queuePayload.category || '').trim();

    var targetGuests = guests.filter(function (g) {
      if (mode === 'selected') {
        return !!selectedIdsMap[String(g.guest_id)];
      }
      if (mode === 'category') {
        return String(g.category) === targetCategory;
      }
      if (mode === 'unsent') {
        return g.delivery_status !== APP_CONFIG.DELIVERY_STATUS.SENT;
      }
      if (mode === 'all') {
        return true;
      }
      return false;
    });

    if (targetGuests.length === 0) {
      return errorResponse('Tidak ada tamu yang memenuhi kriteria pilihan antrean.', 'WA_QUEUE_NO_TARGETS');
    }

    var ts = nowISO();
    var newMessages = [];
    var guestStatusPatch = {};

    targetGuests.forEach(function (g, idx) {
      var rawToken = extractRawTokenFromGuest(g);
      var invUrl = g.invitation_url || (getWebAppBaseUrl() + '?token=' + encodeURIComponent(rawToken));
      var rendered = renderMessageText(
        template,
        {
          guest_name: g.guest_name,
          category: g.category,
          invitation_url: invUrl
        },
        wedding
      );

      newMessages.push({
        message_id: generateId('MSG') + '-' + idx,
        guest_id: g.guest_id,
        message_template: rendered,
        provider_message_id: '',
        status: APP_CONFIG.DELIVERY_STATUS.QUEUED,
        error_message: '',
        sent_at: ''
      });

      guestStatusPatch[String(g.guest_id)] = {
        delivery_status: APP_CONFIG.DELIVERY_STATUS.QUEUED,
        updated_at: ts
      };
    });

    appendRecordsBatch(APP_CONFIG.SHEETS.MESSAGES.name, newMessages);
    batchUpdateRecordsById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestStatusPatch);

    // Jika Cloud API sudah dikonfigurasi, pasang Time-driven Trigger otomatis
    var creds = getWhatsAppCloudCredentials();
    var triggerInstalled = false;
    if (creds.configured) {
      triggerInstalled = ensureQueueTriggerInstalled();
    }

    return okResponse(
      {
        queuedCount: newMessages.length,
        cloudApiConfigured: creds.configured,
        triggerInstalled: triggerInstalled
      },
      newMessages.length +
        ' pesan berhasil dimasukkan ke dalam antrean.' +
        (creds.configured
          ? ' Pengiriman otomatis bertahap (Cloud API) telah dijadwalkan.'
          : ' (Catatan: Kredensial Cloud API belum diatur; Anda dapat mengirim satu-per-satu lewat tombol 1-Klik WA Gratis pada daftar antrean atau mengatur Cloud API di Settings).')
    );
  });
}

/**
 * Memproses Antrean Pesan WhatsApp Secara Bertahap (Batch)
 * Dapat dipanggil oleh Time-driven Trigger otomatis maupun tombol "Proses Antrean Sekarang" di Admin Dashboard.
 */
function processMessageQueue(sessionToken) {
  if (sessionToken) {
    requireAdmin(sessionToken);
  }

  var creds = getWhatsAppCloudCredentials();
  if (!creds.configured) {
    removeQueueTriggers();
    return errorResponse(
      'Tidak dapat memproses antrean otomatis via Cloud API karena Phone Number ID dan Access Token belum diatur di Script Properties. Silakan atur kredensial di menu Settings atau gunakan tombol "1-Klik WA Gratis (wa.me)" pada tabel antrean.',
      'WA_CLOUD_NOT_CONFIGURED'
    );
  }

  return withScriptLock(function () {
    var allMessages = getSheetRecords(APP_CONFIG.SHEETS.MESSAGES.name);
    var allGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);

    var guestMap = {};
    allGuests.forEach(function (g) {
      guestMap[String(g.guest_id)] = g;
    });

    var queuedMessages = allMessages.filter(function (m) {
      return String(m.status) === APP_CONFIG.DELIVERY_STATUS.QUEUED;
    });

    if (queuedMessages.length === 0) {
      removeQueueTriggers();
      return okResponse(
        { processed: 0, sent: 0, failed: 0, remaining: 0 },
        'Tidak ada pesan dalam antrean yang perlu diproses.'
      );
    }

    var batch = queuedMessages.slice(0, APP_CONFIG.WA_BATCH_SIZE);
    var messagePatchMap = {};
    var guestPatchMap = {};
    var sentCount = 0;
    var failedCount = 0;

    batch.forEach(function (msg) {
      var guest = guestMap[String(msg.guest_id)];
      var ts = nowISO();

      if (!guest) {
        failedCount++;
        messagePatchMap[String(msg.message_id)] = {
          status: APP_CONFIG.DELIVERY_STATUS.FAILED,
          error_message: 'Data tamu tidak ditemukan di sheet Guests.',
          sent_at: ts
        };
        return;
      }

      var sendRes = dispatchWhatsAppCloudMessage(
        guest.whatsapp_number,
        msg.message_template,
        guest
      );

      if (sendRes.success) {
        sentCount++;
        messagePatchMap[String(msg.message_id)] = {
          provider_message_id: sendRes.providerMessageId,
          status: APP_CONFIG.DELIVERY_STATUS.SENT,
          error_message: '',
          sent_at: ts
        };
        guestPatchMap[String(guest.guest_id)] = {
          delivery_status: APP_CONFIG.DELIVERY_STATUS.SENT,
          updated_at: ts
        };
      } else {
        failedCount++;
        messagePatchMap[String(msg.message_id)] = {
          status: APP_CONFIG.DELIVERY_STATUS.FAILED,
          error_message: sendRes.errorMessage,
          sent_at: ts
        };
        guestPatchMap[String(guest.guest_id)] = {
          delivery_status: APP_CONFIG.DELIVERY_STATUS.FAILED,
          updated_at: ts
        };
      }

      // Jeda singkat 250ms antar request agar mematuhi rate limit Meta Cloud API
      Utilities.sleep(250);
    });

    batchUpdateRecordsById(APP_CONFIG.SHEETS.MESSAGES.name, 'message_id', messagePatchMap);
    batchUpdateRecordsById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestPatchMap);

    var remaining = Math.max(0, queuedMessages.length - batch.length);
    if (remaining === 0) {
      removeQueueTriggers();
    } else {
      ensureQueueTriggerInstalled();
    }

    return okResponse(
      {
        processed: batch.length,
        sent: sentCount,
        failed: failedCount,
        remaining: remaining
      },
      'Batch antrean diproses: ' +
        sentCount +
        ' terkirim, ' +
        failedCount +
        ' gagal, ' +
        remaining +
        ' tersisa di antrean.'
    );
  });
}

/**
 * Handler untuk Time-driven Trigger Google Apps Script
 */
function processMessageQueueTrigger() {
  try {
    processMessageQueue(null);
  } catch (e) {
    Logger.log('processMessageQueueTrigger error: ' + e.message);
  }
}

/**
 * Memasang Time-driven Trigger setiap 1 menit jika belum ada
 */
function ensureQueueTriggerInstalled() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'processMessageQueueTrigger') {
        return true;
      }
    }
    ScriptApp.newTrigger('processMessageQueueTrigger')
      .timeBased()
      .everyMinutes(1)
      .create();
    return true;
  } catch (e) {
    return false;
  }
}

/**
 * Menghapus Time-driven Trigger antrean ketika antrean sudah kosong
 */
function removeQueueTriggers() {
  try {
    var triggers = ScriptApp.getProjectTriggers();
    for (var i = 0; i < triggers.length; i++) {
      if (triggers[i].getHandlerFunction() === 'processMessageQueueTrigger') {
        ScriptApp.deleteTrigger(triggers[i]);
      }
    }
  } catch (e) {}
}

/**
 * Menjadwalkan ulang (Retry) pesan yang gagal dikirim secara terkendali
 */
function retryFailedMessages(sessionToken, messageIds) {
  requireAdmin(sessionToken);

  return withScriptLock(function () {
    var allMessages = getSheetRecords(APP_CONFIG.SHEETS.MESSAGES.name);
    var idSet = {};
    var filterSpecific = Array.isArray(messageIds) && messageIds.length > 0;
    if (filterSpecific) {
      messageIds.forEach(function (id) {
        idSet[String(id).trim()] = true;
      });
    }

    var msgPatch = {};
    var guestPatch = {};
    var ts = nowISO();
    var retriedCount = 0;

    allMessages.forEach(function (m) {
      var isFailed = String(m.status) === APP_CONFIG.DELIVERY_STATUS.FAILED;
      var isSelected = !filterSpecific || idSet[String(m.message_id)];
      if (isFailed && isSelected) {
        msgPatch[String(m.message_id)] = {
          status: APP_CONFIG.DELIVERY_STATUS.QUEUED,
          error_message: ''
        };
        guestPatch[String(m.guest_id)] = {
          delivery_status: APP_CONFIG.DELIVERY_STATUS.QUEUED,
          updated_at: ts
        };
        retriedCount++;
      }
    });

    if (retriedCount === 0) {
      return errorResponse('Tidak ada pesan berstatus Gagal Dikirim yang dipilih.', 'WA_RETRY_NONE');
    }

    batchUpdateRecordsById(APP_CONFIG.SHEETS.MESSAGES.name, 'message_id', msgPatch);
    batchUpdateRecordsById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestPatch);

    var creds = getWhatsAppCloudCredentials();
    if (creds.configured) {
      ensureQueueTriggerInstalled();
    }

    return okResponse(
      { retriedCount: retriedCount },
      retriedCount + ' pesan gagal berhasil dikembalikan ke antrean untuk dikirim ulang.'
    );
  });
}

/**
 * Mengambil riwayat pengiriman pesan WhatsApp beserta statistik antrean & link 1-Klik WA
 */
function getMessageHistory(sessionToken, filters) {
  requireAdmin(sessionToken);
  var params = filters || {};

  var messages = getSheetRecords(APP_CONFIG.SHEETS.MESSAGES.name);
  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var creds = getWhatsAppCloudCredentials();

  var guestMap = {};
  guests.forEach(function (g) {
    guestMap[String(g.guest_id)] = g;
  });

  var stats = {
    totalMessages: messages.length,
    queued: 0,
    sent: 0,
    failed: 0,
    cloudApiConfigured: creds.configured
  };

  var enriched = messages.map(function (m) {
    var g = guestMap[String(m.guest_id)] || {};
    var st = m.status || APP_CONFIG.DELIVERY_STATUS.QUEUED;
    if (st === APP_CONFIG.DELIVERY_STATUS.QUEUED) stats.queued++;
    else if (st === APP_CONFIG.DELIVERY_STATUS.SENT) stats.sent++;
    else if (st === APP_CONFIG.DELIVERY_STATUS.FAILED) stats.failed++;

    var cleanPhone = normalizeIndonesianPhone(g.whatsapp_number || '');
    var waMeUrl = cleanPhone
      ? 'https://wa.me/' + cleanPhone + '?text=' + encodeURIComponent(m.message_template || '')
      : '';

    return {
      message_id: m.message_id,
      guest_id: m.guest_id,
      guest_name: g.guest_name || '(Tamu Terhapus)',
      whatsapp_number: cleanPhone,
      category: g.category || '-',
      message_template: m.message_template || '',
      provider_message_id: m.provider_message_id || '',
      status: st,
      error_message: m.error_message || '',
      sent_at: m.sent_at || '',
      wa_me_url: waMeUrl
    };
  });

  // Urutkan terbaru di atas
  enriched.reverse();

  var statusFilter = String(params.status || '').trim();
  var search = String(params.search || '').trim().toLowerCase();

  var filtered = enriched.filter(function (item) {
    if (statusFilter && statusFilter !== 'ALL' && item.status !== statusFilter) {
      return false;
    }
    if (search) {
      var mName = item.guest_name.toLowerCase().indexOf(search) !== -1;
      var mPhone = item.whatsapp_number.toLowerCase().indexOf(search) !== -1;
      if (!mName && !mPhone) return false;
    }
    return true;
  });

  return okResponse({
    messages: filtered.slice(0, 300),
    stats: stats
  });
}
