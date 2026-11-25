/**
 * ============================================================================
 * CONFIG.GS
 * Konfigurasi Utama, Skema Sheet Database, Konstanta Keamanan & Default Data
 * Wedding Invitation Management System
 * ============================================================================
 */

var APP_CONFIG = {
  APP_NAME: 'Wedding Invitation Management System',
  VERSION: '1.0.0',
  TIMEZONE: 'Asia/Jakarta',

  // Konfigurasi Keamanan & Cache
  ADMIN_SESSION_TTL_SECONDS: 43200, // 12 Jam
  LOGIN_MAX_ATTEMPTS: 5,
  LOGIN_LOCKOUT_SECONDS: 900,       // 15 Menit
  PUBLIC_RATE_LIMIT_MAX: 45,        // Maks 45 request per menit per token/client
  PUBLIC_RATE_LIMIT_WINDOW: 60,     // 60 detik
  WEDDING_CACHE_KEY: 'WEDDING_PUBLIC_CONFIG_V1',
  WEDDING_CACHE_TTL: 300,           // 5 Menit
  MAX_UPLOAD_BYTES: 5 * 1024 * 1024, // 5 MB

  // Konfigurasi Antrean WhatsApp
  WA_BATCH_SIZE: 15,                // Jumlah pesan per eksekusi trigger
  WA_DEFAULT_API_VERSION: 'v20.0',

  // Kategori Tamu Resmi
  GUEST_CATEGORIES: [
    'Keluarga',
    'Teman',
    'Rekan Kerja',
    'Kerabat',
    'Lainnya'
  ],

  // Status Pengiriman
  DELIVERY_STATUS: {
    UNSENT: 'Belum Dikirim',
    QUEUED: 'Dalam Antrean',
    SENT: 'Terkirim',
    FAILED: 'Gagal Dikirim'
  },

  // Status RSVP
  RSVP_STATUS: {
    ATTENDING: 'Hadir',
    NOT_ATTENDING: 'Tidak Hadir',
    PENDING: 'Belum Konfirmasi'
  },

  // Nama Sheet dan Urutan Kolom Wajib (Sesuai Spesifikasi Bagian 6)
  SHEETS: {
    USERS: {
      name: 'Users',
      headers: ['user_id', 'username', 'password_hash', 'role', 'active', 'created_at']
    },
    WEDDINGS: {
      name: 'Weddings',
      headers: [
        'wedding_id',
        'groom_name',
        'bride_name',
        'wedding_date',
        'akad_time',
        'reception_time',
        'venue',
        'address',
        'maps_url',
        'description',
        'cover_image',
        'status',
        'settings_json'
      ]
    },
    GUESTS: {
      name: 'Guests',
      headers: [
        'guest_id',
        'guest_name',
        'whatsapp_number',
        'category',
        'token_hash',
        'invitation_url',
        'delivery_status',
        'created_at',
        'updated_at',
        'invitation_token',
        'wedding_id',
        'locked_theme'
      ]
    },
    MESSAGES: {
      name: 'Messages',
      headers: [
        'message_id',
        'guest_id',
        'message_template',
        'provider_message_id',
        'status',
        'error_message',
        'sent_at'
      ]
    },
    RSVP: {
      name: 'RSVP',
      headers: [
        'rsvp_id',
        'guest_id',
        'attendance_status',
        'guest_count',
        'wishes',
        'created_at',
        'updated_at'
      ]
    },
    GALLERY: {
      name: 'Gallery',
      headers: ['image_id', 'wedding_id', 'image_url', 'caption', 'display_order']
    },
    CHECKIN: {
      name: 'Checkin',
      headers: ['checkin_id', 'guest_id', 'checkin_time', 'checked_by']
    },
    SETTINGS: {
      name: 'Settings',
      headers: ['setting_key', 'setting_value']
    }
  },

  // Kunci Script Properties (Kredensial Sensitif)
  SCRIPT_PROPERTIES: {
    SPREADSHEET_ID: 'SPREADSHEET_ID',
    DRIVE_FOLDER_ID: 'DRIVE_FOLDER_ID',
    WEBAPP_BASE_URL: 'WEBAPP_BASE_URL',
    WA_PHONE_NUMBER_ID: 'WA_PHONE_NUMBER_ID',
    WA_ACCESS_TOKEN: 'WA_ACCESS_TOKEN',
    WA_BUSINESS_ACCOUNT_ID: 'WA_BUSINESS_ACCOUNT_ID',
    WA_API_VERSION: 'WA_API_VERSION',
    WA_USE_TEMPLATE_API: 'WA_USE_TEMPLATE_API',
    WA_META_TEMPLATE_NAME: 'WA_META_TEMPLATE_NAME',
    WA_META_TEMPLATE_LANG: 'WA_META_TEMPLATE_LANG'
  },

  // Default Data Pernikahan Awal
  DEFAULT_WEDDING: {
    wedding_id: 'WED-001',
    groom_name: 'Romeo Montague',
    bride_name: 'Juliet Capulet',
    wedding_date: '2026-12-12',
    akad_time: '08:00 - 10:00 WIB',
    reception_time: '11:00 - 14:00 WIB',
    venue: 'The Grand Champagne Ballroom',
    address: 'Jl. Jenderal Sudirman Kav. 52-53, Senayan, Jakarta Selatan',
    maps_url: 'https://maps.google.com/?q=-6.225014,106.809723',
    description: 'Tanpa mengurangi rasa hormat, kami mengundang Bapak/Ibu/Saudara/i untuk menghadiri hari bahagia pernikahan kami.',
    cover_image: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
    status: 'Published'
  },

  // Default Settings Tambahan (Konten Undangan & Template Pesan)
  DEFAULT_SETTINGS: {
    invitation_theme: 'elegant_floral',
    qr_checkin_enabled: 'true',
    groom_nickname: 'Romeo',
    bride_nickname: 'Juliet',
    groom_parents: 'Putra Pertama dari Bpk. Hendra Montague & Ibu Sofia Montague',
    bride_parents: 'Putri Kedua dari Bpk. Wijaya Capulet & Ibu Ratna Capulet',
    groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
    bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
    akad_title: 'Akad Nikah',
    reception_title: 'Resepsi Pernikahan',
    quote_text: '"Dan di antara tanda-tanda (kebesaran)-Nya ialah Dia menciptakan pasangan-pasangan untukmu dari jenismu sendiri, agar kamu cenderung dan merasa tenteram kepadanya, dan Dia menjadikan di antaramu rasa kasih dan sayang."',
    quote_source: 'QS. Ar-Rum: 21',
    our_story_json: JSON.stringify([
      {
        year: '2023',
        title: 'Pertemuan Pertama',
        story: 'Kami pertama kali bertemu dalam sebuah acara komunitas kreatif di Jakarta. Percakapan singkat hari itu menjadi awal dari kisah panjang kami.'
      },
      {
        year: '2025',
        title: 'Komitmen & Lamaran',
        story: 'Setelah melewati berbagai musim kehidupan bersama, kami memutuskan untuk mengikat janji di hadapan kedua keluarga besar.'
      },
      {
        year: '12 Desember 2026',
        title: 'Hari Bahagia',
        story: 'Dengan memohon ridho dan berkah Tuhan Yang Maha Esa, kami melangkah menuju lembaran baru sebagai sepasang suami istri.'
      }
    ]),
    music_url: 'https://cdn.pixabay.com/download/audio/2022/05/27/audio_1808fbf07a.mp3',
    music_enabled: 'true',
    video_url: '',
    livestream_url: '',
    gift_bank_name: 'BCA',
    gift_account_number: '1234567890',
    gift_account_name: 'Romeo Montague',
    gift_address: 'Jl. Jenderal Sudirman Kav. 52-53, Jakarta Selatan',
    gift_note: 'Doa restu Anda merupakan karunia terindah bagi kami. Namun jika berkenan memberikan tanda kasih, dapat melalui rekening atau alamat di bawah ini.',
    also_invite_text: 'Keluarga Besar Mempelai Pria\nKeluarga Besar Mempelai Wanita\nSahabat & Rekan Kerja',
    closing_text: 'Merupakan suatu kehormatan dan kebahagiaan bagi kami apabila Bapak/Ibu/Saudara/i berkenan hadir untuk memberikan doa restu kepada kami.',
    wa_message_template:
      'Halo {{nama_tamu}},\n\n' +
      'Dengan penuh sukacita, kami mengundang Anda untuk menghadiri pernikahan kami:\n' +
      '*{{nama_pasangan}}*\n\n' +
      'Silakan buka undangan digital pribadi Anda melalui link berikut:\n\n' +
      '{{link_undangan}}\n\n' +
      'Terima kasih atas perhatian dan doa restunya.'
  },

  DEFAULT_GALLERY: [
    {
      image_id: 'GAL-001',
      wedding_id: 'WED-001',
      image_url: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      caption: 'Our Prewedding Moment I',
      display_order: 1
    },
    {
      image_id: 'GAL-002',
      wedding_id: 'WED-001',
      image_url: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      caption: 'Our Prewedding Moment II',
      display_order: 2
    },
    {
      image_id: 'GAL-003',
      wedding_id: 'WED-001',
      image_url: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      caption: 'Together Forever',
      display_order: 3
    },
    {
      image_id: 'GAL-004',
      wedding_id: 'WED-001',
      image_url: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
      caption: 'The Promise',
      display_order: 4
    }
  ],

  // Skema Slot Foto Khusus per Tema (Setiap tema memiliki jumlah & fungsi slot berbeda)
  DEFAULT_THEME_MEDIA: {
    elegant_floral: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    },
    batak_heritage: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_4: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    },
    modern_minimalist: {
      cover_photo: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    },
    romantic_sunset: {
      cover_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    },
    dark_luxury: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=600&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=600&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_4: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
      gallery_5: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80'
    },
    thelove_cinematic: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      slide_2: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=1000&q=80',
      slide_3: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      story_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=800&q=80',
      story_2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=800&q=80',
      story_3: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=800&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80',
      closing_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80'
    },
    dark_boho: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
      gallery_4: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80'
    },
    cypress_linen: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    },
    first_class_vows: {
      cover_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1519225421980-715cb0215aed?auto=format&fit=crop&w=900&q=80'
    },
    traditional_java: {
      cover_photo: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=1000&q=80',
      hero_photo: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=1000&q=80',
      groom_photo: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?auto=format&fit=crop&w=700&q=80',
      bride_photo: 'https://images.unsplash.com/photo-1534528741775-53994a69daeb?auto=format&fit=crop&w=700&q=80',
      gallery_1: 'https://images.unsplash.com/photo-1519741497674-611481863552?auto=format&fit=crop&w=900&q=80',
      gallery_2: 'https://images.unsplash.com/photo-1511285560929-80b456fea0bc?auto=format&fit=crop&w=900&q=80',
      gallery_3: 'https://images.unsplash.com/photo-1520854221256-17451cc331bf?auto=format&fit=crop&w=900&q=80',
      gallery_4: 'https://images.unsplash.com/photo-1465495976277-4387d4b0b4c6?auto=format&fit=crop&w=900&q=80'
    }
  }
};

/**
 * Mengambil nilai Script Property dengan fallback default
 */
function getScriptProp(key, defaultValue) {
  try {
    var props = PropertiesService.getScriptProperties();
    var val = props.getProperty(key);
    return (val !== null && val !== undefined && val !== '') ? val : (defaultValue || '');
  } catch (err) {
    return defaultValue || '';
  }
}

/**
 * Menyimpan nilai ke Script Properties
 */
function setScriptProp(key, value) {
  var props = PropertiesService.getScriptProperties();
  props.setProperty(key, String(value || '').trim());
}

/**
 * Menyimpan banyak Script Properties sekaligus
 */
function setScriptPropsBatch(propMap) {
  var props = PropertiesService.getScriptProperties();
  var cleanMap = {};
  Object.keys(propMap || {}).forEach(function (k) {
    if (propMap[k] !== undefined && propMap[k] !== null) {
      cleanMap[k] = String(propMap[k]).trim();
    }
  });
  props.setProperties(cleanMap, false);
}

/**
 * Mendapatkan Base URL Web App saat ini untuk membentuk link undangan tamu
 */
function getWebAppBaseUrl() {
  var customBase = getScriptProp(APP_CONFIG.SCRIPT_PROPERTIES.WEBAPP_BASE_URL, '');
  if (customBase) {
    return customBase.replace(/\?.*$/, '').replace(/\/+$/, '');
  }
  try {
    var serviceUrl = ScriptApp.getService().getUrl();
    if (serviceUrl) {
      return serviceUrl;
    }
  } catch (e) {
    // Fallback jika belum di-deploy sebagai Web App
  }
  return 'https://script.google.com/macros/s/YOUR_DEPLOYMENT_ID/exec';
}
