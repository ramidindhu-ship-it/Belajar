import React, { useState } from 'react';
import {
  LayoutDashboard,
  Receipt,
  Landmark,
  BarChart3,
  Settings as SettingsIcon,
  Plus,
  User,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { GoogleAuthModal } from './GoogleAuthModal';
import { PWAInstallButton } from './PWAInstallButton';

export type NavigationTab = 'dashboard' | 'transactions' | 'accounts' | 'reports' | 'settings';

interface NavbarProps {
  currentTab: NavigationTab;
  onTabChange: (tab: NavigationTab) => void;
  onOpenAddTransaction: () => void;
}

export const Navbar: React.FC<NavbarProps> = ({
  currentTab,
  onTabChange,
  onOpenAddTransaction,
}) => {
  const { currentUser } = useAuth();
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);

  const tabs = [
    { key: 'dashboard' as NavigationTab, label: 'Beranda', icon: LayoutDashboard },
    { key: 'transactions' as NavigationTab, label: 'Transaksi', icon: Receipt },
    { key: 'accounts' as NavigationTab, label: 'Akun', icon: Landmark },
    { key: 'reports' as NavigationTab, label: 'Laporan', icon: BarChart3 },
    { key: 'settings' as NavigationTab, label: 'Pengaturan', icon: SettingsIcon },
  ];

  return (
    <>
      {/* ======================================================== */}
      {/* MOBILE BOTTOM NAVIGATION BAR */}
      {/* ======================================================== */}
      <div className="md:hidden fixed bottom-0 left-0 right-0 z-40 bg-white/95 dark:bg-slate-900/95 backdrop-blur-md border-t border-slate-200/80 dark:border-slate-800 px-2 py-1 shadow-lg">
        <div className="max-w-md mx-auto flex items-center justify-around relative">
          {tabs.map((tab) => {
            const isSelected = currentTab === tab.key;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`flex-1 py-1.5 flex flex-col items-center justify-center transition-all ${
                  isSelected
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-400 hover:text-slate-600 dark:hover:text-slate-300'
                }`}
              >
                <div
                  className={`p-1 rounded-xl transition-all ${
                    isSelected ? 'bg-emerald-500/15' : ''
                  }`}
                >
                  <IconComponent className="w-5 h-5 stroke-[2.2]" />
                </div>
                <span className="text-[10px] mt-0.5 tracking-tight">{tab.label}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* MOBILE FLOATING ACTION BUTTON */}
      <button
        onClick={onOpenAddTransaction}
        className="md:hidden fixed bottom-18 right-4 z-40 w-13 h-13 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-95 text-white shadow-xl shadow-emerald-600/30 flex items-center justify-center transition cursor-pointer"
        title="Tambah Transaksi"
      >
        <Plus className="w-7 h-7 stroke-[2.5]" />
      </button>

      {/* ======================================================== */}
      {/* TABLET / DESKTOP SIDE NAVIGATION RAIL */}
      {/* ======================================================== */}
      <aside className="hidden md:flex flex-col items-center justify-between w-20 lg:w-60 h-screen fixed left-0 top-0 z-40 bg-white dark:bg-slate-900 border-r border-slate-200/80 dark:border-slate-800 p-4">
        {/* Brand Logo Header */}
        <div className="w-full flex items-center gap-3 px-2 py-2">
          <div className="w-10 h-10 rounded-2xl bg-gradient-to-br from-emerald-400 to-teal-600 text-slate-950 flex items-center justify-center font-black shadow-md shrink-0">
            <Landmark className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="hidden lg:block min-w-0">
            <h1 className="text-base font-black tracking-tight text-slate-900 dark:text-white leading-none">
              BukuKas Pro
            </h1>
            <span className="text-[10px] font-semibold text-emerald-600 dark:text-emerald-400">
              Fintech Accounting
            </span>
          </div>
        </div>

        {/* Quick Add FAB for Tablet / Desktop */}
        <div className="w-full my-4">
          <button
            onClick={onOpenAddTransaction}
            className="w-full py-3 px-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-bold text-xs sm:text-sm shadow-md flex items-center justify-center gap-2 transition cursor-pointer"
          >
            <Plus className="w-5 h-5 stroke-[2.5]" />
            <span className="hidden lg:inline">Catat Transaksi</span>
          </button>
        </div>

        {/* Navigation Tabs */}
        <nav className="w-full space-y-1.5 flex-1">
          {tabs.map((tab) => {
            const isSelected = currentTab === tab.key;
            const IconComponent = tab.icon;
            return (
              <button
                key={tab.key}
                onClick={() => onTabChange(tab.key)}
                className={`w-full flex items-center gap-3.5 p-3 rounded-2xl transition-all cursor-pointer ${
                  isSelected
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-500 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white'
                }`}
              >
                <IconComponent className="w-5 h-5 stroke-[2.2] shrink-0" />
                <span className="hidden lg:inline text-xs sm:text-sm">{tab.label}</span>
              </button>
            );
          })}
        </nav>

        {/* PWA Install Button in Sidebar */}
        <div className="w-full pb-2 hidden md:block">
          <PWAInstallButton variant="banner" className="w-full justify-center" />
        </div>

        {/* User Google Account Profile Card in Sidebar */}
        <div className="w-full pt-3 border-t border-slate-100 dark:border-slate-800">
          <button
            onClick={() => setIsAuthModalOpen(true)}
            className="w-full p-2 rounded-2xl hover:bg-slate-100 dark:hover:bg-slate-800 transition flex items-center gap-2.5 text-left cursor-pointer"
          >
            {currentUser ? (
              <>
                {currentUser.photoURL ? (
                  <img
                    src={currentUser.photoURL}
                    alt={currentUser.displayName || 'Google'}
                    className="w-8 h-8 rounded-full border border-emerald-500/40 object-cover shrink-0"
                  />
                ) : (
                  <div className="w-8 h-8 rounded-full bg-emerald-600 text-white font-bold text-xs flex items-center justify-center shrink-0">
                    {(currentUser.displayName || currentUser.email || 'G')[0].toUpperCase()}
                  </div>
                )}
                <div className="hidden lg:block min-w-0 flex-1">
                  <div className="flex items-center gap-1">
                    <span className="text-xs font-bold text-slate-900 dark:text-white truncate block">
                      {currentUser.displayName || 'Akun Google'}
                    </span>
                    <CheckCircle2 className="w-3 h-3 text-emerald-500 shrink-0" />
                  </div>
                  <span className="text-[10px] text-slate-400 truncate block">
                    {currentUser.email}
                  </span>
                </div>
              </>
            ) : (
              <>
                <div className="w-8 h-8 rounded-full bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 flex items-center justify-center text-slate-500 shrink-0">
                  <User className="w-4 h-4" />
                </div>
                <div className="hidden lg:block min-w-0 flex-1">
                  <span className="text-xs font-bold text-slate-900 dark:text-white block">
                    Masuk Google
                  </span>
                  <span className="text-[10px] text-emerald-600 dark:text-emerald-400 block">
                    Cadangkan Akun
                  </span>
                </div>
              </>
            )}
          </button>
        </div>
      </aside>

      <GoogleAuthModal
        isOpen={isAuthModalOpen}
        onClose={() => setIsAuthModalOpen(false)}
      />
    </>
  );
};
