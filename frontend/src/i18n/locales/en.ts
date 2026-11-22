export default {
  app: {
    brand: "PT XYZ DocShield",
    portalSubtitle: "Internal Document Security & Exchange Portal",
    logout: "Sign Out",
    toggleSidebar: "Toggle Sidebar Navigation",
    closeMenu: "Close menu",
    language: "Language"
  },
  nav: {
    dashboard: "Dashboard",
    documents: "Documents",
    encrypt: "Lock Document (Encrypt)",
    decrypt: "Unlock Document (Decrypt)",
    keys: "My Security Keys",
    usersAdmin: "User Management",
    usersDirectory: "Recipient Directory",
    auditLogs: "Audit Logs",
    settings: "System Settings",
    profile: "Profile & Password",
    login: "Sign In"
  },
  common: {
    reload: "Reload",
    loading: "Loading...",
    save: "Save",
    saving: "Saving...",
    cancel: "Cancel",
    close: "Close",
    delete: "Delete",
    download: "Download",
    search: "Search",
    resetFilter: "Reset Filters",
    actions: "Actions"
  },
  login: {
    usernameLabel: "Username, Corporate Email, or Employee ID",
    usernamePlaceholder: "Example: admin.security",
    passwordLabel: "Password",
    passwordPlaceholder: "Enter your password",
    submit: "Sign In",
    submitting: "Signing in...",
    demoTitle: "Demo Accounts (Click to autofill):",
    welcomeToast: "Welcome back, {name}.",
    loginError: "Failed to sign in."
  },
  dashboard: {
    welcomeTitle: "Welcome, {name}",
    title: "Security Overview Dashboard",
    subtitle: "Monitor encrypted documents, security key readiness, and recent system activity.",
    openDocument: "Decrypt Document (.enc)",
    lockNewDocument: "+ Lock New Document",
    statLockedTitle: "Total Encrypted Documents",
    statLockedSub: "Total storage: {size}",
    statReadyTitle: "Users Ready to Receive",
    statReadySub: "Out of {count} active employee accounts",
    statDecryptedTitle: "Documents Decrypted",
    statDecryptedSub: "Document integrity verified",
    statTamperTitle: "Tamper Attempts Blocked",
    statTamperSub: "Corrupted or modified files rejected",
    recentDocsTitle: "Recent Documents",
    viewAllDocs: "View All Documents →",
    recentActivity: "Recent Activity",
    viewAllHistory: "View All History →",
    noRecentActivity: "No recent activity logs yet."
  },
  documents: {
    title: "Encrypted Documents",
    subtitle: "Manage, download, or decrypt documents protected with AES-256-GCM & ECC P-256.",
    encryptNew: "+ Lock New Document",
    searchPlaceholder: "Search file name or document UID..."
  },
  encrypt: {
    title: "Lock & Protect Document (Encrypt)",
    subtitle: "Protect your document so only the selected recipient can decrypt it.",
    viewDocuments: "View Documents",
    fillSample: "Autofill with Sample File",
    submit: "Encrypt & Download (.enc)",
    submitting: "Encrypting Document..."
  },
  decrypt: {
    title: "Unlock Document (Decrypt)",
    viewDocuments: "View Documents",
    submit: "Decrypt & Download Original File",
    submitting: "Decrypting Document..."
  },
  keys: {
    title: "My Security Keys",
    subtitle: "Manage your personal ECC NIST P-256 keypair and browse the recipient public key directory."
  },
  users: {
    title: "Users & Access Control",
    subtitle: "Manage employee accounts, document clearance roles, and security key readiness.",
    addUser: "+ Add New User"
  },
  audit: {
    title: "Activity & Security Audit Logs",
    subtitle: "Tamper-evident audit trail of document encryption, decryption, and authentication events.",
    verifyChain: "Verify Audit Chain",
    verifyingChain: "Verifying...",
    exportCsv: "Export CSV Report"
  },
  settings: {
    title: "System Settings & Benchmarks",
    subtitle: "Active cryptographic standards and encryption/decryption performance test results.",
    saveSettings: "Save Settings"
  },
  profile: {
    title: "Profile & Account Password",
    subtitle: "Update your account identity and manage your login password."
  },
  roles: {
    SECURITY_ADMIN: "Security Admin",
    ADMINISTRATOR: "Administrator",
    EXECUTIVE: "Executive",
    MANAGER: "Manager",
    AUTHORIZED_RECIPIENT: "Authorized Recipient",
    STAFF: "Staff"
  },
  classifications: {
    INTERNAL: "Internal",
    CONFIDENTIAL: "Confidential",
    SECRET: "Secret",
    TOP_SECRET: "Top Secret"
  },
  actions: {
    ENCRYPTION: "Document Encrypted",
    DECRYPTION_SUCCESS: "Document Decrypted",
    DECRYPTION_FAILED: "Decryption Failed",
    TAMPER_DETECTED: "Tamper Detected / Corrupted File",
    KEY_GENERATED: "Security Key Generated",
    KEY_ROTATED: "Security Key Rotated",
    LOGIN: "User Login",
    LOGIN_SUCCESS: "User Login",
    LOGIN_FAILED: "Login Failed (Bad Credentials)",
    UNAUTHORIZED_ACCESS: "Access Denied",
    LOGOUT: "User Logout",
    DOCUMENT_DOWNLOADED: "Encrypted File Downloaded",
    DOCUMENT_DELETED: "Document Deleted",
    USER_CREATED: "User Created",
    USER_UPDATED: "User Updated",
    USER_DELETED: "User Deactivated",
    SETTINGS_UPDATED: "Settings Updated",
    PASSWORD_CHANGED: "Password Changed"
  },
  statuses: {
    SUCCESS: "Success",
    FAILED: "Failed",
    FAILURE: "Denied",
    ALERT: "Alert",
    ENCRYPTED: "Encrypted"
  }
};
