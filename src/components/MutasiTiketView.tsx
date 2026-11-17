import { FormEvent, useState } from 'react';
import { Check, Plus, ShieldCheck, Wrench, X } from 'lucide-react';
import {
  AsetBMD,
  KondisiBarang,
  LokasiUnit,
  MutasiAset,
  PrioritasTiket,
  RoleProfile,
  StatusTiket,
  TiketKerusakan,
} from '../types/bmd';
import {
  formatRupiah,
  formatWaktuIndonesia,
  LABEL_KONDISI,
  LABEL_PRIORITAS,
  LABEL_STATUS_MUTASI,
  LABEL_STATUS_TIKET,
} from '../utils/formatters';

interface MutasiViewProps {
  role: RoleProfile;
  asets: AsetBMD[];
  lokasiList: LokasiUnit[];
  mutasiList: MutasiAset[];
  onCreateMutasi: (payload: {
    asetId: string;
    lokasiTujuanId: string;
    penanggungJawabBaru: string;
    alasanMutasi: string;
  }) => void;
  onApproveMutasi: (mutasiId: string, catatan: string) => void;
  onRejectMutasi: (mutasiId: string, catatan: string) => void;
  onVerifyMutasi: (mutasiId: string) => void;
}

export function MutasiView({
  role,
  asets,
  lokasiList,
  mutasiList,
  onCreateMutasi,
  onApproveMutasi,
  onRejectMutasi,
  onVerifyMutasi,
}: MutasiViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [asetId, setAsetId] = useState(asets[0]?.id ?? '');
  const [lokasiTujuanId, setLokasiTujuanId] = useState(lokasiList[1]?.id ?? '');
  const [pjBaru, setPjBaru] = useState(lokasiList[1]?.penanggungJawab ?? '');
  const [alasan, setAlasan] = useState('');

  const asetMap = new Map(asets.map((a) => [a.id, a]));
  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));

  const selectedAsetObj = asetMap.get(asetId);

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAsetObj || lokasiTujuanId === selectedAsetObj.lokasiId || !alasan.trim()) return;
    onCreateMutasi({
      asetId,
      lokasiTujuanId,
      penanggungJawabBaru: pjBaru.trim() || 'Kepala Pos Tujuan',
      alasanMutasi: alasan.trim(),
    });
    setAlasan('');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            PERPINDAHAN ANTAR POS DAMKAR & BIDANG
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Mutasi & Berita Acara Lokasi Aset
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Alur berjenjang: Pengajuan Pos/Admin → Persetujuan Kasubag Umum → Verifikasi Pengurus Barang & Pembaruan KIB.
          </p>
        </div>

        {role.izin.ajukanMutasi && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Tutup Form Mutasi' : 'Ajukan Mutasi Aset'}
          </button>
        )}
      </div>

      {showForm && role.izin.ajukanMutasi && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
        >
          <h2 className="text-sm font-semibold text-slate-900">
            Formulir Permohonan Mutasi Barang Milik Daerah
          </h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Pilih Aset</label>
              <select
                value={asetId}
                onChange={(e) => {
                  const id = e.target.value;
                  setAsetId(id);
                  const found = asetMap.get(id);
                  const alt = lokasiList.find((l) => l.id !== found?.lokasiId);
                  if (alt) {
                    setLokasiTujuanId(alt.id);
                    setPjBaru(alt.penanggungJawab);
                  }
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {asets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.namaBarang} ({lokasiMap.get(a.lokasiId)?.namaLokasi})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Lokasi Tujuan</label>
              <select
                value={lokasiTujuanId}
                onChange={(e) => {
                  setLokasiTujuanId(e.target.value);
                  const loc = lokasiMap.get(e.target.value);
                  if (loc) setPjBaru(loc.penanggungJawab);
                }}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {lokasiList
                  .filter((l) => l.id !== selectedAsetObj?.lokasiId)
                  .map((l) => (
                    <option key={l.id} value={l.id}>
                      {l.namaLokasi}
                    </option>
                  ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Penanggung Jawab Baru</label>
              <input
                type="text"
                required
                value={pjBaru}
                onChange={(e) => setPjBaru(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>
          <div>
            <label className="block font-semibold text-slate-700 mb-1">Alasan Mutasi / Dasar Surat Tugas</label>
            <textarea
              rows={2}
              required
              value={alasan}
              onChange={(e) => setAlasan(e.target.value)}
              placeholder="Contoh: Penambahan armada pompa portabel untuk Pos Damkar Waru."
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md cursor-pointer"
            >
              Kirim Permohonan Mutasi
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {mutasiList.map((mut) => {
          const aset = asetMap.get(mut.asetId);
          const asal = lokasiMap.get(mut.lokasiAsalId);
          const tujuan = lokasiMap.get(mut.lokasiTujuanId);
          const st = LABEL_STATUS_MUTASI[mut.status];

          return (
            <div key={mut.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {mut.nomorBeritaAcara}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    {formatWaktuIndonesia(mut.createdAt)}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">
                  {aset?.namaBarang ?? 'Aset'}
                </h3>
                <p className="text-xs text-slate-600">
                  <span className="font-medium text-slate-800">{asal?.namaLokasi ?? '-'}</span>
                  {' → '}
                  <span className="font-medium text-[#0F2A4A]">{tujuan?.namaLokasi ?? '-'}</span>
                  {' · '}PJ Baru: {mut.penanggungJawabBaru} · Pemohon: {mut.pemohonNama}
                </p>
                <p className="text-xs text-slate-600">Alasan: {mut.alasanMutasi}</p>
                {mut.catatanApproval && (
                  <p className="text-xs text-slate-500">
                    Catatan persetujuan: {mut.catatanApproval}
                  </p>
                )}
              </div>

              <div className="flex flex-wrap items-center gap-2 shrink-0">
                {mut.status === 'MENUNGGU_PERSETUJUAN' && role.izin.setujuiMutasi && (
                  <>
                    <button
                      type="button"
                      onClick={() =>
                        onApproveMutasi(
                          mut.id,
                          `Disetujui oleh ${role.namaPetugas} untuk penempatan di ${tujuan?.namaLokasi}.`
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Setujui Mutasi
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        onRejectMutasi(mut.id, `Ditolak oleh ${role.namaPetugas} — evaluasi kebutuhan pos.`)
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <X className="w-3.5 h-3.5" />
                      Tolak
                    </button>
                  </>
                )}

                {mut.status === 'DISETUJUI_KASUBAG' && role.izin.verifikasiMutasi && (
                  <button
                    type="button"
                    onClick={() => onVerifyMutasi(mut.id)}
                    className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                  >
                    <ShieldCheck className="w-3.5 h-3.5" />
                    Verifikasi & Perbarui Lokasi KIB
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

interface TiketKerusakanViewProps {
  role: RoleProfile;
  asets: AsetBMD[];
  lokasiList: LokasiUnit[];
  tiketList: TiketKerusakan[];
  onCreateTiket: (payload: {
    asetId: string;
    prioritas: PrioritasTiket;
    kondisiDilaporkan: KondisiBarang;
    judulKeluhan: string;
    deskripsiKerusakan: string;
    estimasiBiaya: number;
  }) => void;
  onUpdateTiketStatus: (
    tiketId: string,
    status: StatusTiket,
    teknisi?: string,
    tindakan?: string
  ) => void;
}

export function TiketKerusakanView({
  role,
  asets,
  lokasiList,
  tiketList,
  onCreateTiket,
  onUpdateTiketStatus,
}: TiketKerusakanViewProps) {
  const [showForm, setShowForm] = useState(false);
  const [asetId, setAsetId] = useState(asets[0]?.id ?? '');
  const [prioritas, setPrioritas] = useState<PrioritasTiket>('TINGGI');
  const [kondisi, setKondisi] = useState<KondisiBarang>('RUSAK_RINGAN');
  const [judul, setJudul] = useState('');
  const [deskripsi, setDeskripsi] = useState('');
  const [biaya, setBiaya] = useState('750000');

  const asetMap = new Map(asets.map((a) => [a.id, a]));
  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!judul.trim()) return;
    onCreateTiket({
      asetId,
      prioritas,
      kondisiDilaporkan: kondisi,
      judulKeluhan: judul.trim(),
      deskripsiKerusakan: deskripsi.trim() || judul.trim(),
      estimasiBiaya: Number(biaya) || 0,
    });
    setJudul('');
    setDeskripsi('');
    setShowForm(false);
  };

  return (
    <div className="space-y-5">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            PEMELIHARAAN BERKALA & PENANGANAN TEKNIS
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Pelaporan & Tiket Kerusakan Aset
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Laporan kerusakan dari pos lapangan tersinkron otomatis dengan kondisi KIB dan histori biaya pemeliharaan.
          </p>
        </div>

        {role.izin.laporKerusakan && (
          <button
            type="button"
            onClick={() => setShowForm((v) => !v)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showForm ? 'Tutup Form Tiket' : 'Laporkan Kerusakan'}
          </button>
        )}
      </div>

      {showForm && role.izin.laporKerusakan && (
        <form
          onSubmit={handleSubmit}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
        >
          <h2 className="text-sm font-semibold text-slate-900">Buat Tiket Perbaikan Aset</h2>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Barang / Armada Terkait</label>
              <select
                value={asetId}
                onChange={(e) => setAsetId(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {asets.map((a) => (
                  <option key={a.id} value={a.id}>
                    {a.namaBarang} ({a.kodeQr})
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Prioritas</label>
              <select
                value={prioritas}
                onChange={(e) => setPrioritas(e.target.value as PrioritasTiket)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="RENDAH">Rendah</option>
                <option value="SEDANG">Sedang</option>
                <option value="TINGGI">Tinggi</option>
                <option value="DARURAT">Darurat Operasi</option>
              </select>
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kondisi Saat Ini</label>
              <select
                value={kondisi}
                onChange={(e) => setKondisi(e.target.value as KondisiBarang)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                <option value="RUSAK_RINGAN">Rusak Ringan</option>
                <option value="RUSAK_BERAT">Rusak Berat</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Judul Keluhan</label>
              <input
                type="text"
                required
                value={judul}
                onChange={(e) => setJudul(e.target.value)}
                placeholder="Contoh: Lampu rotator & sirine mobil rescue mati"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Estimasi Biaya (Rp)</label>
              <input
                type="number"
                min={0}
                value={biaya}
                onChange={(e) => setBiaya(e.target.value)}
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Deskripsi Kerusakan</label>
            <textarea
              rows={2}
              value={deskripsi}
              onChange={(e) => setDeskripsi(e.target.value)}
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={() => setShowForm(false)}
              className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              className="px-4 py-2 font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md cursor-pointer"
            >
              Kirim Tiket Kerusakan
            </button>
          </div>
        </form>
      )}

      <div className="bg-white border border-slate-200 rounded-lg divide-y divide-slate-100">
        {tiketList.map((tkt) => {
          const aset = asetMap.get(tkt.asetId);
          const lok = lokasiMap.get(tkt.lokasiKejadianId);
          const st = LABEL_STATUS_TIKET[tkt.status];
          const prio = LABEL_PRIORITAS[tkt.prioritas];
          const kond = LABEL_KONDISI[tkt.kondisiDilaporkan];

          return (
            <div key={tkt.id} className="p-5 flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
              <div className="space-y-1.5 min-w-0">
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  <span className="font-mono font-semibold text-slate-700 tabular-nums">
                    {tkt.nomorTiket}
                  </span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={`font-semibold ${prio.textClass}`}>Prioritas {prio.label}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className={`font-semibold ${st.textClass}`}>{st.label}</span>
                  <span aria-hidden="true" className="text-slate-300">·</span>
                  <span className="font-mono text-slate-500 tabular-nums">
                    {formatWaktuIndonesia(tkt.tanggalLapor)}
                  </span>
                </div>

                <h3 className="text-base font-semibold text-slate-900">{tkt.judulKeluhan}</h3>
                <p className="text-xs text-slate-600">
                  Aset: <span className="font-medium text-slate-800">{aset?.namaBarang ?? '-'}</span> ·{' '}
                  Lokasi: {lok?.namaLokasi ?? '-'} · Kondisi Lapor:{' '}
                  <span className={`font-semibold ${kond.textClass}`}>{kond.label}</span> · Estimasi:{' '}
                  <span className="font-mono font-semibold tabular-nums">
                    {formatRupiah(tkt.estimasiBiaya)}
                  </span>
                </p>
                <p className="text-xs text-slate-600">{tkt.deskripsiKerusakan}</p>
                {tkt.tindakanPerbaikan && (
                  <p className="text-xs text-slate-700">
                    Penanganan ({tkt.teknisiPelaksana ?? 'Tim Teknis'}): {tkt.tindakanPerbaikan}
                  </p>
                )}
              </div>

              {role.izin.kelolaTeknisTiket &&
                tkt.status !== 'SELESAI_DIPERBAIKI' &&
                tkt.status !== 'TIDAK_DAPAT_DIPERBAIKI' && (
                  <div className="flex flex-wrap items-center gap-2 shrink-0">
                    {tkt.status === 'DILAPORKAN' && (
                      <button
                        type="button"
                        onClick={() =>
                          onUpdateTiketStatus(
                            tkt.id,
                            'DALAM_PENANGANAN',
                            'Tim Bengkel Rekanan BPBD Sidoarjo',
                            'Inspeksi teknis awal dan pengadaan suku cadang dimulai.'
                          )
                        }
                        className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-amber-600 hover:bg-amber-700 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        <Wrench className="w-3.5 h-3.5" />
                        Proses Perbaikan
                      </button>
                    )}
                    <button
                      type="button"
                      onClick={() =>
                        onUpdateTiketStatus(
                          tkt.id,
                          'SELESAI_DIPERBAIKI',
                          tkt.teknisiPelaksana ?? 'Teknisi Internal BPBD',
                          'Perbaikan tuntas dan uji fungsi lolos; kondisi KIB dipulihkan menjadi Baik.'
                        )
                      }
                      className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                    >
                      <Check className="w-3.5 h-3.5" />
                      Tandai Selesai & Pulihkan KIB
                    </button>
                  </div>
                )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
