export default {
  app: {
    brand: "PT XYZ DocShield",
    portalSubtitle: "Portal Pengamanan & Pengiriman Dokumen Internal",
    logout: "Keluar Akun",
    toggleSidebar: "Buka / Sembunyikan Menu Samping",
    closeMenu: "Tutup menu",
    language: "Bahasa"
  },
  nav: {
    dashboard: "Beranda",
    documents: "Daftar Dokumen",
    encrypt: "Kunci Dokumen (Enkripsi)",
    decrypt: "Buka Dokumen (Dekripsi)",
    keys: "Kunci Keamanan Saya",
    usersAdmin: "Kelola Pengguna",
    usersDirectory: "Direktori Penerima",
    auditLogs: "Riwayat Aktivitas",
    settings: "Pengaturan Sistem",
    profile: "Profil & Kata Sandi",
    login: "Masuk ke Sistem"
  },
  common: {
    reload: "Muat Ulang",
    loading: "Memuat...",
    save: "Simpan",
    saving: "Menyimpan...",
    cancel: "Batal",
    close: "Tutup",
    delete: "Hapus",
    download: "Unduh",
    search: "Cari",
    resetFilter: "Reset Filter",
    actions: "Tindakan"
  },
  login: {
    usernameLabel: "Username, Email Kantor, atau NIK",
    usernamePlaceholder: "Contoh: admin.security",
    passwordLabel: "Kata Sandi (Password)",
    passwordPlaceholder: "Masukkan kata sandi Anda",
    submit: "Masuk ke Sistem",
    submitting: "Sedang Masuk...",
    demoTitle: "Akun Percobaan (Klik untuk mengisi otomatis):",
    welcomeToast: "Selamat datang, {name}.",
    loginError: "Gagal masuk ke sistem."
  },
  dashboard: {
    welcomeTitle: "Selamat Datang, {name}",
    title: "Beranda & Ringkasan Keamanan",
    subtitle: "Pantau dokumen yang telah diamankan, kesiapan kunci keamanan Anda, dan aktivitas terbaru.",
    openDocument: "Buka Dokumen (.enc)",
    lockNewDocument: "+ Kunci Dokumen Baru",
    statLockedTitle: "Total Dokumen Terkunci",
    statLockedSub: "Total kapasitas: {size}",
    statReadyTitle: "Pengguna Siap Menerima File",
    statReadySub: "Dari {count} akun karyawan aktif",
    statDecryptedTitle: "Dokumen Berhasil Dibuka",
    statDecryptedSub: "Keaslian isi dokumen terjamin",
    statTamperTitle: "Percobaan Manipulasi Ditolak",
    statTamperSub: "File rusak atau diubah pihak lain",
    recentDocsTitle: "Dokumen Terbaru",
    viewAllDocs: "Lihat Semua Dokumen →",
    recentActivity: "Riwayat Aktivitas Terakhir",
    viewAllHistory: "Lihat Semua Riwayat →",
    noRecentActivity: "Belum ada riwayat aktivitas terbaru."
  },
  documents: {
    title: "Daftar Dokumen Terkunci",
    subtitle: "Kelola dokumen yang sudah diamankan (.enc), unduh file, atau buka isinya kembali.",
    encryptNew: "+ Kunci Dokumen Baru",
    searchPlaceholder: "Cari nama file atau kode dokumen..."
  },
  encrypt: {
    title: "Kunci & Amankan Dokumen (Enkripsi)",
    subtitle: "Lindungi dokumen Anda agar hanya dapat dibuka oleh penerima yang Anda pilih.",
    viewDocuments: "Lihat Daftar Dokumen",
    fillSample: "Isi Otomatis dengan File Contoh",
    submit: "Kunci Dokumen & Unduh Hasilnya (.enc)",
    submitting: "Sedang Mengunci Dokumen..."
  },
  decrypt: {
    title: "Buka Dokumen Terkunci (Dekripsi)",
    viewDocuments: "Lihat Daftar Dokumen",
    submit: "Buka Kunci & Unduh Dokumen Asli",
    submitting: "Sedang Membuka Dokumen..."
  },
  keys: {
    title: "Kunci Keamanan Saya",
    subtitle: "Kelola pasangan kunci ECC NIST P-256 pribadi Anda dan lihat direktori kunci penerima."
  },
  users: {
    title: "Data Pengguna & Hak Akses",
    subtitle: "Kelola daftar akun karyawan, peran akses dokumen, dan kesiapan kunci keamanan.",
    addUser: "+ Tambah Pengguna Baru"
  },
  audit: {
    title: "Riwayat Aktivitas & Keamanan",
    subtitle: "Catatan lengkap aktivitas penguncian dokumen, pembukaan dokumen, dan riwayat masuk pengguna.",
    verifyChain: "Verifikasi Rantai Audit",
    verifyingChain: "Memverifikasi...",
    exportCsv: "Unduh Laporan CSV"
  },
  settings: {
    title: "Pengaturan Sistem & Hasil Uji Performa",
    subtitle: "Informasi standar pengamanan yang digunakan sistem serta hasil pengujian kecepatan penguncian file.",
    saveSettings: "Simpan Pengaturan"
  },
  profile: {
    title: "Profil & Kata Sandi Akun",
    subtitle: "Perbarui identitas akun Anda dan kelola kata sandi login."
  },
  roles: {
    SECURITY_ADMIN: "Admin Keamanan",
    ADMINISTRATOR: "Administrator",
    EXECUTIVE: "Direksi / Eksekutif",
    MANAGER: "Manajer",
    AUTHORIZED_RECIPIENT: "Penerima Berwenang",
    STAFF: "Staf"
  },
  classifications: {
    INTERNAL: "Internal",
    CONFIDENTIAL: "Terbatas (Confidential)",
    SECRET: "Rahasia (Secret)",
    TOP_SECRET: "Sangat Rahasia"
  },
  actions: {
    ENCRYPTION: "Mengunci Dokumen (Enkripsi)",
    DECRYPTION_SUCCESS: "Membuka Dokumen (Dekripsi)",
    DECRYPTION_FAILED: "Gagal Membuka Dokumen",
    TAMPER_DETECTED: "File Rusak / Diubah Pihak Lain",
    KEY_GENERATED: "Membuat Kunci Keamanan Baru",
    KEY_ROTATED: "Memperbarui Kunci Keamanan",
    LOGIN: "Masuk ke Sistem (Login)",
    LOGIN_SUCCESS: "Masuk ke Sistem (Login)",
    LOGIN_FAILED: "Gagal Masuk (Salah Kata Sandi)",
    UNAUTHORIZED_ACCESS: "Akses Ditolak",
    LOGOUT: "Keluar dari Sistem (Logout)",
    DOCUMENT_DOWNLOADED: "Mengunduh File Terkunci",
    DOCUMENT_DELETED: "Menghapus Dokumen",
    USER_CREATED: "Menambah Pengguna Baru",
    USER_UPDATED: "Memperbarui Data Pengguna",
    USER_DELETED: "Menonaktifkan Pengguna",
    SETTINGS_UPDATED: "Mengubah Pengaturan Sistem",
    PASSWORD_CHANGED: "Mengganti Kata Sandi"
  },
  statuses: {
    SUCCESS: "Berhasil",
    FAILED: "Gagal",
    FAILURE: "Ditolak",
    ALERT: "Peringatan",
    ENCRYPTED: "Terkunci Aman"
  },
  components: {
    close: "Tutup",
    closeNotification: "Tutup notifikasi",
    confirmTitle: "Konfirmasi Tindakan",
    confirmMessage: "Apakah Anda yakin ingin melanjutkan tindakan ini?",
    confirmAction: "Ya, Lanjutkan",
    previous: "Sebelumnya",
    next: "Berikutnya",
    showing: "Menampilkan",
    of: "dari",
    page: "Halaman",
    items: "item",
    loadingData: "Sedang memuat data...",
    noData: "Tidak ada data yang tersedia.",
    copy: "Salin",
    copiedSuccess: "{label} berhasil disalin.",
    defaultCopyLabel: "Teks",
    showPassword: "Lihat Sandi",
    hidePassword: "Sembunyikan",
    processing: "Memproses...",
    dropzoneEmpty: "Klik untuk memilih file atau seret ke sini",
    dropzoneChange: "Klik untuk mengganti file",
    searchPlaceholder: "Cari..."
  }
};
