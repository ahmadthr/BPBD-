import { useCallback, useEffect, useState } from 'react';
import {
  ArrowLeftRight,
  ClipboardList,
  Database,
  Download,
  LayoutDashboard,
  LogOut,
  Menu,
  QrCode,
  RefreshCw,
  Shield,
  Users,
  Wrench,
  X,
} from 'lucide-react';
import { AssetDashboard } from './components/AssetDashboard';
import { DatabaseBlueprintView } from './components/DatabaseBlueprintView';
import { KibInventoryView } from './components/KibInventoryView';
import { BpbdLogoImage, LoginPage } from './components/LoginPage';
import { MutasiView, TiketKerusakanView } from './components/MutasiTiketView';
import { QrScannerModule } from './components/QrScannerModule';
import { UserRbacView } from './components/UserRbacView';
import {
  INITIAL_ASET,
  INITIAL_AUDIT_LOG,
  INITIAL_LOKASI,
  INITIAL_MUTASI,
  INITIAL_OPNAME,
  INITIAL_TIKET,
  ROLE_PROFILES,
} from './data/initialBmdData';
import {
  AsetBMD,
  AuditLogEntry,
  AuthSession,
  AuthUser,
  KibGolongan,
  KondisiBarang,
  MutasiAset,
  OpnameFisik,
  PrioritasTiket,
  RoleKey,
  RolePermissions,
  RoleProfile,
  StatusTiket,
  TabKey,
  TiketKerusakan,
} from './types/bmd';
import { LABEL_GOLONGAN_KIB, LABEL_KONDISI } from './utils/formatters';

const DATA_STORAGE_KEY = 'simas_bmd_sidoarjo_state_v1';
const AUTH_STORAGE_KEY = 'simas_bmd_jwt_session_v1';

const DEFAULT_PERMISSIONS_MAP: Record<RoleKey, RolePermissions> = {
  SUPER_ADMIN: ROLE_PROFILES.SUPER_ADMIN.izin,
  ADMIN_PENGURUS_BARANG: ROLE_PROFILES.ADMIN_PENGURUS_BARANG.izin,
  KASUBAG_UMUM: ROLE_PROFILES.KASUBAG_UMUM.izin,
  PETUGAS_POS: ROLE_PROFILES.PETUGAS_POS.izin,
  PIMPINAN_VIEWER: ROLE_PROFILES.PIMPINAN_VIEWER.izin,
};

interface PersistedState {
  asets: AsetBMD[];
  mutasiList: MutasiAset[];
  tiketList: TiketKerusakan[];
  opnameHistory: OpnameFisik[];
  auditLogs: AuditLogEntry[];
}

function loadPersistedState(): PersistedState {
  try {
    const raw = localStorage.getItem(DATA_STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw) as Partial<PersistedState>;
      if (Array.isArray(parsed.asets) && parsed.asets.length > 0) {
        return {
          asets: parsed.asets,
          mutasiList: parsed.mutasiList ?? INITIAL_MUTASI,
          tiketList: parsed.tiketList ?? INITIAL_TIKET,
          opnameHistory: parsed.opnameHistory ?? INITIAL_OPNAME,
          auditLogs: parsed.auditLogs ?? INITIAL_AUDIT_LOG,
        };
      }
    }
  } catch {
    // Gunakan data awal jika penyimpanan lokal belum tersedia
  }
  return {
    asets: INITIAL_ASET,
    mutasiList: INITIAL_MUTASI,
    tiketList: INITIAL_TIKET,
    opnameHistory: INITIAL_OPNAME,
    auditLogs: INITIAL_AUDIT_LOG,
  };
}

function loadStoredSession(): AuthSession | null {
  try {
    const raw = sessionStorage.getItem(AUTH_STORAGE_KEY);
    if (!raw) return null;
    const parsed = JSON.parse(raw) as AuthSession;
    if (!parsed.token || !parsed.expiresAt || !parsed.user) return null;
    if (parsed.expiresAt <= Date.now()) {
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      return null;
    }
    return parsed;
  } catch {
    return null;
  }
}

function formatCountdown(secondsLeft: number): string {
  const safe = Math.max(0, Math.floor(secondsLeft));
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, '0')}:${String(s).padStart(2, '0')}`;
}

const ALL_NAV_ITEMS: Array<{
  key: TabKey;
  label: string;
  icon: typeof LayoutDashboard;
  canAccess: (role: RoleProfile) => boolean;
}> = [
  {
    key: 'dashboard',
    label: 'Dashboard Rekap',
    icon: LayoutDashboard,
    canAccess: () => true,
  },
  {
    key: 'inventory',
    label: 'Master KIB A–F',
    icon: ClipboardList,
    canAccess: () => true,
  },
  {
    key: 'scanner',
    label: 'QR Scanner & Opname',
    icon: QrCode,
    canAccess: (r) => r.izin.opnameQr,
  },
  {
    key: 'mutasi',
    label: 'Mutasi & Lokasi',
    icon: ArrowLeftRight,
    canAccess: () => true,
  },
  {
    key: 'tiket',
    label: 'Tiket Kerusakan',
    icon: Wrench,
    canAccess: () => true,
  },
  {
    key: 'users',
    label: 'User & Hak Akses RBAC',
    icon: Users,
    canAccess: (r) => r.izin.kelolaPengguna || r.izin.aturHakAkses,
  },
  {
    key: 'database',
    label: 'Skema DDL & Audit',
    icon: Database,
    canAccess: (r) =>
      r.key === 'SUPER_ADMIN' ||
      r.key === 'ADMIN_PENGURUS_BARANG' ||
      r.key === 'KASUBAG_UMUM',
  },
];

export default function App() {
  const [session, setSession] = useState<AuthSession | null>(() => loadStoredSession());
  const [sessionNotice, setSessionNotice] = useState<string | null>(null);
  const [secondsLeft, setSecondsLeft] = useState<number>(() => {
    const s = loadStoredSession();
    return s ? Math.max(0, Math.floor((s.expiresAt - Date.now()) / 1000)) : 0;
  });

  const [activeTab, setActiveTab] = useState<TabKey>(() => {
    const s = loadStoredSession();
    return s ? ROLE_PROFILES[s.user.role].defaultLandingTab : 'dashboard';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const [state, setState] = useState<PersistedState>(() => loadPersistedState());
  const [filterGolongan, setFilterGolongan] = useState<KibGolongan | 'ALL'>('ALL');
  const [filterLokasiId, setFilterLokasiId] = useState<string>('ALL');

  const lokasiList = INITIAL_LOKASI;
  const lokasiMap = new Map(lokasiList.map((l) => [l.id, l]));

  // Persist data operasional
  useEffect(() => {
    try {
      localStorage.setItem(DATA_STORAGE_KEY, JSON.stringify(state));
    } catch {
      // Abaikan jika storage penuh
    }
  }, [state]);

  const [permissionsMap, setPermissionsMap] = useState<Record<RoleKey, RolePermissions>>(
    () => session?.permissionsMap ?? DEFAULT_PERMISSIONS_MAP
  );

  // Validasi sesi terhadap backend saat aplikasi dibuka ulang
  useEffect(() => {
    if (!session) return;
    let active = true;
    fetch('/api/auth/me', {
      headers: { Authorization: `Bearer ${session.token}` },
    })
      .then(async (res) => {
        if (!active) return;
        if (!res.ok) {
          sessionStorage.removeItem(AUTH_STORAGE_KEY);
          setSession(null);
          setSessionNotice('Sesi Anda telah berakhir atau tidak valid. Silakan masuk kembali.');
        } else {
          const data = (await res.json()) as {
            user: AuthSession['user'];
            expiresAt: number;
            permissionsMap?: Record<RoleKey, RolePermissions>;
          };
          const nextMap = data.permissionsMap ?? DEFAULT_PERMISSIONS_MAP;
          setPermissionsMap(nextMap);
          const updated: AuthSession = {
            token: session.token,
            user: data.user,
            expiresAt: data.expiresAt,
            permissionsMap: nextMap,
          };
          sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
          setSession(updated);
        }
      })
      .catch(() => {
        // Biarkan sesi lokal tetap berjalan jika server restart sementara
      });
    return () => {
      active = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Hitung mundur timeout JWT otomatis
  useEffect(() => {
    if (!session) return;
    const updateCountdown = () => {
      const remaining = Math.floor((session.expiresAt - Date.now()) / 1000);
      if (remaining <= 0) {
        sessionStorage.removeItem(AUTH_STORAGE_KEY);
        setSession(null);
        setSecondsLeft(0);
        setSessionNotice(
          'Masa aktif token JWT Anda telah habis (timeout keamanan). Silakan masuk kembali.'
        );
      } else {
        setSecondsLeft(remaining);
      }
    };

    updateCountdown();
    const timer = window.setInterval(updateCountdown, 1000);
    return () => window.clearInterval(timer);
  }, [session]);

  const handleLoginSuccess = (newSession: AuthSession) => {
    if (newSession.permissionsMap) {
      setPermissionsMap(newSession.permissionsMap);
    }
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(newSession));
    setSession(newSession);
    setSessionNotice(null);
    setSecondsLeft(Math.max(0, Math.floor((newSession.expiresAt - Date.now()) / 1000)));
    // Redireksi otomatis berbasis Role RBAC sesuai PRD
    const targetTab = ROLE_PROFILES[newSession.user.role].defaultLandingTab;
    setActiveTab(targetTab);
  };

  const handleRefreshSession = async () => {
    if (!session) return;
    try {
      const res = await fetch('/api/auth/refresh', {
        method: 'POST',
        headers: { Authorization: `Bearer ${session.token}` },
      });
      if (!res.ok) {
        handleLogout('Sesi tidak dapat diperpanjang. Silakan masuk kembali.');
        return;
      }
      const data = (await res.json()) as {
        token: string;
        expiresAt: number;
        user: AuthSession['user'];
        permissionsMap?: Record<RoleKey, RolePermissions>;
      };
      const nextMap = data.permissionsMap ?? permissionsMap;
      setPermissionsMap(nextMap);
      const nextSession: AuthSession = {
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
        permissionsMap: nextMap,
      };
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(nextSession));
      setSession(nextSession);
    } catch {
      // Abaikan kegagalan sementara
    }
  };

  const handleLogout = useCallback(
    async (notice?: string) => {
      if (session) {
        try {
          await fetch('/api/auth/logout', {
            method: 'POST',
            headers: { Authorization: `Bearer ${session.token}` },
          });
        } catch {
          // Lanjutkan pembersihan sesi lokal
        }
      }
      sessionStorage.removeItem(AUTH_STORAGE_KEY);
      setSession(null);
      setMobileMenuOpen(false);
      setSessionNotice(notice ?? null);
    },
    [session]
  );

  const handlePermissionsUpdated = (nextMap: Record<RoleKey, RolePermissions>) => {
    setPermissionsMap(nextMap);
    if (session) {
      const updated = { ...session, permissionsMap: nextMap };
      sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
      setSession(updated);
    }
  };

  const handleCurrentUserUpdated = (updatedUser: AuthUser) => {
    if (!session) return;
    const updated = { ...session, user: updatedUser };
    sessionStorage.setItem(AUTH_STORAGE_KEY, JSON.stringify(updated));
    setSession(updated);
  };

  // Jika belum login, tampilkan Halaman Login RBAC
  if (!session) {
    return (
      <LoginPage onLoginSuccess={handleLoginSuccess} sessionNotice={sessionNotice} />
    );
  }

  // Bangun RoleProfile aktif yang disinkronkan dengan data user & matriks izin dinamis
  const baseRole = ROLE_PROFILES[session.user.role];
  const activeIzin = permissionsMap[session.user.role] ?? baseRole.izin;
  const role: RoleProfile = {
    ...baseRole,
    namaPetugas: session.user.namaLengkap,
    nip: session.user.nip,
    jabatan: session.user.jabatan,
    unitTugas: session.user.unitTugas,
    izin: activeIzin,
  };

  const allowedNavItems = ALL_NAV_ITEMS.filter((item) => item.canAccess(role));
  const effectiveTab: TabKey = allowedNavItems.some((item) => item.key === activeTab)
    ? activeTab
    : role.defaultLandingTab;

  const appendAudit = (
    prevLogs: AuditLogEntry[],
    namaTabel: string,
    aksi: AuditLogEntry['aksi'],
    ringkasan: string
  ): AuditLogEntry[] => [
    {
      id: `log-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      waktuKejadian: new Date().toISOString(),
      penggunaNama: role.namaPetugas,
      peranSaatAksi: role.key,
      namaTabel,
      aksi,
      ringkasan,
    },
    ...prevLogs,
  ];

  const handleAddAset = (
    payload: Omit<AsetBMD, 'id' | 'kodeQr' | 'tanggalOpnameTerakhir'>
  ) => {
    if (!role.izin.kelolaMasterKib) return;
    const golCode = payload.golongan.replace('_', '');
    const kodeQr = `SDA-BPBD-${golCode}-${payload.tahunPerolehan}-${payload.nomorRegister}`;
    const newAset: AsetBMD = {
      ...payload,
      id: `ast-${Date.now()}`,
      kodeQr,
      tanggalOpnameTerakhir: new Date().toISOString().slice(0, 10),
    };
    setState((prev) => ({
      ...prev,
      asets: [newAset, ...prev.asets],
      auditLogs: appendAudit(
        prev.auditLogs,
        'kib_b_peralatan_mesin',
        'INSERT',
        `Mendaftarkan aset baru ${newAset.namaBarang} (${newAset.kodeQr})`
      ),
    }));
  };

  const handleLogPrintQr = (aset: AsetBMD) => {
    if (!role.izin.cetakLabelQr) return;
    setState((prev) => ({
      ...prev,
      auditLogs: appendAudit(
        prev.auditLogs,
        'kib_b_peralatan_mesin',
        'PRINT_QR',
        `Mencetak/mengunduh label QR Code ${aset.kodeQr} (${aset.namaBarang})`
      ),
    }));
  };

  const handleRecordOpname = (payload: {
    asetId: string;
    lokasiTervalidasiId: string;
    metodeValidasi: 'QR_CAMERA' | 'INPUT_MANUAL';
    kondisiFisik: KondisiBarang;
    catatanLapangan: string;
  }) => {
    if (!role.izin.opnameQr) return;
    const today = new Date().toISOString().slice(0, 10);
    const asetTarget = state.asets.find((a) => a.id === payload.asetId);
    const newOpname: OpnameFisik = {
      id: `opn-${Date.now()}`,
      asetId: payload.asetId,
      lokasiTervalidasiId: payload.lokasiTervalidasiId,
      petugasNama: role.namaPetugas,
      metodeValidasi: payload.metodeValidasi,
      kondisiFisik: payload.kondisiFisik,
      keberadaanFisik: true,
      catatanLapangan: payload.catatanLapangan,
      waktuOpname: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      asets: prev.asets.map((a) =>
        a.id === payload.asetId
          ? {
              ...a,
              kondisi: payload.kondisiFisik,
              lokasiId: payload.lokasiTervalidasiId,
              tanggalOpnameTerakhir: today,
            }
          : a
      ),
      opnameHistory: [newOpname, ...prev.opnameHistory],
      auditLogs: appendAudit(
        prev.auditLogs,
        'opname_fisik',
        'SCAN_OPNAME',
        `Opname fisik ${asetTarget?.namaBarang ?? payload.asetId}: kondisi ${LABEL_KONDISI[payload.kondisiFisik].label}`
      ),
    }));
  };

  const handleCreateMutasi = (payload: {
    asetId: string;
    lokasiTujuanId: string;
    penanggungJawabBaru: string;
    alasanMutasi: string;
  }) => {
    if (!role.izin.ajukanMutasi) return;
    const asetTarget = state.asets.find((a) => a.id === payload.asetId);
    if (!asetTarget) return;
    const seq = String(state.mutasiList.length + 1).padStart(3, '0');
    const newMutasi: MutasiAset = {
      id: `mut-${Date.now()}`,
      nomorBeritaAcara: `BA-MUT/BPBD/2026/11/${seq}`,
      asetId: payload.asetId,
      lokasiAsalId: asetTarget.lokasiId,
      lokasiTujuanId: payload.lokasiTujuanId,
      pemohonNama: role.namaPetugas,
      penanggungJawabBaru: payload.penanggungJawabBaru,
      alasanMutasi: payload.alasanMutasi,
      status: 'MENUNGGU_PERSETUJUAN',
      createdAt: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      mutasiList: [newMutasi, ...prev.mutasiList],
      auditLogs: appendAudit(
        prev.auditLogs,
        'mutasi_aset',
        'INSERT',
        `Mengajukan mutasi ${newMutasi.nomorBeritaAcara} untuk ${asetTarget.namaBarang}`
      ),
    }));
  };

  const handleApproveMutasi = (mutasiId: string, catatan: string) => {
    if (!role.izin.setujuiMutasi) return;
    const target = state.mutasiList.find((m) => m.id === mutasiId);
    setState((prev) => ({
      ...prev,
      mutasiList: prev.mutasiList.map((m) =>
        m.id === mutasiId
          ? {
              ...m,
              status: 'DISETUJUI_KASUBAG',
              disetujuiOleh: role.namaPetugas,
              tanggalPersetujuan: new Date().toISOString(),
              catatanApproval: catatan,
            }
          : m
      ),
      auditLogs: appendAudit(
        prev.auditLogs,
        'mutasi_aset',
        'APPROVE',
        `Kasubag Umum menyetujui mutasi ${target?.nomorBeritaAcara ?? mutasiId}`
      ),
    }));
  };

  const handleRejectMutasi = (mutasiId: string, catatan: string) => {
    if (!role.izin.setujuiMutasi) return;
    const target = state.mutasiList.find((m) => m.id === mutasiId);
    setState((prev) => ({
      ...prev,
      mutasiList: prev.mutasiList.map((m) =>
        m.id === mutasiId
          ? {
              ...m,
              status: 'DITOLAK',
              disetujuiOleh: role.namaPetugas,
              tanggalPersetujuan: new Date().toISOString(),
              catatanApproval: catatan,
            }
          : m
      ),
      auditLogs: appendAudit(
        prev.auditLogs,
        'mutasi_aset',
        'REJECT',
        `Menolak permohonan mutasi ${target?.nomorBeritaAcara ?? mutasiId}`
      ),
    }));
  };

  const handleVerifyMutasi = (mutasiId: string) => {
    if (!role.izin.verifikasiMutasi) return;
    const target = state.mutasiList.find((m) => m.id === mutasiId);
    if (!target) return;
    const asetTarget = state.asets.find((a) => a.id === target.asetId);
    const lokTujuan = lokasiMap.get(target.lokasiTujuanId);

    setState((prev) => ({
      ...prev,
      mutasiList: prev.mutasiList.map((m) =>
        m.id === mutasiId
          ? {
              ...m,
              status: 'SELESAI_VERIFIKASI',
              diverifikasiOleh: role.namaPetugas,
              tanggalVerifikasi: new Date().toISOString(),
            }
          : m
      ),
      asets: prev.asets.map((a) =>
        a.id === target.asetId
          ? {
              ...a,
              lokasiId: target.lokasiTujuanId,
              penanggungJawab: target.penanggungJawabBaru,
            }
          : a
      ),
      auditLogs: appendAudit(
        prev.auditLogs,
        'mutasi_aset',
        'UPDATE',
        `Verifikasi final ${target.nomorBeritaAcara}: ${asetTarget?.namaBarang ?? 'Aset'} dipindahkan ke ${lokTujuan?.namaLokasi ?? '-'}`
      ),
    }));
  };

  const handleCreateTiket = (payload: {
    asetId: string;
    prioritas: PrioritasTiket;
    kondisiDilaporkan: KondisiBarang;
    judulKeluhan: string;
    deskripsiKerusakan: string;
    estimasiBiaya: number;
  }) => {
    if (!role.izin.laporKerusakan) return;
    const asetTarget = state.asets.find((a) => a.id === payload.asetId);
    if (!asetTarget) return;
    const seq = String(143 + state.tiketList.length).padStart(4, '0');
    const newTiket: TiketKerusakan = {
      id: `tkt-${Date.now()}`,
      nomorTiket: `TKT-2026-${seq}`,
      asetId: payload.asetId,
      lokasiKejadianId: asetTarget.lokasiId,
      pelaporNama: role.namaPetugas,
      prioritas: payload.prioritas,
      kondisiDilaporkan: payload.kondisiDilaporkan,
      judulKeluhan: payload.judulKeluhan,
      deskripsiKerusakan: payload.deskripsiKerusakan,
      status: 'DILAPORKAN',
      estimasiBiaya: payload.estimasiBiaya,
      tanggalLapor: new Date().toISOString(),
    };

    setState((prev) => ({
      ...prev,
      tiketList: [newTiket, ...prev.tiketList],
      asets: prev.asets.map((a) =>
        a.id === payload.asetId ? { ...a, kondisi: payload.kondisiDilaporkan } : a
      ),
      auditLogs: appendAudit(
        prev.auditLogs,
        'tiket_kerusakan',
        'INSERT',
        `Melaporkan kerusakan ${newTiket.nomorTiket} (${payload.judulKeluhan})`
      ),
    }));
  };

  const handleUpdateTiketStatus = (
    tiketId: string,
    status: StatusTiket,
    teknisi?: string,
    tindakan?: string
  ) => {
    if (!role.izin.kelolaTeknisTiket) return;
    const target = state.tiketList.find((t) => t.id === tiketId);
    if (!target) return;

    setState((prev) => ({
      ...prev,
      tiketList: prev.tiketList.map((t) =>
        t.id === tiketId
          ? {
              ...t,
              status,
              teknisiPelaksana: teknisi ?? t.teknisiPelaksana,
              tindakanPerbaikan: tindakan ?? t.tindakanPerbaikan,
              tanggalSelesai:
                status === 'SELESAI_DIPERBAIKI' ? new Date().toISOString() : t.tanggalSelesai,
            }
          : t
      ),
      asets:
        status === 'SELESAI_DIPERBAIKI'
          ? prev.asets.map((a) => (a.id === target.asetId ? { ...a, kondisi: 'BAIK' } : a))
          : prev.asets,
      auditLogs: appendAudit(
        prev.auditLogs,
        'tiket_kerusakan',
        'UPDATE',
        `Memperbarui status tiket ${target.nomorTiket} menjadi ${status}`
      ),
    }));
  };

  const handleExportCsv = () => {
    if (!role.izin.unduhLaporanResmi) return;
    const headers = [
      'Golongan',
      'Kode Barang',
      'Nomor Register',
      'Kode QR',
      'Nama Barang',
      'Merk/Tipe',
      'Tahun Perolehan',
      'Harga Perolehan (IDR)',
      'Kondisi',
      'Lokasi/Pos',
      'Penanggung Jawab',
    ];
    const rows = state.asets.map((a) => [
      LABEL_GOLONGAN_KIB[a.golongan].kode,
      a.kodeBarang,
      a.nomorRegister,
      a.kodeQr,
      `"${a.namaBarang.replace(/"/g, '""')}"`,
      `"${a.merkTipe.replace(/"/g, '""')}"`,
      String(a.tahunPerolehan),
      String(a.hargaPerolehan),
      LABEL_KONDISI[a.kondisi].label,
      `"${lokasiMap.get(a.lokasiId)?.namaLokasi ?? '-'}"`,
      `"${a.penanggungJawab}"`,
    ]);
    const csv = [headers.join(','), ...rows.map((r) => r.join(','))].join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `Rekap-SIMAS-BMD-BPBD-Sidoarjo-${new Date().toISOString().slice(0, 10)}.csv`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const activeNavMeta = allowedNavItems.find((n) => n.key === effectiveTab);

  const sidebarContent = (
    <div className="flex flex-col h-full bg-[#0F2A4A] text-white">
      <div className="px-4 py-4 border-b border-white/10 flex items-center gap-3">
        <BpbdLogoImage size={38} />
        <div className="min-w-0">
          <p className="text-base font-bold tracking-tight text-white font-display truncate">
            SIMAS-BMD
          </p>
          <p className="text-[11px] text-amber-300/95 leading-snug truncate">
            BPBD Kab. Sidoarjo
          </p>
        </div>
      </div>

      <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto" aria-label="Menu utama">
        {allowedNavItems.map((item) => {
          const Icon = item.icon;
          const isActive = effectiveTab === item.key;
          return (
            <button
              key={item.key}
              type="button"
              onClick={() => {
                setActiveTab(item.key);
                setMobileMenuOpen(false);
              }}
              className={`w-full flex items-center gap-3 px-3 py-2.5 rounded-md text-xs font-semibold transition-colors whitespace-nowrap cursor-pointer ${
                isActive
                  ? 'bg-white text-[#0F2A4A]'
                  : 'text-blue-100 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="w-4 h-4 shrink-0" />
              <span className="truncate">{item.label}</span>
            </button>
          );
        })}
      </nav>

      {/* Panel Akun Terautentikasi, Status JWT & Kontrol Sesi */}
      <div className="p-4 border-t border-white/10 space-y-3 bg-[#0B203A]">
        <div className="space-y-1">
          <div className="flex items-center gap-1.5 text-[11px] font-semibold text-blue-200">
            <Shield className="w-3.5 h-3.5 shrink-0" />
            <span className="truncate">{role.label}</span>
          </div>
          <p className="text-xs font-semibold text-white truncate">{role.namaPetugas}</p>
          <p className="font-mono text-[10px] text-blue-200/80 tabular-nums">
            NIP {role.nip}
          </p>
        </div>

        <div className="pt-2 border-t border-white/10 flex items-center justify-between text-[11px]">
          <span className="text-blue-200/80">Sisa Sesi JWT</span>
          <span
            className={`font-mono font-semibold tabular-nums ${
              secondsLeft < 180 ? 'text-amber-300' : 'text-emerald-300'
            }`}
          >
            {formatCountdown(secondsLeft)}
          </span>
        </div>

        <div className="grid grid-cols-2 gap-2">
          <button
            type="button"
            onClick={handleRefreshSession}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-blue-100 bg-[#15365E] hover:bg-[#1E4A7D] rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <RefreshCw className="w-3 h-3" />
            Perpanjang
          </button>
          <button
            type="button"
            onClick={() => handleLogout()}
            className="inline-flex items-center justify-center gap-1 px-2 py-1.5 text-[11px] font-semibold text-red-100 bg-red-900/50 hover:bg-red-800/70 rounded transition-colors cursor-pointer whitespace-nowrap"
          >
            <LogOut className="w-3 h-3" />
            Keluar
          </button>
        </div>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-slate-50 flex">
      {/* Sidebar Desktop */}
      <aside className="hidden lg:block lg:w-64 lg:shrink-0 lg:sticky lg:top-0 lg:h-screen no-print">
        {sidebarContent}
      </aside>

      {/* Drawer Mobile */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 lg:hidden flex no-print">
          <div
            className="fixed inset-0 bg-slate-900/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative w-64 max-w-[80vw] h-full z-10">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(false)}
              aria-label="Tutup menu navigasi"
              className="absolute top-3 right-3 p-1.5 text-white/80 hover:text-white cursor-pointer"
            >
              <X className="w-5 h-5" />
            </button>
            {sidebarContent}
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 min-w-0 flex flex-col">
        {/* Top Bar Contract: Breadcrumb on Left, Single Action on Right */}
        <header className="sticky top-0 z-30 h-14 bg-white border-b border-slate-200 px-4 sm:px-6 flex items-center justify-between gap-4 no-print">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              aria-label="Buka menu navigasi"
              className="lg:hidden p-2 -ml-2 text-slate-700 hover:bg-slate-100 rounded-md cursor-pointer"
            >
              <Menu className="w-5 h-5" />
            </button>
            <div className="flex items-center gap-2 text-xs text-slate-500 min-w-0">
              <span className="font-semibold text-[#0F2A4A] whitespace-nowrap shrink-0">
                SIMAS-BMD
              </span>
              <span aria-hidden="true">/</span>
              <span className="font-medium text-slate-900 truncate">
                {activeNavMeta?.label ?? 'Dashboard'}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-3 shrink-0">
            {role.izin.opnameQr ? (
              <button
                type="button"
                onClick={() => setActiveTab('scanner')}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <QrCode className="w-3.5 h-3.5" />
                Scan QR
              </button>
            ) : (
              <button
                type="button"
                onClick={handleExportCsv}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
              >
                <Download className="w-3.5 h-3.5" />
                Unduh Rekap
              </button>
            )}
          </div>
        </header>

        <main className="flex-1 px-4 py-6 sm:px-6 lg:px-8 max-w-[1320px] w-full mx-auto">
          {effectiveTab === 'dashboard' && (
            <AssetDashboard
              role={role}
              asets={state.asets}
              lokasiList={lokasiList}
              mutasiList={state.mutasiList}
              tiketList={state.tiketList}
              onNavigateTab={(tab) => setActiveTab(tab)}
              onFilterByLokasi={(lokasiId) => {
                setFilterLokasiId(lokasiId);
                setFilterGolongan('ALL');
                setActiveTab('inventory');
              }}
              onFilterByGolongan={(golongan) => {
                setFilterGolongan(golongan);
                setFilterLokasiId('ALL');
                setActiveTab('inventory');
              }}
              onExportCsv={handleExportCsv}
            />
          )}

          {effectiveTab === 'inventory' && (
            <KibInventoryView
              role={role}
              asets={state.asets}
              lokasiList={lokasiList}
              filterGolongan={filterGolongan}
              filterLokasiId={filterLokasiId}
              onChangeGolongan={setFilterGolongan}
              onChangeLokasi={setFilterLokasiId}
              onAddAset={handleAddAset}
              onLogPrintQr={handleLogPrintQr}
            />
          )}

          {effectiveTab === 'scanner' && role.izin.opnameQr && (
            <QrScannerModule
              role={role}
              asets={state.asets}
              lokasiList={lokasiList}
              opnameHistory={state.opnameHistory}
              onRecordOpname={handleRecordOpname}
              onQuickCreateTiket={handleCreateTiket}
              onQuickCreateMutasi={handleCreateMutasi}
            />
          )}

          {effectiveTab === 'mutasi' && (
            <MutasiView
              role={role}
              asets={state.asets}
              lokasiList={lokasiList}
              mutasiList={state.mutasiList}
              onCreateMutasi={handleCreateMutasi}
              onApproveMutasi={handleApproveMutasi}
              onRejectMutasi={handleRejectMutasi}
              onVerifyMutasi={handleVerifyMutasi}
            />
          )}

          {effectiveTab === 'tiket' && (
            <TiketKerusakanView
              role={role}
              asets={state.asets}
              lokasiList={lokasiList}
              tiketList={state.tiketList}
              onCreateTiket={handleCreateTiket}
              onUpdateTiketStatus={handleUpdateTiketStatus}
            />
          )}

          {effectiveTab === 'users' && (role.izin.kelolaPengguna || role.izin.aturHakAkses) && (
            <UserRbacView
              token={session.token}
              currentUserId={session.user.id}
              currentUserRole={role.key}
              permissionsMap={permissionsMap}
              onPermissionsUpdated={handlePermissionsUpdated}
              onCurrentUserUpdated={handleCurrentUserUpdated}
            />
          )}

          {effectiveTab === 'database' &&
            (role.key === 'SUPER_ADMIN' ||
              role.key === 'ADMIN_PENGURUS_BARANG' ||
              role.key === 'KASUBAG_UMUM') && (
              <DatabaseBlueprintView auditLogs={state.auditLogs} />
            )}
        </main>
      </div>
    </div>
  );
}
