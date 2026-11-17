-- ============================================================================
-- SIMAS-BMD (Sistem Inventarisasi & Manajemen Aset Barang Milik Daerah)
-- OPD: Badan Penanggulangan Bencana Daerah (BPBD) Kabupaten Sidoarjo
-- Target DBMS: PostgreSQL 15+ / Supabase
-- Standar Pengkodean: Permendagri No. 19 Tahun 2016 & Permendagri No. 47/2021
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS "pgcrypto";

-- 1. ENUM TYPES UNTUK VALIDITAS DOMAIN DATA
CREATE TYPE role_pengguna AS ENUM (
  'SUPER_ADMIN',
  'ADMIN_PENGURUS_BARANG',
  'KASUBAG_UMUM',
  'PETUGAS_POS',
  'PIMPINAN_VIEWER'
);

CREATE TYPE golongan_kib AS ENUM (
  'KIB_A', -- Tanah
  'KIB_B', -- Peralatan dan Mesin
  'KIB_C', -- Gedung dan Bangunan
  'KIB_D', -- Jalan, Irigasi, dan Jaringan
  'KIB_E', -- Aset Tetap Lainnya
  'KIB_F'  -- Konstruksi Dalam Pengerjaan
);

CREATE TYPE kondisi_aset AS ENUM (
  'BAIK',
  'RUSAK_RINGAN',
  'RUSAK_BERAT'
);

CREATE TYPE status_mutasi AS ENUM (
  'MENUNGGU_PERSETUJUAN',
  'DISETUJUI_KASUBAG',
  'DITOLAK',
  'SELESAI_VERIFIKASI'
);

CREATE TYPE status_tiket AS ENUM (
  'DILAPORKAN',
  'DALAM_PENANGANAN',
  'MENUNGGU_SUKU_CADANG',
  'SELESAI_DIPERBAIKI',
  'TIDAK_DAPAT_DIPERBAIKI'
);

CREATE TYPE prioritas_tiket AS ENUM (
  'RENDAH',
  'SEDANG',
  'TINGGI',
  'DARURAT'
);

-- 2. TABEL MASTER LOKASI / POS DAMKAR / RUANGAN BPBD
CREATE TABLE master_lokasi (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_lokasi VARCHAR(32) NOT NULL UNIQUE,
  nama_lokasi VARCHAR(150) NOT NULL,
  jenis_unit VARCHAR(50) NOT NULL CHECK (jenis_unit IN ('MAKO_OPD', 'POS_DAMKAR', 'GUDANG_LOGISTIK', 'RUANG_BIDANG')),
  alamat TEXT NOT NULL,
  penanggung_jawab VARCHAR(120) NOT NULL,
  telepon_pos VARCHAR(30),
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3. TABEL PENGGUNA & HAK AKSES (RBAC & AUTENTIKASI)
CREATE TABLE pengguna_rbac (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nip VARCHAR(24) NOT NULL UNIQUE,
  username VARCHAR(60) NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  nama_lengkap VARCHAR(120) NOT NULL,
  jabatan VARCHAR(120) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  role role_pengguna NOT NULL DEFAULT 'PETUGAS_POS',
  lokasi_unit_id UUID REFERENCES master_lokasi(id) ON DELETE SET NULL,
  aktif BOOLEAN NOT NULL DEFAULT TRUE,
  last_login_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 3B. TABEL LOG AUTENTIKASI & KEAMANAN SESI JWT
CREATE TABLE auth_audit_log (
  id BIGSERIAL PRIMARY KEY,
  waktu TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  identifier_input VARCHAR(100) NOT NULL,
  pengguna_id UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  role_pengguna role_pengguna,
  status_autentikasi VARCHAR(32) NOT NULL CHECK (
    status_autentikasi IN ('LOGIN_BERHASIL', 'LOGIN_GAGAL', 'LOGOUT', 'TOKEN_DIPERBARUI', 'AKSES_DITOLAK')
  ),
  ip_address INET,
  keterangan TEXT NOT NULL
);

-- 4. TABEL UTAMA KIB B (PERALATAN DAN MESIN)
-- Mencakup kendaraan operasional kebencanaan, mobil pompa damkar, pompa apung,
-- perahu karet LCR, chainsaw, genset, alat komunikasi, dan perangkat IT OPD.
CREATE TABLE kib_b_peralatan_mesin (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  kode_qr VARCHAR(64) NOT NULL UNIQUE,
  golongan golongan_kib NOT NULL DEFAULT 'KIB_B',
  kode_barang VARCHAR(32) NOT NULL,          -- Contoh: 1.3.2.02.01.003
  nomor_register VARCHAR(12) NOT NULL,       -- Contoh: 0001 s.d. 9999
  nama_barang VARCHAR(200) NOT NULL,
  merk_tipe VARCHAR(150) NOT NULL,
  ukuran_cc VARCHAR(60),
  bahan VARCHAR(80),
  tahun_perolehan SMALLINT NOT NULL CHECK (tahun_perolehan BETWEEN 1970 AND 2100),
  nomor_pabrik VARCHAR(100),
  nomor_rangka VARCHAR(100),
  nomor_mesin VARCHAR(100),
  nomor_polisi VARCHAR(20),
  nomor_bpkb VARCHAR(60),
  asal_usul VARCHAR(80) NOT NULL DEFAULT 'APBD Kabupaten Sidoarjo',
  harga_perolehan NUMERIC(16, 2) NOT NULL CHECK (harga_perolehan >= 0),
  kondisi kondisi_aset NOT NULL DEFAULT 'BAIK',
  lokasi_id UUID NOT NULL REFERENCES master_lokasi(id) ON UPDATE CASCADE ON DELETE RESTRICT,
  penanggung_jawab_id UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  keterangan TEXT,
  tanggal_opname_terakhir DATE,
  created_by UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT uq_kib_b_kode_register UNIQUE (kode_barang, nomor_register, tahun_perolehan)
);

CREATE INDEX idx_kib_b_kode_qr ON kib_b_peralatan_mesin (kode_qr);
CREATE INDEX idx_kib_b_lokasi ON kib_b_peralatan_mesin (lokasi_id);
CREATE INDEX idx_kib_b_kondisi ON kib_b_peralatan_mesin (kondisi);

-- 5. TABEL MUTASI & PERPINDAHAN LOKASI ASET
-- Mencatat perpindahan antar bidang/ruangan/pos Damkar dengan alur approval Kasubag & Verifikasi Pengurus Barang.
CREATE TABLE mutasi_aset (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_berita_acara VARCHAR(60) NOT NULL UNIQUE,
  aset_id UUID NOT NULL REFERENCES kib_b_peralatan_mesin(id) ON DELETE CASCADE,
  lokasi_asal_id UUID NOT NULL REFERENCES master_lokasi(id) ON DELETE RESTRICT,
  lokasi_tujuan_id UUID NOT NULL REFERENCES master_lokasi(id) ON DELETE RESTRICT,
  pemohon_id UUID NOT NULL REFERENCES pengguna_rbac(id) ON DELETE RESTRICT,
  penanggung_jawab_baru VARCHAR(120) NOT NULL,
  alasan_mutasi TEXT NOT NULL,
  status status_mutasi NOT NULL DEFAULT 'MENUNGGU_PERSETUJUAN',
  disetujui_oleh UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  tanggal_persetujuan TIMESTAMPTZ,
  diverifikasi_oleh UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  tanggal_verifikasi TIMESTAMPTZ,
  catatan_approval TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  CONSTRAINT chk_lokasi_mutasi_berbeda CHECK (lokasi_asal_id <> lokasi_tujuan_id)
);

CREATE INDEX idx_mutasi_aset_status ON mutasi_aset (status);
CREATE INDEX idx_mutasi_aset_id ON mutasi_aset (aset_id);

-- 6. TABEL PELAPORAN & TIKET KERUSAKAN ASET
-- Terintegrasi dengan QR Code Scanner petugas lapangan/pos Damkar dan histori pemeliharaan berkala.
CREATE TABLE tiket_kerusakan (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  nomor_tiket VARCHAR(40) NOT NULL UNIQUE,
  aset_id UUID NOT NULL REFERENCES kib_b_peralatan_mesin(id) ON DELETE CASCADE,
  lokasi_kejadian_id UUID NOT NULL REFERENCES master_lokasi(id) ON DELETE RESTRICT,
  pelapor_id UUID NOT NULL REFERENCES pengguna_rbac(id) ON DELETE RESTRICT,
  prioritas prioritas_tiket NOT NULL DEFAULT 'SEDANG',
  kondisi_dilaporkan kondisi_aset NOT NULL,
  judul_keluhan VARCHAR(180) NOT NULL,
  deskripsi_kerusakan TEXT NOT NULL,
  status status_tiket NOT NULL DEFAULT 'DILAPORKAN',
  teknisi_pelaksana VARCHAR(120),
  tindakan_perbaikan TEXT,
  estimasi_biaya NUMERIC(14, 2) DEFAULT 0 CHECK (estimasi_biaya >= 0),
  biaya_realisasi NUMERIC(14, 2) DEFAULT 0 CHECK (biaya_realisasi >= 0),
  tanggal_lapor TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  tanggal_selesai TIMESTAMPTZ,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

CREATE INDEX idx_tiket_status_prioritas ON tiket_kerusakan (status, prioritas);
CREATE INDEX idx_tiket_aset_id ON tiket_kerusakan (aset_id);

-- 7. TABEL OPNAME FISIK MANDIRI BERKALA
CREATE TABLE opname_fisik (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  aset_id UUID NOT NULL REFERENCES kib_b_peralatan_mesin(id) ON DELETE CASCADE,
  lokasi_tervalidasi_id UUID NOT NULL REFERENCES master_lokasi(id) ON DELETE RESTRICT,
  petugas_id UUID NOT NULL REFERENCES pengguna_rbac(id) ON DELETE RESTRICT,
  metode_validasi VARCHAR(20) NOT NULL CHECK (metode_validasi IN ('QR_CAMERA', 'INPUT_MANUAL')),
  kondisi_fisik kondisi_aset NOT NULL,
  keberadaan_fisik BOOLEAN NOT NULL DEFAULT TRUE,
  catatan_lapangan TEXT,
  waktu_opname TIMESTAMPTZ NOT NULL DEFAULT NOW()
);

-- 8. TABEL AUDIT LOG (APPEND-ONLY UNTUK KEPATUHAN INSPEKTORAT / BPK)
CREATE TABLE audit_log (
  id BIGSERIAL PRIMARY KEY,
  waktu_kejadian TIMESTAMPTZ NOT NULL DEFAULT NOW(),
  pengguna_id UUID REFERENCES pengguna_rbac(id) ON DELETE SET NULL,
  peran_saat_aksi role_pengguna,
  nama_tabel VARCHAR(64) NOT NULL,
  record_id UUID,
  aksi VARCHAR(24) NOT NULL CHECK (aksi IN ('INSERT', 'UPDATE', 'APPROVE', 'REJECT', 'SCAN_OPNAME', 'PRINT_QR')),
  ringkasan TEXT NOT NULL,
  data_sebelum JSONB,
  data_sesudah JSONB
);

CREATE INDEX idx_audit_log_waktu ON audit_log (waktu_kejadian DESC);
CREATE INDEX idx_audit_log_tabel ON audit_log (nama_tabel, record_id);

-- 9. TRIGGER OTOMATIS PEMBARUAN TIMESTAMP & PENCATATAN AUDIT LOG KIB B
CREATE OR REPLACE FUNCTION fn_touch_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at := NOW();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_kib_b_updated_at
  BEFORE UPDATE ON kib_b_peralatan_mesin
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_mutasi_updated_at
  BEFORE UPDATE ON mutasi_aset
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();

CREATE TRIGGER trg_tiket_updated_at
  BEFORE UPDATE ON tiket_kerusakan
  FOR EACH ROW EXECUTE FUNCTION fn_touch_updated_at();
