/**
 * ============================================================================
 * UTILS.GS
 * Fungsi Utilitas: Kriptografi, Sanitasi XSS, Validasi Nomor WA, Rate Limit
 * ============================================================================
 */

/**
 * Menghasilkan waktu sekarang dalam format ISO 8601 (WIB / Asia/Jakarta)
 */
function nowISO() {
  return Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE || 'Asia/Jakarta', "yyyy-MM-dd'T'HH:mm:ssXXX");
}

/**
 * Format tanggal menjadi ramah baca (contoh: 12 Desember 2026, 14:30)
 */
function formatReadableDateTime(isoString) {
  if (!isoString) return '-';
  try {
    var d = new Date(isoString);
    if (isNaN(d.getTime())) return String(isoString);
    return Utilities.formatDate(d, APP_CONFIG.TIMEZONE || 'Asia/Jakarta', 'dd MMM yyyy, HH:mm');
  } catch (e) {
    return String(isoString);
  }
}

/**
 * Menghasilkan ID unik dengan prefix (contoh: GST-20261122-A8F3K9)
 */
function generateId(prefix) {
  var cleanPrefix = (prefix || 'ID').toUpperCase();
  var uuidPart = Utilities.getUuid().replace(/-/g, '').substring(0, 10).toUpperCase();
  var timePart = Utilities.formatDate(new Date(), APP_CONFIG.TIMEZONE || 'Asia/Jakarta', 'yyMMddHHmm');
  return cleanPrefix + '-' + timePart + '-' + uuidPart;
}

/**
 * Menghasilkan token acak kriptografis (URL-safe alphanumeric) untuk link undangan
 */
function generateRandomToken(length) {
  var targetLen = length || 28;
  var raw = Utilities.getUuid().replace(/-/g, '') + Utilities.getUuid().replace(/-/g, '');
  var bytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    raw + ':' + new Date().getTime() + ':' + Math.random(),
    Utilities.Charset.UTF_8
  );
  var encoded = Utilities.base64EncodeWebSafe(bytes).replace(/[^a-zA-Z0-9]/g, '');
  while (encoded.length < targetLen) {
    encoded += Utilities.getUuid().replace(/-/g, '');
  }
  return encoded.substring(0, targetLen);
}

/**
 * Menghitung SHA-256 hex digest dari sebuah string
 */
function sha256Hex(input) {
  var rawBytes = Utilities.computeDigest(
    Utilities.DigestAlgorithm.SHA_256,
    String(input || ''),
    Utilities.Charset.UTF_8
  );
  var hex = [];
  for (var i = 0; i < rawBytes.length; i++) {
    var b = rawBytes[i];
    if (b < 0) b += 256;
    var h = b.toString(16);
    if (h.length === 1) h = '0' + h;
    hex.push(h);
  }
  return hex.join('');
}

/**
 * Membuat hash token undangan untuk disimpan dan diverifikasi di database
 */
function hashToken(rawToken) {
  var clean = String(rawToken || '').trim();
  if (!clean) return '';
  return sha256Hex('INV_TOKEN_V1::' + clean);
}

/**
 * Membuat password hash dengan salt unik: format "salt$sha256(salt:password)"
 */
function createPasswordHash(plainPassword, customSalt) {
  var salt = customSalt || generateRandomToken(16);
  var digest = sha256Hex(salt + '::WIMS_AUTH_V1::' + String(plainPassword || ''));
  return salt + '$' + digest;
}

/**
 * Memverifikasi password terhadap storedHash ("salt$hash") dengan perbandingan waktu konstan
 */
function verifyPasswordHash(plainPassword, storedHash) {
  if (!plainPassword || !storedHash) return false;
  var parts = String(storedHash).split('$');
  if (parts.length !== 2) return false;
  var salt = parts[0];
  var expectedFull = createPasswordHash(plainPassword, salt);
  if (expectedFull.length !== storedHash.length) return false;
  var diff = 0;
  for (var i = 0; i < expectedFull.length; i++) {
    diff |= expectedFull.charCodeAt(i) ^ storedHash.charCodeAt(i);
  }
  return diff === 0;
}

/**
 * Sanitasi teks untuk mencegah XSS dan Formula Injection di Google Sheets
 */
function sanitizeString(input, maxLength) {
  if (input === null || input === undefined) return '';
  var str = String(input).trim();
  // Cegah CSV / Spreadsheet Formula Injection (=, +, -, @ di awal sel)
  if (/^[=+\-@]/.test(str) && !/^\+62\d+$/.test(str)) {
    str = "'" + str;
  }
  // Escape karakter berbahaya HTML untuk mencegah stored XSS
  str = str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
  if (maxLength && str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  return str;
}

/**
 * Sanitasi teks ringan untuk URL atau data konfigurasi yang butuh karakter URL utuh
 * namun tetap menolak script injection (<script>, javascript:, data:text/html)
 */
function sanitizeTextPlain(input, maxLength) {
  if (input === null || input === undefined) return '';
  var str = String(input).trim();
  str = str.replace(/<\s*\/?\s*script[^>]*>/gi, '');
  str = str.replace(/javascript\s*:/gi, '');
  str = str.replace(/on\w+\s*=/gi, '');
  str = str.replace(/[<>]/g, '');
  if (maxLength && str.length > maxLength) {
    str = str.substring(0, maxLength);
  }
  return str;
}

/**
 * Sanitasi URL (hanya mengizinkan http:// atau https://)
 */
function sanitizeUrl(urlInput) {
  if (!urlInput) return '';
  var str = String(urlInput).trim();
  if (!/^https?:\/\//i.test(str)) {
    return '';
  }
  return str.replace(/["'<>]/g, '');
}

/**
 * Normalisasi nomor WhatsApp Indonesia menjadi format standar internasional tanpa '+' (contoh: 6281234567890)
 */
function normalizeIndonesianPhone(rawPhone) {
  if (rawPhone === null || rawPhone === undefined) return '';
  var str = String(rawPhone).trim();
  // Hapus karakter spasi, strip, titik, kurung, dan petik
  var digits = str.replace(/[^0-9+]/g, '');
  if (digits.indexOf('+62') === 0) {
    digits = '62' + digits.substring(3);
  } else if (digits.indexOf('08') === 0) {
    digits = '62' + digits.substring(1);
  } else if (digits.indexOf('8') === 0) {
    digits = '62' + digits;
  }
  digits = digits.replace(/[^0-9]/g, '');
  return digits;
}

/**
 * Validasi nomor WhatsApp Indonesia (Wajib diawali 628 dan total 10 s/d 15 digit)
 */
function isValidIndonesianPhone(phone) {
  var normalized = normalizeIndonesianPhone(phone);
  return /^628[1-9][0-9]{7,11}$/.test(normalized);
}

/**
 * Rate Limiter berbasis CacheService untuk membatasi frekuensi request publik / login
 */
function checkRateLimit(bucketKey, maxRequests, windowSeconds) {
  try {
    var cache = CacheService.getScriptCache();
    var cacheKey = 'RL_' + sha256Hex(bucketKey).substring(0, 24);
    var currentStr = cache.get(cacheKey);
    var count = currentStr ? parseInt(currentStr, 10) : 0;
    if (count >= maxRequests) {
      return {
        allowed: false,
        count: count,
        retryAfterSeconds: windowSeconds
      };
    }
    cache.put(cacheKey, String(count + 1), windowSeconds || 60);
    return {
      allowed: true,
      count: count + 1
    };
  } catch (err) {
    // Jika CacheService gagal karena kuota internal, tetap izinkan dengan log
    return { allowed: true, count: 1 };
  }
}

/**
 * Pembungkus respons sukses standar ke frontend
 */
function okResponse(data, message) {
  return {
    success: true,
    message: message || 'OK',
    data: data !== undefined ? data : null,
    timestamp: nowISO()
  };
}

/**
 * Pembungkus respons error standar ke frontend
 */
function errorResponse(message, code, details) {
  return {
    success: false,
    error: true,
    code: code || 'ERR_GENERAL',
    message: message || 'Terjadi kesalahan pada server.',
    details: details || null,
    timestamp: nowISO()
  };
}

/**
 * Mengubah array objek menjadi string CSV RFC-4180 yang aman
 */
function objectsToCSV(headers, rows) {
  var escapeCell = function (val) {
    if (val === null || val === undefined) return '""';
    var str = String(val);
    if (/^[=+\-@]/.test(str)) {
      str = "'" + str;
    }
    str = str.replace(/"/g, '""');
    return '"' + str + '"';
  };

  var lines = [];
  lines.push(headers.map(escapeCell).join(','));
  (rows || []).forEach(function (row) {
    var line = headers.map(function (h) {
      return escapeCell(row[h]);
    });
    lines.push(line.join(','));
  });
  return lines.join('\r\n');
}

/**
 * Mem-parsing teks CSV menjadi array 2 dimensi dengan dukungan tanda kutip
 */
function parseCSVText(csvText) {
  if (!csvText) return [];
  var text = String(csvText).replace(/\r\n/g, '\n').replace(/\r/g, '\n');
  // Deteksi delimiter otomatis (koma atau titik koma yang sering dipakai Excel Indonesia)
  var firstLine = text.split('\n')[0] || '';
  var commaCount = (firstLine.match(/,/g) || []).length;
  var semiCount = (firstLine.match(/;/g) || []).length;
  var delimiter = semiCount > commaCount ? ';' : ',';

  var rows = [];
  var currentRow = [];
  var currentVal = '';
  var inQuotes = false;

  for (var i = 0; i < text.length; i++) {
    var char = text[i];
    var nextChar = text[i + 1];

    if (inQuotes) {
      if (char === '"' && nextChar === '"') {
        currentVal += '"';
        i++;
      } else if (char === '"') {
        inQuotes = false;
      } else {
        currentVal += char;
      }
    } else {
      if (char === '"') {
        inQuotes = true;
      } else if (char === delimiter) {
        currentRow.push(currentVal.trim());
        currentVal = '';
      } else if (char === '\n') {
        currentRow.push(currentVal.trim());
        if (currentRow.some(function (cell) { return cell !== ''; })) {
          rows.push(currentRow);
        }
        currentRow = [];
        currentVal = '';
      } else {
        currentVal += char;
      }
    }
  }
  if (currentVal !== '' || currentRow.length > 0) {
    currentRow.push(currentVal.trim());
    if (currentRow.some(function (cell) { return cell !== ''; })) {
      rows.push(currentRow);
    }
  }
  return rows;
}
