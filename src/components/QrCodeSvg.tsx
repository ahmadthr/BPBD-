import { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { Download, Printer } from 'lucide-react';
import { AsetBMD, LokasiUnit } from '../types/bmd';
import { LABEL_GOLONGAN_KIB } from '../utils/formatters';

interface QrCodeSvgProps {
  value: string;
  size?: number;
  className?: string;
}

export function QrCodeSvg({ value, size = 140, className = '' }: QrCodeSvgProps) {
  const [svgMarkup, setSvgMarkup] = useState<string>('');

  useEffect(() => {
    let active = true;
    QRCode.toString(value, {
      type: 'svg',
      margin: 1,
      width: size,
      errorCorrectionLevel: 'M',
      color: {
        dark: '#0F2A4A',
        light: '#FFFFFF',
      },
    })
      .then((svg) => {
        if (active) setSvgMarkup(svg);
      })
      .catch(() => {
        if (active) setSvgMarkup('');
      });

    return () => {
      active = false;
    };
  }, [value, size]);

  if (!svgMarkup) {
    return (
      <div
        style={{ width: size, height: size }}
        className={`flex items-center justify-center border border-slate-200 bg-slate-50 text-xs text-slate-400 ${className}`}
      >
        Memuat QR
      </div>
    );
  }

  return (
    <div
      style={{ width: size, height: size }}
      className={`overflow-hidden bg-white ${className}`}
      aria-label={`QR Code ${value}`}
      dangerouslySetInnerHTML={{ __html: svgMarkup }}
    />
  );
}

interface OfficialQrLabelCardProps {
  aset: AsetBMD;
  lokasi?: LokasiUnit;
  canPrint: boolean;
  onLogPrint?: (aset: AsetBMD) => void;
}

export function OfficialQrLabelCard({
  aset,
  lokasi,
  canPrint,
  onLogPrint,
}: OfficialQrLabelCardProps) {
  const handleDownloadSvg = async () => {
    const svg = await QRCode.toString(aset.kodeQr, {
      type: 'svg',
      margin: 2,
      width: 320,
      errorCorrectionLevel: 'H',
      color: { dark: '#0F2A4A', light: '#FFFFFF' },
    });
    const blob = new Blob([svg], { type: 'image/svg+xml;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `QR-${aset.kodeQr}.svg`;
    a.click();
    URL.revokeObjectURL(url);
    onLogPrint?.(aset);
  };

  const handlePrint = () => {
    onLogPrint?.(aset);
    window.print();
  };

  return (
    <div className="space-y-4">
      <div className="border border-slate-300 bg-white p-4">
        <div className="flex items-center justify-between border-b border-slate-200 pb-2.5 mb-3">
          <div>
            <p className="text-[11px] font-semibold tracking-wider text-slate-500">
              PEMERINTAH KABUPATEN SIDOARJO
            </p>
            <p className="text-xs font-bold text-[#0F2A4A]">
              BPBD · KARTU INVENTARIS BARANG ({LABEL_GOLONGAN_KIB[aset.golongan].kode})
            </p>
          </div>
          <span className="font-mono text-xs font-semibold text-[#0F2A4A] tabular-nums">
            TA {aset.tahunPerolehan}
          </span>
        </div>

        <div className="flex items-start gap-4">
          <div className="shrink-0 border border-slate-200 p-1.5 bg-white">
            <QrCodeSvg value={aset.kodeQr} size={108} />
          </div>
          <div className="min-w-0 flex-1 space-y-1.5">
            <p className="text-sm font-semibold text-slate-900 leading-snug">
              {aset.namaBarang}
            </p>
            <p className="text-xs text-slate-600 truncate">{aset.merkTipe}</p>
            <div className="pt-1 space-y-0.5 text-xs font-mono text-slate-700 tabular-nums">
              <p>Kode: {aset.kodeBarang} · Reg {aset.nomorRegister}</p>
              <p>QR ID: {aset.kodeQr}</p>
              <p className="font-sans text-slate-600">
                Unit: {lokasi?.namaLokasi ?? '-'}
              </p>
            </div>
          </div>
        </div>
      </div>

      {canPrint ? (
        <div className="flex flex-wrap items-center gap-2 no-print">
          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-white bg-[#0F2A4A] hover:bg-[#173B66] rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Printer className="w-3.5 h-3.5" />
            Cetak Label Stiker
          </button>
          <button
            type="button"
            onClick={handleDownloadSvg}
            className="inline-flex items-center gap-2 px-4 py-2 text-xs font-semibold text-slate-700 bg-white border border-slate-300 hover:bg-slate-50 rounded-md transition-colors whitespace-nowrap shrink-0 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            Unduh QR (SVG)
          </button>
        </div>
      ) : (
        <p className="text-xs text-slate-500">
          Cetak & unduh label QR resmi hanya tersedia untuk Pengurus Barang dan Kasubag Umum.
        </p>
      )}
    </div>
  );
}
