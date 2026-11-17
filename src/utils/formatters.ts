import {
  KibGolongan,
  KondisiBarang,
  PrioritasTiket,
  StatusMutasi,
  StatusTiket,
} from '../types/bmd';

export function formatRupiah(value: number): string {
  return new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0,
  }).format(value);
}

export function formatRupiahRingkas(value: number): string {
  if (value >= 1_000_000_000) {
    return `Rp ${(value / 1_000_000_000).toFixed(2).replace('.', ',')} M`;
  }
  if (value >= 1_000_000) {
    return `Rp ${(value / 1_000_000).toFixed(1).replace('.', ',')} Jt`;
  }
  return formatRupiah(value);
}

export function formatTanggalIndonesia(isoOrDate: string): string {
  if (!isoOrDate) return '-';
  const date = new Date(isoOrDate);
  if (Number.isNaN(date.getTime())) return isoOrDate;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  }).format(date);
}

export function formatWaktuIndonesia(iso: string): string {
  if (!iso) return '-';
  const date = new Date(iso);
  if (Number.isNaN(date.getTime())) return iso;
  return new Intl.DateTimeFormat('id-ID', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  }).format(date);
}

export const LABEL_GOLONGAN_KIB: Record<KibGolongan, { kode: string; nama: string; deskripsi: string }> = {
  KIB_A: { kode: 'KIB A', nama: 'Tanah', deskripsi: 'Lahan Mako, pos Damkar, dan area logistik' },
  KIB_B: { kode: 'KIB B', nama: 'Peralatan & Mesin', deskripsi: 'Armada Damkar, pompa apung, LCR, chainsaw, IT' },
  KIB_C: { kode: 'KIB C', nama: 'Gedung & Bangunan', deskripsi: 'Kantor BPBD, pos jaga Damkar, gudang BNPB' },
  KIB_D: { kode: 'KIB D', nama: 'Jalan, Irigasi & Jaringan', deskripsi: 'Jaringan hidran kota, instalasi sirine EWS' },
  KIB_E: { kode: 'KIB E', nama: 'Aset Tetap Lainnya', deskripsi: 'Dokumen SOP kebencanaan, perangkat simulasi' },
  KIB_F: { kode: 'KIB F', nama: 'Konstruksi Dalam Pengerjaan', deskripsi: 'Pembangunan & rehabilitasi pos lapangan' },
};

export const LABEL_KONDISI: Record<KondisiBarang, { label: string; textClass: string; dotColor: string; barColor: string }> = {
  BAIK: {
    label: 'Baik',
    textClass: 'text-emerald-700',
    dotColor: 'bg-emerald-600',
    barColor: 'bg-emerald-600',
  },
  RUSAK_RINGAN: {
    label: 'Rusak Ringan',
    textClass: 'text-amber-700',
    dotColor: 'bg-amber-600',
    barColor: 'bg-amber-500',
  },
  RUSAK_BERAT: {
    label: 'Rusak Berat',
    textClass: 'text-red-700',
    dotColor: 'bg-red-600',
    barColor: 'bg-red-600',
  },
};

export const LABEL_STATUS_MUTASI: Record<StatusMutasi, { label: string; textClass: string }> = {
  MENUNGGU_PERSETUJUAN: { label: 'Menunggu Persetujuan Kasubag', textClass: 'text-amber-700' },
  DISETUJUI_KASUBAG: { label: 'Disetujui · Menunggu Verifikasi Barang', textClass: 'text-blue-900' },
  DITOLAK: { label: 'Ditolak', textClass: 'text-red-700' },
  SELESAI_VERIFIKASI: { label: 'Selesai · Lokasi Diperbarui', textClass: 'text-emerald-700' },
};

export const LABEL_STATUS_TIKET: Record<StatusTiket, { label: string; textClass: string }> = {
  DILAPORKAN: { label: 'Dilaporkan', textClass: 'text-red-700' },
  DALAM_PENANGANAN: { label: 'Dalam Penanganan Teknis', textClass: 'text-amber-700' },
  MENUNGGU_SUKU_CADANG: { label: 'Menunggu Suku Cadang', textClass: 'text-amber-700' },
  SELESAI_DIPERBAIKI: { label: 'Selesai Diperbaiki', textClass: 'text-emerald-700' },
  TIDAK_DAPAT_DIPERBAIKI: { label: 'Usul Penghapusan BMD', textClass: 'text-red-700' },
};

export const LABEL_PRIORITAS: Record<PrioritasTiket, { label: string; textClass: string }> = {
  RENDAH: { label: 'Rendah', textClass: 'text-slate-600' },
  SEDANG: { label: 'Sedang', textClass: 'text-blue-900' },
  TINGGI: { label: 'Tinggi', textClass: 'text-amber-700' },
  DARURAT: { label: 'Darurat Operasi', textClass: 'text-red-700' },
};
