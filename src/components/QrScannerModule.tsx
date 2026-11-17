import { FormEvent, useEffect, useRef, useState } from 'react';
import {
  AlertTriangle,
  ArrowLeftRight,
  Camera,
  CameraOff,
  CheckCircle2,
  ClipboardCheck,
  QrCode,
  Search,
} from 'lucide-react';
import {
  AsetBMD,
  KondisiBarang,
  LokasiUnit,
  OpnameFisik,
  PrioritasTiket,
  RoleProfile,
} from '../types/bmd';
import {
  formatRupiah,
  formatTanggalIndonesia,
  formatWaktuIndonesia,
  LABEL_GOLONGAN_KIB,
  LABEL_KONDISI,
} from '../utils/formatters';
import { QrCodeSvg } from './QrCodeSvg';

interface QrScannerModuleProps {
  role: RoleProfile;
  asets: AsetBMD[];
  lokasiList: LokasiUnit[];
  opnameHistory: OpnameFisik[];
  onRecordOpname: (payload: {
    asetId: string;
    lokasiTervalidasiId: string;
    metodeValidasi: 'QR_CAMERA' | 'INPUT_MANUAL';
    kondisiFisik: KondisiBarang;
    catatanLapangan: string;
  }) => void;
  onQuickCreateTiket: (payload: {
    asetId: string;
    prioritas: PrioritasTiket;
    kondisiDilaporkan: KondisiBarang;
    judulKeluhan: string;
    deskripsiKerusakan: string;
    estimasiBiaya: number;
  }) => void;
  onQuickCreateMutasi: (payload: {
    asetId: string;
    lokasiTujuanId: string;
    penanggungJawabBaru: string;
    alasanMutasi: string;
  }) => void;
}

type BarcodeDetectorLike = {
  detect: (source: ImageBitmapSource) => Promise<Array<{ rawValue?: string }>>;
};

export function QrScannerModule({
  role,
  asets,
  lokasiList,
  opnameHistory,
  onRecordOpname,
  onQuickCreateTiket,
  onQuickCreateMutasi,
}: QrScannerModuleProps) {
  const [manualQuery, setManualQuery] = useState('');
  const [selectedAset, setSelectedAset] = useState<AsetBMD | null>(asets[0] ?? null);
  const [scanMethod, setScanMethod] = useState<'QR_CAMERA' | 'INPUT_MANUAL'>('INPUT_MANUAL');
  const [cameraActive, setCameraActive] = useState(false);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [feedbackMessage, setFeedbackMessage] = useState<string | null>(null);

  // Sub-panel aksi cepat setelah scan
  const [activeAction, setActiveAction] = useState<'opname' | 'tiket' | 'mutasi'>('opname');

  // Form Opname Fisik
  const [opnameKondisi, setOpnameKondisi] = useState<KondisiBarang>('BAIK');
  const [opnameLokasiId, setOpnameLokasiId] = useState<string>(asets[0]?.lokasiId ?? '');
  const [opnameCatatan, setOpnameCatatan] = useState('');

  // Form Lapor Kerusakan
  const [tiketPrioritas, setTiketPrioritas] = useState<PrioritasTiket>('TINGGI');
  const [tiketKondisi, setTiketKondisi] = useState<KondisiBarang>('RUSAK_RINGAN');
  const [tiketJudul, setTiketJudul] = useState('');
  const [tiketDeskripsi, setTiketDeskripsi] = useState('');
  const [tiketBiaya, setTiketBiaya] = useState('500000');

  // Form Ajukan Mutasi
  const [mutasiTujuanId, setMutasiTujuanId] = useState<string>(lokasiList[1]?.id ?? '');
  const [mutasiPjBaru, setMutasiPjBaru] = useState('');
  const [mutasiAlasan, setMutasiAlasan] = useState('');

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const rafRef = useRef<number | null>(null);

  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));

  const syncSelectedAsset = (aset: AsetBMD, method: 'QR_CAMERA' | 'INPUT_MANUAL') => {
    setSelectedAset(aset);
    setScanMethod(method);
    setOpnameKondisi(aset.kondisi);
    setOpnameLokasiId(aset.lokasiId);
    setFeedbackMessage(null);
    const otherLoc = lokasiList.find((l) => l.id !== aset.lokasiId);
    if (otherLoc) {
      setMutasiTujuanId(otherLoc.id);
      setMutasiPjBaru(otherLoc.penanggungJawab);
    }
  };

  const stopCamera = () => {
    if (rafRef.current) {
      cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
    if (streamRef.current) {
      streamRef.current.getTracks().forEach((t) => t.stop());
      streamRef.current = null;
    }
    setCameraActive(false);
  };

  useEffect(() => {
    return () => stopCamera();
  }, []);

  const handleStartCamera = async () => {
    setCameraError(null);
    if (!navigator.mediaDevices || !navigator.mediaDevices.getUserMedia) {
      setCameraError(
        'Browser ini tidak mendukung akses kamera langsung. Gunakan simulasi label QR atau masukkan kode register di bawah.'
      );
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: { ideal: 'environment' } },
      });
      streamRef.current = stream;
      setCameraActive(true);

      requestAnimationFrame(() => {
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          videoRef.current.play().catch(() => {});
        }
      });

      const DetectorCtor = (
        window as unknown as {
          BarcodeDetector?: new (opts: { formats: string[] }) => BarcodeDetectorLike;
        }
      ).BarcodeDetector;

      if (DetectorCtor) {
        const detector = new DetectorCtor({ formats: ['qr_code'] });
        const scanFrame = async () => {
          if (!videoRef.current || !streamRef.current) return;
          try {
            if (videoRef.current.readyState >= 2) {
              const codes = await detector.detect(videoRef.current);
              if (codes.length > 0 && codes[0].rawValue) {
                const raw = codes[0].rawValue.trim();
                const matched = asets.find(
                  (a) =>
                    a.kodeQr.toLowerCase() === raw.toLowerCase() ||
                    a.kodeBarang.toLowerCase() === raw.toLowerCase()
                );
                if (matched) {
                  syncSelectedAsset(matched, 'QR_CAMERA');
                  stopCamera();
                  setFeedbackMessage(`Label QR terverifikasi via kamera: ${matched.kodeQr}`);
                  return;
                }
              }
            }
          } catch {
            // Abaikan frame gagal deteksi
          }
          rafRef.current = requestAnimationFrame(scanFrame);
        };
        rafRef.current = requestAnimationFrame(scanFrame);
      }
    } catch {
      setCameraError(
        'Izin kamera ditolak atau perangkat tidak memiliki kamera aktif. Gunakan input kode QR atau pilih aset di panel simulasi pindai.'
      );
      stopCamera();
    }
  };

  const handleManualLookup = (e: FormEvent) => {
    e.preventDefault();
    const q = manualQuery.trim().toLowerCase();
    if (!q) return;

    const match = asets.find(
      (a) =>
        a.kodeQr.toLowerCase().includes(q) ||
        a.nomorRegister.toLowerCase() === q ||
        a.kodeBarang.toLowerCase().includes(q) ||
        a.namaBarang.toLowerCase().includes(q) ||
        (a.nomorPolisi && a.nomorPolisi.toLowerCase().includes(q))
    );

    if (!match) {
      setFeedbackMessage(`Aset dengan kode atau kata kunci "${manualQuery}" tidak ditemukan di database KIB.`);
      return;
    }
    syncSelectedAsset(match, 'INPUT_MANUAL');
    setFeedbackMessage(`Data KIB valid ditemukan: ${match.kodeQr}`);
  };

  const handleSubmitOpname = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAset || !role.izin.opnameQr) return;
    onRecordOpname({
      asetId: selectedAset.id,
      lokasiTervalidasiId: opnameLokasiId,
      metodeValidasi: scanMethod,
      kondisiFisik: opnameKondisi,
      catatanLapangan: opnameCatatan.trim() || 'Pengecekan fisik rutin sesuai jadwal pos.',
    });
    setOpnameCatatan('');
    setFeedbackMessage(`Opname fisik ${selectedAset.namaBarang} berhasil disimpan.`);
  };

  const handleSubmitTiket = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAset || !role.izin.laporKerusakan || !tiketJudul.trim()) return;
    onQuickCreateTiket({
      asetId: selectedAset.id,
      prioritas: tiketPrioritas,
      kondisiDilaporkan: tiketKondisi,
      judulKeluhan: tiketJudul.trim(),
      deskripsiKerusakan: tiketDeskripsi.trim() || tiketJudul.trim(),
      estimasiBiaya: Number(tiketBiaya) || 0,
    });
    setTiketJudul('');
    setTiketDeskripsi('');
    setFeedbackMessage(`Tiket kerusakan untuk ${selectedAset.namaBarang} berhasil dikirim ke Pengurus Barang.`);
  };

  const handleSubmitMutasi = (e: FormEvent) => {
    e.preventDefault();
    if (!selectedAset || !role.izin.ajukanMutasi || mutasiTujuanId === selectedAset.lokasiId) return;
    onQuickCreateMutasi({
      asetId: selectedAset.id,
      lokasiTujuanId: mutasiTujuanId,
      penanggungJawabBaru: mutasiPjBaru.trim() || 'Kepala Pos Tujuan',
      alasanMutasi: mutasiAlasan.trim() || 'Kebutuhan operasional penanggulangan bencana',
    });
    setMutasiAlasan('');
    setFeedbackMessage(`Permohonan mutasi ${selectedAset.namaBarang} telah diajukan ke Kasubag Umum.`);
  };

  const selectedOpnames = selectedAset
    ? opnameHistory.filter((o) => o.asetId === selectedAset.id)
    : [];

  return (
    <div className="space-y-6">
      {/* Header Halaman */}
      <div className="border-b border-slate-200 pb-5">
        <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
          VALIDASI LAPANGAN & OPNAME MANDIRI
        </p>
        <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
          Pemindai QR Code & Validasi Fisik BMD
        </h1>
        <p className="mt-1 text-sm text-slate-600">
          Pindai label QR Code pada armada Damkar atau peralatan BPBD untuk mengecek keabsahan KIB, mencatat opname harian, atau melaporkan kerusakan langsung dari pos.
        </p>
      </div>

      {feedbackMessage && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-md text-sm text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>{feedbackMessage}</span>
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Kolom Kiri: Kamera Scanner + Pencarian Kode + Sampel QR Siap Uji */}
        <div className="lg:col-span-5 space-y-5">
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
            <div className="flex items-center justify-between gap-2">
              <h2 className="text-base font-semibold text-slate-900">
                Kamera Pemindai QR
              </h2>
              {cameraActive ? (
                <button
                  type="button"
                  onClick={stopCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-red-700 bg-white border border-red-300 hover:bg-red-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <CameraOff className="w-3.5 h-3.5" />
                  Hentikan Kamera
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartCamera}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  <Camera className="w-3.5 h-3.5" />
                  Aktifkan Kamera
                </button>
              )}
            </div>

            <div className="relative aspect-[4/3] w-full bg-slate-900 rounded-md overflow-hidden border border-slate-300 flex items-center justify-center">
              {cameraActive ? (
                <>
                  <video
                    ref={videoRef}
                    playsInline
                    muted
                    className="w-full h-full object-cover"
                  />
                  <div className="absolute inset-8 border-2 border-emerald-400/80 pointer-events-none rounded-sm" />
                  <p className="absolute bottom-3 left-3 right-3 text-center text-xs font-medium text-white bg-slate-900/75 py-1.5 px-3 rounded">
                    Arahkan kamera ke stiker QR Code SIMAS-BMD
                  </p>
                </>
              ) : (
                <div className="text-center px-6 py-8 space-y-2">
                  <QrCode className="w-10 h-10 text-slate-400 mx-auto" />
                  <p className="text-sm font-medium text-slate-200">
                    Kamera Siap Dipakai di Perangkat Mobile & Laptop
                  </p>
                  <p className="text-xs text-slate-400">
                    Tekan &ldquo;Aktifkan Kamera&rdquo; untuk membaca QR fisik atau pilih kode QR uji cepat di bawah.
                  </p>
                </div>
              )}
            </div>

            {cameraError && (
              <div className="flex items-start gap-2 px-3 py-2.5 bg-amber-50 border border-amber-200 rounded text-xs text-amber-900">
                <AlertTriangle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                <span>{cameraError}</span>
              </div>
            )}

            {/* Input Manual Kode QR / No. Register / Plat Nomor */}
            <form onSubmit={handleManualLookup} className="pt-2 border-t border-slate-100 space-y-2">
              <label
                htmlFor="manual-qr-input"
                className="block text-xs font-semibold text-slate-700"
              >
                Cari Manual Kode QR / No. Polisi / Nama Barang
              </label>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                  <input
                    id="manual-qr-input"
                    type="text"
                    value={manualQuery}
                    onChange={(e) => setManualQuery(e.target.value)}
                    placeholder="Contoh: SDA-BPBD-KIBB-2022-0001 atau W 8014 NP"
                    className="w-full pl-9 pr-3 py-2 text-xs font-mono border border-slate-300 rounded-md focus:outline-none focus:ring-2 focus:ring-[#0F2A4A]/20 focus:border-[#0F2A4A]"
                  />
                </div>
                <button
                  type="submit"
                  className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                >
                  Validasi
                </button>
              </div>
            </form>
          </div>

          {/* Simulasi Pindai Cepat Label QR Aset */}
          <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
            <h3 className="text-sm font-semibold text-slate-900">
              Uji Pindai Cepat Label QR Pos Lapangan
            </h3>
            <p className="text-xs text-slate-500">
              Pilih salah satu aset berikut untuk mensimulasikan hasil pembacaan QR Code secara instan:
            </p>
            <div className="divide-y divide-slate-100 border border-slate-200 rounded-md overflow-hidden">
              {asets.slice(0, 5).map((item) => {
                const isSelected = selectedAset?.id === item.id;
                const kond = LABEL_KONDISI[item.kondisi];
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => {
                      syncSelectedAsset(item, 'QR_CAMERA');
                      setFeedbackMessage(`Simulasi pindai QR berhasil: ${item.kodeQr}`);
                    }}
                    className={`w-full text-left px-3.5 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                      isSelected ? 'bg-blue-50/70' : 'bg-white hover:bg-slate-50'
                    }`}
                  >
                    <div className="min-w-0">
                      <p className="text-xs font-semibold text-slate-900 truncate">
                        {item.namaBarang}
                      </p>
                      <p className="text-[11px] font-mono text-slate-500 tabular-nums">
                        {item.kodeQr} · {kond.label}
                      </p>
                    </div>
                    <span className="text-xs font-semibold text-[#0F2A4A] shrink-0">
                      Pindai
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>

        {/* Kolom Kanan: Dossier Validasi Aset & Aksi Lapangan */}
        <div className="lg:col-span-7 space-y-5">
          {selectedAset ? (
            <>
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between border-b border-slate-200 pb-4">
                  <div className="space-y-1">
                    <p className="text-xs font-mono font-semibold text-[#0F2A4A] tabular-nums">
                      {LABEL_GOLONGAN_KIB[selectedAset.golongan].kode} · {selectedAset.kodeQr}
                    </p>
                    <h2 className="text-lg font-bold text-slate-900">
                      {selectedAset.namaBarang}
                    </h2>
                    <p className="text-sm text-slate-600">{selectedAset.merkTipe}</p>
                  </div>
                  <div className="shrink-0 border border-slate-200 p-1 bg-white self-start">
                    <QrCodeSvg value={selectedAset.kodeQr} size={76} />
                  </div>
                </div>

                {/* Metadata Grid Terstruktur */}
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 sm:grid-cols-3 text-xs">
                  <div>
                    <dt className="text-slate-500">Kode Barang & Register</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-slate-900 tabular-nums">
                      {selectedAset.kodeBarang} / {selectedAset.nomorRegister}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Tahun & Nilai Perolehan</dt>
                    <dd className="mt-0.5 font-mono font-semibold text-[#0F2A4A] tabular-nums">
                      {selectedAset.tahunPerolehan} · {formatRupiah(selectedAset.hargaPerolehan)}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Kondisi Terakhir</dt>
                    <dd
                      className={`mt-0.5 font-semibold ${
                        LABEL_KONDISI[selectedAset.kondisi].textClass
                      }`}
                    >
                      {LABEL_KONDISI[selectedAset.kondisi].label}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Lokasi Terdaftar</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {lokasiMap.get(selectedAset.lokasiId)?.namaLokasi ?? '-'}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Penanggung Jawab</dt>
                    <dd className="mt-0.5 font-medium text-slate-900">
                      {selectedAset.penanggungJawab}
                    </dd>
                  </div>
                  <div>
                    <dt className="text-slate-500">Opname Terakhir</dt>
                    <dd className="mt-0.5 font-mono text-slate-900 tabular-nums">
                      {formatTanggalIndonesia(selectedAset.tanggalOpnameTerakhir)}
                    </dd>
                  </div>
                  {selectedAset.nomorPolisi && (
                    <div>
                      <dt className="text-slate-500">No. Polisi / Rangka</dt>
                      <dd className="mt-0.5 font-mono text-slate-900 tabular-nums">
                        {selectedAset.nomorPolisi} · {selectedAset.nomorRangka ?? '-'}
                      </dd>
                    </div>
                  )}
                </dl>
              </div>

              {/* Segmented Aksi Lapangan (RBAC-aware) */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-4">
                <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md">
                  <button
                    type="button"
                    onClick={() => setActiveAction('opname')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeAction === 'opname'
                        ? 'bg-white text-[#0F2A4A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ClipboardCheck className="w-3.5 h-3.5" />
                    Opname Fisik Mandiri
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction('tiket')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeAction === 'tiket'
                        ? 'bg-white text-[#0F2A4A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <AlertTriangle className="w-3.5 h-3.5" />
                    Lapor Kerusakan
                  </button>
                  <button
                    type="button"
                    onClick={() => setActiveAction('mutasi')}
                    className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                      activeAction === 'mutasi'
                        ? 'bg-white text-[#0F2A4A] shadow-xs'
                        : 'text-slate-600 hover:text-slate-900'
                    }`}
                  >
                    <ArrowLeftRight className="w-3.5 h-3.5" />
                    Ajukan Mutasi
                  </button>
                </div>

                {activeAction === 'opname' && (
                  role.izin.opnameQr ? (
                    <form onSubmit={handleSubmitOpname} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kondisi Fisik Teramati
                          </label>
                          <select
                            value={opnameKondisi}
                            onChange={(e) => setOpnameKondisi(e.target.value as KondisiBarang)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2A4A]"
                          >
                            <option value="BAIK">Baik (Siap Operasional)</option>
                            <option value="RUSAK_RINGAN">Rusak Ringan (Butuh Servis)</option>
                            <option value="RUSAK_BERAT">Rusak Berat (Tidak Laik Pakai)</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Lokasi Keberadaan Fisik
                          </label>
                          <select
                            value={opnameLokasiId}
                            onChange={(e) => setOpnameLokasiId(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2A4A]"
                          >
                            {lokasiList.map((l) => (
                              <option key={l.id} value={l.id}>
                                {l.namaLokasi}
                              </option>
                            ))}
                          </select>
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Catatan Pengecekan Lapangan
                        </label>
                        <textarea
                          rows={2}
                          value={opnameCatatan}
                          onChange={(e) => setOpnameCatatan(e.target.value)}
                          placeholder="Contoh: Mesin dipanaskan 15 menit, aki normal, selang nozzle lengkap."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2A4A]"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-emerald-700 hover:bg-emerald-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Simpan Hasil Opname Fisik
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Peran {role.label} hanya memiliki akses baca (read-only). Ubah peran ke Petugas Pos atau Pengurus Barang untuk mencatat opname.
                    </p>
                  )
                )}

                {activeAction === 'tiket' && (
                  role.izin.laporKerusakan ? (
                    <form onSubmit={handleSubmitTiket} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Prioritas Penanganan
                          </label>
                          <select
                            value={tiketPrioritas}
                            onChange={(e) => setTiketPrioritas(e.target.value as PrioritasTiket)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                          >
                            <option value="RENDAH">Rendah</option>
                            <option value="SEDANG">Sedang</option>
                            <option value="TINGGI">Tinggi</option>
                            <option value="DARURAT">Darurat Operasi</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Kondisi Aset
                          </label>
                          <select
                            value={tiketKondisi}
                            onChange={(e) => setTiketKondisi(e.target.value as KondisiBarang)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                          >
                            <option value="RUSAK_RINGAN">Rusak Ringan</option>
                            <option value="RUSAK_BERAT">Rusak Berat</option>
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Estimasi Biaya (Rp)
                          </label>
                          <input
                            type="number"
                            min={0}
                            value={tiketBiaya}
                            onChange={(e) => setTiketBiaya(e.target.value)}
                            className="w-full px-3 py-2 text-sm font-mono border border-slate-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Judul Keluhan Kerusakan
                        </label>
                        <input
                          type="text"
                          required
                          value={tiketJudul}
                          onChange={(e) => setTiketJudul(e.target.value)}
                          placeholder="Contoh: Selang hisap pompa utama retak di sambungan kopling"
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Detail Kronologi Kerusakan
                        </label>
                        <textarea
                          rows={2}
                          value={tiketDeskripsi}
                          onChange={(e) => setTiketDeskripsi(e.target.value)}
                          placeholder="Jelaskan gejala kerusakan saat operasi atau pengecekan rutin."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-red-700 hover:bg-red-800 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Kirim Tiket Kerusakan
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Peran {role.label} hanya memiliki akses baca.
                    </p>
                  )
                )}

                {activeAction === 'mutasi' && (
                  role.izin.ajukanMutasi ? (
                    <form onSubmit={handleSubmitMutasi} className="space-y-4">
                      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Lokasi Tujuan Mutasi
                          </label>
                          <select
                            value={mutasiTujuanId}
                            onChange={(e) => {
                              setMutasiTujuanId(e.target.value);
                              const loc = lokasiMap.get(e.target.value);
                              if (loc) setMutasiPjBaru(loc.penanggungJawab);
                            }}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md bg-white"
                          >
                            {lokasiList
                              .filter((l) => l.id !== selectedAset.lokasiId)
                              .map((l) => (
                                <option key={l.id} value={l.id}>
                                  {l.namaLokasi}
                                </option>
                              ))}
                          </select>
                        </div>
                        <div>
                          <label className="block text-xs font-semibold text-slate-700 mb-1">
                            Penanggung Jawab Baru
                          </label>
                          <input
                            type="text"
                            required
                            value={mutasiPjBaru}
                            onChange={(e) => setMutasiPjBaru(e.target.value)}
                            className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-xs font-semibold text-slate-700 mb-1">
                          Alasan Perpindahan / Berita Acara
                        </label>
                        <textarea
                          rows={2}
                          required
                          value={mutasiAlasan}
                          onChange={(e) => setMutasiAlasan(e.target.value)}
                          placeholder="Contoh: Dukungan siaga pos Damkar menghadapi peningkatan laporan kebakaran lahan."
                          className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md"
                        />
                      </div>
                      <button
                        type="submit"
                        className="px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                      >
                        Ajukan Permohonan Mutasi
                      </button>
                    </form>
                  ) : (
                    <p className="text-xs text-slate-500">
                      Peran {role.label} tidak memiliki izin pengajuan mutasi.
                    </p>
                  )
                )}
              </div>

              {/* Riwayat Opname Fisik Aset */}
              <div className="bg-white border border-slate-200 rounded-lg p-5 space-y-3">
                <h3 className="text-sm font-semibold text-slate-900">
                  Histori Opname Fisik Aset Ini
                </h3>
                {selectedOpnames.length === 0 ? (
                  <p className="text-xs text-slate-500">
                    Belum ada catatan opname QR terbaru untuk barang ini.
                  </p>
                ) : (
                  <div className="divide-y divide-slate-100">
                    {selectedOpnames.map((op) => (
                      <div key={op.id} className="py-2.5 text-xs space-y-1">
                        <div className="flex items-center justify-between gap-2">
                          <span className="font-semibold text-slate-900">
                            {op.petugasNama} · {op.metodeValidasi === 'QR_CAMERA' ? 'Scan QR' : 'Input Manual'}
                          </span>
                          <span className="font-mono text-slate-500 tabular-nums">
                            {formatWaktuIndonesia(op.waktuOpname)}
                          </span>
                        </div>
                        <p className="text-slate-600">
                          Kondisi:{' '}
                          <span className={`font-semibold ${LABEL_KONDISI[op.kondisiFisik].textClass}`}>
                            {LABEL_KONDISI[op.kondisiFisik].label}
                          </span>{' '}
                          — {op.catatanLapangan}
                        </p>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          ) : (
            <div className="bg-white border border-slate-200 rounded-lg p-8 text-center text-sm text-slate-500">
              Pindai label QR Code atau pilih aset untuk menampilkan rincian KIB dan aksi lapangan.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
