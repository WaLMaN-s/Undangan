/**
 * ============================================================================
 * INVITATIONSERVICE.GS
 * Pengaturan Konten Undangan, Galeri Foto, Upload Gambar ke Google Drive,
 * Caching Konfigurasi Acara, dan Pengambilan Undangan Personal Berdasarkan Token
 * ============================================================================
 */

/**
 * Mengambil ID klien/wedding aktif saat ini dari Settings (default: WED-001)
 */
function getActiveWeddingId() {
  var settings = getSettingsMap();
  return (settings.active_wedding_id && String(settings.active_wedding_id).trim()) || 'WED-001';
}

/**
 * Mengambil ringkasan seluruh klien/wedding untuk dropdown switcher Admin
 */
function listAllWeddingsSummary() {
  var weddings = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
  var globalSettings = getSettingsMap();
  return weddings.map(function (w) {
    var wSet = {};
    try {
      if (w.settings_json) wSet = JSON.parse(w.settings_json);
    } catch (e) {}
    return {
      wedding_id: w.wedding_id,
      groom_name: w.groom_name || '',
      bride_name: w.bride_name || '',
      wedding_date: w.wedding_date || '',
      invitation_theme: wSet.invitation_theme || globalSettings.invitation_theme || 'elegant_floral',
      status: w.status || 'Published'
    };
  });
}

/**
 * Mengambil konfigurasi pernikahan lengkap (Weddings + Settings + Gallery)
 * mendukung Multi-Klien (targetWeddingId) dan CacheService.
 */
function getWeddingConfigData(bypassCache, targetWeddingId) {
  var activeId = (targetWeddingId && String(targetWeddingId).trim()) || getActiveWeddingId();
  var cacheKey = APP_CONFIG.WEDDING_CACHE_KEY + '_' + activeId;
  var cache = CacheService.getScriptCache();
  if (!bypassCache) {
    try {
      var cachedStr = cache.get(cacheKey);
      if (cachedStr) {
        return JSON.parse(cachedStr);
      }
    } catch (e) {}
  }

  var weddings = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
  if (weddings.length === 0) {
    initializeDatabase();
    weddings = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
  }

  var wedding = null;
  for (var wi = 0; wi < weddings.length; wi++) {
    if (String(weddings[wi].wedding_id).trim() === activeId) {
      wedding = weddings[wi];
      break;
    }
  }
  if (!wedding) {
    wedding = weddings[0] || APP_CONFIG.DEFAULT_WEDDING;
  }

  var globalSettings = getSettingsMap();
  var clientSettings = {};
  try {
    if (wedding.settings_json && String(wedding.settings_json).trim()) {
      clientSettings = JSON.parse(wedding.settings_json);
    }
  } catch (eParse) {}

  // Gabungkan: default -> global Settings (khusus WED-001) -> clientSettings (per klien)
  var settings = {};
  if (String(wedding.wedding_id) === 'WED-001' || !wedding.settings_json) {
    Object.keys(globalSettings).forEach(function (k) {
      settings[k] = globalSettings[k];
    });
  }
  Object.keys(clientSettings).forEach(function (k) {
    if (clientSettings[k] !== undefined) {
      settings[k] = clientSettings[k];
    }
  });

  var allGallery = getSheetRecords(APP_CONFIG.SHEETS.GALLERY.name);
  var gallery = allGallery.filter(function (g) {
    var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
    return gWid === String(wedding.wedding_id);
  });

  gallery.sort(function (a, b) {
    return (parseInt(a.display_order, 10) || 0) - (parseInt(b.display_order, 10) || 0);
  });

  var stories = [];
  try {
    stories = JSON.parse(settings.our_story_json || APP_CONFIG.DEFAULT_SETTINGS.our_story_json);
    if (!Array.isArray(stories)) stories = [];
  } catch (e2) {
    stories = [];
  }

  // Merge stored per-theme media slots with default per-theme slots
  var themeMediaMap = JSON.parse(JSON.stringify(APP_CONFIG.DEFAULT_THEME_MEDIA || {}));
  try {
    if (settings.theme_media_json) {
      var parsedMedia = JSON.parse(settings.theme_media_json);
      if (parsedMedia && typeof parsedMedia === 'object') {
        Object.keys(parsedMedia).forEach(function (tKey) {
          if (!themeMediaMap[tKey]) themeMediaMap[tKey] = {};
          var slotObj = parsedMedia[tKey] || {};
          Object.keys(slotObj).forEach(function (sKey) {
            if (slotObj[sKey]) {
              themeMediaMap[tKey][sKey] = slotObj[sKey];
            }
          });
        });
      }
    }
  } catch (eMedia) {}

  var activeThemeKey = settings.invitation_theme || APP_CONFIG.DEFAULT_SETTINGS.invitation_theme || 'elegant_floral';
  var activeSlots = themeMediaMap[activeThemeKey] || themeMediaMap.elegant_floral || {};

  var fullConfig = {
    wedding_id: wedding.wedding_id || 'WED-001',
    invitation_theme: activeThemeKey,
    qr_checkin_enabled: String(settings.qr_checkin_enabled !== undefined ? settings.qr_checkin_enabled : 'true') === 'true',
    theme_media: themeMediaMap,
    active_theme_slots: activeSlots,
    groom_name: wedding.groom_name || APP_CONFIG.DEFAULT_WEDDING.groom_name,
    bride_name: wedding.bride_name || APP_CONFIG.DEFAULT_WEDDING.bride_name,
    groom_nickname: settings.groom_nickname || (wedding.groom_name || 'Romeo').split(' ')[0],
    bride_nickname: settings.bride_nickname || (wedding.bride_name || 'Juliet').split(' ')[0],
    groom_parents: settings.groom_parents || APP_CONFIG.DEFAULT_SETTINGS.groom_parents,
    bride_parents: settings.bride_parents || APP_CONFIG.DEFAULT_SETTINGS.bride_parents,
    groom_photo: activeSlots.groom_photo || settings.groom_photo || APP_CONFIG.DEFAULT_SETTINGS.groom_photo,
    bride_photo: activeSlots.bride_photo || settings.bride_photo || APP_CONFIG.DEFAULT_SETTINGS.bride_photo,
    wedding_date: wedding.wedding_date || APP_CONFIG.DEFAULT_WEDDING.wedding_date,
    akad_title: settings.akad_title || 'Akad Nikah',
    akad_time: wedding.akad_time || APP_CONFIG.DEFAULT_WEDDING.akad_time,
    reception_title: settings.reception_title || 'Resepsi Pernikahan',
    reception_time: wedding.reception_time || APP_CONFIG.DEFAULT_WEDDING.reception_time,
    venue: wedding.venue || APP_CONFIG.DEFAULT_WEDDING.venue,
    address: wedding.address || APP_CONFIG.DEFAULT_WEDDING.address,
    maps_url: wedding.maps_url || APP_CONFIG.DEFAULT_WEDDING.maps_url,
    description: wedding.description || APP_CONFIG.DEFAULT_WEDDING.description,
    cover_image: activeSlots.cover_photo || wedding.cover_image || APP_CONFIG.DEFAULT_WEDDING.cover_image,
    hero_image: activeSlots.hero_photo || activeSlots.cover_photo || wedding.cover_image || APP_CONFIG.DEFAULT_WEDDING.cover_image,
    closing_image: activeSlots.closing_photo || activeSlots.hero_photo || activeSlots.cover_photo || wedding.cover_image,
    status: wedding.status || 'Published',
    quote_text: settings.quote_text !== undefined ? settings.quote_text : APP_CONFIG.DEFAULT_SETTINGS.quote_text,
    quote_source: settings.quote_source !== undefined ? settings.quote_source : APP_CONFIG.DEFAULT_SETTINGS.quote_source,
    our_story: stories,
    music_url: settings.music_url !== undefined ? settings.music_url : APP_CONFIG.DEFAULT_SETTINGS.music_url,
    music_enabled: String(settings.music_enabled || 'true') === 'true',
    closing_text: settings.closing_text || APP_CONFIG.DEFAULT_SETTINGS.closing_text,
    wa_message_template: settings.wa_message_template || APP_CONFIG.DEFAULT_SETTINGS.wa_message_template,
    gallery: gallery.map(function (img, idx) {
      return {
        image_id: img.image_id || ('GAL-' + (idx + 1)),
        wedding_id: img.wedding_id || 'WED-001',
        image_url: img.image_url || '',
        caption: img.caption || '',
        display_order: parseInt(img.display_order, 10) || (idx + 1)
      };
    })
  };

  try {
    cache.put(cacheKey, JSON.stringify(fullConfig), APP_CONFIG.WEDDING_CACHE_TTL);
  } catch (e3) {}

  return fullConfig;
}

/**
 * Mengambil konfigurasi undangan untuk Admin Invitation Editor & Settings
 */
function getWeddingSettingsAdmin(sessionToken) {
  requireAdmin(sessionToken);
  var config = getWeddingConfigData(true);
  var systemProps = {
    spreadsheetId: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.SPREADSHEET_ID, ''),
    driveFolderId: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.DRIVE_FOLDER_ID, ''),
    webAppBaseUrl: getWebAppBaseUrl(),
    waPhoneNumberId: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_PHONE_NUMBER_ID, ''),
    waBusinessAccountId: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_BUSINESS_ACCOUNT_ID, ''),
    waApiVersion: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_API_VERSION, APP_CONFIG.WA_DEFAULT_API_VERSION),
    waHasAccessToken: !!getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_ACCESS_TOKEN, ''),
    waUseTemplateApi: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_USE_TEMPLATE_API, 'false') === 'true',
    waMetaTemplateName: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_NAME, ''),
    waMetaTemplateLang: getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WA_META_TEMPLATE_LANG, 'id')
  };
  return okResponse({
    wedding: config,
    clients: listAllWeddingsSummary(),
    activeWeddingId: config.wedding_id,
    system: systemProps
  });
}

function listWeddingsAdmin(sessionToken) {
  requireAdmin(sessionToken);
  return okResponse({
    clients: listAllWeddingsSummary(),
    activeWeddingId: getActiveWeddingId()
  });
}

function createWeddingClient(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload) return errorResponse('Data klien baru tidak boleh kosong.', 'CLIENT_EMPTY');

  return withScriptLock(function () {
    var groomName = sanitizeString(payload.groom_name || 'Mempelai Pria', 120);
    var brideName = sanitizeString(payload.bride_name || 'Mempelai Wanita', 120);
    var weddingDate = sanitizeTextPlain(payload.wedding_date || '2026-12-12', 30);
    var chosenTheme = sanitizeTextPlain(payload.invitation_theme || 'elegant_floral', 50);
    var newWeddingId = 'WED-' + Utilities.formatDate(new Date(), 'Asia/Jakarta', 'yyMMddHHmmss');

    var clientSettings = {
      invitation_theme: chosenTheme,
      qr_checkin_enabled: 'true',
      theme_media_json: JSON.stringify(APP_CONFIG.DEFAULT_THEME_MEDIA || {}),
      groom_nickname: groomName.split(' ')[0] || 'Pria',
      bride_nickname: brideName.split(' ')[0] || 'Wanita',
      groom_parents: sanitizeString(payload.groom_parents || 'Putra dari Bpk. ... & Ibu ...', 220),
      bride_parents: sanitizeString(payload.bride_parents || 'Putri dari Bpk. ... & Ibu ...', 220),
      groom_photo: APP_CONFIG.DEFAULT_SETTINGS.groom_photo,
      bride_photo: APP_CONFIG.DEFAULT_SETTINGS.bride_photo,
      akad_title: 'Akad Nikah',
      reception_title: 'Resepsi Pernikahan',
      quote_text: APP_CONFIG.DEFAULT_SETTINGS.quote_text,
      quote_source: APP_CONFIG.DEFAULT_SETTINGS.quote_source,
      our_story_json: APP_CONFIG.DEFAULT_SETTINGS.our_story_json,
      music_url: APP_CONFIG.DEFAULT_SETTINGS.music_url,
      music_enabled: 'true',
      closing_text: APP_CONFIG.DEFAULT_SETTINGS.closing_text,
      wa_message_template: APP_CONFIG.DEFAULT_SETTINGS.wa_message_template
    };

    var newRow = {
      wedding_id: newWeddingId,
      groom_name: groomName,
      bride_name: brideName,
      wedding_date: weddingDate,
      akad_time: sanitizeString(payload.akad_time || '08:00 - 10:00 WIB', 80),
      reception_time: sanitizeString(payload.reception_time || '11:00 - 14:00 WIB', 80),
      venue: sanitizeString(payload.venue || 'The Grand Ballroom', 160),
      address: sanitizeString(payload.address || 'Jakarta, Indonesia', 350),
      maps_url: sanitizeUrl(payload.maps_url || APP_CONFIG.DEFAULT_WEDDING.maps_url),
      description: APP_CONFIG.DEFAULT_WEDDING.description,
      cover_image: APP_CONFIG.DEFAULT_WEDDING.cover_image,
      status: 'Published',
      settings_json: JSON.stringify(clientSettings)
    };

    appendRecord(APP_CONFIG.SHEETS.WEDDINGS.name, newRow);
    saveSettingsMap({ active_wedding_id: newWeddingId });
    clearWeddingCache();

    var refreshed = getWeddingConfigData(true, newWeddingId);
    return okResponse({
      wedding: refreshed,
      clients: listAllWeddingsSummary(),
      activeWeddingId: newWeddingId
    }, 'Klien baru "' + groomName + ' & ' + brideName + '" berhasil ditambahkan!');
  });
}

function switchActiveWedding(sessionToken, weddingId) {
  requireAdmin(sessionToken);
  var targetId = String(weddingId || '').trim();
  if (!targetId) return errorResponse('ID Klien wajib dipilih.', 'CLIENT_MISSING_ID');

  return withScriptLock(function () {
    saveSettingsMap({ active_wedding_id: targetId });
    clearWeddingCache();
    var refreshed = getWeddingConfigData(true, targetId);
    return okResponse({
      wedding: refreshed,
      clients: listAllWeddingsSummary(),
      activeWeddingId: targetId
    }, 'Berhasil beralih ke klien: ' + refreshed.groom_name + ' & ' + refreshed.bride_name);
  });
}

function deleteWeddingClient(sessionToken, weddingId) {
  requireAdmin(sessionToken);
  var targetId = String(weddingId || '').trim();
  return withScriptLock(function () {
    var weddings = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
    if (weddings.length <= 1) {
      return errorResponse('Minimal harus ada 1 klien undangan yang tersisa.', 'CLIENT_MIN_ONE');
    }
    deleteRecordsByIds(APP_CONFIG.SHEETS.WEDDINGS.name, 'wedding_id', [targetId]);
    var guestIdsToRemove = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name)
      .filter(function (g) {
        var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
        return gWid === targetId;
      })
      .map(function (g) { return g.guest_id; });
    if (guestIdsToRemove.length > 0) {
      deleteRecordsByIds(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', guestIdsToRemove);
    }
    var remaining = getSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name);
    var nextId = remaining[0].wedding_id;
    saveSettingsMap({ active_wedding_id: nextId });
    clearWeddingCache();
    return okResponse({
      wedding: getWeddingConfigData(true, nextId),
      clients: listAllWeddingsSummary(),
      activeWeddingId: nextId
    }, 'Klien berhasil dihapus.');
  });
}

/**
 * Menyimpan perubahan dari Invitation Editor maupun Settings (Pasangan, Acara, Konten, Galeri)
 */
function updateWeddingSettings(sessionToken, payload) {
  requireAdmin(sessionToken);
  if (!payload) {
    return errorResponse('Data pengaturan tidak boleh kosong.', 'WEDDING_EMPTY_PAYLOAD');
  }

  return withScriptLock(function () {
    var targetWid = (payload.wedding_id && String(payload.wedding_id).trim()) || getActiveWeddingId();
    var current = getWeddingConfigData(true, targetWid);
    var weddingId = current.wedding_id || targetWid;

    var updatedWeddingRow = {
      wedding_id: weddingId,
      groom_name: sanitizeString(payload.groom_name || current.groom_name, 120),
      bride_name: sanitizeString(payload.bride_name || current.bride_name, 120),
      wedding_date: sanitizeTextPlain(payload.wedding_date || current.wedding_date, 30),
      akad_time: sanitizeString(payload.akad_time || current.akad_time, 80),
      reception_time: sanitizeString(payload.reception_time || current.reception_time, 80),
      venue: sanitizeString(payload.venue || current.venue, 160),
      address: sanitizeString(payload.address || current.address, 350),
      maps_url: sanitizeUrl(payload.maps_url !== undefined ? payload.maps_url : current.maps_url),
      description: sanitizeString(payload.description !== undefined ? payload.description : current.description, 600),
      cover_image: sanitizeUrl(payload.cover_image !== undefined ? payload.cover_image : current.cover_image),
      status: sanitizeString(payload.status || current.status || 'Published', 30)
    };

    replaceSheetRecords(APP_CONFIG.SHEETS.WEDDINGS.name, [updatedWeddingRow]);

    // Sanitasi array cerita pasangan
    var storyList = current.our_story || [];
    if (Array.isArray(payload.our_story)) {
      storyList = payload.our_story.map(function (st) {
        return {
          year: sanitizeString(st.year || '', 50),
          title: sanitizeString(st.title || '', 120),
          story: sanitizeString(st.story || '', 600)
        };
      }).filter(function (st) {
        return st.title || st.story;
      });
    }

    var mergedThemeMedia = current.theme_media || JSON.parse(JSON.stringify(APP_CONFIG.DEFAULT_THEME_MEDIA || {}));
    if (payload.theme_media && typeof payload.theme_media === 'object') {
      Object.keys(payload.theme_media).forEach(function (tKey) {
        if (!mergedThemeMedia[tKey]) mergedThemeMedia[tKey] = {};
        var slotMap = payload.theme_media[tKey] || {};
        Object.keys(slotMap).forEach(function (sKey) {
          var cleanSlotUrl = sanitizeUrl(slotMap[sKey]);
          if (cleanSlotUrl) {
            mergedThemeMedia[tKey][sKey] = cleanSlotUrl;
          }
        });
      });
    }

    var settingsUpdates = {
      invitation_theme: sanitizeTextPlain(
        payload.invitation_theme !== undefined ? payload.invitation_theme : current.invitation_theme,
        50
      ) || 'elegant_floral',
      qr_checkin_enabled: payload.qr_checkin_enabled !== undefined
        ? String(!!payload.qr_checkin_enabled)
        : String(current.qr_checkin_enabled !== false),
      theme_media_json: JSON.stringify(mergedThemeMedia),
      groom_nickname: sanitizeString(
        payload.groom_nickname !== undefined ? payload.groom_nickname : current.groom_nickname,
        60
      ),
      bride_nickname: sanitizeString(
        payload.bride_nickname !== undefined ? payload.bride_nickname : current.bride_nickname,
        60
      ),
      groom_parents: sanitizeString(
        payload.groom_parents !== undefined ? payload.groom_parents : current.groom_parents,
        220
      ),
      bride_parents: sanitizeString(
        payload.bride_parents !== undefined ? payload.bride_parents : current.bride_parents,
        220
      ),
      groom_photo: sanitizeUrl(
        payload.groom_photo !== undefined ? payload.groom_photo : current.groom_photo
      ),
      bride_photo: sanitizeUrl(
        payload.bride_photo !== undefined ? payload.bride_photo : current.bride_photo
      ),
      akad_title: sanitizeString(
        payload.akad_title !== undefined ? payload.akad_title : current.akad_title,
        80
      ),
      reception_title: sanitizeString(
        payload.reception_title !== undefined ? payload.reception_title : current.reception_title,
        80
      ),
      quote_text: sanitizeString(
        payload.quote_text !== undefined ? payload.quote_text : current.quote_text,
        600
      ),
      quote_source: sanitizeString(
        payload.quote_source !== undefined ? payload.quote_source : current.quote_source,
        120
      ),
      our_story_json: JSON.stringify(storyList),
      music_url: sanitizeUrl(
        payload.music_url !== undefined ? payload.music_url : current.music_url
      ),
      music_enabled: payload.music_enabled !== undefined ? String(!!payload.music_enabled) : String(current.music_enabled),
      closing_text: sanitizeString(
        payload.closing_text !== undefined ? payload.closing_text : current.closing_text,
        500
      )
    };

    if (payload.wa_message_template !== undefined) {
      settingsUpdates.wa_message_template = sanitizeTextPlain(payload.wa_message_template, 2000);
    } else if (current.wa_message_template) {
      settingsUpdates.wa_message_template = current.wa_message_template;
    }

    updatedWeddingRow.settings_json = JSON.stringify(settingsUpdates);
    var updatedOk = updateRecordById(APP_CONFIG.SHEETS.WEDDINGS.name, 'wedding_id', weddingId, updatedWeddingRow);
    if (!updatedOk) {
      appendRecord(APP_CONFIG.SHEETS.WEDDINGS.name, updatedWeddingRow);
    }

    if (weddingId === getActiveWeddingId()) {
      saveSettingsMap(settingsUpdates);
    }

    // Update Galeri khusus klien ini jika disertakan
    if (Array.isArray(payload.gallery)) {
      var otherGallery = getSheetRecords(APP_CONFIG.SHEETS.GALLERY.name).filter(function (g) {
        var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
        return gWid !== weddingId;
      });
      var cleanGallery = payload.gallery
        .map(function (g, idx) {
          var imgUrl = sanitizeUrl(g.image_url);
          if (!imgUrl) return null;
          return {
            image_id: sanitizeTextPlain(g.image_id || generateId('GAL'), 40),
            wedding_id: weddingId,
            image_url: imgUrl,
            caption: sanitizeString(g.caption || '', 150),
            display_order: parseInt(g.display_order, 10) || (idx + 1)
          };
        })
        .filter(Boolean);
      replaceSheetRecords(APP_CONFIG.SHEETS.GALLERY.name, otherGallery.concat(cleanGallery));
    }

    clearWeddingCache();
    var refreshed = getWeddingConfigData(true, weddingId);

    return okResponse({
      wedding: refreshed,
      clients: listAllWeddingsSummary(),
      activeWeddingId: weddingId
    }, 'Pengaturan undangan klien berhasil disimpan.');
  });
}

/**
 * Mengunggah gambar (foto pasangan / cover / galeri) ke Google Drive
 * dengan batas ukuran maksimal 5 MB dan mengembalikan direct image URL.
 */
function uploadImageToDrive(sessionToken, uploadPayload) {
  requireAdmin(sessionToken);
  if (!uploadPayload || !uploadPayload.base64Data) {
    return errorResponse('Data file gambar tidak ditemukan.', 'UPLOAD_EMPTY');
  }

  var mimeType = String(uploadPayload.mimeType || 'image/jpeg').toLowerCase();
  var allowedMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
  if (allowedMimes.indexOf(mimeType) === -1) {
    return errorResponse('Format gambar tidak didukung. Gunakan JPG, PNG, atau WEBP.', 'UPLOAD_INVALID_MIME');
  }

  var cleanBase64 = String(uploadPayload.base64Data).replace(/^data:[^;]+;base64,/, '');
  var decodedBytes = Utilities.base64Decode(cleanBase64);
  if (decodedBytes.length > APP_CONFIG.MAX_UPLOAD_BYTES) {
    return errorResponse('Ukuran gambar melebihi batas maksimal 5 MB.', 'UPLOAD_TOO_LARGE');
  }

  var folderId = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.DRIVE_FOLDER_ID, '');
  var folder = null;

  if (folderId) {
    try {
      folder = DriveApp.getFolderById(folderId);
    } catch (e) {
      folder = null;
    }
  }

  if (!folder) {
    var folderIter = DriveApp.getFoldersByName('Wedding_Invitation_Media');
    if (folderIter.hasNext()) {
      folder = folderIter.next();
    } else {
      folder = DriveApp.createFolder('Wedding_Invitation_Media');
    }
    setScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.DRIVE_FOLDER_ID, folder.getId());
  }

  var safeName = 'WIMS_' + new Date().getTime() + '_' + sanitizeTextPlain(uploadPayload.fileName || 'photo.jpg', 60);
  var blob = Utilities.newBlob(decodedBytes, mimeType, safeName);
  var file = folder.createFile(blob);
  file.setSharing(DriveApp.Access.ANYONE_WITH_LINK, DriveApp.Permission.VIEW);

  var fileId = file.getId();
  var directUrl = 'https://lh3.googleusercontent.com/d/' + fileId;

  return okResponse(
    {
      fileId: fileId,
      imageUrl: directUrl,
      fallbackUrl: 'https://drive.google.com/uc?export=view&id=' + fileId,
      fileName: safeName
    },
    'Gambar berhasil diunggah ke Google Drive.'
  );
}

/**
 * Menyimpan konfigurasi sistem (Spreadsheet ID, Drive Folder ID, WebApp Base URL)
 */
function saveSystemIntegrationSettings(sessionToken, sysPayload) {
  requireAdmin(sessionToken);
  if (!sysPayload) {
    return errorResponse('Payload pengaturan sistem kosong.', 'SYS_EMPTY');
  }

  var propUpdates = {};
  if (sysPayload.spreadsheetId !== undefined && String(sysPayload.spreadsheetId).trim()) {
    var testId = String(sysPayload.spreadsheetId).trim();
    try {
      SpreadsheetApp.openById(testId);
      propUpdates[APP_CONFIG.SCRIPT_PROPERTIES.SPREADSHEET_ID] = testId;
    } catch (e) {
      return errorResponse('Spreadsheet ID tidak valid atau akun tidak memiliki akses ke Spreadsheet tersebut.', 'SYS_INVALID_SHEET_ID');
    }
  }

  if (sysPayload.driveFolderId !== undefined) {
    var dId = String(sysPayload.driveFolderId).trim();
    if (dId) {
      try {
        DriveApp.getFolderById(dId);
      } catch (e2) {
        return errorResponse('Drive Folder ID tidak ditemukan atau tidak dapat diakses.', 'SYS_INVALID_FOLDER_ID');
      }
    }
    propUpdates[APP_CONFIG.SCRIPT_PROPERTIES.DRIVE_FOLDER_ID] = dId;
  }

  if (sysPayload.webAppBaseUrl !== undefined) {
    propUpdates[APP_CONFIG.SCRIPT_PROPERTIES.WEBAPP_BASE_URL] = sanitizeUrl(sysPayload.webAppBaseUrl);
  }

  setScriptPropsBatch(propUpdates);
  clearWeddingCache();

  return okResponse(propUpdates, 'Pengaturan integrasi Google Spreadsheet & Drive berhasil disimpan.');
}

/**
 * Mencari data tamu berdasarkan token mentah (membandingkan hashToken(rawToken) dengan token_hash di sheet Guests)
 */
function findGuestByRawToken(rawToken) {
  var cleanToken = String(rawToken || '').trim();
  if (!cleanToken || cleanToken.length < 6) {
    return null;
  }

  var targetHash = hashToken(cleanToken);
  var guests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);

  for (var i = 0; i < guests.length; i++) {
    var g = guests[i];
    if (g.token_hash && String(g.token_hash).trim() === targetHash) {
      return g;
    }
    var extracted = extractRawTokenFromGuest(g);
    if (extracted && extracted === cleanToken) {
      return g;
    }
  }
  return null;
}

/**
 * ENDPOINT PUBLIK UTAMA UNTUK GUEST INVITATION WEBSITE
 * Mengambil data undangan personal berdasarkan invitation token.
 * KEAMANAN:
 * - Rate limit per token
 * - Hanya mengembalikan nama tamu pemilik token tersebut
 * - TIDAK PERNAH mengekspos nomor WhatsApp tamu atau daftar tamu lainnya
 */
function getInvitationByToken(rawToken) {
  var cleanToken = String(rawToken || '').trim();
  if (!cleanToken) {
    return errorResponse(
      'Token undangan tidak ditemukan. Pastikan Anda membuka link undangan pribadi yang lengkap.',
      'INV_MISSING_TOKEN'
    );
  }

  // Batasi frekuensi request publik
  var rl = checkRateLimit('PUB_INV_' + cleanToken, APP_CONFIG.PUBLIC_RATE_LIMIT_MAX, APP_CONFIG.PUBLIC_RATE_LIMIT_WINDOW);
  if (!rl.allowed) {
    return errorResponse(
      'Terlalu banyak permintaan dalam waktu singkat. Silakan tunggu beberapa detik lalu muat ulang.',
      'INV_RATE_LIMITED'
    );
  }

  var matchedGuest = findGuestByRawToken(cleanToken);
  if (!matchedGuest) {
    return errorResponse(
      'Maaf, undangan tidak ditemukan atau link tidak valid. Silakan hubungi penyelenggara acara.',
      'INV_TOKEN_INVALID'
    );
  }

  var guestWeddingId = (matchedGuest.wedding_id && String(matchedGuest.wedding_id).trim()) || 'WED-001';
  var weddingConfig = getWeddingConfigData(false, guestWeddingId);
  if (String(weddingConfig.status).toLowerCase() === 'draft') {
    return errorResponse(
      'Undangan saat ini sedang dalam tahap persiapan dan belum dipublikasikan.',
      'INV_NOT_PUBLISHED'
    );
  }

  // Kunci tema permanen per link tamu jika belum terkunci
  var lockedTheme = (matchedGuest.locked_theme && String(matchedGuest.locked_theme).trim()) || '';
  var effectiveTheme = lockedTheme || weddingConfig.invitation_theme || 'elegant_floral';
  if (!lockedTheme) {
    try {
      updateRecordById(APP_CONFIG.SHEETS.GUESTS.name, 'guest_id', matchedGuest.guest_id, {
        locked_theme: effectiveTheme,
        wedding_id: weddingConfig.wedding_id || guestWeddingId
      });
    } catch (eLock) {}
  }
  var effectiveSlots = (weddingConfig.theme_media && weddingConfig.theme_media[effectiveTheme])
    ? weddingConfig.theme_media[effectiveTheme]
    : (weddingConfig.active_theme_slots || {});

  // Ambil RSVP milik tamu ini & daftar buku ucapan publik (khusus klien/wedding yang sama)
  var allRsvps = getSheetRecords(APP_CONFIG.SHEETS.RSVP.name);
  var allGuests = getSheetRecords(APP_CONFIG.SHEETS.GUESTS.name);
  var checkins = getSheetRecords(APP_CONFIG.SHEETS.CHECKIN.name);

  var guestNameMap = {};
  var sameClientGuestMap = {};
  allGuests.forEach(function (g) {
    var gWid = (g.wedding_id && String(g.wedding_id).trim()) || 'WED-001';
    if (gWid === String(weddingConfig.wedding_id || guestWeddingId)) {
      guestNameMap[String(g.guest_id)] = g.guest_name || 'Tamu Undangan';
      sameClientGuestMap[String(g.guest_id)] = true;
    }
  });

  var myRsvp = null;
  var publicWishes = [];

  allRsvps.forEach(function (r) {
    if (String(r.guest_id) === String(matchedGuest.guest_id)) {
      myRsvp = {
        rsvp_id: r.rsvp_id,
        attendance_status: r.attendance_status || APP_CONFIG.RSVP_STATUS.PENDING,
        guest_count: parseInt(r.guest_count, 10) || 1,
        wishes: r.wishes || '',
        updated_at: r.updated_at || r.created_at || ''
      };
    }

    if (sameClientGuestMap[String(r.guest_id)] && r.wishes && String(r.wishes).trim() !== '') {
      publicWishes.push({
        sender_name: guestNameMap[String(r.guest_id)] || 'Sahabat & Keluarga',
        attendance_status: r.attendance_status || APP_CONFIG.RSVP_STATUS.ATTENDING,
        wishes: r.wishes,
        created_at: r.updated_at || r.created_at || ''
      });
    }
  });

  // Urutkan ucapan terbaru di paling atas
  publicWishes.sort(function (a, b) {
    return String(b.created_at).localeCompare(String(a.created_at));
  });

  var myCheckin = null;
  for (var c = 0; c < checkins.length; c++) {
    if (String(checkins[c].guest_id) === String(matchedGuest.guest_id)) {
      myCheckin = {
        checked_in: true,
        checkin_time: checkins[c].checkin_time
      };
      break;
    }
  }

  // Kembalikan profil tamu yang AMAN (tanpa nomor WA, tanpa daftar tamu lain)
  return okResponse({
    guest: {
      guest_id: matchedGuest.guest_id,
      guest_name: matchedGuest.guest_name,
      category: matchedGuest.category || 'Tamu Kehormatan',
      qr_token: cleanToken,
      rsvp: myRsvp,
      checkin: myCheckin
    },
    wedding: {
      invitation_theme: effectiveTheme,
      qr_checkin_enabled: weddingConfig.qr_checkin_enabled !== false,
      theme_media: weddingConfig.theme_media || {},
      active_theme_slots: effectiveSlots,
      groom_name: weddingConfig.groom_name,
      bride_name: weddingConfig.bride_name,
      groom_nickname: weddingConfig.groom_nickname,
      bride_nickname: weddingConfig.bride_nickname,
      groom_parents: weddingConfig.groom_parents,
      bride_parents: weddingConfig.bride_parents,
      groom_photo: weddingConfig.groom_photo,
      bride_photo: weddingConfig.bride_photo,
      wedding_date: weddingConfig.wedding_date,
      akad_title: weddingConfig.akad_title,
      akad_time: weddingConfig.akad_time,
      reception_title: weddingConfig.reception_title,
      reception_time: weddingConfig.reception_time,
      venue: weddingConfig.venue,
      address: weddingConfig.address,
      maps_url: weddingConfig.maps_url,
      description: weddingConfig.description,
      cover_image: weddingConfig.cover_image,
      hero_image: weddingConfig.hero_image || weddingConfig.cover_image,
      closing_image: weddingConfig.closing_image || weddingConfig.cover_image,
      quote_text: weddingConfig.quote_text,
      quote_source: weddingConfig.quote_source,
      our_story: weddingConfig.our_story,
      gallery: weddingConfig.gallery,
      music_url: weddingConfig.music_url,
      music_enabled: weddingConfig.music_enabled,
      closing_text: weddingConfig.closing_text
    },
    wishes: publicWishes.slice(0, 60)
  });
}
