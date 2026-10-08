import React from 'react';
import { Cloud, RefreshCw } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';

export const CloudSyncStatusCard: React.FC = () => {
  const { cloudSyncState, syncNow, formatDateTime } = useFinance();

  return (
    <div className="rounded-2xl bg-slate-50 dark:bg-slate-800/60 p-4 border border-slate-200/80 dark:border-slate-700/60 flex items-center justify-between">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400">
          {cloudSyncState.isSyncing ? (
            <RefreshCw className="w-5 h-5 animate-spin" />
          ) : (
            <Cloud className="w-5 h-5" />
          )}
        </div>
        <div>
          <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
            {cloudSyncState.isSyncing ? 'Sinkronisasi Cloud Aktif' : 'Cloud Terhubung & Aman'}
          </h4>
          <p className="text-[11px] text-slate-500 dark:text-slate-400">
            Terakhir: {formatDateTime(cloudSyncState.lastSyncTimestamp)}
          </p>
        </div>
      </div>

      <button
        onClick={() => syncNow()}
        disabled={cloudSyncState.isSyncing}
        className="px-3.5 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition-all disabled:opacity-50 active:scale-95 shadow-sm"
      >
        {cloudSyncState.isSyncing ? 'Syncing...' : 'Sinkron'}
      </button>
    </div>
  );
};
