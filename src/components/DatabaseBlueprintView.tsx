import { useState } from 'react';
import { Check, Copy, Download } from 'lucide-react';
import { DDL_SQL_EXCERPT } from '../data/initialBmdData';
import { AuditLogEntry } from '../types/bmd';
import { formatWaktuIndonesia } from '../utils/formatters';

interface DatabaseBlueprintViewProps {
  auditLogs: AuditLogEntry[];
}

export function DatabaseBlueprintView({ auditLogs }: DatabaseBlueprintViewProps) {
  const [copied, setCopied] = useState(false);

  const handleCopySql = async () => {
    try {
      await navigator.clipboard.writeText(DDL_SQL_EXCERPT);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      setCopied(false);
    }
  };

  const handleDownloadSql = () => {
    const blob = new Blob([DDL_SQL_EXCERPT], { type: 'text/sql;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'simas_bmd_sidoarjo_ddl.sql';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between border-b border-slate-200 pb-5">
        <div>
          <p className="text-xs font-semibold text-[#0F2A4A] tracking-wide">
            ARSITEKTUR BASIS DATA RELASIONAL & JEJAK AUDIT
          </p>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-slate-900">
            Skema DDL PostgreSQL & Audit Log Kepatuhan
          </h1>
          <p className="mt-1 text-sm text-slate-600">
            Rancangan DDL SQL untuk tabel KIB B, Mutasi Aset, Tiket Kerusakan, serta rekam jejak audit (append-only) untuk pemeriksaan Inspektorat / BPK.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleCopySql}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
            {copied ? 'DDL SQL Disalin' : 'Salin DDL SQL'}
          </button>
          <button
            type="button"
            onClick={handleDownloadSql}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh .sql
          </button>
        </div>
      </div>

      {/* Ringkasan Relasi Tabel */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-4">
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="font-mono text-xs font-semibold text-[#0F2A4A]">kib_b_peralatan_mesin</p>
          <p className="mt-1 text-xs text-slate-600">
            Kunci unik komposit (kode_barang, nomor_register, tahun_perolehan) + indeks kode_qr.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="font-mono text-xs font-semibold text-[#0F2A4A]">mutasi_aset</p>
          <p className="mt-1 text-xs text-slate-600">
            FK ke kib_b dan master_lokasi asal/tujuan dengan CHECK lokasi asal ≠ tujuan.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="font-mono text-xs font-semibold text-[#0F2A4A]">tiket_kerusakan</p>
          <p className="mt-1 text-xs text-slate-600">
            Pelaporan lapangan terhubung ke aset_id, prioritas operasi, dan biaya pemeliharaan.
          </p>
        </div>
        <div className="bg-white border border-slate-200 rounded-lg p-4">
          <p className="font-mono text-xs font-semibold text-[#0F2A4A]">audit_log</p>
          <p className="mt-1 text-xs text-slate-600">
            Mencatat setiap INSERT, APPROVE, SCAN_OPNAME, dan PRINT_QR beserta peran RBAC.
          </p>
        </div>
      </div>

      {/* Audit Log Aktivitas Real-time */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-4 border-b border-slate-200">
          <h2 className="text-base font-semibold text-slate-900">
            Jejak Audit Aktivitas Sistem (audit_log)
          </h2>
          <p className="text-xs text-slate-500 mt-0.5">
            Setiap perubahan data KIB, opname QR, persetujuan mutasi, dan cetak stiker tercatat otomatis di sini.
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="border-b border-slate-200 bg-slate-50/70 font-semibold text-slate-600">
                <th className="py-2.5 px-4">Waktu</th>
                <th className="py-2.5 px-4">Pengguna & Peran</th>
                <th className="py-2.5 px-4">Tabel / Aksi</th>
                <th className="py-2.5 px-4">Ringkasan Transaksi</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {auditLogs.map((log) => (
                <tr key={log.id} className="hover:bg-slate-50">
                  <td className="py-2.5 px-4 font-mono tabular-nums text-slate-500 whitespace-nowrap">
                    {formatWaktuIndonesia(log.waktuKejadian)}
                  </td>
                  <td className="py-2.5 px-4">
                    <p className="font-semibold text-slate-900">{log.penggunaNama}</p>
                    <p className="font-mono text-[11px] text-slate-500">{log.peranSaatAksi}</p>
                  </td>
                  <td className="py-2.5 px-4 font-mono text-[#0F2A4A]">
                    {log.namaTabel} · {log.aksi}
                  </td>
                  <td className="py-2.5 px-4 text-slate-700">{log.ringkasan}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Viewer Kode DDL SQL */}
      <div className="bg-white border border-slate-200 rounded-lg overflow-hidden">
        <div className="px-5 py-3.5 border-b border-slate-200 flex items-center justify-between">
          <h2 className="text-sm font-semibold text-slate-900 font-mono">
            database/simas_bmd_schema.sql
          </h2>
          <span className="text-xs text-slate-500">PostgreSQL 15+ / Supabase Compatible</span>
        </div>
        <pre className="p-5 overflow-x-auto text-xs font-mono leading-relaxed text-slate-800 bg-slate-50">
          <code>{DDL_SQL_EXCERPT}</code>
        </pre>
      </div>
    </div>
  );
}
