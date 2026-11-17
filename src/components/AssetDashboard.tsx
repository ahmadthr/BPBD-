import { ArrowRight, Download, QrCode, Wrench } from 'lucide-react';
import {
  AsetBMD,
  KibGolongan,
  LokasiUnit,
  MutasiAset,
  RoleProfile,
  TiketKerusakan,
} from '../types/bmd';
import {
  formatRupiah,
  formatRupiahRingkas,
  formatTanggalIndonesia,
  LABEL_GOLONGAN_KIB,
  LABEL_KONDISI,
  LABEL_PRIORITAS,
  LABEL_STATUS_MUTASI,
} from '../utils/formatters';

interface AssetDashboardProps {
  role: RoleProfile;
  asets: AsetBMD[];
  lokasiList: LokasiUnit[];
  mutasiList: MutasiAset[];
  tiketList: TiketKerusakan[];
  onNavigateTab: (tab: 'inventory' | 'scanner' | 'mutasi' | 'tiket') => void;
  onFilterByLokasi: (lokasiId: string) => void;
  onFilterByGolongan: (golongan: KibGolongan) => void;
  onExportCsv: () => void;
}

const ALL_GOLONGAN: KibGolongan[] = ['KIB_A', 'KIB_B', 'KIB_C', 'KIB_D', 'KIB_E', 'KIB_F'];

export function AssetDashboard({
  role,
  asets,
  lokasiList,
  mutasiList,
  tiketList,
  onNavigateTab,
  onFilterByLokasi,
  onFilterByGolongan,
  onExportCsv,
}: AssetDashboardProps) {
  const totalNilaiAset = asets.reduce((sum, item) => sum + item.hargaPerolehan, 0);
  const totalUnit = asets.length;
  const countBaik = asets.filter((a) => a.kondisi === 'BAIK').length;
  const countRusakRingan = asets.filter((a) => a.kondisi === 'RUSAK_RINGAN').length;
  const countRusakBerat = asets.filter((a) => a.kondisi === 'RUSAK_BERAT').length;
  const persenBaik = totalUnit > 0 ? Math.round((countBaik / totalUnit) * 100) : 0;

  const mutasiMenunggu = mutasiList.filter(
    (m) => m.status === 'MENUNGGU_PERSETUJUAN' || m.status === 'DISETUJUI_KASUBAG'
  );
  const tiketAktif = tiketList.filter(
    (t) => t.status !== 'SELESAI_DIPERBAIKI' && t.status !== 'TIDAK_DAPAT_DIPERBAIKI'
  );
  const tiketDarurat = tiketAktif.filter((t) => t.prioritas === 'DARURAT' || t.prioritas === 'TINGGI');

  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));
  const asetMap = new Map(asets.map((a) => [a.id, a]));

  const rekapPerGolongan = ALL_GOLONGAN.map((gol) => {
    const items = asets.filter((a) => a.golongan === gol);
    const nilai = items.reduce((acc, a) => acc + a.hargaPerolehan, 0);
    const baik = items.filter((a) => a.kondisi === 'BAIK').length;
    const ringan = items.filter((a) => a.kondisi === 'RUSAK_RINGAN').length;
    const berat = items.filter((a) => a.kondisi === 'RUSAK_BERAT').length;
    return {
      golongan: gol,
      meta: LABEL_GOLONGAN_KIB[gol],
      jumlah: items.length,
      nilai,
      baik,
      ringan,
      berat,
    };
  });

  const rekapPerLokasi = lokasiList.map((lok) => {
    const items = asets.filter((a) => a.lokasiId === lok.id);
    const nilai = items.reduce((acc, a) => acc + a.hargaPerolehan, 0);
    const kendala = items.filter((a) => a.kondisi !== 'BAIK').length;
    return {
      lokasi: lok,
      jumlah: items.length,
      nilai,
      kendala,
    };
  });

  return (
    <div className="space-y-6">
      {/* Header Konteks Eksekutif */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            BPBD KABUPATEN SIDOARJO · {role.unitTugas}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Rekapitulasi Aset Barang Milik Daerah
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Ikhtisar nilai perolehan KIB A s.d. F, kesiapsiagaan armada pos Damkar, dan antrean mutasi serta perbaikan.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          {role.izin.opnameQr && (
            <button
              type="button"
              onClick={() => onNavigateTab('scanner')}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <QrCode className="w-4 h-4" />
              Pindai QR Opname
            </button>
          )}
          {role.izin.unduhLaporanResmi && (
            <button
              type="button"
              onClick={onExportCsv}
              className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Download className="w-4 h-4" />
              Unduh Rekap KIB (CSV)
            </button>
          )}
        </div>
      </div>

      {/* 4-Column KPI Strip */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Total Nilai Perolehan BMD</p>
          <p className="mt-2 text-2xl font-bold text-[#0F2A4A] font-mono tabular-nums">
            {formatRupiahRingkas(totalNilaiAset)}
          </p>
          <p className="mt-1.5 text-xs text-slate-500 font-mono tabular-nums">
            {formatRupiah(totalNilaiAset)}
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Total Unit Aset Terregister</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {totalUnit} <span className="text-sm font-normal text-slate-500">unit KIB A–F</span>
          </p>
          <p className="mt-1.5 text-xs text-slate-600">
            Tersebar di {lokasiList.length} lokasi Mako & Pos Damkar
          </p>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Kesiapsiagaan Kondisi Fisik</p>
          <p className="mt-2 text-2xl font-bold text-emerald-700 font-mono tabular-nums">
            {persenBaik}% <span className="text-sm font-medium text-slate-700">Kondisi Baik</span>
          </p>
          <div className="mt-2 flex items-center gap-3 text-xs tabular-nums">
            <span className="text-emerald-700 font-medium">{countBaik} Baik</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-amber-700 font-medium">{countRusakRingan} R. Ringan</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span className="text-red-700 font-medium">{countRusakBerat} R. Berat</span>
          </div>
        </div>

        <div className="bg-white border border-slate-200 rounded-lg p-5">
          <p className="text-xs font-medium text-slate-500">Tindak Lanjut Operasional</p>
          <p className="mt-2 text-2xl font-bold text-slate-900 font-mono tabular-nums">
            {tiketAktif.length} <span className="text-sm font-normal text-slate-500">tiket</span>{' '}
            <span aria-hidden="true" className="text-slate-300">/</span>{' '}
            {mutasiMenunggu.length} <span className="text-sm font-normal text-slate-500">mutasi</span>
          </p>
          <p className="mt-1.5 text-xs text-red-700 font-medium tabular-nums">
            {tiketDarurat.length} tiket prioritas tinggi/darurat aktif
          </p>
        </div>
      </div>

      {/* Bar Proporsi Kondisi Keseluruhan */}
      <div className="bg-white border border-slate-200 rounded-lg p-5">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between mb-3">
          <h2 className="text-sm font-semibold text-slate-900">
            Proporsi Kondisi Fisik Inventaris Terkini
          </h2>
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-600 tabular-nums">
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-emerald-600 inline-block" aria-hidden="true" />
              Baik ({countBaik})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-amber-500 inline-block" aria-hidden="true" />
              Rusak Ringan ({countRusakRingan})
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 bg-red-600 inline-block" aria-hidden="true" />
              Rusak Berat ({countRusakBerat})
            </span>
          </div>
        </div>
        <div className="h-3 w-full bg-slate-100 overflow-hidden flex rounded-sm">
          {totalUnit > 0 && (
            <>
              <div
                style={{ width: `${(countBaik / totalUnit) * 100}%` }}
                className="bg-emerald-600 h-full transition-all"
                title={`Baik: ${countBaik}`}
              />
              <div
                style={{ width: `${(countRusakRingan / totalUnit) * 100}%` }}
                className="bg-amber-500 h-full transition-all"
                title={`Rusak Ringan: ${countRusakRingan}`}
              />
              <div
                style={{ width: `${(countRusakBerat / totalUnit) * 100}%` }}
                className="bg-red-600 h-full transition-all"
                title={`Rusak Berat: ${countRusakBerat}`}
              />
            </>
          )}
        </div>
      </div>

      {/* Grid Utama: Tabel Rekap KIB A-F + Sebaran Pos Damkar */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Tabel Rekap KIB A - F */}
        <div className="lg:col-span-7 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Rekapitulasi Kartu Inventaris Barang (KIB A–F)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                Klik baris golongan KIB untuk membuka daftar rincian barang
              </p>
            </div>
            <button
              type="button"
              onClick={() => onNavigateTab('inventory')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2A4A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Semua Aset
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                  <th className="py-2.5 px-5">Golongan KIB</th>
                  <th className="py-2.5 px-3 text-right">Unit</th>
                  <th className="py-2.5 px-3 text-right">Kondisi (B / RR / RB)</th>
                  <th className="py-2.5 px-5 text-right">Nilai Perolehan</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100 text-sm">
                {rekapPerGolongan.map((row) => (
                  <tr
                    key={row.golongan}
                    onClick={() => onFilterByGolongan(row.golongan)}
                    className="hover:bg-slate-50 transition-colors cursor-pointer"
                  >
                    <td className="py-3 px-5">
                      <p className="font-semibold text-slate-900">
                        {row.meta.kode} — {row.meta.nama}
                      </p>
                      <p className="text-xs text-slate-500">{row.meta.deskripsi}</p>
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-900 font-medium">
                      {row.jumlah}
                    </td>
                    <td className="py-3 px-3 text-right font-mono tabular-nums text-xs">
                      <span className="text-emerald-700 font-medium">{row.baik}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-amber-700 font-medium">{row.ringan}</span>
                      <span className="text-slate-300 mx-1">/</span>
                      <span className="text-red-700 font-medium">{row.berat}</span>
                    </td>
                    <td className="py-3 px-5 text-right font-mono tabular-nums font-semibold text-[#0F2A4A]">
                      {formatRupiah(row.nilai)}
                    </td>
                  </tr>
                ))}
              </tbody>
              <tfoot>
                <tr className="border-t border-slate-200 bg-slate-50 text-xs font-semibold text-slate-900">
                  <td className="py-3 px-5">Total Rekapitulasi OPD</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">{totalUnit}</td>
                  <td className="py-3 px-3 text-right font-mono tabular-nums">
                    {countBaik} / {countRusakRingan} / {countRusakBerat}
                  </td>
                  <td className="py-3 px-5 text-right font-mono tabular-nums text-[#0F2A4A]">
                    {formatRupiah(totalNilaiAset)}
                  </td>
                </tr>
              </tfoot>
            </table>
          </div>
        </div>

        {/* Sebaran per Lokasi & Pos Damkar */}
        <div className="lg:col-span-5 bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Sebaran Unit & Pos Damkar Sidoarjo
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              Pantau penempatan inventaris dan kendala kondisi di tiap pos lapangan
            </p>
          </div>
          <div className="divide-y divide-slate-100">
            {rekapPerLokasi.map((item) => (
              <button
                key={item.lokasi.id}
                type="button"
                onClick={() => onFilterByLokasi(item.lokasi.id)}
                className="w-full text-left px-5 py-3.5 hover:bg-slate-50 transition-colors flex items-center justify-between gap-4 cursor-pointer"
              >
                <div className="min-w-0">
                  <p className="text-sm font-semibold text-slate-900 truncate">
                    {item.lokasi.namaLokasi}
                  </p>
                  <p className="text-xs text-slate-500 truncate mt-0.5">
                    {item.lokasi.kodeLokasi} · PJ: {item.lokasi.penanggungJawab}
                  </p>
                </div>
                <div className="text-right shrink-0">
                  <p className="text-sm font-semibold font-mono tabular-nums text-[#0F2A4A]">
                    {item.jumlah} aset
                  </p>
                  <p className="text-xs font-mono tabular-nums text-slate-500">
                    {item.kendala > 0 ? (
                      <span className="text-amber-700 font-medium">{item.kendala} kendala</span>
                    ) : (
                      <span className="text-emerald-700">100% laik</span>
                    )}
                  </p>
                </div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Antrean Tindak Lanjut: Mutasi & Tiket Kerusakan */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        {/* Antrean Mutasi */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Permohonan Mutasi & Perpindahan Aset
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('mutasi')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2A4A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Kelola Mutasi
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {mutasiList.slice(0, 3).map((mut) => {
              const aset = asetMap.get(mut.asetId);
              const asal = lokasiMap.get(mut.lokasiAsalId);
              const tujuan = lokasiMap.get(mut.lokasiTujuanId);
              const st = LABEL_STATUS_MUTASI[mut.status];
              return (
                <div key={mut.id} className="px-5 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                      {mut.nomorBeritaAcara}
                    </span>
                    <span className={`text-xs font-semibold ${st.textClass}`}>
                      {st.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {aset?.namaBarang ?? 'Aset Tidak Ditemukan'}
                  </p>
                  <p className="text-xs text-slate-600">
                    {asal?.namaLokasi ?? '-'} → {tujuan?.namaLokasi ?? '-'} · Pemohon: {mut.pemohonNama}
                  </p>
                </div>
              );
            })}
          </div>
        </div>

        {/* Tiket Kerusakan */}
        <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
          <div className="flex items-center justify-between px-5 py-4 border-b border-slate-200">
            <h2 className="text-base font-semibold text-slate-900">
              Tiket Kerusakan & Pemeliharaan Terkini
            </h2>
            <button
              type="button"
              onClick={() => onNavigateTab('tiket')}
              className="inline-flex items-center gap-1 text-xs font-semibold text-[#0F2A4A] hover:underline whitespace-nowrap shrink-0 cursor-pointer"
            >
              Buka Tiket
              <ArrowRight className="w-3.5 h-3.5" />
            </button>
          </div>
          <div className="divide-y divide-slate-100">
            {tiketList.slice(0, 3).map((tkt) => {
              const aset = asetMap.get(tkt.asetId);
              const prio = LABEL_PRIORITAS[tkt.prioritas];
              const kond = LABEL_KONDISI[tkt.kondisiDilaporkan];
              return (
                <div key={tkt.id} className="px-5 py-3.5 space-y-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-mono text-xs font-medium text-slate-500 tabular-nums">
                      {tkt.nomorTiket} · {formatTanggalIndonesia(tkt.tanggalLapor)}
                    </span>
                    <span className={`inline-flex items-center gap-1 text-xs font-semibold ${prio.textClass}`}>
                      <Wrench className="w-3 h-3" />
                      Prioritas {prio.label}
                    </span>
                  </div>
                  <p className="text-sm font-semibold text-slate-900">
                    {tkt.judulKeluhan}
                  </p>
                  <p className="text-xs text-slate-600">
                    {aset?.namaBarang ?? '-'} ·{' '}
                    <span className={`font-medium ${kond.textClass}`}>{kond.label}</span> · Est.{' '}
                    <span className="font-mono tabular-nums">{formatRupiah(tkt.estimasiBiaya)}</span>
                  </p>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
