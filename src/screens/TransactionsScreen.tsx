import React, { useState } from 'react';
import { Search, X, Trash2, Edit2, ArrowDownRight, ArrowUpRight, Receipt, Plus, Calendar } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory, CATEGORY_DETAILS, TransactionRecord } from '../types/finance';

interface TransactionsScreenProps {
  onOpenAddTransaction: () => void;
  onEditTransaction: (tx: TransactionRecord) => void;
}

const toLocalDateStr = (timestamp: number) => {
  const d = new Date(timestamp);
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
};

export const TransactionsScreen: React.FC<TransactionsScreenProps> = ({
  onOpenAddTransaction,
  onEditTransaction,
}) => {
  const {
    transactions,
    searchQuery,
    setSearchQuery,
    selectedCategoryFilter,
    setSelectedCategoryFilter,
    deleteTransaction,
    formatRupiah,
    formatDateTime,
  } = useFinance();

  const [dateFilter, setDateFilter] = useState('');
  const [dateFilterPreset, setDateFilterPreset] = useState<'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH' | 'CUSTOM'>('ALL');

  const categories: AccountCategory[] = ['HARTA', 'UTANG', 'MODAL', 'PENDAPATAN', 'BIAYA'];

  // Handle preset clicks
  const handleSelectDatePreset = (preset: 'ALL' | 'TODAY' | 'YESTERDAY' | 'WEEK' | 'MONTH') => {
    setDateFilterPreset(preset);
    const now = new Date();
    if (preset === 'ALL') {
      setDateFilter('');
    } else if (preset === 'TODAY') {
      setDateFilter(toLocalDateStr(now.getTime()));
    } else if (preset === 'YESTERDAY') {
      const yesterday = new Date(now);
      yesterday.setDate(yesterday.getDate() - 1);
      setDateFilter(toLocalDateStr(yesterday.getTime()));
    } else {
      setDateFilter('');
    }
  };

  const filteredTransactions = transactions.filter((tx) => {
    const matchesSearch =
      searchQuery.trim() === '' ||
      tx.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      tx.referenceNumber.toLowerCase().includes(searchQuery.toLowerCase());

    const matchesCategory = selectedCategoryFilter === null || tx.category === selectedCategoryFilter;

    const txLocalDate = toLocalDateStr(tx.date);

    let matchesDate = true;
    if (dateFilterPreset === 'WEEK') {
      const sevenDaysAgo = Date.now() - 7 * 86400000;
      matchesDate = tx.date >= sevenDaysAgo;
    } else if (dateFilterPreset === 'MONTH') {
      const now = new Date();
      const txD = new Date(tx.date);
      matchesDate = txD.getFullYear() === now.getFullYear() && txD.getMonth() === now.getMonth();
    } else if (dateFilter) {
      matchesDate = txLocalDate === dateFilter;
    }

    return matchesSearch && matchesCategory && matchesDate;
  });

  return (
    <div className="space-y-4 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Jurnal Transaksi</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            {transactions.length} transaksi tercatat di pembukuan
          </p>
        </div>
        <button
          onClick={onOpenAddTransaction}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
        >
          <Plus className="w-4 h-4 stroke-[2.5]" />
          <span>Tambah</span>
        </button>
      </div>

      {/* Search Bar & Date Filter Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="sm:col-span-2 relative">
          <Search className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Cari catatan transaksi / no ref..."
            className="w-full pl-10 pr-9 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-xs"
          />
          {searchQuery && (
            <button
              onClick={() => setSearchQuery('')}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          )}
        </div>

        {/* Date Filter Input */}
        <div className="relative flex items-center">
          <Calendar className="w-4 h-4 text-slate-400 absolute left-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => {
              setDateFilter(e.target.value);
              setDateFilterPreset('CUSTOM');
            }}
            className="w-full pl-10 pr-8 py-2.5 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 text-xs sm:text-sm text-slate-900 dark:text-white font-medium focus:outline-none focus:ring-2 focus:ring-emerald-500 transition shadow-xs cursor-pointer"
            title="Pilih tanggal transaksi spesifik"
          />
          {dateFilter && (
            <button
              onClick={() => {
                setDateFilter('');
                setDateFilterPreset('ALL');
              }}
              className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 cursor-pointer"
              title="Hapus filter tanggal"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          )}
        </div>
      </div>

      {/* Date Filter Quick Presets */}
      <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
        <span className="text-[11px] font-bold text-slate-400 dark:text-slate-500 shrink-0 flex items-center gap-1">
          <Calendar className="w-3 h-3" /> Tanggal:
        </span>
        <button
          type="button"
          onClick={() => handleSelectDatePreset('ALL')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            dateFilterPreset === 'ALL' && !dateFilter
              ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Semua Tanggal
        </button>
        <button
          type="button"
          onClick={() => handleSelectDatePreset('TODAY')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            dateFilterPreset === 'TODAY'
              ? 'bg-emerald-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Hari Ini
        </button>
        <button
          type="button"
          onClick={() => handleSelectDatePreset('YESTERDAY')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            dateFilterPreset === 'YESTERDAY'
              ? 'bg-amber-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Kemarin
        </button>
        <button
          type="button"
          onClick={() => handleSelectDatePreset('WEEK')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            dateFilterPreset === 'WEEK'
              ? 'bg-indigo-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          7 Hari Terakhir
        </button>
        <button
          type="button"
          onClick={() => handleSelectDatePreset('MONTH')}
          className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
            dateFilterPreset === 'MONTH'
              ? 'bg-purple-600 text-white'
              : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
          }`}
        >
          Bulan Ini
        </button>
      </div>

      {/* Category Filter Chips */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        <button
          onClick={() => setSelectedCategoryFilter(null)}
          className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap ${
            selectedCategoryFilter === null
              ? 'bg-emerald-600 text-white shadow-sm'
              : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
          }`}
        >
          Semua
        </button>
        {categories.map((cat) => {
          const isSelected = selectedCategoryFilter === cat;
          const details = CATEGORY_DETAILS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategoryFilter(isSelected ? null : cat)}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
                isSelected
                  ? 'text-white shadow-sm'
                  : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200/80 dark:border-slate-800 hover:bg-slate-50'
              }`}
              style={{
                backgroundColor: isSelected ? details.color : undefined,
              }}
            >
              <span
                className="w-2 h-2 rounded-full"
                style={{ backgroundColor: isSelected ? '#ffffff' : details.color }}
              />
              <span>{details.displayName}</span>
            </button>
          );
        })}
      </div>

      {/* Active Filters Summary (if any) */}
      {(dateFilterPreset !== 'ALL' || dateFilter || selectedCategoryFilter !== null || searchQuery) && (
        <div className="flex items-center justify-between px-3 py-2 rounded-xl bg-slate-100 dark:bg-slate-800 text-xs">
          <span className="font-semibold text-slate-600 dark:text-slate-300">
            Ditemukan <strong className="text-emerald-600 dark:text-emerald-400">{filteredTransactions.length}</strong> transaksi
            {dateFilter && ` pada tanggal ${dateFilter}`}
            {dateFilterPreset === 'TODAY' && ' (Hari Ini)'}
            {dateFilterPreset === 'YESTERDAY' && ' (Kemarin)'}
            {dateFilterPreset === 'WEEK' && ' (7 Hari Terakhir)'}
            {dateFilterPreset === 'MONTH' && ' (Bulan Ini)'}
          </span>
          <button
            type="button"
            onClick={() => {
              setDateFilter('');
              setDateFilterPreset('ALL');
              setSelectedCategoryFilter(null);
              setSearchQuery('');
            }}
            className="text-[11px] font-bold text-red-500 hover:text-red-600 hover:underline cursor-pointer"
          >
            Reset Semua Filter
          </button>
        </div>
      )}

      {/* Transactions List */}
      {filteredTransactions.length === 0 ? (
        <div className="rounded-3xl bg-white dark:bg-slate-900 p-12 text-center border border-slate-200/80 dark:border-slate-800">
          <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-3" />
          <h4 className="text-sm font-bold text-slate-700 dark:text-slate-300">
            Tidak ada transaksi ditemukan
          </h4>
          <p className="text-xs text-slate-400 mt-1">
            {searchQuery || selectedCategoryFilter || dateFilter || dateFilterPreset !== 'ALL'
              ? 'Coba sesuaikan filter tanggal atau kata kunci pencarian.'
              : 'Mulai dengan mencatat transaksi harian baru.'}
          </p>
        </div>
      ) : (
        <div className="space-y-2.5">
          {filteredTransactions.map((tx) => {
            const isExpense = tx.category === 'BIAYA';
            const isIncome = tx.category === 'PENDAPATAN';
            const categoryDetails = CATEGORY_DETAILS[tx.category];

            return (
              <div
                key={tx.id}
                className="flex items-center justify-between p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
              >
                <div className="flex items-center gap-3.5 min-w-0">
                  <div
                    className="w-11 h-11 rounded-2xl flex items-center justify-center shrink-0"
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
                    <p className="text-sm font-bold text-slate-900 dark:text-white truncate">
                      {tx.description}
                    </p>
                    <div className="flex items-center gap-2 mt-1">
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold"
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
                      <span className="text-[10px] font-mono text-slate-400 hidden sm:inline">
                        • {tx.referenceNumber}
                      </span>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-2 shrink-0 ml-3">
                  <span
                    className={`text-sm sm:text-base font-black ${
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
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition cursor-pointer"
                    title="Edit transaksi"
                  >
                    <Edit2 className="w-4 h-4" />
                  </button>

                  <button
                    onClick={() => deleteTransaction(tx.id)}
                    className="w-8 h-8 rounded-xl flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition cursor-pointer"
                    title="Hapus transaksi"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
};
