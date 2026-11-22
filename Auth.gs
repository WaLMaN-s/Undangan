/**
 * ============================================================================
 * AUTH.GS
 * Modul Autentikasi Admin, Proteksi Brute-Force, Session Token & ganti Password
 * ============================================================================
 */

/**
 * Autentikasi Login Admin
 * - Memeriksa batas percobaan login (Brute-force protection via CacheService)
 * - Memverifikasi username & password_hash dengan salt unik
 * - Membuat session token di CacheService (TTL 12 jam)
 */
function authenticateAdmin(usernameInput, passwordInput) {
  var username = sanitizeTextPlain(usernameInput, 80).toLowerCase();
  var password = String(passwordInput || '');

  if (!username || !password) {
    return errorResponse('Username dan password wajib diisi.', 'AUTH_EMPTY_INPUT');
  }

  var cache = CacheService.getScriptCache();
  var attemptKey = 'LOGIN_ATTEMPT_' + sha256Hex(username).substring(0, 20);
  var attemptsStr = cache.get(attemptKey);
  var attempts = attemptsStr ? parseInt(attemptsStr, 10) : 0;

  if (attempts >= APP_CONFIG.LOGIN_MAX_ATTEMPTS) {
    return errorResponse(
      'Terlalu banyak percobaan login gagal. Akun dikunci sementara selama 15 menit demi keamanan.',
      'AUTH_LOCKED_OUT'
    );
  }

  // Pastikan database telah diinisialisasi
  var users = getSheetRecords(APP_CONFIG.SHEETS.USERS.name);
  if (users.length === 0) {
    initializeDatabase();
    users = getSheetRecords(APP_CONFIG.SHEETS.USERS.name);
  }

  var matchedUser = null;
  for (var i = 0; i < users.length; i++) {
    var u = users[i];
    if (String(u.username || '').trim().toLowerCase() === username) {
      matchedUser = u;
      break;
    }
  }

  var isActive = matchedUser && String(matchedUser.active).toLowerCase() !== 'false' && String(matchedUser.active) !== '0';
  var isPasswordValid = matchedUser && isActive && verifyPasswordHash(password, matchedUser.password_hash);

  if (!isPasswordValid) {
    cache.put(attemptKey, String(attempts + 1), APP_CONFIG.LOGIN_LOCKOUT_SECONDS);
    var remaining = Math.max(0, APP_CONFIG.LOGIN_MAX_ATTEMPTS - (attempts + 1));
    return errorResponse(
      'Username atau password salah. Sisa percobaan: ' + remaining + ' kali.',
      'AUTH_INVALID_CREDENTIALS'
    );
  }

  // Login berhasil -> bersihkan counter gagal & buat token sesi baru
  cache.remove(attemptKey);

  var sessionToken = generateRandomToken(40);
  var sessionPayload = {
    user_id: matchedUser.user_id,
    username: matchedUser.username,
    role: matchedUser.role || 'admin',
    issued_at: nowISO()
  };

  cache.put(
    'ADMIN_SESSION_' + sessionToken,
    JSON.stringify(sessionPayload),
    APP_CONFIG.ADMIN_SESSION_TTL_SECONDS
  );

  return okResponse(
    {
      sessionToken: sessionToken,
      user: sessionPayload,
      expiresInSeconds: APP_CONFIG.ADMIN_SESSION_TTL_SECONDS
    },
    'Login berhasil. Selamat datang kembali!'
  );
}

/**
 * Memvalidasi session token admin dari CacheService.
 * Melempar Error jika tidak valid (digunakan oleh semua endpoint sensitif admin).
 */
function requireAdmin(sessionToken) {
  if (!sessionToken || typeof sessionToken !== 'string') {
    throw new Error('UNAUTHORIZED: Sesi login tidak ditemukan. Silakan login kembali.');
  }
  var cleanToken = sessionToken.trim();
  var cache = CacheService.getScriptCache();
  var rawSession = cache.get('ADMIN_SESSION_' + cleanToken);
  if (!rawSession) {
    throw new Error('UNAUTHORIZED: Sesi Anda telah berakhir. Silakan login kembali.');
  }
  try {
    var sessionObj = JSON.parse(rawSession);
    // Perpanjang masa aktif sesi saat aktif digunakan (sliding expiration)
    cache.put(
      'ADMIN_SESSION_' + cleanToken,
      rawSession,
      APP_CONFIG.ADMIN_SESSION_TTL_SECONDS
    );
    return sessionObj;
  } catch (e) {
    throw new Error('UNAUTHORIZED: Data sesi tidak valid.');
  }
}

/**
 * Mengecek apakah session token admin masih aktif (tanpa throw exception)
 */
function verifyAdminSession(sessionToken) {
  try {
    var user = requireAdmin(sessionToken);
    return okResponse({ valid: true, user: user }, 'Sesi aktif.');
  } catch (err) {
    return errorResponse(err.message, 'AUTH_SESSION_EXPIRED');
  }
}

/**
 * Logout Admin & hapus session dari CacheService
 */
function logoutAdmin(sessionToken) {
  if (sessionToken) {
    try {
      CacheService.getScriptCache().remove('ADMIN_SESSION_' + String(sessionToken).trim());
    } catch (e) {}
  }
  return okResponse({ loggedOut: true }, 'Anda telah berhasil logout.');
}

/**
 * Mengubah kredensial Admin (username & password) dari halaman Settings
 */
function updateAdminCredentials(sessionToken, payload) {
  var adminSession = requireAdmin(sessionToken);
  if (!payload || !payload.currentPassword) {
    return errorResponse('Password saat ini wajib diisi untuk verifikasi.', 'AUTH_MISSING_CURRENT_PW');
  }

  return withScriptLock(function () {
    var users = getSheetRecords(APP_CONFIG.SHEETS.USERS.name);
    var currentUser = null;
    for (var i = 0; i < users.length; i++) {
      if (String(users[i].user_id) === String(adminSession.user_id)) {
        currentUser = users[i];
        break;
      }
    }

    if (!currentUser) {
      return errorResponse('Data akun admin tidak ditemukan.', 'AUTH_USER_NOT_FOUND');
    }

    if (!verifyPasswordHash(payload.currentPassword, currentUser.password_hash)) {
      return errorResponse('Password saat ini yang Anda masukkan salah.', 'AUTH_WRONG_PASSWORD');
    }

    var newUsername = payload.newUsername
      ? sanitizeTextPlain(payload.newUsername, 60).toLowerCase()
      : currentUser.username;

    if (!newUsername || newUsername.length < 3) {
      return errorResponse('Username minimal 3 karakter.', 'AUTH_INVALID_USERNAME');
    }

    var updates = {
      username: newUsername
    };

    if (payload.newPassword) {
      if (String(payload.newPassword).length < 8) {
        return errorResponse('Password baru minimal harus 8 karakter.', 'AUTH_WEAK_PASSWORD');
      }
      updates.password_hash = createPasswordHash(payload.newPassword);
    }

    updateRecordById(APP_CONFIG.SHEETS.USERS.name, 'user_id', currentUser.user_id, updates);

    // Perbarui sesi di cache
    var updatedSession = {
      user_id: currentUser.user_id,
      username: newUsername,
      role: currentUser.role || 'admin',
      issued_at: nowISO()
    };
    CacheService.getScriptCache().put(
      'ADMIN_SESSION_' + String(sessionToken).trim(),
      JSON.stringify(updatedSession),
      APP_CONFIG.ADMIN_SESSION_TTL_SECONDS
    );

    return okResponse({ user: updatedSession }, 'Kredensial akun admin berhasil diperbarui.');
  });
}
