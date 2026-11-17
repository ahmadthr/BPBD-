export type RoleKey =
  | 'SUPER_ADMIN'
  | 'ADMIN_PENGURUS_BARANG'
  | 'KASUBAG_UMUM'
  | 'PETUGAS_POS'
  | 'PIMPINAN_VIEWER';

export type KibGolongan = 'KIB_A' | 'KIB_B' | 'KIB_C' | 'KIB_D' | 'KIB_E' | 'KIB_F';

export type KondisiBarang = 'BAIK' | 'RUSAK_RINGAN' | 'RUSAK_BERAT';

export type StatusMutasi =
  | 'MENUNGGU_PERSETUJUAN'
  | 'DISETUJUI_KASUBAG'
  | 'DITOLAK'
  | 'SELESAI_VERIFIKASI';

export type StatusTiket =
  | 'DILAPORKAN'
  | 'DALAM_PENANGANAN'
  | 'MENUNGGU_SUKU_CADANG'
  | 'SELESAI_DIPERBAIKI'
  | 'TIDAK_DAPAT_DIPERBAIKI';

export type PrioritasTiket = 'RENDAH' | 'SEDANG' | 'TINGGI' | 'DARURAT';

export type JenisUnit = 'MAKO_OPD' | 'POS_DAMKAR' | 'GUDANG_LOGISTIK' | 'RUANG_BIDANG';

export interface RolePermissions {
  kelolaMasterKib: boolean;
  cetakLabelQr: boolean;
  ajukanMutasi: boolean;
  setujuiMutasi: boolean;
  verifikasiMutasi: boolean;
  laporKerusakan: boolean;
  kelolaTeknisTiket: boolean;
  opnameQr: boolean;
  unduhLaporanResmi: boolean;
  kelolaPengguna: boolean;
  aturHakAkses: boolean;
  editNamaPengguna: boolean;
}

export interface RoleProfile {
  key: RoleKey;
  label: string;
  namaPetugas: string;
  nip: string;
  jabatan: string;
  unitTugas: string;
  izin: RolePermissions;
  defaultLandingTab: TabKey;
}

export type TabKey =
  | 'dashboard'
  | 'inventory'
  | 'scanner'
  | 'mutasi'
  | 'tiket'
  | 'users'
  | 'database';

export interface AuthUser {
  id: string;
  nip: string;
  username: string;
  namaLengkap: string;
  jabatan: string;
  unitTugas: string;
  role: RoleKey;
  aktif: boolean;
  lastLoginAt: string | null;
}

export interface AuthSession {
  token: string;
  expiresAt: number;
  user: AuthUser;
  permissionsMap?: Record<RoleKey, RolePermissions>;
}

export interface AuthAuditEntry {
  id: string;
  waktu: string;
  identifier: string;
  namaPengguna: string;
  role: RoleKey | 'UNKNOWN';
  status:
    | 'LOGIN_BERHASIL'
    | 'LOGIN_GAGAL'
    | 'LOGOUT'
    | 'TOKEN_DIPERBARUI'
    | 'AKSES_DITOLAK'
    | 'UBAH_PENGGUNA'
    | 'UBAH_HAK_AKSES';
  keterangan: string;
  ipAddress: string;
}

export interface LokasiUnit {
  id: string;
  kodeLokasi: string;
  namaLokasi: string;
  jenisUnit: JenisUnit;
  alamat: string;
  penanggungJawab: string;
  teleponPos: string;
}

export interface AsetBMD {
  id: string;
  kodeQr: string;
  golongan: KibGolongan;
  kodeBarang: string;
  nomorRegister: string;
  namaBarang: string;
  merkTipe: string;
  ukuranCc?: string;
  bahan?: string;
  tahunPerolehan: number;
  nomorPabrik?: string;
  nomorRangka?: string;
  nomorMesin?: string;
  nomorPolisi?: string;
  asalUsul: string;
  hargaPerolehan: number;
  kondisi: KondisiBarang;
  lokasiId: string;
  penanggungJawab: string;
  keterangan?: string;
  tanggalOpnameTerakhir: string;
}

export interface MutasiAset {
  id: string;
  nomorBeritaAcara: string;
  asetId: string;
  lokasiAsalId: string;
  lokasiTujuanId: string;
  pemohonNama: string;
  penanggungJawabBaru: string;
  alasanMutasi: string;
  status: StatusMutasi;
  disetujuiOleh?: string;
  tanggalPersetujuan?: string;
  diverifikasiOleh?: string;
  tanggalVerifikasi?: string;
  catatanApproval?: string;
  createdAt: string;
}

export interface TiketKerusakan {
  id: string;
  nomorTiket: string;
  asetId: string;
  lokasiKejadianId: string;
  pelaporNama: string;
  prioritas: PrioritasTiket;
  kondisiDilaporkan: KondisiBarang;
  judulKeluhan: string;
  deskripsiKerusakan: string;
  status: StatusTiket;
  teknisiPelaksana?: string;
  tindakanPerbaikan?: string;
  estimasiBiaya: number;
  tanggalLapor: string;
  tanggalSelesai?: string;
}

export interface OpnameFisik {
  id: string;
  asetId: string;
  lokasiTervalidasiId: string;
  petugasNama: string;
  metodeValidasi: 'QR_CAMERA' | 'INPUT_MANUAL';
  kondisiFisik: KondisiBarang;
  keberadaanFisik: boolean;
  catatanLapangan: string;
  waktuOpname: string;
}

export interface AuditLogEntry {
  id: string;
  waktuKejadian: string;
  penggunaNama: string;
  peranSaatAksi: RoleKey;
  namaTabel: string;
  aksi: 'INSERT' | 'UPDATE' | 'APPROVE' | 'REJECT' | 'SCAN_OPNAME' | 'PRINT_QR';
  ringkasan: string;
}
