import { FormEvent, useCallback, useEffect, useState } from 'react';
import {
  Check,
  CheckCircle2,
  Pencil,
  Plus,
  RefreshCw,
  Save,
  Shield,
  UserCheck,
  UserX,
  X,
} from 'lucide-react';
import { ROLE_PROFILES } from '../data/initialBmdData';
import { AuthAuditEntry, AuthUser, RoleKey, RolePermissions } from '../types/bmd';
import { formatWaktuIndonesia } from '../utils/formatters';

interface UserRbacViewProps {
  token: string;
  currentUserId: string;
  currentUserRole: RoleKey;
  permissionsMap: Record<RoleKey, RolePermissions>;
  onPermissionsUpdated: (nextMap: Record<RoleKey, RolePermissions>) => void;
  onCurrentUserUpdated: (updatedUser: AuthUser) => void;
}

const PERMISSION_ROWS: Array<{
  key: keyof RolePermissions;
  label: string;
  deskripsi: string;
}> = [
  {
    key: 'kelolaMasterKib',
    label: 'CRUD Master KIB A–F',
    deskripsi: 'Tambah dan ubah data master barang milik daerah',
  },
  {
    key: 'cetakLabelQr',
    label: 'Cetak & Unduh Label QR',
    deskripsi: 'Mencetak stiker QR dan mengunduh file SVG resmi',
  },
  {
    key: 'opnameQr',
    label: 'Scan QR & Opname Fisik',
    deskripsi: 'Melakukan validasi fisik dan pencatatan kondisi lapangan',
  },
  {
    key: 'ajukanMutasi',
    label: 'Ajukan Mutasi Lokasi',
    deskripsi: 'Mengajukan permohonan pemindahan aset antar pos/bidang',
  },
  {
    key: 'setujuiMutasi',
    label: 'Approval Mutasi (Kasubag)',
    deskripsi: 'Menyetujui atau menolak permohonan mutasi aset',
  },
  {
    key: 'verifikasiMutasi',
    label: 'Verifikasi Final Mutasi',
    deskripsi: 'Memperbarui lokasi master KIB pasca persetujuan',
  },
  {
    key: 'laporKerusakan',
    label: 'Buat Tiket Kerusakan',
    deskripsi: 'Melaporkan kendala teknis peralatan dari pos',
  },
  {
    key: 'kelolaTeknisTiket',
    label: 'Proses & Tutup Tiket',
    deskripsi: 'Menugaskan teknisi dan memulihkan status kondisi KIB',
  },
  {
    key: 'unduhLaporanResmi',
    label: 'Unduh Rekap Resmi (CSV)',
    deskripsi: 'Mengekspor rekapitulasi KIB A–F untuk laporan audit',
  },
  {
    key: 'kelolaPengguna',
    label: 'Kelola Daftar Akun User',
    deskripsi: 'Melihat, menambah, dan mengaktifkan/menonaktifkan akun',
  },
];

const EDITABLE_ROLES: RoleKey[] = [
  'ADMIN_PENGURUS_BARANG',
  'KASUBAG_UMUM',
  'PETUGAS_POS',
  'PIMPINAN_VIEWER',
];

export function UserRbacView({
  token,
  currentUserId,
  currentUserRole,
  permissionsMap,
  onPermissionsUpdated,
  onCurrentUserUpdated,
}: UserRbacViewProps) {
  const isSuperAdmin = currentUserRole === 'SUPER_ADMIN';

  const [users, setUsers] = useState<AuthUser[]>([]);
  const [authLogs, setAuthLogs] = useState<AuthAuditEntry[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  // Draft matriks izin lokal untuk Super Admin
  const [draftMatrix, setDraftMatrix] = useState<Record<RoleKey, RolePermissions>>(permissionsMap);
  const [savingMatrix, setSavingMatrix] = useState(false);

  // Form tambah pengguna
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [nip, setNip] = useState('');
  const [username, setUsername] = useState('');
  const [namaLengkap, setNamaLengkap] = useState('');
  const [jabatan, setJabatan] = useState('');
  const [unitTugas, setUnitTugas] = useState('Pos Damkar Unit Krian');
  const [role, setRole] = useState<RoleKey>('PETUGAS_POS');
  const [password, setPassword] = useState('');
  const [savingUser, setSavingUser] = useState(false);

  // Modal Edit Nama & Profil Pengguna
  const [editingUser, setEditingUser] = useState<AuthUser | null>(null);
  const [editNama, setEditNama] = useState('');
  const [editNip, setEditNip] = useState('');
  const [editUsername, setEditUsername] = useState('');
  const [editJabatan, setEditJabatan] = useState('');
  const [editUnitTugas, setEditUnitTugas] = useState('');
  const [editRole, setEditRole] = useState<RoleKey>('PETUGAS_POS');
  const [editPassword, setEditPassword] = useState('');
  const [savingEdit, setSavingEdit] = useState(false);

  useEffect(() => {
    setDraftMatrix(permissionsMap);
  }, [permissionsMap]);

  const fetchData = useCallback(async () => {
    setLoading(true);
    setErrorMsg(null);
    try {
      const [usersRes, logsRes, permRes] = await Promise.all([
        fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/auth/audit-logs', { headers: { Authorization: `Bearer ${token}` } }),
        fetch('/api/rbac/permissions', { headers: { Authorization: `Bearer ${token}` } }),
      ]);

      if (!usersRes.ok) {
        const d = (await usersRes.json()) as { error?: string };
        throw new Error(d.error || 'Gagal memuat daftar pengguna.');
      }

      const usersData = (await usersRes.json()) as { users: AuthUser[] };
      setUsers(usersData.users);

      if (logsRes.ok) {
        const logsData = (await logsRes.json()) as { logs: AuthAuditEntry[] };
        setAuthLogs(logsData.logs);
      }

      if (permRes.ok) {
        const permData = (await permRes.json()) as {
          permissionsMap: Record<RoleKey, RolePermissions>;
        };
        setDraftMatrix(permData.permissionsMap);
      }
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Terjadi kesalahan jaringan.');
    } finally {
      setLoading(false);
    }
  }, [token]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const openEditModal = (u: AuthUser) => {
    setEditingUser(u);
    setEditNama(u.namaLengkap);
    setEditNip(u.nip);
    setEditUsername(u.username);
    setEditJabatan(u.jabatan);
    setEditUnitTugas(u.unitTugas);
    setEditRole(u.role);
    setEditPassword('');
    setErrorMsg(null);
    setSuccessMsg(null);
  };

  const handleSaveEditUser = async (e: FormEvent) => {
    e.preventDefault();
    if (!editingUser) return;
    setSavingEdit(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const bodyPayload: Record<string, unknown> = {
        namaLengkap: editNama.trim(),
        nip: editNip.trim(),
        username: editUsername.trim(),
        jabatan: editJabatan.trim(),
        unitTugas: editUnitTugas.trim(),
      };
      if (editingUser.id !== currentUserId) {
        bodyPayload.role = editRole;
      }
      if (editPassword.trim().length >= 6) {
        bodyPayload.newPassword = editPassword.trim();
      }

      const res = await fetch(`/api/users/${editingUser.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify(bodyPayload),
      });

      const data = (await res.json()) as { error?: string; user?: AuthUser };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Gagal memperbarui profil pengguna.');
      }

      setUsers((prev) => prev.map((u) => (u.id === data.user!.id ? data.user! : u)));
      if (data.user.id === currentUserId) {
        onCurrentUserUpdated(data.user);
      }
      setEditingUser(null);
      setSuccessMsg(`Profil pengguna ${data.user.namaLengkap} berhasil diperbarui.`);
      fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan perubahan profil.');
    } finally {
      setSavingEdit(false);
    }
  };

  const handleTogglePermission = (targetRole: RoleKey, key: keyof RolePermissions) => {
    if (!isSuperAdmin || targetRole === 'SUPER_ADMIN') return;
    setDraftMatrix((prev) => ({
      ...prev,
      [targetRole]: {
        ...prev[targetRole],
        [key]: !prev[targetRole][key],
      },
    }));
  };

  const handleSaveMatrix = async () => {
    if (!isSuperAdmin) return;
    setSavingMatrix(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/rbac/permissions', {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ permissionsMap: draftMatrix }),
      });
      const data = (await res.json()) as {
        error?: string;
        permissionsMap?: Record<RoleKey, RolePermissions>;
      };
      if (!res.ok || !data.permissionsMap) {
        throw new Error(data.error || 'Gagal menyimpan matriks hak akses.');
      }
      onPermissionsUpdated(data.permissionsMap);
      setSuccessMsg('Matriks hak akses RBAC berhasil diperbarui dan diterapkan langsung ke seluruh peran.');
      fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui hak akses.');
    } finally {
      setSavingMatrix(false);
    }
  };

  const handleCreateUser = async (e: FormEvent) => {
    e.preventDefault();
    setSavingUser(true);
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch('/api/users', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          nip,
          username,
          namaLengkap,
          jabatan,
          unitTugas,
          role,
          password,
        }),
      });
      const data = (await res.json()) as { error?: string; user?: AuthUser };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Gagal menambah pengguna baru.');
      }
      setUsers((prev) => [data.user!, ...prev]);
      setNip('');
      setUsername('');
      setNamaLengkap('');
      setJabatan('');
      setPassword('');
      setShowCreateForm(false);
      setSuccessMsg(`Akun ${data.user.namaLengkap} berhasil ditambahkan.`);
      fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal menyimpan pengguna.');
    } finally {
      setSavingUser(false);
    }
  };

  const handleToggleActive = async (user: AuthUser) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ aktif: !user.aktif }),
      });
      const data = (await res.json()) as { error?: string; user?: AuthUser };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Gagal mengubah status akun.');
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user! : u)));
      setSuccessMsg(
        `Akun ${data.user.namaLengkap} kini berstatus ${data.user.aktif ? 'Aktif' : 'Nonaktif'}.`
      );
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui akun.');
    }
  };

  const handleRoleChange = async (user: AuthUser, nextRole: RoleKey) => {
    setErrorMsg(null);
    setSuccessMsg(null);
    try {
      const res = await fetch(`/api/users/${user.id}`, {
        method: 'PATCH',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ role: nextRole }),
      });
      const data = (await res.json()) as { error?: string; user?: AuthUser };
      if (!res.ok || !data.user) {
        throw new Error(data.error || 'Gagal mengubah peran pengguna.');
      }
      setUsers((prev) => prev.map((u) => (u.id === user.id ? data.user! : u)));
      setSuccessMsg(`Peran ${data.user.namaLengkap} diubah menjadi ${ROLE_PROFILES[nextRole].label}.`);
      fetchData();
    } catch (err) {
      setErrorMsg(err instanceof Error ? err.message : 'Gagal memperbarui peran.');
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            {isSuperAdmin
              ? 'KONSOL OTORITAS SUPER ADMIN · PENENTUAN HAK AKSES & IDENTITAS'
              : 'OTORISASI & KEAMANAN SISTEM (RBAC)'}
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Manajemen Pengguna & Hak Akses RBAC
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            {isSuperAdmin
              ? 'Kelola akun pegawai BPBD Sidoarjo, ubah nama dan profil pengguna, serta tentukan matriks hak akses untuk setiap peran secara dinamis.'
              : 'Kelola daftar akun pegawai BPBD Sidoarjo dan pantau log autentikasi JWT. Perubahan nama & matriks hak akses dikendalikan oleh Super Admin.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={fetchData}
            className="inline-flex items-center gap-1.5 px-3.5 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            Muat Ulang
          </button>
          <button
            type="button"
            onClick={() => setShowCreateForm((v) => !v)}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Plus className="w-4 h-4" />
            {showCreateForm ? 'Tutup Form' : 'Tambah Akun Pegawai'}
          </button>
        </div>
      </div>

      {successMsg && (
        <div className="flex items-start gap-2.5 px-4 py-3 bg-emerald-50 border border-emerald-200 rounded-md text-xs text-emerald-900">
          <CheckCircle2 className="w-4 h-4 text-emerald-700 shrink-0 mt-0.5" />
          <span>{successMsg}</span>
        </div>
      )}

      {errorMsg && (
        <div className="px-4 py-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-900">
          {errorMsg}
        </div>
      )}

      {/* Form Tambah Pengguna */}
      {showCreateForm && (
        <form
          onSubmit={handleCreateUser}
          className="bg-white border border-slate-200 rounded-lg p-5 space-y-4 text-xs"
        >
          <div className="flex items-center justify-between border-b border-slate-100 pb-3">
            <h2 className="text-sm font-semibold text-slate-900">
              Daftarkan Akun Pegawai Baru (tb_users)
            </h2>
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="text-slate-400 hover:text-slate-700 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
            <div>
              <label className="block font-semibold text-slate-700 mb-1">NIP Pegawai</label>
              <input
                type="text"
                required
                value={nip}
                onChange={(e) => setNip(e.target.value)}
                placeholder="199402182020121003"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Username</label>
              <input
                type="text"
                required
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="pos.krian"
                className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Kata Sandi Awal</label>
              <input
                type="password"
                required
                minLength={6}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Minimal 6 karakter"
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
            <div className="sm:col-span-2">
              <label className="block font-semibold text-slate-700 mb-1">Nama Lengkap & Gelar</label>
              <input
                type="text"
                required
                value={namaLengkap}
                onChange={(e) => setNamaLengkap(e.target.value)}
                placeholder="Arif Kurniawan, A.Md."
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Unit / Pos Tugas</label>
              <input
                type="text"
                required
                value={unitTugas}
                onChange={(e) => setUnitTugas(e.target.value)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md"
              />
            </div>
            <div>
              <label className="block font-semibold text-slate-700 mb-1">Peran RBAC</label>
              <select
                value={role}
                onChange={(e) => setRole(e.target.value as RoleKey)}
                className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white"
              >
                {Object.values(ROLE_PROFILES)
                  .filter((rp) => isSuperAdmin || rp.key !== 'SUPER_ADMIN')
                  .map((rp) => (
                    <option key={rp.key} value={rp.key}>
                      {rp.label}
                    </option>
                  ))}
              </select>
            </div>
          </div>

          <div>
            <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
            <input
              type="text"
              value={jabatan}
              onChange={(e) => setJabatan(e.target.value)}
              placeholder="Komandan Regu Pos Damkar Unit Krian"
              className="w-full px-3 py-2 border border-slate-300 rounded-md"
            />
          </div>

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              onClick={() => setShowCreateForm(false)}
              className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
            >
              Batal
            </button>
            <button
              type="submit"
              disabled={savingUser}
              className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md cursor-pointer"
            >
              <Check className="w-3.5 h-3.5" />
              {savingUser ? 'Menyimpan...' : 'Simpan Akun'}
            </button>
          </div>
        </form>
      )}

      {/* Daftar Pengguna Terdaftar */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex items-center justify-between">
          <div>
            <h2 className="text-base font-semibold text-slate-900">
              Daftar Pengguna Terdaftar (tb_users)
            </h2>
            <p className="text-xs text-slate-500 mt-0.5">
              {isSuperAdmin
                ? 'Klik "Edit Nama" untuk mengubah nama lengkap, NIP, jabatan, unit tugas, atau kata sandi akun manapun.'
                : 'Daftar akun pegawai BPBD Kabupaten Sidoarjo.'}
            </p>
          </div>
          <span className="font-mono text-xs text-slate-500 tabular-nums">
            {users.length} akun
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <th className="py-2.5 px-4">NIP & Username</th>
                <th className="py-2.5 px-4">Nama & Unit Tugas</th>
                <th className="py-2.5 px-4">Peran RBAC</th>
                <th className="py-2.5 px-4">Status & Login Terakhir</th>
                <th className="py-2.5 px-4 text-right">Aksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {loading ? (
                <tr>
                  <td colSpan={5} className="py-8 px-4 text-center text-slate-500">
                    Memuat data pengguna RBAC...
                  </td>
                </tr>
              ) : (
                users.map((u) => {
                  const isSelf = u.id === currentUserId;
                  const isTargetSuper = u.role === 'SUPER_ADMIN';
                  const canModifyRow = isSuperAdmin || !isTargetSuper;

                  return (
                    <tr key={u.id} className="hover:bg-slate-50">
                      <td className="py-3 px-4 font-mono tabular-nums align-top">
                        <p className="font-semibold text-slate-900">{u.username}</p>
                        <p className="text-slate-500">{u.nip}</p>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p className="font-semibold text-slate-900">
                          {u.namaLengkap}{' '}
                          {isSelf && <span className="text-[#0F2A4A]">(Anda)</span>}
                        </p>
                        <p className="text-slate-500">
                          {u.jabatan} · {u.unitTugas}
                        </p>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <select
                          aria-label={`Ubah peran ${u.namaLengkap}`}
                          value={u.role}
                          disabled={isSelf || !canModifyRow}
                          onChange={(e) => handleRoleChange(u, e.target.value as RoleKey)}
                          className="px-2.5 py-1.5 text-xs border border-slate-300 rounded bg-white disabled:bg-slate-100"
                        >
                          {Object.values(ROLE_PROFILES)
                            .filter((rp) => isSuperAdmin || rp.key !== 'SUPER_ADMIN')
                            .map((rp) => (
                              <option key={rp.key} value={rp.key}>
                                {rp.label}
                              </option>
                            ))}
                        </select>
                      </td>
                      <td className="py-3 px-4 align-top">
                        <p
                          className={`font-semibold ${
                            u.aktif ? 'text-emerald-700' : 'text-red-700'
                          }`}
                        >
                          {u.aktif ? 'Aktif' : 'Nonaktif'}
                        </p>
                        <p className="font-mono text-[11px] text-slate-500 tabular-nums mt-0.5">
                          {u.lastLoginAt
                            ? formatWaktuIndonesia(u.lastLoginAt)
                            : 'Belum pernah login'}
                        </p>
                      </td>
                      <td className="py-3 px-4 text-right align-top">
                        <div className="inline-flex items-center justify-end gap-2">
                          {isSuperAdmin && (
                            <button
                              type="button"
                              onClick={() => openEditModal(u)}
                              className="inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold text-[#0F2A4A] bg-white border border-slate-300 hover:bg-slate-50 rounded transition-colors cursor-pointer whitespace-nowrap"
                            >
                              <Pencil className="w-3.5 h-3.5" />
                              Edit Nama
                            </button>
                          )}
                          {!isSelf && canModifyRow && (
                            <button
                              type="button"
                              onClick={() => handleToggleActive(u)}
                              className={`inline-flex items-center gap-1 px-2.5 py-1.5 text-xs font-semibold border rounded transition-colors cursor-pointer whitespace-nowrap ${
                                u.aktif
                                  ? 'text-red-700 border-red-300 bg-white hover:bg-red-50'
                                  : 'text-emerald-700 border-emerald-300 bg-white hover:bg-emerald-50'
                              }`}
                            >
                              {u.aktif ? (
                                <>
                                  <UserX className="w-3.5 h-3.5" />
                                  Nonaktifkan
                                </>
                              ) : (
                                <>
                                  <UserCheck className="w-3.5 h-3.5" />
                                  Aktifkan
                                </>
                              )}
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Editor Matriks Kewenangan RBAC (Dinamis untuk Super Admin) */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex items-start gap-2.5">
            <Shield className="w-4 h-4 text-[#0F2A4A] shrink-0 mt-0.5" />
            <div>
              <h2 className="text-base font-semibold text-slate-900">
                Penentuan Matriks Hak Akses (RBAC Matrix)
              </h2>
              <p className="text-xs text-slate-500 mt-0.5">
                {isSuperAdmin
                  ? 'Centang atau hapus centang izin per peran lalu klik "Simpan Hak Akses" untuk langsung mengubah kewenangan operasional.'
                  : 'Konfigurasi izin aktif yang ditetapkan oleh Super Admin Sistem.'}
              </p>
            </div>
          </div>

          {isSuperAdmin && (
            <button
              type="button"
              onClick={handleSaveMatrix}
              disabled={savingMatrix}
              className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] disabled:opacity-60 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
            >
              <Save className="w-3.5 h-3.5" />
              {savingMatrix ? 'Menyimpan...' : 'Simpan Hak Akses'}
            </button>
          )}
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Kewenangan / Modul</th>
                <th className="py-2.5 px-3 text-center">Super Admin</th>
                <th className="py-2.5 px-3 text-center">Admin / Pengurus Barang</th>
                <th className="py-2.5 px-3 text-center">Kasubag Umum</th>
                <th className="py-2.5 px-3 text-center">Petugas Pos</th>
                <th className="py-2.5 px-4 text-center">Pimpinan / Viewer</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {PERMISSION_ROWS.map((row) => (
                <tr key={row.key} className="hover:bg-slate-50/60">
                  <td className="py-3 px-4">
                    <p className="font-semibold text-slate-900">{row.label}</p>
                    <p className="text-[11px] text-slate-500">{row.deskripsi}</p>
                  </td>
                  <td className="py-3 px-3 text-center">
                    <span className="font-mono text-[11px] font-semibold text-emerald-700">
                      Penuh
                    </span>
                  </td>
                  {EDITABLE_ROLES.map((rk) => {
                    const checked = Boolean(draftMatrix[rk]?.[row.key]);
                    return (
                      <td key={rk} className="py-3 px-3 text-center">
                        {isSuperAdmin ? (
                          <input
                            type="checkbox"
                            aria-label={`${row.label} untuk ${ROLE_PROFILES[rk].label}`}
                            checked={checked}
                            onChange={() => handleTogglePermission(rk, row.key)}
                            className="w-4 h-4 accent-[#0F2A4A] cursor-pointer"
                          />
                        ) : (
                          <span
                            className={`font-semibold ${
                              checked ? 'text-emerald-700' : 'text-slate-400'
                            }`}
                          >
                            {checked ? 'Ya' : 'Tidak'}
                          </span>
                        )}
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Log Autentikasi & Perubahan RBAC */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Log Autentikasi & Perubahan Hak Akses (auth_audit_log)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Mencatat login, kegagalan kata sandi, perubahan nama/profil pengguna, dan pembaruan matriks RBAC.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-4">NIP / Username</th>
                <th className="py-2.5 px-4">Status Kejadian</th>
                <th className="py-2.5 px-4">IP / Keterangan</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {authLogs.map((log) => (
                <tr key={log.id}>
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWaktuIndonesia(log.waktu)}
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-slate-900">{log.namaPengguna}</p>
                    <p className="font-mono text-[11px] text-slate-500">{log.identifier}</p>
                  </td>
                  <td className="py-2.5 px-4">
                    <span
                      className={`font-mono font-semibold ${
                        log.status === 'LOGIN_BERHASIL' || log.status === 'TOKEN_DIPERBARUI'
                          ? 'text-emerald-700'
                          : log.status === 'UBAH_PENGGUNA' || log.status === 'UBAH_HAK_AKSES'
                            ? 'text-[#0F2A4A]'
                            : log.status === 'LOGOUT'
                              ? 'text-slate-600'
                              : 'text-red-700'
                      }`}
                    >
                      {log.status}
                    </span>
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">
                    <span className="font-mono text-slate-500 mr-2">{log.ipAddress}</span>
                    {log.keterangan}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal Edit Nama & Profil Pengguna (Khusus Super Admin) */}
      {editingUser && isSuperAdmin && (
        <div
          className="fixed inset-0 z-50 bg-slate-900/50 flex items-center justify-center p-4"
          onClick={() => setEditingUser(null)}
        >
          <div
            className="bg-white border border-slate-200 rounded-lg w-full max-w-xl max-h-[90vh] overflow-y-auto p-6 space-y-5"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center justify-between border-b border-slate-200 pb-3">
              <div>
                <p className="text-xs font-semibold text-[#0F2A4A]">OTORITAS SUPER ADMIN</p>
                <h2 className="text-lg font-bold text-slate-900">
                  Edit Nama & Profil Pengguna
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setEditingUser(null)}
                aria-label="Tutup modal edit"
                className="p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleSaveEditUser} className="space-y-4 text-xs">
              <div>
                <label className="block font-semibold text-slate-700 mb-1">
                  Nama Lengkap & Gelar
                </label>
                <input
                  type="text"
                  required
                  value={editNama}
                  onChange={(e) => setEditNama(e.target.value)}
                  className="w-full px-3 py-2 text-sm border border-slate-300 rounded-md focus:outline-none focus:border-[#0F2A4A]"
                />
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">NIP Pegawai</label>
                  <input
                    type="text"
                    required
                    value={editNip}
                    onChange={(e) => setEditNip(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Username</label>
                  <input
                    type="text"
                    required
                    value={editUsername}
                    onChange={(e) => setEditUsername(e.target.value)}
                    className="w-full px-3 py-2 font-mono border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Jabatan</label>
                  <input
                    type="text"
                    required
                    value={editJabatan}
                    onChange={(e) => setEditJabatan(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Unit / Pos Tugas</label>
                  <input
                    type="text"
                    required
                    value={editUnitTugas}
                    onChange={(e) => setEditUnitTugas(e.target.value)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">Peran RBAC</label>
                  <select
                    value={editRole}
                    disabled={editingUser.id === currentUserId}
                    onChange={(e) => setEditRole(e.target.value as RoleKey)}
                    className="w-full px-3 py-2 border border-slate-300 rounded-md bg-white disabled:bg-slate-100"
                  >
                    {Object.values(ROLE_PROFILES).map((rp) => (
                      <option key={rp.key} value={rp.key}>
                        {rp.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block font-semibold text-slate-700 mb-1">
                    Reset Kata Sandi (Opsional)
                  </label>
                  <input
                    type="password"
                    minLength={6}
                    value={editPassword}
                    onChange={(e) => setEditPassword(e.target.value)}
                    placeholder="Kosongkan jika tidak diubah"
                    className="w-full px-3 py-2 border border-slate-300 rounded-md"
                  />
                </div>
              </div>

              <div className="flex justify-end gap-2 pt-3 border-t border-slate-200">
                <button
                  type="button"
                  onClick={() => setEditingUser(null)}
                  className="px-4 py-2 font-semibold text-slate-700 bg-white border border-slate-300 rounded-md hover:bg-slate-50 cursor-pointer"
                >
                  Batal
                </button>
                <button
                  type="submit"
                  disabled={savingEdit}
                  className="inline-flex items-center gap-1.5 px-4 py-2 font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  {savingEdit ? 'Menyimpan...' : 'Simpan Perubahan'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
