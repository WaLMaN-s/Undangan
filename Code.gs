/**
 * ============================================================================
 * CODE.GS
 * Entry Point Web App Google Apps Script (doGet Routing, HTML Template Include,
 * dan Public/Admin RPC Bridge)
 * ============================================================================
 */

/**
 * Router Utama Web App Google Apps Script
 * - Jika diakses dengan parameter ?token=RANDOM_TOKEN (atau ?mode=guest):
 *   Merender GUEST INVITATION WEBSITE (Mobile-Only 360-430px)
 * - Jika diakses tanpa parameter token (atau ?page=admin):
 *   Merender ADMIN DASHBOARD (Desktop-first & Responsive)
 */
function doGet(e) {
  var params = (e && e.parameter) ? e.parameter : {};
  var token = params.token ? String(params.token).trim() : '';
  var pageMode = params.page ? String(params.page).trim().toLowerCase() : '';

  // Auto-init database (8 Sheet) pada akses pertama jika sheet Users belum tersedia
  try {
    var ss = getSpreadsheet(true);
    if (!ss.getSheetByName(APP_CONFIG.SHEETS.USERS.name)) {
      initializeDatabase();
    }
  } catch (err) {
    Logger.log('Auto-check spreadsheet: ' + err.message);
  }

  // Routing ke Guest Invitation Website jika terdapat parameter ?token=... atau ?page=invitation
  if (token || pageMode === 'invitation' || pageMode === 'guest') {
    var themeFileMap = {
      elegant_floral: 'ThemeElegantFloral',
      batak_heritage: 'ThemeBatakHeritage',
      modern_minimalist: 'ThemeModernMinimalist',
      romantic_sunset: 'ThemeRomanticSunset',
      dark_luxury: 'ThemeDarkLuxury',
      thelove_cinematic: 'ThemeTheloveCinematic',
      dark_boho: 'ThemeDarkBoho',
      cypress_linen: 'ThemeCypressLinen',
      first_class_vows: 'ThemeFirstClassVows',
      traditional_java: 'ThemeTraditionalJava'
    };

    var selectedThemeKey = '';
    var isAdminPreview = params.preview === '1' || params.preview === 'true';
    var matchedGuest = token ? findGuestByRawToken(token) : null;
    var guestWeddingId = (matchedGuest && matchedGuest.wedding_id) ? String(matchedGuest.wedding_id).trim() : '';

    if (matchedGuest && matchedGuest.locked_theme && themeFileMap[String(matchedGuest.locked_theme).trim().toLowerCase()]) {
      selectedThemeKey = String(matchedGuest.locked_theme).trim().toLowerCase();
      if (isAdminPreview && params.theme && themeFileMap[String(params.theme).trim().toLowerCase()]) {
        selectedThemeKey = String(params.theme).trim().toLowerCase();
      }
    } else if (isAdminPreview && params.theme && themeFileMap[String(params.theme).trim().toLowerCase()]) {
      selectedThemeKey = String(params.theme).trim().toLowerCase();
    } else {
      try {
        var weddingCfg = getWeddingConfigData(false, guestWeddingId);
        selectedThemeKey = (weddingCfg && weddingCfg.invitation_theme) || 'elegant_floral';
        if (matchedGuest && !matchedGuest.locked_theme && !isAdminPreview) {
          try {
            updateRecordById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', matchedGuest.guest_id, {
              locked_theme: selectedThemeKey,
              wedding_id: weddingCfg.wedding_id || guestWeddingId || 'WED-001'
            });
          } catch (eLock) {}
        }
      } catch (eTheme) {
        selectedThemeKey = 'elegant_floral';
      }
    }

    var targetHtmlFile = themeFileMap[selectedThemeKey] || 'ThemeElegantFloral';
    var guestTpl = HtmlService.createTemplateFromFile(targetHtmlFile);
    guestTpl.initialToken = sanitizeTextPlain(token, 120);
    guestTpl.initialGuestName = sanitizeTextPlain(params.to || '', 100);
    guestTpl.webAppUrl = getWebAppBaseUrl();

    return guestTpl
      .evaluate()
      .setTitle('Wedding Invitation')
      .addMetaTag('viewport', 'width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no')
      .addMetaTag('theme-color', selectedThemeKey === 'dark_boho' ? '#1d1d1b' : '#FAF7F0')
      .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
  }

  // Default Routing: Admin Dashboard
  var adminTpl = HtmlService.createTemplateFromFile('AdminDashboard');
  adminTpl.webAppUrl = getWebAppBaseUrl();
  adminTpl.appVersion = APP_CONFIG.VERSION;

  return adminTpl
    .evaluate()
    .setTitle('Wedding Invitation Management System — Admin Dashboard')
    .addMetaTag('viewport', 'width=device-width, initial-scale=1.0')
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

/**
 * Helper untuk menyisipkan file HTML modular (CSS & JavaScript) ke dalam template utama
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * ============================================================================
 * DISPATCHER RPC TERPUSAT UNTUK FRONTEND (google.script.run.apiDispatcher)
 * Memastikan semua error tertangkap rapi dan selalu mengembalikan format JSON konsisten.
 * ============================================================================
 */
function apiDispatcher(action, payload, sessionToken) {
  try {
    switch (String(action || '')) {
      // --- Inisialisasi Database ---
      case 'initializeDatabase':
        requireAdmin(sessionToken);
        var initRes = initializeDatabase();
        return okResponse(initRes, 'Database Google Sheets (8 Sheet) berhasil diinisialisasi.');

      // --- Autentikasi Admin ---
      case 'authenticateAdmin':
        return authenticateAdmin(payload && payload.username, payload && payload.password);
      case 'verifyAdminSession':
        return verifyAdminSession(sessionToken);
      case 'logoutAdmin':
        return logoutAdmin(sessionToken);
      case 'updateAdminCredentials':
        return updateAdminCredentials(sessionToken, payload);

      // --- Dashboard & Reports ---
      case 'getDashboardStats':
        return getDashboardStats(sessionToken);
      case 'exportReport':
        return exportReport(sessionToken, payload && payload.reportType);

      // --- Manajemen Data Tamu ---
      case 'getGuests':
        return getGuests(sessionToken, payload);
      case 'addGuest':
        return addGuest(sessionToken, payload);
      case 'updateGuest':
        return updateGuest(sessionToken, payload);
      case 'deleteGuest':
        return deleteGuest(sessionToken, payload && payload.guest_id);
      case 'bulkDeleteGuests':
        return bulkDeleteGuests(sessionToken, payload && payload.guestIds);
      case 'importGuests':
        return importGuests(sessionToken, payload);
      case 'refreshAllGuestInvitationUrls':
        return refreshAllGuestInvitationUrls(sessionToken);

      // --- Invitation Editor & Settings & Multi-Client ---
      case 'getWeddingSettingsAdmin':
        return getWeddingSettingsAdmin(sessionToken);
      case 'listWeddingsAdmin':
        return listWeddingsAdmin(sessionToken);
      case 'createWeddingClient':
        return createWeddingClient(sessionToken, payload);
      case 'switchActiveWedding':
        return switchActiveWedding(sessionToken, payload && payload.wedding_id);
      case 'deleteWeddingClient':
        return deleteWeddingClient(sessionToken, payload && payload.wedding_id);
      case 'updateWeddingSettings':
        return updateWeddingSettings(sessionToken, payload);
      case 'uploadImageToDrive':
        return uploadImageToDrive(sessionToken, payload);
      case 'saveSystemIntegrationSettings':
        return saveSystemIntegrationSettings(sessionToken, payload);

      // --- WhatsApp Message Management (Cloud API + 1-Klik Gratis) ---
      case 'saveWhatsAppCredentials':
        return saveWhatsAppCredentials(sessionToken, payload);
      case 'sendTestWhatsAppMessage':
        return sendTestWhatsAppMessage(sessionToken, payload);
      case 'recordManualWhatsAppSend':
        return recordManualWhatsAppSend(sessionToken, payload);
      case 'createMessageQueue':
        return createMessageQueue(sessionToken, payload);
      case 'processMessageQueue':
        return processMessageQueue(sessionToken);
      case 'retryFailedMessages':
        return retryFailedMessages(sessionToken, payload && payload.messageIds);
      case 'getMessageHistory':
        return getMessageHistory(sessionToken, payload);

      // --- RSVP Management ---
      case 'getRSVPList':
        return getRSVPList(sessionToken, payload);
      case 'updateRSVPByAdmin':
        return updateRSVPByAdmin(sessionToken, payload);

      // --- QR Check-in Management ---
      case 'verifyCheckin':
        return verifyCheckin(sessionToken, payload && payload.qrInput, payload && payload.checkedBy);
      case 'getCheckinDashboardData':
        return getCheckinDashboardData(sessionToken);
      case 'deleteCheckinRecord':
        return deleteCheckinRecord(sessionToken, payload && payload.checkin_id);

      // --- Endpoint Publik Tamu (Guest Invitation Website) ---
      case 'getInvitationByToken':
        return getInvitationByToken(payload && payload.token);
      case 'submitRSVP':
        return submitRSVP(payload && payload.token, payload && payload.rsvpData);

      default:
        return errorResponse('Action API tidak dikenali: ' + action, 'API_UNKNOWN_ACTION');
    }
  } catch (err) {
    var msg = err && err.message ? err.message : String(err);
    var code = msg.indexOf('UNAUTHORIZED:') === 0 ? 'AUTH_UNAUTHORIZED' : 'SERVER_EXCEPTION';
    return errorResponse(msg.replace(/^UNAUTHORIZED:\s*/, ''), code);
  }
}
