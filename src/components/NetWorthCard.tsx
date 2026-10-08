import React from 'react';
import { ArrowUpRight, ArrowDownRight, Cloud, RefreshCw } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const NetWorthCard: React.FC = () => {
  const { balanceSheet, cloudSyncState, syncNow, formatRupiah } = useFinance();
  const netWorth = balanceSheet.totalHarta - balanceSheet.totalUtang;

  return (
    <div className="rounded-3xl bg-gradient-to-br from-[#0F243A] via-[#0B2F38] to-[#064E3B] p-5 text-white shadow-lg border border-emerald-900/30">
      {/* Top Bar: Title & Cloud Pill Button */}
      <div className="flex items-center justify-between">
        <div>
          <span className="text-xs font-semibold uppercase tracking-wider text-emerald-300/80">
            Kekayaan Bersih (Net Worth)
          </span>
          <p className="text-[11px] text-slate-300/70">Harta dikurangi Utang</p>
        </div>

        <button
          onClick={() => syncNow()}
          disabled={cloudSyncState.isSyncing}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 hover:bg-white/20 active:scale-95 transition-all text-xs font-medium backdrop-blur-sm border border-white/15"
          title="Klik untuk sinkronisasi cloud"
        >
          {cloudSyncState.isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-emerald-400 animate-spin" />
              <span className="text-emerald-300 font-semibold">Syncing...</span>
            </>
          ) : (
            <>
              <Cloud className="w-3.5 h-3.5 text-emerald-400" />
              <span className="text-white">Cloud Sync</span>
            </>
          )}
        </button>
      </div>

      {/* Main Net Worth Amount */}
      <div className="mt-3.5">
        <h2 className="text-2xl sm:text-3xl font-black tracking-tight text-white drop-shadow-sm">
          {formatRupiah(netWorth)}
        </h2>
      </div>

      {/* Sub Breakdown Pills: Total Harta & Total Utang */}
      <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-white/10">
        {/* Total Harta Pill */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-emerald-500/25 text-emerald-400">
            <ArrowUpRight className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-emerald-300/80 block">
              Total Harta
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
              {formatRupiah(balanceSheet.totalHarta)}
            </span>
          </div>
        </div>

        {/* Total Utang Pill */}
        <div className="flex items-center gap-2.5 p-2.5 rounded-2xl bg-white/5 border border-white/10 backdrop-blur-sm">
          <div className="flex items-center justify-center w-8 h-8 rounded-full bg-red-500/25 text-red-300">
            <ArrowDownRight className="w-4 h-4 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[10px] uppercase font-bold text-red-300/80 block">
              Total Utang
            </span>
            <span className="text-xs sm:text-sm font-extrabold text-white truncate block">
              {formatRupiah(balanceSheet.totalUtang)}
            </span>
          </div>
        </div>
      </div>
    </div>
  );
};
