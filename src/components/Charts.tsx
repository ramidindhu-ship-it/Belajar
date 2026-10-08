import React, { useState } from 'react';
import { PieChart as PieChartIcon, BarChart3 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { ExpenseCategoryBreakdown, DailyExpenseBarData } from '../types/finance';

interface ExpenseDonutProps {
  breakdownList: ExpenseCategoryBreakdown[];
  totalExpense: number;
}

export const ExpenseDonutChartCard: React.FC<ExpenseDonutProps> = ({ breakdownList, totalExpense }) => {
  const { formatRupiah } = useFinance();
  const [selectedSubAccountId, setSelectedSubAccountId] = useState<number | null>(null);

  const selectedItem = breakdownList.find((i) => i.subAccountId === selectedSubAccountId);

  // SVG calculations for donut chart
  const size = 180;
  const strokeWidth = 28;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let accumulatedPercent = 0;

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200/80 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-base font-bold text-slate-900 dark:text-white">Proporsi Pengeluaran</h3>
          <p className="text-xs text-slate-500 dark:text-slate-400">Visualisasi alokasi per subakun biaya</p>
        </div>
        <span className="px-2.5 py-1 rounded-lg text-xs font-semibold bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
          {breakdownList.length} Akun
        </span>
      </div>

      {breakdownList.length === 0 || totalExpense <= 0 ? (
        <div className="flex flex-col items-center justify-center py-10 text-center">
          <div className="w-12 h-12 rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
            <PieChartIcon className="w-6 h-6" />
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Belum ada data pengeluaran untuk ditampilkan</p>
        </div>
      ) : (
        <div className="mt-4">
          {/* Donut Graphic & Center stats */}
          <div className="relative flex items-center justify-center h-48">
            <svg width={size} height={size} className="transform -rotate-90">
              {breakdownList.map((item) => {
                const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
                const strokeDashoffset = -((accumulatedPercent / 100) * circumference);
                accumulatedPercent += item.percentage;

                const isSelected = selectedSubAccountId === item.subAccountId;
                const strokeOpacity = selectedSubAccountId === null || isSelected ? 1 : 0.35;

                return (
                  <circle
                    key={item.subAccountId}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    fill="transparent"
                    stroke={item.color}
                    strokeWidth={isSelected ? strokeWidth + 4 : strokeWidth}
                    strokeDasharray={strokeDasharray}
                    strokeDashoffset={strokeDashoffset}
                    strokeOpacity={strokeOpacity}
                    className="cursor-pointer transition-all duration-300 hover:stroke-opacity-100"
                    onClick={() =>
                      setSelectedSubAccountId(selectedSubAccountId === item.subAccountId ? null : item.subAccountId)
                    }
                  />
                );
              })}
            </svg>

            {/* Center label */}
            <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none text-center px-4">
              <span className="text-[11px] font-medium text-slate-500 dark:text-slate-400 truncate max-w-[120px]">
                {selectedItem?.subAccountName || 'Total Biaya'}
              </span>
              <span className="text-sm sm:text-base font-extrabold text-slate-900 dark:text-white mt-0.5">
                {formatRupiah(selectedItem?.totalAmount || totalExpense)}
              </span>
              {selectedItem && (
                <span
                  className="text-[11px] font-bold mt-0.5"
                  style={{ color: selectedItem.color }}
                >
                  {selectedItem.percentage.toFixed(1)}%
                </span>
              )}
            </div>
          </div>

          {/* Interactive Legend Pills */}
          <div className="flex flex-wrap gap-1.5 mt-3 pt-3 border-t border-slate-100 dark:border-slate-800">
            {breakdownList.map((item) => {
              const isSelected = selectedSubAccountId === item.subAccountId;
              return (
                <button
                  key={item.subAccountId}
                  onClick={() =>
                    setSelectedSubAccountId(isSelected ? null : item.subAccountId)
                  }
                  className={`flex items-center gap-1.5 px-2.5 py-1 rounded-xl text-xs font-medium transition-all ${
                    isSelected
                      ? 'bg-slate-900 text-white dark:bg-white dark:text-slate-900 shadow-sm'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700'
                  }`}
                >
                  <span
                    className="w-2.5 h-2.5 rounded-full shrink-0"
                    style={{ backgroundColor: item.color }}
                  />
                  <span className="truncate max-w-[90px]">{item.subAccountName}</span>
                  <span className="font-bold opacity-80">{item.percentage.toFixed(0)}%</span>
                </button>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

interface DailyBarProps {
  dailyData: DailyExpenseBarData[];
}

export const DailyExpenseBarChartCard: React.FC<DailyBarProps> = ({ dailyData }) => {
  const { formatRupiah } = useFinance();
  const maxAmount = Math.max(...dailyData.map((d) => d.amount), 50000);
  const total7Days = dailyData.reduce((acc, d) => acc + d.amount, 0);

  const formatShortAmount = (val: number) => {
    if (val >= 1000000) return `${(val / 1000000).toFixed(1)}jt`;
    if (val >= 1000) return `${Math.round(val / 1000)}k`;
    return val > 0 ? String(Math.round(val)) : '-';
  };

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 shadow-sm border border-slate-200/80 dark:border-slate-800">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <div className="flex items-center gap-2">
            <BarChart3 className="w-4 h-4 text-emerald-500" />
            <h3 className="text-base font-bold text-slate-900 dark:text-white">Pengeluaran Harian</h3>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400">Aktivitas belanja 7 hari terakhir</p>
        </div>
        <div className="text-right">
          <span className="text-[10px] text-slate-400 uppercase font-semibold block">Total 7 Hari</span>
          <span className="text-xs sm:text-sm font-bold text-emerald-600 dark:text-emerald-400">
            {formatRupiah(total7Days)}
          </span>
        </div>
      </div>

      {/* Bar Chart Area */}
      <div className="flex items-end justify-between gap-1.5 sm:gap-2 h-36 mt-6 px-1">
        {dailyData.map((bar, idx) => {
          const heightPercent = maxAmount > 0 ? Math.max((bar.amount / maxAmount) * 100, 4) : 4;
          return (
            <div key={idx} className="flex-1 flex flex-col items-center justify-end h-full group">
              {/* Value text above bar */}
              <span
                className={`text-[9px] font-semibold mb-1 truncate transition-opacity ${
                  bar.isToday
                    ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                    : 'text-slate-400 group-hover:text-slate-700 dark:group-hover:text-slate-200'
                }`}
              >
                {formatShortAmount(bar.amount)}
              </span>

              {/* Bar pillar */}
              <div
                className="w-full max-w-[28px] rounded-t-lg transition-all duration-300"
                style={{
                  height: `${heightPercent}%`,
                  backgroundColor: bar.isToday ? '#10B981' : '#0D9488',
                  opacity: bar.isToday ? 1 : 0.75,
                }}
              />

              {/* Day label below bar */}
              <div className="mt-2 text-center">
                <span
                  className={`text-[10px] block font-medium capitalize ${
                    bar.isToday
                      ? 'text-emerald-600 dark:text-emerald-400 font-bold'
                      : 'text-slate-500 dark:text-slate-400'
                  }`}
                >
                  {bar.isToday ? 'Hari Ini' : bar.dayLabel}
                </span>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
