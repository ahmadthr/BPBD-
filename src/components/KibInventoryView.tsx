import { FormEvent, useState } from 'react';
import { Plus, QrCode, Search, X } from 'lucide-react';
import {
  AsetBMD,
  KibGolongan,
  KondisiBarang,
  LokasiUnit,
  RoleProfile,
} from '../types/bmd';
import {
  formatRupiah,
  formatTanggalIndonesia,
  LABEL_GOLONGAN_KIB,
  LABEL_KONDISI,
} from '../utils/formatters';
import { OfficialQrLabelCard } from './QrCodeSvg';

interface KibInventoryViewProps {
  role: RoleProfile;
  asets: AsetBMD[];
  lokasiList: LokasiUnit[];
  filterGolongan: KibGolongan | 'ALL';
  filterLokasiId: string;
  onChangeGolongan: (gol: KibGolongan | 'ALL') => void;
  onChangeLokasi: (lokId: string) => void;
  onAddAset: (aset: Omit<AsetBMD, 'id' | 'kodeQr' | 'tanggalOpnameTerakhir'>) => void;
  onLogPrintQr: (aset: AsetBMD) => void;
}

const GOLONGAN_TABS: Array<{ key: KibGolongan | 'ALL'; label: string }> = [
  { key: 'ALL', label: 'Semua KIB' },
  { key: 'KIB_A', label: 'KIB A' },
  { key: 'KIB_B', label: 'KIB B' },
  { key: 'KIB_C', label: 'KIB C' },
  { key: 'KIB_D', label: 'KIB D' },
  { key: 'KIB_E', label: 'KIB E' },
  { key: 'KIB_F', label: 'KIB F' },
];

export function KibInventoryView({
  role,
  asets,
  lokasiList,
  filterGolongan,
  filterLokasiId,
  onChangeGolongan,
  onChangeLokasi,
  onAddAset,
  onLogPrintQr,
}: KibInventoryViewProps) {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterKondisi, setFilterKondisi] = useState<KondisiBarang | 'ALL'>('ALL');
  const [selectedAset, setSelectedAset] = useState<AsetBMD | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);

  // Form tambah aset baru
  const [newGolongan, setNewGolongan] = useState<KibGolongan>('KIB_B');
  const [newKodeBarang, setNewKodeBarang] = useState('1.3.2.02.01.006');
  const [newRegister, setNewRegister] = useState('0021');
  const [newNamaBarang, setNewNamaBarang] = useState('');
  const [newMerkTipe, setNewMerkTipe] = useState('');
  const [newTahun, setNewTahun] = useState('2026');
  const [newHarga, setNewHarga] = useState('45000000');
  const [newKondisi, setNewKondisi] = useState<KondisiBarang>('BAIK');
  const [newLokasiId, setNewLokasiId] = useState(lokasiList[0]?.id ?? '');
  const [newNomorPolisi, setNewNomorPolisi] = useState('');
  const [newAsalUsul, setNewAsalUsul] = useState('APBD Kabupaten Sidoarjo');
  const [newPj, setNewPj] = useState(lokasiList[0]?.penanggungJawab ?? '');

  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));

  const filteredAsets = asets.filter((item) => {
    if (filterGolongan !== 'ALL' && item.golongan !== filterGolongan) return false;
    if (filterLokasiId !== 'ALL' && item.lokasiId !== filterLokasiId) return false;
    if (filterKondisi !== 'ALL' && item.kondisi !== filterKondisi) return false;
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const match =
        item.namaBarang.toLowerCase().includes(q) ||
        item.kodeBarang.toLowerCase().includes(q) ||
        item.kodeQr.toLowerCase().includes(q) ||
        item.merkTipe.toLowerCase().includes(q) ||
        item.nomorRegister.toLowerCase().includes(q) ||
        (item.nomorPolisi && item.nomorPolisi.toLowerCase().includes(q));
      if (!match) return false;
    }
    return true;
  });

  const handleCreateSubmit = (e: FormEvent) => {
    e.preventDefault();
    if (!newNamaBarang.trim() || !newMerkTipe.trim()) return;
    onAddAset({
      golongan: newGolongan,
      kodeBarang: newKodeBarang.trim(),
      nomorRegister: newRegister.trim().padStart(4, '0'),
      namaBarang: newNamaBarang.trim(),
      merkTipe: newMerkTipe.trim(),
      tahunPerolehan: Number(newTahun) || 2026,
      hargaPerolehan: Number(newHarga) || 0,
      kondisi: newKondisi,
      lokasiId: newLokasiId,
      penanggungJawab: newPj.trim() || 'Pengurus Barang OPD',
      asalUsul: newAsalUsul.trim() || 'APBD Kabupaten Sidoarjo',
      nomorPolisi: newNomorPolisi.trim() || undefined,
    });
    setNewNamaBarang('');
    setNewMerkTipe('');
    setNewNomorPolisi('');
    setShowCreateModal(false);
  };

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            BUKU INVENTARIS TERPADU (PERMENDAGRI 19/2016)
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Master Kartu Inventaris Barang (KIB A–F)
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Validasi nomor register, tahun perolehan, penempatan pos Damkar, serta pencetakan stiker QR Code resmi.
          </p>
        </div>

        {role.izin.kelolaMasterKib && (
          <button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            Catat Perolehan Aset
          </button>
        )}
      </div>

      {/* Filter Bar */}
      <div className="bg-white border border-slate-200 rounded-lg p-4 space-y-4">
        <div className="flex flex-wrap items-center gap-1 p-1 bg-slate-100 rounded-md w-fit max-w-full overflow-x-auto">
          {GOLONGAN_TABS.map((tab) => (
            <button
              key={tab.key}
              type="button"
              onClick={() => onChangeGolongan(tab.key)}
              className={`px-3 py-1.5 text-xs font-semibold rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer ${
                filterGolongan === tab.key
                  ? 'bg-white text-[#0F2A4A] shadow-xs'
                  : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <div className="grid grid-cols-1 gap-3 md:grid-cols-12">
          <div className="md:col-span-5 relative">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Cari nama barang, kode barang, no. polisi, atau QR..."
              className="w-full pl-9 pr-3 py-2 text-xs border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2A4A]"
            />
          </div>
          <div className="md:col-span-4">
            <select
              value={filterLokasiId}
              onChange={(e) => onChangeLokasi(e.target.value)}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2A4A]"
            >
              <option value="ALL">Semua Lokasi / Pos Damkar</option>
              {lokasiList.map((lok) => (
                <option key={lok.id} value={lok.id}>
                  {lok.namaLokasi}
                </option>
              ))}
            </select>
          </div>
          <div className="md:col-span-3">
            <select
              value={filterKondisi}
              onChange={(e) => setFilterKondisi(e.target.value as KondisiBarang | 'ALL')}
              className="w-full px-3 py-2 text-xs border border-slate-300 rounded-md bg-white focus:outline-none focus:border-[#0F2A4A]"
            >
              <option value="ALL">Semua Kondisi</option>
              <option value="BAIK">Baik</option>
              <option value="RUSAK_RINGAN">Rusak Ringan</option>
              <option value="RUSAK_BERAT">Rusak Berat</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabel Data KIB */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 text-xs font-semibold text-slate-600">
                <th className="py-2.5 px-4">Kode Barang & Reg</th>
                <th className="py-2.5 px-4">Nama Barang & Spesifikasi</th>
                <th className="py-2.5 px-4">Lokasi / Pos</th>
                <th className="py-2.5 px-3 text-right">Tahun</th>
                <th className="py-2.5 px-4 text-right">Nilai Perolehan</th>
                <th className="py-2.5 px-4">Kondisi</th>
                <th className="py-2.5 px-4 text-right">Label QR</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 text-xs">
              {filteredAsets.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-10 px-4 text-center text-slate-500">
                    Tidak ada data aset yang sesuai dengan kriteria pencarian atau filter saat ini.
                  </td>
                </tr>
              ) : (
                filteredAsets.map((aset) => {
                  const kond = LABEL_KONDISI[aset.kondisi];
                  const lok = lokasiMap.get(aset.lokasiId);
                  return (
                    <tr
                      key={aset.id}
                      onClick={() => setSelectedAset(aset)}
                      className="hover:bg-slate-50 transition-colors cursor-pointer"
                    >
                      <td className="py-3 px-4 font-mono tabular-nums align-top">
                        <p className="font-semibold text-[#0F2A4A]">
                          {LABEL_GOLONGAN_KIB[aset.golongan].kode}
                        </p>
                        <p className="text-slate-600">{aset.kodeBarang}</p>
                        <p className="text-slate-400">Reg. {aset.nomorRegister}</p>
                      </td>
                      <td className="py-3 px-4 align-top max-w-xs">
                        <p className="text-sm font-semibold text-slate-900">
                          {aset.namaBarang}
                        </p>
                        <p className="text-slate-600 mt-0.5">
                          {aset.merkTipe}
                          {aset.nomorPolisi ? ` · ${aset.nomorPolisi}` : ''}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p className="font-medium text-slate-900">
                          {lok?.namaLokasi ?? '-'}
                        </p>
                        <p className="text-slate-500 mt-0.5">PJ: {aset.penanggungJawab}</p>
                      </td>
                      <td className="py-3 px-3 text-right font-mono tabular-nums text-slate-800 align-top">
                        {aset.tahunPerolehan}
                      </td>
                      <td className="py-3 px-4 text-right font-mono tabular-nums font-semibold text-slate-900 align-top">
                        {formatRupiah(aset.hargaPerolehan)}
                      </td>
                      <td className="py-3 px-4 align-top">
                        <span className={`inline-flex items-center gap-1.5 font-semibold ${kond.textClass}`}>
                          <span className={`w-1.5 h-1.5 ${kond.dotColor} inline-block`} aria-hidden="true" />
                          {kond.label}
                        </span>
                        <p className="text-[11px] font-mono text-slate-400 tabular-nums mt-0.5">
                          Opname: {formatTanggalIndonesia(aset.tanggalOpnameTerakhir)}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedAset(aset);
                          }}
                          className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors whitespace-nowrap shrink-0 cursor-pointer"
                        >
                          <QrCode className="w-3.5 h-3.5" />
                          QR
                        </button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal / Drawer Detail Aset & Cetak Stiker QR */}
      {selectedAset && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setSelectedAset(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-start justify-between gap-4 border-b border-slate-200 pb-4 no-print">
              <div>
                <p className="text-xs font-mono font-semibold text-[#0F2A4A]">
                  DETAIL ASET & LABEL QR CODE
                </p>
                <h2 className="text-lg font-bold text-slate-900 mt-0.5">
                  {selectedAset.namaBarang}
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setSelectedAset(null)}
                aria-label="Tutup panel detail"
                className="p-1.5 text-slate-500 hover:text-slate-900 rounded cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <OfficialQrLabelCard
              aset={selectedAset}
              lokasi={lokasiMap.get(selectedAset.lokasiId)}
              canPrint={role.izin.cetakLabelQr}
              onLogPrint={onLogPrintQr}
            />

            <dl className="grid grid-cols-2 gap-3 text-xs pt-2 border-t border-slate-200 no-print">
              <div>
                <dt className="text-slate-500">Asal Usul Perolehan</dt>
                <dd className="font-medium text-slate-900 mt-0.5">{selectedAset.asalUsul}</dd>
              </div>
              <div>
                <dt className="text-slate-500">Harga Perolehan</dt>
                <dd className="font-mono font-semibold text-[#0F2A4A] tabular-nums mt-0.5">
                  {formatRupiah(selectedAset.hargaPerolehan)}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Nomor Rangka / Mesin</dt>
                <dd className="font-mono text-slate-800 mt-0.5">
                  {selectedAset.nomorRangka ?? '-'} / {selectedAset.nomorMesin ?? '-'}
                </dd>
              </div>
              <div>
                <dt className="text-slate-500">Keterangan</dt>
                <dd className="text-slate-800 mt-0.5">{selectedAset.keterangan ?? '-'}</dd>
              </div>
            </dl>
          </div>
        </div>
      )}

      {/* Modal Tambah Perolehan Aset Baru */}
      {showCreateModal && role.izin.kelolaMasterKib && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setShowCreateModal(false)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <h2 className="text-lg font-bold text-slate-900">
                Catat Perolehan Barang Milik Daerah Baru
              </h2>
              <button
                type="button"
                onClick={() => setShowCreateModal(false)}
                aria-label="Tutup form"
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="space-y-4 text-xs">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Golongan KIB</label>
                  <select
                    value={newGolongan}
                    onChange={(e) => setNewGolongan(e.target.value as KibGolongan)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    {GOLONGAN_TABS.filter((g) => g.key !== 'ALL').map((g) => (
                      <option key={g.key} value={g.key}>
                        {g.label} — {LABEL_GOLONGAN_KIB[g.key as KibGolongan].nama}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kode Barang</label>
                  <input
                    type="text"
                    required
                    value={newKodeBarang}
                    onChange={(e) => setNewKodeBarang(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nomor Register</label>
                  <input
                    type="text"
                    required
                    value={newRegister}
                    onChange={(e) => setNewRegister(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Nama Barang</label>
                  <input
                    type="text"
                    required
                    value={newNamaBarang}
                    onChange={(e) => setNewNamaBarang(e.target.value)}
                    placeholder="Contoh: Pompa Alkon Pemadam 20 HP"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Merk / Tipe / Spesifikasi</label>
                  <input
                    type="text"
                    required
                    value={newMerkTipe}
                    onChange={(e) => setNewMerkTipe(e.target.value)}
                    placeholder="Contoh: Tohatsu V20FS Portable"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Tahun Perolehan</label>
                  <input
                    type="number"
                    min={1980}
                    max={2100}
                    required
                    value={newTahun}
                    onChange={(e) => setNewTahun(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Harga Perolehan (Rp)</label>
                  <input
                    type="number"
                    min={0}
                    required
                    value={newHarga}
                    onChange={(e) => setNewHarga(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Kondisi Awal</label>
                  <select
                    value={newKondisi}
                    onChange={(e) => setNewKondisi(e.target.value as KondisiBarang)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    <option value="BAIK">Baik</option>
                    <option value="RUSAK_RINGAN">Rusak Ringan</option>
                    <option value="RUSAK_BERAT">Rusak Berat</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penempatan Lokasi</label>
                  <select
                    value={newLokasiId}
                    onChange={(e) => {
                      setNewLokasiId(e.target.value);
                      const loc = lokasiMap.get(e.target.value);
                      if (loc) setNewPj(loc.penanggungJawab);
                    }}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
                  >
                    {lokasiList.map((l) => (
                      <option key={l.id} value={l.id}>
                        {l.namaLokasi}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Penanggung Jawab</label>
                  <input
                    type="text"
                    required
                    value={newPj}
                    onChange={(e) => setNewPj(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">No. Polisi (Jika Armada)</label>
                  <input
                    type="text"
                    value={newNomorPolisi}
                    onChange={(e) => setNewNomorPolisi(e.target.value)}
                    placeholder="Opsional, mis: W 8025 NP"
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div>
                <label className="block font-semibold text-slate-700 mb-1">Asal Usul / Sumber Dana</label>
                <input
                  type="text"
                  value={newAsalUsul}
                  onChange={(e) => setNewAsalUsul(e.target.value)}
                  className="w-full px-3 py-2 border border-slate-300 rounded-md"
                />
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setShowCreateModal(false)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md cursor-pointer"
                >
                  Simpan & Generate Kode QR
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
