import React, { useState } from 'react';
import {
  Smartphone,
  CheckCircle2,
  RefreshCw,
  HardDriveDownload,
  Palette,
  Sun,
  Moon,
  Monitor,
  Check,
  Calendar,
  Clock,
  SlidersHorizontal,
  FileSpreadsheet,
  Trash2,
  AlertTriangle,
  User,
  X,
  LogOut,
  ShieldCheck,
  CloudDownload,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { useAuth } from '../context/AuthContext';
import { ThemeMode, ColorPalette, DateFormatOption, TimeFormatOption } from '../types/finance';
import { GoogleAuthModal } from '../components/GoogleAuthModal';
import { PWAInstallButton } from '../components/PWAInstallButton';
import { Download } from 'lucide-react';

interface SettingsScreenProps {
  onOpenInputSaldoAwal: () => void;
}

export const SettingsScreen: React.FC<SettingsScreenProps> = ({ onOpenInputSaldoAwal }) => {
  const { currentUser, signInWithGoogle, logout } = useAuth();
  const {
    appSettings,
    cloudSyncState,
    cloudSyncLogs,
    syncNow,
    createCloudBackup,
    restoreFromGoogleBackup,
    setThemeMode,
    setColorPalette,
    setDateFormat,
    setTimeFormat,
    toggleRealtimeSync,
    resetAllDataToCustomChartOfAccounts,
    formatDateTime,
    exportExcelCsv,
  } = useFinance();

  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [isResetConfirmOpen, setIsResetConfirmOpen] = useState(false);
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3000);
  };

  const handleConfirmReset = () => {
    resetAllDataToCustomChartOfAccounts();
    setIsResetConfirmOpen(false);
    showToast('Semua transaksi dan saldo telah dikosongkan!');
  };

  const palettes: { key: ColorPalette; title: string; color: string }[] = [
    { key: 'EMERALD', title: 'Emerald Fintech', color: '#10B981' },
    { key: 'OCEAN', title: 'Ocean Blue', color: '#0284C7' },
    { key: 'ROYAL', title: 'Royal Indigo', color: '#6366F1' },
    { key: 'AMBER', title: 'Warm Amber', color: '#D97706' },
    { key: 'TEAL', title: 'Forest Teal', color: '#0D9488' },
  ];

  const dateOptions: { key: DateFormatOption; pattern: string; sample: string }[] = [
    { key: 'DAY_MONTH_YEAR', pattern: 'dd MMM yyyy', sample: 'Contoh: 06 Okt 2026' },
    { key: 'SLASH_DMY', pattern: 'dd/MM/yyyy', sample: 'Contoh: 06/10/2026' },
    { key: 'FULL_DATE', pattern: 'dd MMMM yyyy', sample: 'Contoh: 06 Oktober 2026' },
    { key: 'ISO_DATE', pattern: 'yyyy-MM-dd', sample: 'Contoh: 2026-10-06' },
  ];

  const timeOptions: { key: TimeFormatOption; title: string; sample: string }[] = [
    { key: 'HOUR_24', title: 'Format 24 Jam', sample: 'Contoh: 14:30' },
    { key: 'HOUR_12', title: 'Format 12 Jam (AM/PM)', sample: 'Contoh: 02:30 PM' },
  ];

  return (
    <div className="space-y-6 pb-28">
      {/* Toast Alert */}
      {toastMessage && (
        <div className="fixed top-4 left-1/2 -translate-x-1/2 z-50 px-4 py-2.5 rounded-2xl bg-slate-900 text-white text-xs font-bold shadow-xl border border-slate-700 animate-bounce">
          {toastMessage}
        </div>
      )}

      {/* Screen Header */}
      <div className="px-1">
        <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Pengaturan Aplikasi</h2>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          Kustomisasi tema warna, format tanggal & pencadangan Akun Google
        </p>
      </div>

      {/* ======================================================== */}
      {/* 1. KONEKSI AKUN GOOGLE & SINKRONISASI MULTI-USER */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Smartphone className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Akun Google & Cadangan Cloud Multi-Pengguna
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          {/* User Profile Card */}
          {currentUser ? (
            <div className="flex items-center justify-between p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
              <div className="flex items-center gap-3 min-w-0">
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-12 h-12 rounded-full border border-emerald-500/30 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-emerald-600 text-white font-bold text-lg flex items-center justify-center shrink-0">
                    {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <h4 className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {currentUser.displayName || 'Pengguna Google'}
                    </h4>
                    <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  </div>
                  <p className="text-xs text-slate-500 dark:text-slate-400 truncate">
                    {currentUser.email}
                  </p>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 font-semibold block mt-0.5">
                    Data Anda tersimpan aman & terisolasi di Cloud Firestore
                  </span>
                </div>
              </div>

              <button
                onClick={() => setIsAuthModalOpen(true)}
                className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline px-2 py-1 shrink-0"
              >
                Kelola
              </button>
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60 text-center space-y-3">
              <div className="max-w-md mx-auto">
                <h4 className="text-sm font-bold text-slate-900 dark:text-white">
                  Belum Terhubung ke Akun Google
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
                  Masuk dengan akun Google agar pembukuan Anda otomatis dicadangkan di cloud dan tidak tercampur jika aplikasi digunakan oleh orang lain.
                </p>
              </div>

              <button
                type="button"
                onClick={() => setIsAuthModalOpen(true)}
                className="w-full sm:w-auto px-5 py-3 rounded-2xl bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/80 text-slate-800 dark:text-white font-extrabold text-xs sm:text-sm border border-slate-300 dark:border-slate-700 shadow-sm inline-flex items-center justify-center gap-2.5 transition active:scale-98"
              >
                <svg className="w-4 h-4" viewBox="0 0 24 24">
                  <path
                    fill="#4285F4"
                    d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
                  />
                  <path
                    fill="#34A853"
                    d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
                  />
                  <path
                    fill="#FBBC05"
                    d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.06H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.94l2.85-2.22.81-.63z"
                  />
                  <path
                    fill="#EA4335"
                    d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.06l3.66 2.84c.87-2.6 3.3-4.52 6.16-4.52z"
                  />
                </svg>
                <span>Masuk dengan Akun Google</span>
              </button>
            </div>
          )}

          {/* Multi-User Protection Explainer */}
          <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/40 text-xs text-slate-600 dark:text-slate-300 space-y-1">
            <span className="font-bold flex items-center gap-1.5 text-slate-800 dark:text-slate-200">
              <ShieldCheck className="w-4 h-4 text-emerald-500" />
              <span>Pemisahan Akun Otomatis:</span>
            </span>
            <p className="text-[11px] text-slate-500 dark:text-slate-400 leading-relaxed">
              Jika orang lain membuka aplikasi ini dan login dengan akun Google mereka sendiri, sistem otomatis memuat buku kas pribadi mereka. Data Anda tidak akan tercampur dan tetap tersimpan aman di akun Google Anda.
            </p>
          </div>

          {/* Realtime Multi-Device Sync Switch */}
          <div className="flex items-center justify-between pt-3 border-t border-slate-100 dark:border-slate-800">
            <div>
              <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Sinkronisasi Otomatis ke Cloud
              </h5>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Otomatis mencadangkan setiap penambahan & pengeditan transaksi ke Cloud
              </p>
            </div>

            <button
              onClick={() => toggleRealtimeSync(!appSettings.realtimeSyncEnabled)}
              className={`w-12 h-6.5 rounded-full p-1 transition-colors relative cursor-pointer ${
                appSettings.realtimeSyncEnabled ? 'bg-emerald-600' : 'bg-slate-300 dark:bg-slate-700'
              }`}
            >
              <div
                className={`w-4.5 h-4.5 rounded-full bg-white shadow-sm transition-transform ${
                  appSettings.realtimeSyncEnabled ? 'translate-x-5.5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>

          {/* Action Buttons: Cadangkan Google & Pulihkan */}
          <div className="grid grid-cols-2 gap-2.5 pt-1">
            <button
              onClick={async () => {
                await createCloudBackup();
                showToast(
                  currentUser
                    ? 'Data berhasil dicadangkan ke Akun Google!'
                    : 'Data dicadangkan di penyimpanan lokal!'
                );
              }}
              disabled={cloudSyncState.isSyncing}
              className="py-2.5 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white text-xs font-bold transition flex items-center justify-center gap-2 shadow-sm disabled:opacity-50 cursor-pointer"
            >
              <HardDriveDownload className="w-3.5 h-3.5" />
              <span>{cloudSyncState.isSyncing ? 'Menyimpan...' : 'Cadangkan ke Google'}</span>
            </button>

            <button
              onClick={async () => {
                if (!currentUser) {
                  setIsAuthModalOpen(true);
                  return;
                }
                const success = await restoreFromGoogleBackup();
                if (success) {
                  showToast('Data berhasil dipulihkan dari Akun Google!');
                } else {
                  showToast('Belum ada cadangan di akun Google ini.');
                }
              }}
              className="py-2.5 px-3 rounded-2xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-800 dark:text-slate-200 text-xs font-bold transition flex items-center justify-center gap-2 border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
            >
              <CloudDownload className="w-3.5 h-3.5" />
              <span>Pulihkan Cadangan</span>
            </button>
          </div>

          {/* Recent Sync Logs */}
          {cloudSyncLogs.length > 0 && (
            <div className="pt-2 border-t border-slate-100 dark:border-slate-800">
              <span className="text-[11px] uppercase font-bold text-slate-400 block mb-2">
                Aktivitas Sinkronisasi Terkini
              </span>
              <div className="space-y-1.5">
                {cloudSyncLogs.slice(0, 3).map((log, idx) => (
                  <div key={idx} className="flex items-start gap-2 text-xs">
                    <CheckCircle2 className="w-3.5 h-3.5 text-emerald-500 shrink-0 mt-0.5" />
                    <div className="min-w-0">
                      <p className="text-slate-700 dark:text-slate-300 font-medium truncate">
                        {log.message}
                      </p>
                      <span className="text-[10px] text-slate-400">
                        {formatDateTime(log.timestamp)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. PASANG APLIKASI KE DEVICE (PWA INSTALL) */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Download className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Pasang Aplikasi ke Layar Utama
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <div>
            <h4 className="text-sm font-bold text-slate-900 dark:text-white">
              Install BukuKas Pro di HP / Laptop
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Pasang sebagai aplikasi mandiri (PWA) di beranda HP Android, iPhone, iPad, atau komputer Anda tanpa membuka browser secara manual.
            </p>
          </div>

          <PWAInstallButton variant="button" />
        </div>
      </div>

      {/* ======================================================== */}
      {/* 2. TEMA & WARNA TAMPILAN */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Palette className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Tema & Warna Tampilan
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
          {/* Theme Mode Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Mode Tampilan
            </label>
            <div className="grid grid-cols-3 gap-2">
              {[
                { mode: 'SYSTEM' as ThemeMode, label: 'Sistem', icon: Monitor },
                { mode: 'LIGHT' as ThemeMode, label: 'Terang', icon: Sun },
                { mode: 'DARK' as ThemeMode, label: 'Gelap', icon: Moon },
              ].map(({ mode, label, icon: IconComp }) => {
                const isSelected = appSettings.themeMode === mode;
                return (
                  <button
                    key={mode}
                    onClick={() => setThemeMode(mode)}
                    className={`p-3 rounded-2xl flex flex-col items-center justify-center gap-1.5 transition text-xs font-bold border cursor-pointer ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-sm'
                        : 'bg-slate-50 dark:bg-slate-800/60 text-slate-700 dark:text-slate-300 border-slate-200/80 dark:border-slate-700/80 hover:bg-slate-100'
                    }`}
                  >
                    <IconComp className="w-4 h-4" />
                    <span>{label}</span>
                  </button>
                );
              })}
            </div>
          </div>

          {/* Color Palette Selector */}
          <div>
            <label className="text-xs font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-2">
              Pilihan Warna Aksen Utama
            </label>
            <div className="space-y-2">
              {palettes.map((p) => {
                const isSelected = appSettings.colorPalette === p.key;
                return (
                  <button
                    key={p.key}
                    onClick={() => setColorPalette(p.key)}
                    className={`w-full flex items-center justify-between p-3 rounded-2xl border transition cursor-pointer ${
                      isSelected
                        ? 'bg-slate-50 dark:bg-slate-800/80 border-slate-400 dark:border-slate-600 shadow-xs'
                        : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <div
                        className="w-6 h-6 rounded-full shrink-0 shadow-inner"
                        style={{ backgroundColor: p.color }}
                      />
                      <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                        {p.title}
                      </span>
                    </div>

                    {isSelected && (
                      <div className="w-6 h-6 rounded-full bg-emerald-500 text-white flex items-center justify-center">
                        <Check className="w-3.5 h-3.5 stroke-[3]" />
                      </div>
                    )}
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 3. FORMAT TANGGAL & WAKTU */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Format Tanggal & Waktu
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
          <div className="p-3.5 rounded-2xl bg-emerald-500/10 border border-emerald-500/20 text-center">
            <span className="text-[10px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block">
              Pratinjau Tampilan Saat Ini
            </span>
            <span className="text-sm sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 block mt-0.5">
              {formatDateTime(Date.now())}
            </span>
          </div>

          <div>
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Format Tanggal
            </label>
            <div className="space-y-1.5">
              {dateOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="date_format"
                    checked={appSettings.dateFormat === opt.key}
                    onChange={() => setDateFormat(opt.key)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {opt.pattern}
                    </span>
                    <span className="text-[11px] text-slate-400">{opt.sample}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>

          <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
            <label className="text-xs font-bold text-slate-800 dark:text-slate-200 block mb-2">
              Format Waktu
            </label>
            <div className="space-y-1.5">
              {timeOptions.map((opt) => (
                <label
                  key={opt.key}
                  className="flex items-center gap-3 p-2.5 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-800/60 cursor-pointer"
                >
                  <input
                    type="radio"
                    name="time_format"
                    checked={appSettings.timeFormat === opt.key}
                    onChange={() => setTimeFormat(opt.key)}
                    className="w-4 h-4 text-emerald-600 accent-emerald-600"
                  />
                  <div>
                    <span className="text-xs font-bold text-slate-900 dark:text-white block">
                      {opt.title}
                    </span>
                    <span className="text-[11px] text-slate-400">{opt.sample}</span>
                  </div>
                </label>
              ))}
            </div>
          </div>
        </div>
      </div>

      {/* ======================================================== */}
      {/* 4. MANAJEMEN PEMBUKUAN & DATA */}
      {/* ======================================================== */}
      <div className="space-y-3">
        <div className="flex items-center gap-2 px-1">
          <SlidersHorizontal className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
          <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
            Manajemen Pembukuan & Data
          </h3>
        </div>

        <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
          <button
            onClick={onOpenInputSaldoAwal}
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-bold border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <SlidersHorizontal className="w-4 h-4 text-emerald-600" />
            <span>Input Saldo Awal (Harta, Utang, Modal)</span>
          </button>

          <button
            onClick={exportExcelCsv}
            className="w-full py-3 px-4 rounded-2xl bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-900 dark:text-white text-xs sm:text-sm font-bold border border-slate-200/80 dark:border-slate-700 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <FileSpreadsheet className="w-4 h-4 text-emerald-600" />
            <span>Ekspor Laporan Keuangan ke Excel</span>
          </button>

          <button
            onClick={() => setIsResetConfirmOpen(true)}
            className="w-full py-3 px-4 rounded-2xl bg-red-500/10 hover:bg-red-500/15 text-red-600 dark:text-red-400 text-xs sm:text-sm font-bold border border-red-500/20 flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Trash2 className="w-4 h-4" />
            <span>Kosongkan Semua Transaksi & Reset Saldo</span>
          </button>
        </div>
      </div>

      {/* Google Auth Modal */}
      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />

      {/* Dialog Konfirmasi Reset */}
      {isResetConfirmOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
          <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col p-5">
            <div className="w-12 h-12 rounded-2xl bg-red-500/15 text-red-600 flex items-center justify-center mx-auto mb-3">
              <AlertTriangle className="w-6 h-6" />
            </div>

            <h4 className="text-base font-extrabold text-slate-900 dark:text-white text-center">
              Kosongkan Semua Data?
            </h4>
            <p className="text-xs text-slate-500 dark:text-slate-400 text-center mt-1">
              Tindakan ini akan menghapus seluruh jurnal transaksi dan mengembalikan seluruh saldo ke Rp 0 sesuai bagan akun resmi. Lanjutkan?
            </p>

            <div className="flex gap-2 pt-5">
              <button
                type="button"
                onClick={() => setIsResetConfirmOpen(false)}
                className="flex-1 py-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 text-xs font-bold cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                onClick={handleConfirmReset}
                className="flex-1 py-2.5 rounded-xl bg-red-600 hover:bg-red-700 text-white text-xs font-bold cursor-pointer"
              >
                Ya, Kosongkan
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
