import React from 'react';
import {
  Plus,
  BarChart2,
  BookOpen,
  Cloud,
  SlidersHorizontal,
  FileSpreadsheet,
  ArrowUpRight,
  ArrowDownRight,
  Receipt,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { HeaderBanner } from '../components/HeaderBanner';
import { NetWorthCard } from '../components/NetWorthCard';
import { DailyExpenseBarChartCard, ExpenseDonutChartCard } from '../components/Charts';
import { CloudSyncStatusCard } from '../components/CloudSyncStatusCard';
import { AccountCategory, CATEGORY_DETAILS, TransactionRecord } from '../types/finance';
import { Edit2 } from 'lucide-react';

interface DashboardScreenProps {
  onOpenAddTransaction: () => void;
  onOpenInputSaldoAwal: () => void;
  onNavigateTab: (tab: 'dashboard' | 'transactions' | 'accounts' | 'reports' | 'settings') => void;
  onEditTransaction: (tx: TransactionRecord) => void;
}

export const DashboardScreen: React.FC<DashboardScreenProps> = ({
  onOpenAddTransaction,
  onOpenInputSaldoAwal,
  onNavigateTab,
  onEditTransaction,
}) => {
  const {
    transactions,
    incomeStatement,
    dailyExpenses,
    formatRupiah,
    formatDateTime,
    exportExcelCsv,
  } = useFinance();

  const recentTransactions = transactions.slice(0, 8);

  return (
    <div className="space-y-4 sm:space-y-5 pb-24">
      {/* 1. Header Banner */}
      <HeaderBanner />

      {/* 2. Net Worth Card */}
      <NetWorthCard />

      {/* 3. Quick Action Grid (4 Actions) */}
      <div className="grid grid-cols-4 gap-2 sm:gap-3">
        <button
          onClick={onOpenAddTransaction}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center group-hover:scale-105 transition">
            <Plus className="w-5 h-5 stroke-[2.5]" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">Catat</span>
          <span className="text-[10px] text-slate-400">Transaksi</span>
        </button>

        <button
          onClick={() => onNavigateTab('reports')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-cyan-500/15 text-cyan-600 dark:text-cyan-400 flex items-center justify-center group-hover:scale-105 transition">
            <BarChart2 className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">Laporan</span>
          <span className="text-[10px] text-slate-400">Neraca & Laba</span>
        </button>

        <button
          onClick={() => onNavigateTab('accounts')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center group-hover:scale-105 transition">
            <BookOpen className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">Bagan</span>
          <span className="text-[10px] text-slate-400">5 Akun</span>
        </button>

        <button
          onClick={() => onNavigateTab('settings')}
          className="flex flex-col items-center justify-center p-3 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm hover:shadow transition-all active:scale-95 group"
        >
          <div className="w-10 h-10 rounded-xl bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center group-hover:scale-105 transition">
            <Cloud className="w-5 h-5 stroke-[2.2]" />
          </div>
          <span className="text-xs font-bold text-slate-800 dark:text-slate-200 mt-1.5">Cloud</span>
          <span className="text-[10px] text-slate-400">Sinkron</span>
        </button>
      </div>

      {/* 4. Action Shortcuts: Input Saldo Awal & Ekspor Excel */}
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
        <button
          onClick={onOpenInputSaldoAwal}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition-all active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <SlidersHorizontal className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Input Saldo Awal
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Atur saldo awal Harta, Utang & Modal
            </p>
          </div>
        </button>

        <button
          onClick={exportExcelCsv}
          className="flex items-center gap-3 p-3.5 rounded-2xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 text-left transition-all active:scale-98"
        >
          <div className="w-9 h-9 rounded-xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Ekspor Excel (.csv)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Format kompatibel Microsoft Excel
            </p>
          </div>
        </button>
      </div>

      {/* 5. Income vs Expense Card */}
      <div className="rounded-3xl bg-white dark:bg-slate-900 p-4 sm:p-5 shadow-sm border border-slate-200/80 dark:border-slate-800 grid grid-cols-2 divide-x divide-slate-100 dark:divide-slate-800">
        <div className="flex items-center gap-3 pr-2">
          <div className="w-10 h-10 rounded-full bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <ArrowUpRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Pendapatan</span>
            <span className="text-xs sm:text-base font-extrabold text-emerald-600 dark:text-emerald-400 truncate block">
              {formatRupiah(incomeStatement.totalPendapatan)}
            </span>
          </div>
        </div>

        <div className="flex items-center gap-3 pl-4">
          <div className="w-10 h-10 rounded-full bg-amber-500/15 text-amber-600 dark:text-amber-400 flex items-center justify-center shrink-0">
            <ArrowDownRight className="w-5 h-5 stroke-[2.5]" />
          </div>
          <div className="min-w-0">
            <span className="text-[11px] text-slate-400 font-medium block">Total Biaya</span>
            <span className="text-xs sm:text-base font-extrabold text-amber-600 dark:text-amber-400 truncate block">
              {formatRupiah(incomeStatement.totalBiaya)}
            </span>
          </div>
        </div>
      </div>

      {/* 6. Daily Expense 7-day Bar Chart */}
      <DailyExpenseBarChartCard dailyData={dailyExpenses} />

      {/* 7. Expense Donut Chart */}
      <ExpenseDonutChartCard
        breakdownList={incomeStatement.expenseBreakdown}
        totalExpense={incomeStatement.totalBiaya}
      />

      {/* 8. Cloud Sync Status Card */}
      <CloudSyncStatusCard />

      {/* 9. Recent Transactions Header & List */}
      <div>
        <div className="flex items-center justify-between mb-3 px-1">
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Transaksi Terbaru</h3>
          <button
            onClick={() => onNavigateTab('transactions')}
            className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
          >
            Lihat Semua
          </button>
        </div>

        {recentTransactions.length === 0 ? (
          <div className="rounded-2xl bg-white dark:bg-slate-900 p-8 text-center border border-slate-200/80 dark:border-slate-800">
            <Receipt className="w-8 h-8 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
            <p className="text-xs sm:text-sm font-medium text-slate-500 dark:text-slate-400">
              Belum ada transaksi tercatat
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {recentTransactions.map((tx) => {
              const isExpense = tx.category === 'BIAYA';
              const isIncome = tx.category === 'PENDAPATAN';
              const categoryDetails = CATEGORY_DETAILS[tx.category];

              return (
                <div
                  key={tx.id}
                  className="flex items-center justify-between p-3.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs"
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <div
                      className="w-10 h-10 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: `${categoryDetails.color}20`,
                        color: categoryDetails.color,
                      }}
                    >
                      {isExpense ? (
                        <ArrowDownRight className="w-5 h-5 stroke-[2.2]" />
                      ) : isIncome ? (
                        <ArrowUpRight className="w-5 h-5 stroke-[2.2]" />
                      ) : (
                        <Receipt className="w-5 h-5 stroke-[2.2]" />
                      )}
                    </div>
                    <div className="min-w-0">
                      <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                        {tx.description}
                      </p>
                      <div className="flex items-center gap-2 mt-0.5">
                        <span
                          className="px-1.5 py-0.2 rounded text-[10px] font-bold"
                          style={{
                            backgroundColor: `${categoryDetails.color}20`,
                            color: categoryDetails.color,
                          }}
                        >
                          {categoryDetails.displayName}
                        </span>
                        <span className="text-[11px] text-slate-400">
                          {formatDateTime(tx.date)}
                        </span>
                      </div>
                    </div>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 ml-2">
                    <span
                      className={`text-xs sm:text-sm font-extrabold ${
                        isExpense
                          ? 'text-amber-600 dark:text-amber-400'
                          : isIncome
                          ? 'text-emerald-600 dark:text-emerald-400'
                          : 'text-slate-900 dark:text-white'
                      }`}
                    >
                      {isExpense ? '- ' : isIncome ? '+ ' : ''}
                      {formatRupiah(tx.amount)}
                    </span>

                    <button
                      onClick={() => onEditTransaction(tx)}
                      className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                      title="Edit transaksi"
                    >
                      <Edit2 className="w-3.5 h-3.5" />
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
