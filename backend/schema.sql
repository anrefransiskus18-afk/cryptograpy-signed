CREATE DATABASE IF NOT EXISTS hybrid_crypto_db
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hybrid_crypto_db;

-- 1. Tabel Roles (Layer 1: RBAC)
CREATE TABLE IF NOT EXISTS roles (
    id INT AUTO_INCREMENT PRIMARY KEY,
    name VARCHAR(50) NOT NULL UNIQUE COMMENT 'Contoh: EXECUTIVE, SECURITY_ADMIN, MANAGER, STAFF',
    clearance_level INT NOT NULL DEFAULT 1 COMMENT '1=Internal, 2=Confidential, 3=Secret, 4=Top Secret',
    description VARCHAR(255),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB;

-- 2. Tabel Users (Layer 1: Authentication & RBAC)
CREATE TABLE IF NOT EXISTS users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(100) NOT NULL UNIQUE,
    email VARCHAR(150) NOT NULL UNIQUE,
    password_hash VARCHAR(255) NOT NULL,
    full_name VARCHAR(150) NOT NULL,
    department VARCHAR(100) NOT NULL,
    role_id INT NOT NULL,
    is_active BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_user_role FOREIGN KEY (role_id) REFERENCES roles(id) ON DELETE RESTRICT
) ENGINE=InnoDB;

-- 3. Tabel Public Keys (Layer 2: Key Management - ECC NIST P-256)
CREATE TABLE IF NOT EXISTS public_keys (
    id INT AUTO_INCREMENT PRIMARY KEY,
    user_id INT NOT NULL,
    key_fingerprint VARCHAR(64) NOT NULL UNIQUE COMMENT 'SHA-256 Fingerprint dari DER Public Key',
    public_key_pem TEXT NOT NULL COMMENT 'Kunci Publik ECC P-256 dalam format PEM',
    curve_name VARCHAR(30) NOT NULL DEFAULT 'NIST P-256',
    is_revoked BOOLEAN DEFAULT FALSE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT fk_pubkey_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
    INDEX idx_user_active_key (user_id, is_revoked)
) ENGINE=InnoDB;

-- 4. Tabel Audit Logs (Layer 5: Tamper-Proof Audit Trail)
CREATE TABLE IF NOT EXISTS audit_logs (
    id BIGINT AUTO_INCREMENT PRIMARY KEY,
    timestamp DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
    user_id INT NULL,
    actor_identity VARCHAR(150) NOT NULL COMMENT 'Username/Role saat aksi dilakukan',
    action_type VARCHAR(50) NOT NULL COMMENT 'LOGIN, KEY_GENERATED, ENCRYPTION, DECRYPTION_SUCCESS, TAMPER_DETECTED, UNAUTHORIZED_ACCESS',
    document_hash VARCHAR(64) NULL COMMENT 'SHA-256 hash dari nama dokumen atau payload',
    ip_address VARCHAR(45) NOT NULL,
    metadata_json JSON NULL,
    prev_log_hash VARCHAR(64) NOT NULL COMMENT 'Hash berantai dari log sebelumnya (Hash Chain)',
    server_signature VARCHAR(255) NOT NULL COMMENT 'Tanda tangan digital ECDSA P-256 Server (Base64)',
    CONSTRAINT fk_audit_user FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE SET NULL,
    INDEX idx_audit_action (action_type, timestamp)
) ENGINE=InnoDB;
