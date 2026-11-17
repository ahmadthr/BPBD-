import crypto from 'node:crypto';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import dotenv from 'dotenv';
import express, { NextFunction, Request, Response } from 'express';

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PORT = Number(process.env.PORT || 3000);
const SESSION_TTL_SECONDS = 30 * 60; // 30 menit masa aktif JWT

const JWT_SECRET =
  process.env.JWT_SECRET || crypto.randomBytes(32).toString('hex');

export type RoleKey =
  | 'SUPER_ADMIN'
  | 'ADMIN_PENGURUS_BARANG'
  | 'KASUBAG_UMUM'
  | 'PETUGAS_POS'
  | 'PIMPINAN_VIEWER';

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

interface UserRecord {
  id: string;
  nip: string;
  username: string;
  namaLengkap: string;
  jabatan: string;
  unitTugas: string;
  role: RoleKey;
  passwordSalt: string;
  passwordHash: string;
  aktif: boolean;
  lastLoginAt: string | null;
}

interface AuthAuditEntry {
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

interface JwtPayload {
  sub: string;
  nip: string;
  username: string;
  nama: string;
  role: RoleKey;
  iat: number;
  exp: number;
}

function hashPassword(password: string, salt?: string): { salt: string; hash: string } {
  const usedSalt = salt || crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, usedSalt, 64).toString('hex');
  return { salt: usedSalt, hash: derived };
}

function verifyPassword(password: string, salt: string, expectedHash: string): boolean {
  const derived = crypto.scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expectedHash, 'hex');
  if (derived.length !== expectedBuf.length) return false;
  return crypto.timingSafeEqual(derived, expectedBuf);
}

function base64UrlEncode(input: string | Buffer): string {
  return Buffer.from(input)
    .toString('base64')
    .replace(/=/g, '')
    .replace(/\+/g, '-')
    .replace(/\//g, '_');
}

function base64UrlDecode(input: string): string {
  const padded = input + '='.repeat((4 - (input.length % 4)) % 4);
  return Buffer.from(padded.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf8');
}

function signJwt(payload: Omit<JwtPayload, 'iat' | 'exp'>, ttlSeconds = SESSION_TTL_SECONDS): string {
  const now = Math.floor(Date.now() / 1000);
  const fullPayload: JwtPayload = {
    ...payload,
    iat: now,
    exp: now + ttlSeconds,
  };
  const header = base64UrlEncode(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = base64UrlEncode(JSON.stringify(fullPayload));
  const signature = base64UrlEncode(
    crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
  );
  return `${header}.${body}.${signature}`;
}

function verifyJwt(token: string): JwtPayload | null {
  try {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, body, sig] = parts;
    const expectedSig = base64UrlEncode(
      crypto.createHmac('sha256', JWT_SECRET).update(`${header}.${body}`).digest()
    );
    const sigBuf = Buffer.from(sig);
    const expBuf = Buffer.from(expectedSig);
    if (sigBuf.length !== expBuf.length || !crypto.timingSafeEqual(sigBuf, expBuf)) {
      return null;
    }
    const decoded = JSON.parse(base64UrlDecode(body)) as JwtPayload;
    const now = Math.floor(Date.now() / 1000);
    if (!decoded.exp || decoded.exp <= now) {
      return null;
    }
    return decoded;
  } catch {
    return null;
  }
}

// Matriks izin RBAC aktif (dapat diubah oleh Super Admin secara dinamis)
const rolePermissionsStore: Record<RoleKey, RolePermissions> = {
  SUPER_ADMIN: {
    kelolaMasterKib: true,
    cetakLabelQr: true,
    ajukanMutasi: true,
    setujuiMutasi: true,
    verifikasiMutasi: true,
    laporKerusakan: true,
    kelolaTeknisTiket: true,
    opnameQr: true,
    unduhLaporanResmi: true,
    kelolaPengguna: true,
    aturHakAkses: true,
    editNamaPengguna: true,
  },
  ADMIN_PENGURUS_BARANG: {
    kelolaMasterKib: true,
    cetakLabelQr: true,
    ajukanMutasi: true,
    setujuiMutasi: false,
    verifikasiMutasi: true,
    laporKerusakan: true,
    kelolaTeknisTiket: true,
    opnameQr: true,
    unduhLaporanResmi: true,
    kelolaPengguna: true,
    aturHakAkses: false,
    editNamaPengguna: false,
  },
  KASUBAG_UMUM: {
    kelolaMasterKib: false,
    cetakLabelQr: true,
    ajukanMutasi: true,
    setujuiMutasi: true,
    verifikasiMutasi: false,
    laporKerusakan: true,
    kelolaTeknisTiket: false,
    opnameQr: true,
    unduhLaporanResmi: true,
    kelolaPengguna: false,
    aturHakAkses: false,
    editNamaPengguna: false,
  },
  PETUGAS_POS: {
    kelolaMasterKib: false,
    cetakLabelQr: false,
    ajukanMutasi: true,
    setujuiMutasi: false,
    verifikasiMutasi: false,
    laporKerusakan: true,
    kelolaTeknisTiket: false,
    opnameQr: true,
    unduhLaporanResmi: false,
    kelolaPengguna: false,
    aturHakAkses: false,
    editNamaPengguna: false,
  },
  PIMPINAN_VIEWER: {
    kelolaMasterKib: false,
    cetakLabelQr: false,
    ajukanMutasi: false,
    setujuiMutasi: false,
    verifikasiMutasi: false,
    laporKerusakan: false,
    kelolaTeknisTiket: false,
    opnameQr: false,
    unduhLaporanResmi: true,
    kelolaPengguna: false,
    aturHakAkses: false,
    editNamaPengguna: false,
  },
};

function createSeedUser(
  id: string,
  nip: string,
  username: string,
  namaLengkap: string,
  jabatan: string,
  unitTugas: string,
  role: RoleKey,
  initialPassword: string
): UserRecord {
  const { salt, hash } = hashPassword(initialPassword);
  return {
    id,
    nip,
    username,
    namaLengkap,
    jabatan,
    unitTugas,
    role,
    passwordSalt: salt,
    passwordHash: hash,
    aktif: true,
    lastLoginAt: null,
  };
}

// Seed 1 Super Admin + 4 Persona Operasional BPBD Kabupaten Sidoarjo
const usersStore: UserRecord[] = [
  createSeedUser(
    'usr-superadmin',
    '198401012008011001',
    'super.admin',
    'Ahmad Taufiq, S.Kom.',
    'Super Administrator Sistem Informasi OPD',
    'Pusdalops & Sekretariat BPBD Kab. Sidoarjo',
    'SUPER_ADMIN',
    'SuperAdmin#2026'
  ),
  createSeedUser(
    'usr-admin',
    '198604122010011008',
    'admin.bmd',
    'Hendra Wijaya, S.Sos.',
    'Pengurus Barang Pengguna OPD',
    'Mako BPBD Kab. Sidoarjo',
    'ADMIN_PENGURUS_BARANG',
    'BpbdSda#2026'
  ),
  createSeedUser(
    'usr-kasubag',
    '197909212005012014',
    'kasubag.umum',
    'Dra. Siti Rahmawati, M.Si.',
    'Kepala Sub Bagian Umum & Kepegawaian',
    'Sekretariat BPBD Kab. Sidoarjo',
    'KASUBAG_UMUM',
    'Kasubag#2026'
  ),
  createSeedUser(
    'usr-petugas',
    '199107152018031004',
    'pos.buduran',
    'Budi Santoso',
    'Komandan Regu Pos Damkar Unit Buduran',
    'Pos Damkar Unit Buduran',
    'PETUGAS_POS',
    'Damkar#2026'
  ),
  createSeedUser(
    'usr-pimpinan',
    '197211031998031006',
    'kalaksa.bpbd',
    'Ir. Dwi Nugroho Santoso, M.T.',
    'Kepala Pelaksana BPBD Kab. Sidoarjo',
    'Pimpinan OPD BPBD Sidoarjo',
    'PIMPINAN_VIEWER',
    'Pimpinan#2026'
  ),
];

const authAuditStore: AuthAuditEntry[] = [
  {
    id: 'auth-seed-0',
    waktu: '2026-11-16T07:15:00+07:00',
    identifier: 'super.admin',
    namaPengguna: 'Ahmad Taufiq, S.Kom.',
    role: 'SUPER_ADMIN',
    status: 'LOGIN_BERHASIL',
    keterangan: 'Inisialisasi Super Admin dan peninjauan matriks RBAC BPBD Sidoarjo',
    ipAddress: '10.15.22.2',
  },
  {
    id: 'auth-seed-1',
    waktu: '2026-11-16T07:30:00+07:00',
    identifier: '198604122010011008',
    namaPengguna: 'Hendra Wijaya, S.Sos.',
    role: 'ADMIN_PENGURUS_BARANG',
    status: 'LOGIN_BERHASIL',
    keterangan: 'Autentikasi awal sesi pagi Pengurus Barang Mako BPBD',
    ipAddress: '10.15.22.4',
  },
  {
    id: 'auth-seed-2',
    waktu: '2026-11-16T08:05:00+07:00',
    identifier: 'pos.buduran',
    namaPengguna: 'Budi Santoso',
    role: 'PETUGAS_POS',
    status: 'LOGIN_BERHASIL',
    keterangan: 'Login perangkat mobile Pos Damkar Buduran untuk opname harian',
    ipAddress: '10.15.44.19',
  },
];

function sanitizeUser(u: UserRecord) {
  return {
    id: u.id,
    nip: u.nip,
    username: u.username,
    namaLengkap: u.namaLengkap,
    jabatan: u.jabatan,
    unitTugas: u.unitTugas,
    role: u.role,
    aktif: u.aktif,
    lastLoginAt: u.lastLoginAt,
  };
}

interface AuthedRequest extends Request {
  auth?: JwtPayload;
}

function requireAuth(req: AuthedRequest, res: Response, next: NextFunction) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token otentikasi tidak ditemukan.' });
  }
  const token = header.slice('Bearer '.length).trim();
  const payload = verifyJwt(token);
  if (!payload) {
    return res.status(401).json({ error: 'Sesi JWT tidak valid atau telah kedaluwarsa.' });
  }
  req.auth = payload;
  next();
}

function recordAuthAudit(
  req: Request,
  entry: Omit<AuthAuditEntry, 'id' | 'waktu' | 'ipAddress'>
) {
  const ip =
    (typeof req.headers['x-forwarded-for'] === 'string'
      ? req.headers['x-forwarded-for'].split(',')[0].trim()
      : req.socket.remoteAddress) || '127.0.0.1';
  authAuditStore.unshift({
    id: `auth-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
    waktu: new Date().toISOString(),
    ipAddress: ip,
    ...entry,
  });
  if (authAuditStore.length > 150) {
    authAuditStore.length = 150;
  }
}

async function startServer() {
  const app = express();
  app.use(express.json());

  app.get('/api/health', (_req, res) => {
    res.json({ ok: true, service: 'simas-bmd-bpbd-sidoarjo' });
  });

  // POST /api/auth/login
  app.post('/api/auth/login', (req, res) => {
    const { identifier, password } = req.body as {
      identifier?: string;
      password?: string;
    };

    const cleanId = (identifier || '').replace(/\s+/g, '').trim().toLowerCase();
    const rawPass = password || '';

    if (!cleanId || !rawPass) {
      return res.status(400).json({ error: 'NIP/Username dan password wajib diisi.' });
    }

    const user = usersStore.find(
      (u) =>
        u.nip.replace(/\s+/g, '').toLowerCase() === cleanId ||
        u.username.toLowerCase() === cleanId
    );

    if (!user) {
      recordAuthAudit(req, {
        identifier: identifier || '-',
        namaPengguna: 'Tidak Dikenal',
        role: 'UNKNOWN',
        status: 'LOGIN_GAGAL',
        keterangan: 'NIP atau username tidak terdaftar di SIMAS-BMD.',
      });
      return res.status(401).json({ error: 'NIP/Username atau password tidak valid.' });
    }

    if (!user.aktif) {
      recordAuthAudit(req, {
        identifier: user.nip,
        namaPengguna: user.namaLengkap,
        role: user.role,
        status: 'LOGIN_GAGAL',
        keterangan: 'Akun berstatus nonaktif — akses diblokir.',
      });
      return res.status(403).json({
        error: 'Akun Anda sedang dinonaktifkan. Hubungi Super Admin / Pengurus Barang.',
      });
    }

    const validPass = verifyPassword(rawPass, user.passwordSalt, user.passwordHash);
    if (!validPass) {
      recordAuthAudit(req, {
        identifier: user.nip,
        namaPengguna: user.namaLengkap,
        role: user.role,
        status: 'LOGIN_GAGAL',
        keterangan: 'Percobaan masuk dengan kata sandi yang salah.',
      });
      return res.status(401).json({ error: 'NIP/Username atau password tidak valid.' });
    }

    user.lastLoginAt = new Date().toISOString();
    const token = signJwt({
      sub: user.id,
      nip: user.nip,
      username: user.username,
      nama: user.namaLengkap,
      role: user.role,
    });

    const decoded = verifyJwt(token)!;
    recordAuthAudit(req, {
      identifier: user.nip,
      namaPengguna: user.namaLengkap,
      role: user.role,
      status: 'LOGIN_BERHASIL',
      keterangan: `Autentikasi berhasil; token JWT aktif ${SESSION_TTL_SECONDS / 60} menit.`,
    });

    res.json({
      token,
      expiresAt: decoded.exp * 1000,
      ttlSeconds: SESSION_TTL_SECONDS,
      user: sanitizeUser(user),
      permissionsMap: rolePermissionsStore,
    });
  });

  // POST /api/auth/refresh
  app.post('/api/auth/refresh', requireAuth, (req: AuthedRequest, res) => {
    const auth = req.auth!;
    const user = usersStore.find((u) => u.id === auth.sub && u.aktif);
    if (!user) {
      return res.status(403).json({ error: 'Akun tidak ditemukan atau tidak aktif.' });
    }
    const token = signJwt({
      sub: user.id,
      nip: user.nip,
      username: user.username,
      nama: user.namaLengkap,
      role: user.role,
    });
    const decoded = verifyJwt(token)!;
    recordAuthAudit(req, {
      identifier: user.nip,
      namaPengguna: user.namaLengkap,
      role: user.role,
      status: 'TOKEN_DIPERBARUI',
      keterangan: 'Memperpanjang masa aktif token JWT sesi kerja.',
    });
    res.json({
      token,
      expiresAt: decoded.exp * 1000,
      ttlSeconds: SESSION_TTL_SECONDS,
      user: sanitizeUser(user),
      permissionsMap: rolePermissionsStore,
    });
  });

  // POST /api/auth/logout
  app.post('/api/auth/logout', requireAuth, (req: AuthedRequest, res) => {
    const auth = req.auth!;
    recordAuthAudit(req, {
      identifier: auth.nip,
      namaPengguna: auth.nama,
      role: auth.role,
      status: 'LOGOUT',
      keterangan: 'Pengguna keluar dari sesi SIMAS-BMD secara normal.',
    });
    res.json({ ok: true });
  });

  // GET /api/auth/me
  app.get('/api/auth/me', requireAuth, (req: AuthedRequest, res) => {
    const auth = req.auth!;
    const user = usersStore.find((u) => u.id === auth.sub && u.aktif);
    if (!user) {
      return res.status(401).json({ error: 'Pengguna tidak valid atau nonaktif.' });
    }
    res.json({
      user: sanitizeUser(user),
      expiresAt: auth.exp * 1000,
      permissionsMap: rolePermissionsStore,
    });
  });

  // GET /api/rbac/permissions — Ambil matriks izin RBAC aktif
  app.get('/api/rbac/permissions', requireAuth, (_req, res) => {
    res.json({ permissionsMap: rolePermissionsStore });
  });

  // PUT /api/rbac/permissions — Khusus SUPER_ADMIN untuk menentukan hak akses tiap peran
  app.put('/api/rbac/permissions', requireAuth, (req: AuthedRequest, res) => {
    if (req.auth!.role !== 'SUPER_ADMIN') {
      recordAuthAudit(req, {
        identifier: req.auth!.nip,
        namaPengguna: req.auth!.nama,
        role: req.auth!.role,
        status: 'AKSES_DITOLAK',
        keterangan: 'Percobaan mengubah matriks hak akses RBAC tanpa otoritas Super Admin.',
      });
      return res.status(403).json({
        error: 'Hanya Super Admin yang berwenang menentukan matriks hak akses RBAC.',
      });
    }

    const { permissionsMap } = req.body as {
      permissionsMap?: Partial<Record<RoleKey, Partial<RolePermissions>>>;
    };

    if (!permissionsMap) {
      return res.status(400).json({ error: 'Data matriks hak akses tidak valid.' });
    }

    const editableRoles: RoleKey[] = [
      'ADMIN_PENGURUS_BARANG',
      'KASUBAG_UMUM',
      'PETUGAS_POS',
      'PIMPINAN_VIEWER',
    ];

    for (const r of editableRoles) {
      const incoming = permissionsMap[r];
      if (!incoming) continue;
      rolePermissionsStore[r] = {
        ...rolePermissionsStore[r],
        ...incoming,
        // Hanya Super Admin yang memegang otoritas aturHakAkses & editNamaPengguna kecuali diberikan eksplisit
        aturHakAkses: Boolean(incoming.aturHakAkses ?? rolePermissionsStore[r].aturHakAkses),
        editNamaPengguna: Boolean(incoming.editNamaPengguna ?? rolePermissionsStore[r].editNamaPengguna),
      };
    }

    recordAuthAudit(req, {
      identifier: req.auth!.nip,
      namaPengguna: req.auth!.nama,
      role: req.auth!.role,
      status: 'UBAH_HAK_AKSES',
      keterangan: 'Super Admin memperbarui konfigurasi matriks hak akses RBAC OPD.',
    });

    res.json({ permissionsMap: rolePermissionsStore });
  });

  // GET /api/auth/audit-logs
  app.get('/api/auth/audit-logs', requireAuth, (req: AuthedRequest, res) => {
    const role = req.auth!.role;
    if (
      role !== 'SUPER_ADMIN' &&
      role !== 'ADMIN_PENGURUS_BARANG' &&
      role !== 'KASUBAG_UMUM'
    ) {
      return res.status(403).json({ error: 'Akses log keamanan hanya untuk Super Admin, Admin & Kasubag.' });
    }
    res.json({ logs: authAuditStore });
  });

  // GET /api/users — Super Admin & Pengurus Barang (yang memiliki izin kelolaPengguna)
  app.get('/api/users', requireAuth, (req: AuthedRequest, res) => {
    const perms = rolePermissionsStore[req.auth!.role];
    if (!perms?.kelolaPengguna) {
      recordAuthAudit(req, {
        identifier: req.auth!.nip,
        namaPengguna: req.auth!.nama,
        role: req.auth!.role,
        status: 'AKSES_DITOLAK',
        keterangan: 'Percobaan akses daftar pengguna tanpa hak kelola pengguna.',
      });
      return res.status(403).json({ error: 'Anda tidak memiliki izin mengelola data pengguna.' });
    }
    res.json({ users: usersStore.map(sanitizeUser) });
  });

  // POST /api/users — Tambah akun pengguna baru
  app.post('/api/users', requireAuth, (req: AuthedRequest, res) => {
    const callerRole = req.auth!.role;
    const perms = rolePermissionsStore[callerRole];
    if (!perms?.kelolaPengguna) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }
    const { nip, username, namaLengkap, jabatan, unitTugas, role, password } = req.body as {
      nip?: string;
      username?: string;
      namaLengkap?: string;
      jabatan?: string;
      unitTugas?: string;
      role?: RoleKey;
      password?: string;
    };

    if (!nip || !username || !namaLengkap || !role || !password) {
      return res.status(400).json({ error: 'Lengkapi seluruh data akun dan kata sandi awal.' });
    }

    if (role === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
      return res.status(403).json({ error: 'Hanya Super Admin yang dapat membuat akun Super Admin.' });
    }

    const cleanNip = nip.replace(/\s+/g, '');
    const cleanUsername = username.trim().toLowerCase();
    const duplicate = usersStore.find(
      (u) => u.nip.replace(/\s+/g, '') === cleanNip || u.username.toLowerCase() === cleanUsername
    );
    if (duplicate) {
      return res.status(409).json({ error: 'NIP atau username sudah terdaftar.' });
    }

    const created = createSeedUser(
      `usr-${Date.now()}`,
      cleanNip,
      cleanUsername,
      namaLengkap.trim(),
      (jabatan || 'Petugas Operasional').trim(),
      (unitTugas || 'Mako BPBD Kab. Sidoarjo').trim(),
      role,
      password
    );
    usersStore.unshift(created);
    recordAuthAudit(req, {
      identifier: req.auth!.nip,
      namaPengguna: req.auth!.nama,
      role: callerRole,
      status: 'UBAH_PENGGUNA',
      keterangan: `Menambahkan akun ${created.namaLengkap} (${created.username}) sebagai ${created.role}.`,
    });
    res.status(201).json({ user: sanitizeUser(created) });
  });

  // PATCH /api/users/:id — Edit nama lengkap, profil, role, status aktif, atau reset password
  app.patch('/api/users/:id', requireAuth, (req: AuthedRequest, res) => {
    const callerRole = req.auth!.role;
    const perms = rolePermissionsStore[callerRole];
    if (!perms?.kelolaPengguna && !perms?.editNamaPengguna) {
      return res.status(403).json({ error: 'Akses ditolak.' });
    }

    const target = usersStore.find((u) => u.id === req.params.id);
    if (!target) {
      return res.status(404).json({ error: 'Pengguna tidak ditemukan.' });
    }

    if (target.role === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
      return res.status(403).json({
        error: 'Akun Super Admin hanya dapat diubah oleh Super Admin.',
      });
    }

    const { namaLengkap, nip, username, jabatan, unitTugas, role, aktif, newPassword } = req.body as {
      namaLengkap?: string;
      nip?: string;
      username?: string;
      jabatan?: string;
      unitTugas?: string;
      role?: RoleKey;
      aktif?: boolean;
      newPassword?: string;
    };

    const changes: string[] = [];

    if (typeof namaLengkap === 'string' && namaLengkap.trim()) {
      if (!perms.editNamaPengguna && callerRole !== 'SUPER_ADMIN') {
        return res.status(403).json({
          error: 'Hanya Super Admin yang berwenang mengedit nama dan profil pengguna.',
        });
      }
      if (namaLengkap.trim() !== target.namaLengkap) {
        changes.push(`Nama: "${target.namaLengkap}" → "${namaLengkap.trim()}"`);
        target.namaLengkap = namaLengkap.trim();
      }
    }

    if (typeof nip === 'string' && nip.trim()) {
      const cleanNip = nip.replace(/\s+/g, '');
      const dupNip = usersStore.find(
        (u) => u.id !== target.id && u.nip.replace(/\s+/g, '') === cleanNip
      );
      if (dupNip) {
        return res.status(409).json({ error: 'NIP sudah digunakan oleh pengguna lain.' });
      }
      if (cleanNip !== target.nip) {
        changes.push(`NIP diperbarui`);
        target.nip = cleanNip;
      }
    }

    if (typeof username === 'string' && username.trim()) {
      const cleanU = username.trim().toLowerCase();
      const dupU = usersStore.find(
        (u) => u.id !== target.id && u.username.toLowerCase() === cleanU
      );
      if (dupU) {
        return res.status(409).json({ error: 'Username sudah digunakan oleh pengguna lain.' });
      }
      if (cleanU !== target.username) {
        changes.push(`Username: ${target.username} → ${cleanU}`);
        target.username = cleanU;
      }
    }

    if (typeof jabatan === 'string' && jabatan.trim() && jabatan.trim() !== target.jabatan) {
      target.jabatan = jabatan.trim();
      changes.push('Jabatan diperbarui');
    }

    if (typeof unitTugas === 'string' && unitTugas.trim() && unitTugas.trim() !== target.unitTugas) {
      target.unitTugas = unitTugas.trim();
      changes.push('Unit tugas diperbarui');
    }

    if (role && role !== target.role) {
      if (role === 'SUPER_ADMIN' && callerRole !== 'SUPER_ADMIN') {
        return res.status(403).json({ error: 'Hanya Super Admin yang dapat menetapkan peran Super Admin.' });
      }
      if (target.id === req.auth!.sub) {
        return res.status(400).json({ error: 'Tidak dapat mengubah peran akun yang sedang aktif Anda gunakan.' });
      }
      changes.push(`Peran: ${target.role} → ${role}`);
      target.role = role;
    }

    if (typeof aktif === 'boolean' && aktif !== target.aktif) {
      if (target.id === req.auth!.sub && !aktif) {
        return res.status(400).json({ error: 'Tidak dapat menonaktifkan akun yang sedang dipakai.' });
      }
      target.aktif = aktif;
      changes.push(`Status: ${aktif ? 'Aktif' : 'Nonaktif'}`);
    }

    if (typeof newPassword === 'string' && newPassword.trim().length >= 6) {
      const { salt, hash } = hashPassword(newPassword.trim());
      target.passwordSalt = salt;
      target.passwordHash = hash;
      changes.push('Kata sandi direset');
    }

    if (changes.length > 0) {
      recordAuthAudit(req, {
        identifier: req.auth!.nip,
        namaPengguna: req.auth!.nama,
        role: callerRole,
        status: 'UBAH_PENGGUNA',
        keterangan: `Memperbarui profil ${target.namaLengkap} (${changes.join('; ')})`,
      });
    }

    res.json({ user: sanitizeUser(target) });
  });

  if (process.env.NODE_ENV !== 'production') {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.resolve(__dirname, 'dist');
    app.use(express.static(distPath));
    app.get('*', (_req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`SIMAS-BMD server berjalan pada port ${PORT}`);
  });
}

startServer();
