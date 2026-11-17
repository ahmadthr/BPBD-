import { FormEvent, useState } from 'react';
import {
  AlertCircle,
  ArrowRight,
  Eye,
  EyeOff,
  KeyRound,
  Lock,
  ShieldCheck,
  User,
} from 'lucide-react';
import { DEMO_CREDENTIALS } from '../data/initialBmdData';
import { AuthSession } from '../types/bmd';

interface LoginPageProps {
  onLoginSuccess: (session: AuthSession) => void;
  sessionNotice?: string | null;
}

const BPBD_LOGO_URL = '/assets/aistudio/logo-bpbd-sidoarjo_5004ea7b.jpg';

export function BpbdLogoImage({ size = 48 }: { size?: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (imgFailed) {
    return (
      <div
        style={{ width: size, height: size }}
        className="rounded-full bg-white border border-slate-200 flex items-center justify-center shrink-0 text-[10px] font-bold text-[#0F2A4A]"
      >
        BPBD
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className="rounded-full bg-white p-0.5 border border-slate-200/80 overflow-hidden flex items-center justify-center shrink-0 shadow-xs"
    >
      <img
        src={BPBD_LOGO_URL}
        alt="Logo resmi BPBD Kabupaten Sidoarjo"
        referrerPolicy="no-referrer"
        onError={() => setImgFailed(true)}
        className="w-full h-full object-contain rounded-full"
      />
    </div>
  );
}

export function LoginPage({ onLoginSuccess, sessionNotice }: LoginPageProps) {
  const [identifier, setIdentifier] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [selectedDemoRole, setSelectedDemoRole] = useState<string | null>(null);

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);
    if (!identifier.trim() || !password) {
      setErrorMessage('Masukkan NIP atau username serta kata sandi Anda.');
      return;
    }

    setSubmitting(true);
    try {
      const response = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          identifier: identifier.trim(),
          password,
        }),
      });

      const data = (await response.json()) as {
        error?: string;
        token?: string;
        expiresAt?: number;
        user?: AuthSession['user'];
        permissionsMap?: AuthSession['permissionsMap'];
      };

      if (!response.ok || !data.token || !data.user || !data.expiresAt) {
        setErrorMessage(data.error || 'Autentikasi gagal. Periksa kembali kredensial Anda.');
        return;
      }

      onLoginSuccess({
        token: data.token,
        expiresAt: data.expiresAt,
        user: data.user,
        permissionsMap: data.permissionsMap,
      });
    } catch {
      setErrorMessage('Tidak dapat terhubung ke layanan autentikasi SIMAS-BMD.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#EEF2F7] flex flex-col justify-between">
      {/* Top Accent Strip dengan Palet Resmi BPBD (Biru Tua · Oranye Tanggap Bencana · Merah) */}
      <div className="h-1.5 w-full flex shrink-0" aria-hidden="true">
        <div className="flex-1 bg-[#0B2240]" />
        <div className="w-40 bg-[#EA580C]" />
        <div className="w-20 bg-[#C81E1E]" />
      </div>

      {/* Header Instansi Resmi */}
      <header className="bg-white border-b border-slate-200 px-4 sm:px-8 py-3.5">
        <div className="max-w-6xl mx-auto flex items-center justify-between gap-4">
          <div className="flex items-center gap-3.5 min-w-0">
            <BpbdLogoImage size={48} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold tracking-wider text-[#EA580C] truncate">
                PEMERINTAH KABUPATEN SIDOARJO
              </p>
              <p className="text-sm sm:text-base font-bold text-[#0B2240] font-display truncate">
                BADAN PENANGGULANGAN BENCANA DAERAH
              </p>
            </div>
          </div>
          <div className="hidden md:flex items-center gap-2 text-xs text-slate-600 shrink-0">
            <span className="font-semibold text-[#0B2240]">SIMAS-BMD</span>
            <span aria-hidden="true" className="text-slate-300">·</span>
            <span>Inventarisasi & Manajemen BMD</span>
          </div>
        </div>
      </header>

      {/* Konten Utama 2 Kolom */}
      <main className="flex-1 flex items-center justify-center px-4 py-8 sm:px-6 lg:px-8">
        <div className="w-full max-w-6xl grid grid-cols-1 gap-6 lg:grid-cols-12 items-stretch">
          {/* Kolom Kiri: Panel Identitas BPBD Berwarna Biru Tua + Aksen Oranye */}
          <div className="lg:col-span-6 bg-gradient-to-br from-[#0B2240] via-[#0F2D54] to-[#143B6B] text-white rounded-xl p-6 sm:p-8 flex flex-col justify-between gap-6 border border-[#1E4A7D]">
            <div className="space-y-5">
              <div className="flex items-center gap-4">
                <BpbdLogoImage size={64} />
                <div>
                  <p className="text-xs font-semibold tracking-wider text-amber-400">
                    SISTEM INFORMASI ASET DAERAH
                  </p>
                  <h2 className="text-lg font-bold text-white font-display">
                    SIMAS-BMD BPBD Sidoarjo
                  </h2>
                </div>
              </div>

              <div className="space-y-2.5">
                <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-white text-balance leading-tight">
                  Tertib Aset, Siap Siaga Bencana
                </h1>
                <p className="text-sm text-blue-100/90 leading-relaxed">
                  Platform terpadu pengelolaan Kartu Inventaris Barang (KIB A–F), pemindaian label QR Code di pos Damkar, alur persetujuan mutasi, dan tiket perbaikan armada kebencanaan.
                </p>
              </div>

              {/* Fitur Keamanan Inti */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                <div className="bg-white/10 border border-white/15 rounded-lg p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-amber-300 text-xs font-semibold">
                    <ShieldCheck className="w-4 h-4 shrink-0" />
                    <span>Otorisasi RBAC 5 Peran</span>
                  </div>
                  <p className="text-xs text-blue-100/85 leading-relaxed">
                    Redireksi otomatis ke ruang kerja sesuai hak akses masing-masing pegawai.
                  </p>
                </div>
                <div className="bg-white/10 border border-white/15 rounded-lg p-3.5 space-y-1">
                  <div className="flex items-center gap-2 text-emerald-300 text-xs font-semibold">
                    <Lock className="w-4 h-4 shrink-0" />
                    <span>Sesi JWT & Audit Trail</span>
                  </div>
                  <p className="text-xs text-blue-100/85 leading-relaxed">
                    Token sesi aktif 30 menit dengan pencatatan audit otomatis setiap autentikasi.
                  </p>
                </div>
              </div>
            </div>

            {/* Daftar Akun Uji Cepat */}
            <div className="bg-[#081A33]/80 border border-white/15 rounded-lg overflow-hidden">
              <div className="px-4 py-2.5 border-b border-white/10 flex items-center justify-between gap-2">
                <p className="text-xs font-semibold text-amber-300">
                  Akun Pengujian Cepat (Klik untuk Isi Otomatis)
                </p>
                <span className="text-[11px] text-blue-200/80 font-mono">UAT / Demo</span>
              </div>
              <div className="divide-y divide-white/10">
                {DEMO_CREDENTIALS.map((cred) => {
                  const isPicked = selectedDemoRole === cred.role;
                  return (
                    <button
                      key={cred.role}
                      type="button"
                      onClick={() => {
                        setIdentifier(cred.identifier);
                        setPassword(cred.password);
                        setSelectedDemoRole(cred.role);
                        setErrorMessage(null);
                      }}
                      className={`w-full text-left px-4 py-2.5 flex items-center justify-between gap-3 transition-colors cursor-pointer ${
                        isPicked ? 'bg-[#EA580C]/20' : 'hover:bg-white/5'
                      }`}
                    >
                      <div className="min-w-0">
                        <p className="text-xs font-semibold text-white truncate">
                          {cred.label}
                        </p>
                        <p className="text-[11px] font-mono text-blue-200/80 truncate tabular-nums">
                          {cred.identifier} · {cred.tujuanHalaman}
                        </p>
                      </div>
                      <span className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-semibold text-white bg-[#EA580C] hover:bg-[#DC4E08] rounded shrink-0 whitespace-nowrap">
                        Isi
                        <ArrowRight className="w-3 h-3" />
                      </span>
                    </button>
                  );
                })}
              </div>
            </div>
          </div>

          {/* Kolom Kanan: Kartu Form Login Bersih Kontras Tinggi */}
          <div className="lg:col-span-6 bg-white border border-slate-200 rounded-xl p-6 sm:p-10 flex flex-col justify-center">
            <div className="max-w-md w-full mx-auto space-y-6">
              <div className="space-y-2 border-b border-slate-200 pb-5">
                <div className="inline-flex items-center gap-2 text-xs font-semibold text-[#EA580C]">
                  <KeyRound className="w-4 h-4" />
                  <span>AUTENTIKASI PENGGUNA OPD</span>
                </div>
                <h2 className="text-2xl font-bold text-[#0B2240] font-display">
                  Masuk ke SIMAS-BMD
                </h2>
                <p className="text-xs text-slate-600 leading-relaxed">
                  Masukkan NIP pegawai atau username yang terdaftar pada lingkungan kerja BPBD Kabupaten Sidoarjo.
                </p>
              </div>

              {sessionNotice && (
                <div className="flex items-start gap-2.5 px-3.5 py-3 bg-amber-50 border border-amber-200 rounded-md text-xs text-amber-900">
                  <AlertCircle className="w-4 h-4 text-amber-700 shrink-0 mt-0.5" />
                  <span>{sessionNotice}</span>
                </div>
              )}

              {errorMessage && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 px-3.5 py-3 bg-red-50 border border-red-200 rounded-md text-xs text-red-900"
                >
                  <AlertCircle className="w-4 h-4 text-red-700 shrink-0 mt-0.5" />
                  <span>{errorMessage}</span>
                </div>
              )}

              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label
                    htmlFor="login-identifier"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    NIP atau Username
                  </label>
                  <div className="relative">
                    <User className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-identifier"
                      type="text"
                      autoComplete="username"
                      required
                      value={identifier}
                      onChange={(e) => setIdentifier(e.target.value)}
                      placeholder="Contoh: super.admin atau 198604122010011008"
                      className="w-full pl-10 pr-3.5 py-2.5 text-sm font-mono bg-slate-50/60 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/25 focus:border-[#EA580C]"
                    />
                  </div>
                </div>

                <div>
                  <label
                    htmlFor="login-password"
                    className="block text-xs font-semibold text-slate-700 mb-1.5"
                  >
                    Kata Sandi
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
                    <input
                      id="login-password"
                      type={showPassword ? 'text' : 'password'}
                      autoComplete="current-password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Masukkan kata sandi akun"
                      className="w-full pl-10 pr-11 py-2.5 text-sm bg-slate-50/60 border border-slate-300 rounded-md focus:bg-white focus:outline-none focus:ring-2 focus:ring-[#EA580C]/25 focus:border-[#EA580C]"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      aria-label={showPassword ? 'Sembunyikan kata sandi' : 'Lihat kata sandi'}
                      className="absolute right-2.5 top-1/2 -translate-y-1/2 p-1.5 text-slate-500 hover:text-slate-900 cursor-pointer"
                    >
                      {showPassword ? (
                        <EyeOff className="w-4 h-4" />
                      ) : (
                        <Eye className="w-4 h-4" />
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={submitting}
                  className="w-full py-3 px-4 text-sm font-semibold text-white bg-gradient-to-r from-[#0B2240] to-[#174175] hover:from-[#102E57] hover:to-[#1C4D8A] disabled:opacity-60 rounded-md transition-all cursor-pointer shadow-xs"
                >
                  {submitting ? 'Memverifikasi Kredensial...' : 'Masuk ke Sistem'}
                </button>
              </form>

              <div className="pt-4 border-t border-slate-100 flex items-center justify-between gap-2 text-[11px] text-slate-500">
                <span>Diaudit otomatis oleh sistem keamanan OPD</span>
                <span className="font-mono text-[#0B2240] font-semibold">BPBD Sidoarjo</span>
              </div>
            </div>
          </div>
        </div>
      </main>

      <footer className="border-t border-slate-200 bg-white px-6 py-3.5 text-center text-xs text-slate-500">
        SIMAS-BMD · Badan Penanggulangan Bencana Daerah Kabupaten Sidoarjo
      </footer>
    </div>
  );
}
