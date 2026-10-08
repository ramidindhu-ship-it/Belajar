import React, { useState } from 'react';
import {
  Download,
  Smartphone,
  Laptop,
  Share,
  PlusSquare,
  X,
  Copy,
  Check,
  CheckCircle2,
  ExternalLink,
  Sparkles,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface PWAInstallModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const PWAInstallModal: React.FC<PWAInstallModalProps> = ({ isOpen, onClose }) => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [copied, setCopied] = useState(false);

  // App URL for sharing to mobile device
  const appUrl =
    typeof window !== 'undefined'
      ? window.location.href.split('?')[0].replace(/\/$/, '')
      : 'https://ais-pre-tzcnog5773v5fs3fcmvxzj-457913990431.asia-southeast1.run.app';

  if (!isOpen) return null;

  const handleCopyLink = () => {
    navigator.clipboard.writeText(appUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleDirectInstall = async () => {
    const success = await install();
    if (success) {
      onClose();
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/65 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-lg rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-2xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
              <Download className="w-5 h-5 stroke-[2.2]" />
            </div>
            <div>
              <h3 className="text-base sm:text-lg font-extrabold text-slate-900 dark:text-white">
                Pasang Aplikasi ke Device
              </h3>
              <p className="text-xs text-slate-500 dark:text-slate-400">
                Install BukuKas Pro di HP Android, iPhone, Tablet & Laptop
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-5 space-y-4 overflow-y-auto">
          {/* Status banner */}
          {isInstalled ? (
            <div className="p-4 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 flex items-center gap-3">
              <CheckCircle2 className="w-6 h-6 text-emerald-500 shrink-0" />
              <div>
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Aplikasi Sudah Terpasang!
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  BukuKas Pro sudah berjalan dalam mode standalone di layar utama perangkat Anda.
                </p>
              </div>
            </div>
          ) : isInstallable ? (
            /* Native Install Button on supported browsers */
            <div className="p-4 rounded-2xl bg-gradient-to-r from-emerald-500/15 to-teal-500/15 border border-emerald-500/30 text-center space-y-3">
              <div>
                <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[10px] font-extrabold bg-emerald-600 text-white mb-1.5">
                  <Sparkles className="w-3 h-3" /> Siap Di-Install
                </span>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white">
                  Browser Mendukung Instalasi Langsung
                </h4>
                <p className="text-xs text-slate-600 dark:text-slate-300">
                  Klik tombol di bawah untuk langsung memasang ikon BukuKas Pro ke beranda HP atau desktop Anda.
                </p>
              </div>

              <button
                type="button"
                onClick={handleDirectInstall}
                className="w-full py-3 px-4 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-sm shadow-md transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <Download className="w-4 h-4 stroke-[2.5]" />
                <span>Install Sekarang ke Layar Utama</span>
              </button>
            </div>
          ) : null}

          {/* Panduan Instalasi Per Perangkat */}
          <div className="space-y-3">
            <span className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Cara Pasang di Berbagai Perangkat:
            </span>

            {/* 1. Android / Chrome */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                <span>HP Android (Google Chrome / Edge)</span>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                <li>Buka link aplikasi di browser <strong>Google Chrome</strong> di HP Anda.</li>
                <li>Ketuk menu titik tiga (<strong>⋮</strong>) di sudut kanan atas browser.</li>
                <li>Pilih <strong>"Tambahkan ke Layar Utama"</strong> (Add to Home screen) atau <strong>"Install Aplikasi"</strong>.</li>
                <li>Ikon BukuKas Pro akan langsung muncul di layar HP Anda layaknya aplikasi Play Store.</li>
              </ol>
            </div>

            {/* 2. iPhone & iPad / iOS Safari */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                <Share className="w-4 h-4 text-blue-500" />
                <span>iPhone & iPad (Apple Safari)</span>
              </div>
              <ol className="text-xs text-slate-600 dark:text-slate-300 space-y-1 list-decimal list-inside pl-1 leading-relaxed">
                <li>Buka link aplikasi menggunakan browser <strong>Safari</strong> bawaan iOS.</li>
                <li>Ketuk tombol <strong>Bagikan (Share)</strong> — ikon kotak dengan panah ke atas di bilah bawah Safari.</li>
                <li>Gulir ke bawah dan ketuk opsi <strong>"Tambahkan ke Layar Utama"</strong> (<PlusSquare className="w-3.5 h-3.5 inline text-blue-500 mx-0.5" /> Add to Home Screen).</li>
                <li>Ketuk <strong>Tambah</strong> di pojok kanan atas. BukuKas Pro siap dibuka layar penuh!</li>
              </ol>
            </div>

            {/* 3. Laptop / Komputer */}
            <div className="p-3.5 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 space-y-2">
              <div className="flex items-center gap-2 font-bold text-xs sm:text-sm text-slate-900 dark:text-white">
                <Laptop className="w-4 h-4 text-indigo-500" />
                <span>Laptop & Komputer (Chrome / Edge / Mac)</span>
              </div>
              <p className="text-xs text-slate-600 dark:text-slate-300 leading-relaxed">
                Buka link di browser Chrome atau Microsoft Edge, lalu klik ikon <strong>Install</strong> (simbol komputer dengan panah bawah) yang muncul di samping bilah alamat URL di atas.
              </p>
            </div>
          </div>

          {/* Link Aplikasi untuk dibuka di HP */}
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 space-y-2">
            <span className="text-[11px] font-bold text-emerald-800 dark:text-emerald-300 block">
              Tautan Aplikasi untuk Dibuka di HP:
            </span>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={appUrl}
                className="flex-1 px-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-emerald-500/30 text-xs text-slate-700 dark:text-slate-300 font-mono truncate select-all"
              />
              <button
                type="button"
                onClick={handleCopyLink}
                className="px-3 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition flex items-center gap-1.5 shrink-0 cursor-pointer"
              >
                {copied ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copied ? 'Tersalin' : 'Salin'}</span>
              </button>
            </div>
            <p className="text-[10px] text-slate-500 dark:text-slate-400">
              Kirim tautan ini via WhatsApp/Email ke HP Anda, buka di browser, lalu pasang ke layar utama.
            </p>
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2.5 rounded-xl bg-slate-200 dark:bg-slate-800 hover:bg-slate-300 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition cursor-pointer"
          >
            Tutup
          </button>
        </div>
      </div>
    </div>
  );
};
