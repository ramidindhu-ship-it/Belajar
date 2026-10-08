import React, { useState, useMemo } from 'react';
import {
  FileSpreadsheet,
  Copy,
  Check,
  CheckCircle2,
  AlertTriangle,
  ArrowUpRight,
  ArrowDownRight,
  ArrowDownLeft,
  PieChart,
  Scale,
  BookOpen,
  Search,
  Calendar,
  X,
  ChevronRight,
  Receipt,
  Filter,
  BookCheck,
  RotateCcw,
  Lock,
  Unlock,
  Sparkles,
  History,
  Info,
} from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { DailyExpenseBarChartCard, ExpenseDonutChartCard } from '../components/Charts';
import { AccountCategory, CATEGORY_DETAILS, TransactionRecord } from '../types/finance';
import { AccountIcon } from '../components/AccountIcon';

export const ReportsScreen: React.FC = () => {
  const {
    accounts,
    transactions,
    monthlyClosings,
    balanceSheet,
    incomeStatement,
    dailyExpenses,
    accountsWithBalances,
    formatRupiah,
    formatDateTime,
    exportExcelCsv,
    executeMonthlyClosing,
    reopenMonthlyClosing,
    getMonthProfitAndLoss,
  } = useFinance();

  const [activeTab, setActiveTab] = useState<'income' | 'balance' | 'ledger' | 'closing' | 'charts'>('income');
  const [copiedSummary, setCopiedSummary] = useState(false);
  const [copiedLedger, setCopiedLedger] = useState(false);

  // State for Ledger / Filter Per Akun
  const [selectedAccountId, setSelectedAccountId] = useState<number>(() => {
    return accountsWithBalances[0]?.account.id || 1;
  });
  const [ledgerCategoryFilter, setLedgerCategoryFilter] = useState<AccountCategory | 'ALL'>('ALL');
  const [ledgerSearch, setLedgerSearch] = useState('');
  const [ledgerDatePreset, setLedgerDatePreset] = useState<'ALL' | 'THIS_MONTH' | 'LAST_30' | 'LAST_7' | 'TODAY'>('ALL');

  // State for Tutup Buku Bulanan
  const now = new Date();
  const [closingYear, setClosingYear] = useState<number>(now.getFullYear());
  const [closingMonth, setClosingMonth] = useState<number>(now.getMonth() + 1); // 1-12
  const [targetRetainedAccountId, setTargetRetainedAccountId] = useState<number>(() => {
    const retained =
      accounts.find((a) => a.id === 21) ||
      accounts.find((a) => a.code === '3.2.1') ||
      accounts.find((a) => a.category === 'MODAL' && a.name.toLowerCase().includes('laba ditahan')) ||
      accounts.find((a) => a.category === 'MODAL');
    return retained?.id || 21;
  });
  const [closingNotes, setClosingNotes] = useState('');
  const [isExecutingClosing, setIsExecutingClosing] = useState(false);
  const [confirmModalData, setConfirmModalData] = useState<{
    isOpen: boolean;
    type: 'CLOSE' | 'REOPEN';
    closingId?: string;
    monthLabel?: string;
    netProfitOrLoss?: number;
    accountName?: string;
  }>({ isOpen: false, type: 'CLOSE' });
  const [actionFeedback, setActionFeedback] = useState<{
    type: 'success' | 'error';
    message: string;
  } | null>(null);

  const isSurplus = incomeStatement.netProfitOrLoss >= 0;

  // Jump from Laba Rugi / Neraca directly to an account's ledger
  const handleJumpToAccountLedger = (accountId: number) => {
    setSelectedAccountId(accountId);
    setActiveTab('ledger');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  };

  // Filtered accounts for the dropdown/selector based on category & search
  const availableLedgerAccounts = useMemo(() => {
    return accountsWithBalances.filter((item) => {
      const matchesCategory = ledgerCategoryFilter === 'ALL' || item.account.category === ledgerCategoryFilter;
      const matchesSearch =
        !ledgerSearch.trim() ||
        item.account.name.toLowerCase().includes(ledgerSearch.toLowerCase()) ||
        item.account.code.toLowerCase().includes(ledgerSearch.toLowerCase());
      return matchesCategory && matchesSearch;
    });
  }, [accountsWithBalances, ledgerCategoryFilter, ledgerSearch]);

  // Selected account detailed object
  const selectedAccountInfo = useMemo(() => {
    return (
      accountsWithBalances.find((a) => a.account.id === selectedAccountId) ||
      accountsWithBalances[0]
    );
  }, [accountsWithBalances, selectedAccountId]);

  // Filter all transactions involving the selected account
  const accountTransactions = useMemo(() => {
    if (!selectedAccountInfo) return [];
    const accId = selectedAccountInfo.account.id;
    return transactions.filter((tx) => tx.fromAccountId === accId || tx.toAccountId === accId);
  }, [transactions, selectedAccountInfo]);

  // Apply date range filter to the account's transactions
  const filteredAccountTransactions = useMemo(() => {
    const now = new Date();
    return accountTransactions.filter((tx) => {
      if (ledgerDatePreset === 'TODAY') {
        const txD = new Date(tx.date);
        return (
          txD.getFullYear() === now.getFullYear() &&
          txD.getMonth() === now.getMonth() &&
          txD.getDate() === now.getDate()
        );
      }
      if (ledgerDatePreset === 'LAST_7') {
        return tx.date >= Date.now() - 7 * 86400000;
      }
      if (ledgerDatePreset === 'LAST_30') {
        return tx.date >= Date.now() - 30 * 86400000;
      }
      if (ledgerDatePreset === 'THIS_MONTH') {
        const txD = new Date(tx.date);
        return txD.getFullYear() === now.getFullYear() && txD.getMonth() === now.getMonth();
      }
      return true;
    });
  }, [accountTransactions, ledgerDatePreset]);

  // Compute double-entry ledger mutations, inflow/outflow, and running balance
  const ledgerData = useMemo(() => {
    if (!selectedAccountInfo) {
      return {
        entries: [],
        totalInflow: 0,
        totalOutflow: 0,
        initialBalance: 0,
        endingBalance: 0,
        transactionCount: 0,
      };
    }

    const acc = selectedAccountInfo.account;
    const isDebitNormal = CATEGORY_DETAILS[acc.category].isDebitNormal;

    // Monthly closings targeting this account
    const relevantClosings = monthlyClosings.filter(
      (c) => c.retainedEarningsAccountId === acc.id
    );

    // Merge transactions and closing entries into unified chronological sequence
    type UnifiedEntry =
      | { type: 'TX'; date: number; tx: TransactionRecord }
      | { type: 'CLOSING'; date: number; closing: (typeof monthlyClosings)[0] };

    const unifiedList: UnifiedEntry[] = [
      ...filteredAccountTransactions.map((tx) => ({ type: 'TX' as const, date: tx.date, tx })),
      ...relevantClosings.map((c) => ({ type: 'CLOSING' as const, date: c.closedAt, closing: c })),
    ].sort((a, b) => a.date - b.date);

    let currentBalance = acc.initialBalance || 0;
    let totalInflow = 0;
    let totalOutflow = 0;

    const entries = unifiedList.map((entry) => {
      if (entry.type === 'CLOSING') {
        const c = entry.closing;
        const isProfit = c.netProfitOrLoss >= 0;
        let isInflow = false;

        // In equity (MODAL - credit normal): profit increases balance (+), loss decreases (-)
        if (isProfit) {
          isInflow = true;
          currentBalance += c.netProfitOrLoss;
          totalInflow += c.netProfitOrLoss;
        } else {
          isInflow = false;
          currentBalance -= Math.abs(c.netProfitOrLoss);
          totalOutflow += Math.abs(c.netProfitOrLoss);
        }

        return {
          id: `closing-${c.id}`,
          date: c.closedAt,
          isClosing: true,
          closingRecord: c,
          description: `[Tutup Buku] ${c.monthLabel}`,
          referenceNumber: c.id,
          isInflow,
          mutationAmount: Math.abs(c.netProfitOrLoss),
          runningBalance: currentBalance,
          contraName: 'Ikhtisar Laba Rugi (Pendapatan & Biaya)',
          tx: null,
        };
      }

      const tx = entry.tx;
      const isDebit = tx.toAccountId === acc.id;
      const isCredit = tx.fromAccountId === acc.id;

      let isInflow = false;

      if (isDebitNormal) {
        // HARTA (1.x) & BIAYA (5.x): Normal Debit
        if (isDebit) {
          isInflow = true;
          currentBalance += tx.amount;
          totalInflow += tx.amount;
        } else {
          isInflow = false;
          currentBalance -= tx.amount;
          totalOutflow += tx.amount;
        }
      } else {
        // UTANG (2.x), MODAL (3.x), PENDAPATAN (4.x): Normal Credit
        if (isCredit) {
          isInflow = true;
          currentBalance += tx.amount;
          totalInflow += tx.amount;
        } else {
          isInflow = false;
          currentBalance -= tx.amount;
          totalOutflow += tx.amount;
        }
      }

      const contraAccountId = isDebit ? tx.fromAccountId : tx.toAccountId;
      const contraAccount = accounts.find((a) => a.id === contraAccountId);

      return {
        id: `tx-${tx.id}`,
        date: tx.date,
        isClosing: false,
        closingRecord: null,
        description: tx.description,
        referenceNumber: tx.referenceNumber,
        isInflow,
        mutationAmount: tx.amount,
        runningBalance: currentBalance,
        contraName: contraAccount ? `${contraAccount.code} - ${contraAccount.name}` : undefined,
        tx,
      };
    });

    // Return entries in reverse order (newest first for comfortable browsing)
    return {
      entries: [...entries].reverse(),
      totalInflow,
      totalOutflow,
      initialBalance: acc.initialBalance || 0,
      endingBalance: currentBalance,
      transactionCount: entries.length,
    };
  }, [selectedAccountInfo, filteredAccountTransactions, monthlyClosings, accounts]);

  // Copy general financial summary text
  const handleCopySummary = () => {
    const text = `
BUKUKAS PRO - LAPORAN KEUANGAN
Tanggal: ${new Intl.DateTimeFormat('id-ID', { dateStyle: 'full' }).format(new Date())}
------------------------------------------
1. LAPORAN LABA RUGI
Total Pendapatan: ${formatRupiah(incomeStatement.totalPendapatan)}
Total Biaya: ${formatRupiah(incomeStatement.totalBiaya)}
Laba/Rugi Bersih: ${formatRupiah(incomeStatement.netProfitOrLoss)} (${isSurplus ? 'Surplus' : 'Defisit'})

2. NERACA KEUANGAN
Total Harta (Aktiva): ${formatRupiah(balanceSheet.totalHarta)}
Total Utang: ${formatRupiah(balanceSheet.totalUtang)}
Total Modal: ${formatRupiah(balanceSheet.totalModal)}
Laba Periode Berjalan: ${formatRupiah(balanceSheet.currentPeriodNetProfit)}
Total Pasiva: ${formatRupiah(balanceSheet.totalPasiva)}
Status: ${balanceSheet.isBalanced ? 'SEIMBANG (BALANCED)' : 'SELISIH'}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
  };

  // Copy account ledger text
  const handleCopyAccountLedger = () => {
    if (!selectedAccountInfo) return;
    const acc = selectedAccountInfo.account;
    const catDetails = CATEGORY_DETAILS[acc.category];

    const lines = ledgerData.entries.map((item) => {
      const dateFormatted = formatDateTime(item.date);
      const sign = item.isInflow ? '(+)' : '(-)';
      const lawan = item.contraName ? `[Lawan: ${item.contraName}]` : '';
      return `${dateFormatted} | ${sign} ${formatRupiah(item.mutationAmount)} | ${item.description} ${lawan} | Saldo: ${formatRupiah(item.runningBalance)}`;
    });

    const text = `
BUKUKAS PRO - BUKU BESAR MUTASI AKUN
Akun: [${acc.code}] ${acc.name} (${catDetails.displayName})
Periode: ${ledgerDatePreset === 'ALL' ? 'Semua Waktu' : ledgerDatePreset}
Saldo Awal: ${formatRupiah(ledgerData.initialBalance)}
Total Mutasi Masuk (+): ${formatRupiah(ledgerData.totalInflow)}
Total Mutasi Keluar (-): ${formatRupiah(ledgerData.totalOutflow)}
Saldo Akhir: ${formatRupiah(ledgerData.endingBalance)}
Total Mutasi: ${ledgerData.transactionCount} transaksi
------------------------------------------
${lines.join('\n')}
    `.trim();

    navigator.clipboard.writeText(text);
    setCopiedLedger(true);
    setTimeout(() => setCopiedLedger(false), 2000);
  };

  const selectedMonthPL = useMemo(() => {
    return getMonthProfitAndLoss(closingYear, closingMonth);
  }, [getMonthProfitAndLoss, closingYear, closingMonth]);

  const modalAccounts = useMemo(() => {
    return accounts.filter((a) => a.category === 'MODAL');
  }, [accounts]);

  const INDONESIAN_MONTHS = [
    { num: 1, name: 'Januari', short: 'Jan' },
    { num: 2, name: 'Februari', short: 'Feb' },
    { num: 3, name: 'Maret', short: 'Mar' },
    { num: 4, name: 'April', short: 'Apr' },
    { num: 5, name: 'Mei', short: 'Mei' },
    { num: 6, name: 'Juni', short: 'Jun' },
    { num: 7, name: 'Juli', short: 'Jul' },
    { num: 8, name: 'Agustus', short: 'Agu' },
    { num: 9, name: 'September', short: 'Sep' },
    { num: 10, name: 'Oktober', short: 'Okt' },
    { num: 11, name: 'November', short: 'Nov' },
    { num: 12, name: 'Desember', short: 'Des' },
  ];

  const handleConfirmAction = async () => {
    if (confirmModalData.type === 'CLOSE') {
      setIsExecutingClosing(true);
      const res = await executeMonthlyClosing({
        year: closingYear,
        month: closingMonth,
        retainedEarningsAccountId: targetRetainedAccountId,
        notes: closingNotes.trim() || undefined,
      });
      setIsExecutingClosing(false);
      setConfirmModalData({ isOpen: false, type: 'CLOSE' });
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      if (res.success) {
        setClosingNotes('');
      }
      setTimeout(() => setActionFeedback(null), 4000);
    } else if (confirmModalData.type === 'REOPEN' && confirmModalData.closingId) {
      setIsExecutingClosing(true);
      const res = await reopenMonthlyClosing(confirmModalData.closingId);
      setIsExecutingClosing(false);
      setConfirmModalData({ isOpen: false, type: 'REOPEN' });
      setActionFeedback({
        type: res.success ? 'success' : 'error',
        message: res.message,
      });
      setTimeout(() => setActionFeedback(null), 4000);
    }
  };

  return (
    <div className="space-y-4 pb-24">
      {/* Screen Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Laporan Keuangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Laba Rugi, Neraca & Buku Besar Mutasi Akun
          </p>
        </div>

        <div className="flex items-center gap-1.5">
          <button
            onClick={exportExcelCsv}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95 cursor-pointer"
            title="Ekspor ke format Excel (.csv)"
          >
            <FileSpreadsheet className="w-4 h-4 stroke-[2.2]" />
            <span className="hidden sm:inline">Ekspor</span> Excel
          </button>

          <button
            onClick={handleCopySummary}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200/80 dark:border-slate-700/80 cursor-pointer"
            title="Salin ringkasan laporan keuangan"
          >
            {copiedSummary ? <Check className="w-4 h-4 text-emerald-500" /> : <Copy className="w-4 h-4" />}
            <span className="hidden sm:inline">{copiedSummary ? 'Tersalin' : 'Salin'}</span>
          </button>
        </div>
      </div>

      {/* 5 Tabs Row */}
      <div className="grid grid-cols-2 sm:grid-cols-5 gap-1 p-1 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs">
        {[
          { key: 'income', label: 'Laba Rugi', icon: ArrowUpRight },
          { key: 'balance', label: 'Neraca', icon: Scale },
          { key: 'ledger', label: 'Buku Besar', icon: BookOpen },
          { key: 'closing', label: 'Tutup Buku', icon: BookCheck },
          { key: 'charts', label: 'Grafik Biaya', icon: PieChart },
        ].map((tab, idx) => {
          const isSelected = activeTab === tab.key;
          const IconComponent = tab.icon;
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key as any)}
              className={`py-2 px-1.5 rounded-xl text-xs font-bold transition flex items-center justify-center gap-1.5 cursor-pointer ${
                idx === 4 ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isSelected
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
              }`}
            >
              <IconComponent className="w-3.5 h-3.5 shrink-0" />
              <span className="truncate">{tab.label}</span>
            </button>
          );
        })}
      </div>

      {/* Excel Download Shortcut Banner */}
      <div
        onClick={exportExcelCsv}
        className="flex items-center justify-between p-3.5 sm:p-4 rounded-3xl bg-emerald-500/10 hover:bg-emerald-500/15 border border-emerald-500/20 cursor-pointer transition"
      >
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-2xl bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 flex items-center justify-center shrink-0">
            <FileSpreadsheet className="w-5 h-5 stroke-[2.2]" />
          </div>
          <div>
            <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
              Unduh Spreadsheet Excel (.csv)
            </h4>
            <p className="text-[11px] text-slate-500 dark:text-slate-400">
              Termasuk Neraca, Laba Rugi, Saldo Awal/Akhir & Jurnal Transaksi Per Akun
            </p>
          </div>
        </div>
        <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
          Unduh &gt;
        </span>
      </div>

      {/* ========================================================================= */}
      {/* TAB 1: LABA RUGI */}
      {/* ========================================================================= */}
      {activeTab === 'income' && (
        <div className="space-y-4">
          <div
            className={`rounded-3xl p-5 border ${
              isSurplus
                ? 'bg-emerald-500/10 border-emerald-500/20'
                : 'bg-amber-500/10 border-amber-500/20'
            }`}
          >
            <div className="flex items-center justify-between">
              <h3 className="text-base font-bold text-slate-900 dark:text-white">
                Laporan Laba Rugi Bersih
              </h3>
              <span
                className={`px-3 py-1 rounded-full text-xs font-black text-white ${
                  isSurplus ? 'bg-emerald-600' : 'bg-amber-600'
                }`}
              >
                {isSurplus ? 'Surplus (+)' : 'Defisit (-)'}
              </span>
            </div>

            <div className="mt-3">
              <span
                className={`text-2xl sm:text-3xl font-black ${
                  isSurplus ? 'text-emerald-600 dark:text-emerald-400' : 'text-amber-600 dark:text-amber-400'
                }`}
              >
                {formatRupiah(incomeStatement.netProfitOrLoss)}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-3 mt-4 pt-3.5 border-t border-slate-200/40 dark:border-slate-700/40">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Total Pendapatan
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-cyan-600 dark:text-cyan-400 block mt-0.5">
                  {formatRupiah(incomeStatement.totalPendapatan)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
                  Total Biaya (Beban)
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 block mt-0.5">
                  {formatRupiah(incomeStatement.totalBiaya)}
                </span>
              </div>
            </div>
          </div>

          <ReportSection
            title="Pendapatan (Revenue)"
            category="PENDAPATAN"
            accounts={accountsWithBalances.filter((a) => a.account.category === 'PENDAPATAN')}
            totalAmount={incomeStatement.totalPendapatan}
            onSelectAccount={handleJumpToAccountLedger}
          />

          <ReportSection
            title="Beban & Biaya (Expenses)"
            category="BIAYA"
            accounts={accountsWithBalances.filter((a) => a.account.category === 'BIAYA')}
            totalAmount={incomeStatement.totalBiaya}
            onSelectAccount={handleJumpToAccountLedger}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 2: NERACA KEUANGAN */}
      {/* ========================================================================= */}
      {activeTab === 'balance' && (
        <div className="space-y-4">
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-base font-bold text-slate-900 dark:text-white">
                  Persamaan Dasar Akuntansi
                </h3>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Aktiva = Kewajiban + Ekuitas
                </p>
              </div>

              <span
                className={`inline-flex items-center gap-1 px-3 py-1 rounded-full text-xs font-black ${
                  balanceSheet.isBalanced
                    ? 'bg-emerald-500/20 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                    : 'bg-red-500/20 text-red-600 dark:text-red-400 border border-red-500/30'
                }`}
              >
                {balanceSheet.isBalanced ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Seimbang (Balanced)
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Selisih
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4 pt-3.5 border-t border-slate-100 dark:border-slate-800">
              <div>
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Sisi Aktiva (Harta)
                </span>
                <span className="text-lg sm:text-xl font-black text-emerald-600 dark:text-emerald-400 block mt-0.5">
                  {formatRupiah(balanceSheet.totalHarta)}
                </span>
              </div>
              <div className="text-right">
                <span className="text-[10px] uppercase font-bold text-slate-400 block">
                  Sisi Pasiva (Utang + Modal + Laba)
                </span>
                <span className="text-lg sm:text-xl font-black text-indigo-600 dark:text-indigo-400 block mt-0.5">
                  {formatRupiah(balanceSheet.totalPasiva)}
                </span>
              </div>
            </div>
          </div>

          <ReportSection
            title="AKTIVA: Harta & Aset Lancar"
            category="HARTA"
            accounts={accountsWithBalances.filter((a) => a.account.category === 'HARTA')}
            totalAmount={balanceSheet.totalHarta}
            onSelectAccount={handleJumpToAccountLedger}
          />

          <ReportSection
            title="PASIVA: Utang & Kewajiban"
            category="UTANG"
            accounts={accountsWithBalances.filter((a) => a.account.category === 'UTANG')}
            totalAmount={balanceSheet.totalUtang}
            onSelectAccount={handleJumpToAccountLedger}
          />

          <ReportSection
            title="PASIVA: Modal & Ekuitas"
            category="MODAL"
            accounts={accountsWithBalances.filter((a) => a.account.category === 'MODAL')}
            totalAmount={balanceSheet.totalModal}
            onSelectAccount={handleJumpToAccountLedger}
          />
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 3: BUKU BESAR (FILTER TRANSAKSI PER AKUN) */}
      {/* ========================================================================= */}
      {activeTab === 'ledger' && (
        <div className="space-y-4">
          {/* 1. Account Filter Header & Selector Controls */}
          <div className="p-4 rounded-3xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-xl bg-indigo-500/15 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
                  <Filter className="w-4 h-4 stroke-[2.2]" />
                </div>
                <div>
                  <h3 className="text-sm font-extrabold text-slate-900 dark:text-white">
                    Filter Transaksi Per Akun
                  </h3>
                  <p className="text-[11px] text-slate-500 dark:text-slate-400">
                    Buku Besar & Rincian Mutasi Keluar/Masuk
                  </p>
                </div>
              </div>

              <span className="text-[11px] font-bold text-slate-500 dark:text-slate-400">
                {availableLedgerAccounts.length} Akun Tersedia
              </span>
            </div>

            {/* Category Filter Chips */}
            <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
              <button
                type="button"
                onClick={() => setLedgerCategoryFilter('ALL')}
                className={`px-2.5 py-1.5 rounded-xl font-bold transition shrink-0 cursor-pointer ${
                  ledgerCategoryFilter === 'ALL'
                    ? 'bg-slate-800 dark:bg-slate-200 text-white dark:text-slate-900 shadow-xs'
                    : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                }`}
              >
                Semua Akun (37)
              </button>
              {(['HARTA', 'UTANG', 'MODAL', 'PENDAPATAN', 'BIAYA'] as AccountCategory[]).map((cat) => {
                const isSelected = ledgerCategoryFilter === cat;
                const details = CATEGORY_DETAILS[cat];
                return (
                  <button
                    key={cat}
                    type="button"
                    onClick={() => setLedgerCategoryFilter(cat)}
                    className={`px-2.5 py-1.5 rounded-xl font-bold transition shrink-0 flex items-center gap-1.5 cursor-pointer ${
                      isSelected
                        ? 'text-white shadow-xs'
                        : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200'
                    }`}
                    style={{
                      backgroundColor: isSelected ? details.color : undefined,
                    }}
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full"
                      style={{ backgroundColor: isSelected ? '#ffffff' : details.color }}
                    />
                    <span>{details.displayName}</span>
                  </button>
                );
              })}
            </div>

            {/* Account Search & Select Dropdown */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
              <div className="relative sm:col-span-1">
                <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="text"
                  value={ledgerSearch}
                  onChange={(e) => setLedgerSearch(e.target.value)}
                  placeholder="Cari kode/nama akun..."
                  className="w-full pl-8 pr-7 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500"
                />
                {ledgerSearch && (
                  <button
                    onClick={() => setLedgerSearch('')}
                    className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>

              <div className="sm:col-span-2">
                <select
                  value={selectedAccountId}
                  onChange={(e) => setSelectedAccountId(Number(e.target.value))}
                  className="w-full px-3 py-2 rounded-xl bg-slate-50 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-emerald-500 cursor-pointer truncate"
                >
                  {availableLedgerAccounts.map((item) => (
                    <option key={item.account.id} value={item.account.id}>
                      [{item.account.code}] {item.account.name} ({CATEGORY_DETAILS[item.account.category].displayName}) - Saldo: {formatRupiah(item.balance)}
                    </option>
                  ))}
                </select>
              </div>
            </div>
          </div>

          {/* 2. Selected Account Summary Banner */}
          {selectedAccountInfo && (
            <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div
                    className="w-12 h-12 rounded-2xl flex items-center justify-center shrink-0"
                    style={{
                      backgroundColor: `${CATEGORY_DETAILS[selectedAccountInfo.account.category].color}20`,
                      color: CATEGORY_DETAILS[selectedAccountInfo.account.category].color,
                    }}
                  >
                    <AccountIcon name={selectedAccountInfo.account.iconName || 'account_balance'} className="w-6 h-6" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold px-2 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                        {selectedAccountInfo.account.code}
                      </span>
                      <span
                        className="px-2 py-0.5 rounded-md text-[10px] font-bold text-white"
                        style={{
                          backgroundColor: CATEGORY_DETAILS[selectedAccountInfo.account.category].color,
                        }}
                      >
                        {CATEGORY_DETAILS[selectedAccountInfo.account.category].displayName}
                      </span>
                    </div>
                    <h3 className="text-base sm:text-lg font-black text-slate-900 dark:text-white mt-1">
                      {selectedAccountInfo.account.name}
                    </h3>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <button
                    onClick={handleCopyAccountLedger}
                    className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition border border-slate-200 dark:border-slate-700 cursor-pointer"
                    title="Salin rincian mutasi akun ini"
                  >
                    {copiedLedger ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
                    <span>{copiedLedger ? 'Tersalin' : 'Salin Mutasi'}</span>
                  </button>
                </div>
              </div>

              {/* 4-Stat Accounting Breakdown */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
                <div className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-slate-400 block">
                    Saldo Awal
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-slate-700 dark:text-slate-300 block mt-1">
                    {formatRupiah(ledgerData.initialBalance)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-emerald-500/10 border border-emerald-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-emerald-600 dark:text-emerald-400 block flex items-center gap-1">
                    <ArrowDownLeft className="w-3 h-3" /> Mutasi Masuk (+)
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-emerald-600 dark:text-emerald-400 block mt-1">
                    +{formatRupiah(ledgerData.totalInflow)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-amber-500/10 border border-amber-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 block flex items-center gap-1">
                    <ArrowUpRight className="w-3 h-3" /> Mutasi Keluar (-)
                  </span>
                  <span className="text-xs sm:text-sm font-extrabold text-amber-600 dark:text-amber-400 block mt-1">
                    -{formatRupiah(ledgerData.totalOutflow)}
                  </span>
                </div>

                <div className="p-3 rounded-2xl bg-indigo-500/10 border border-indigo-500/20">
                  <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 block">
                    Saldo Akhir
                  </span>
                  <span className="text-xs sm:text-sm font-black text-indigo-600 dark:text-indigo-400 block mt-1">
                    {formatRupiah(ledgerData.endingBalance)}
                  </span>
                </div>
              </div>
            </div>
          )}

          {/* 3. Date Presets Filter for this Account */}
          <div className="flex items-center gap-1.5 overflow-x-auto pb-1 scrollbar-none text-xs">
            <span className="text-[11px] font-bold text-slate-400 shrink-0 flex items-center gap-1">
              <Calendar className="w-3 h-3" /> Periode:
            </span>
            {[
              { key: 'ALL', label: 'Semua Waktu' },
              { key: 'THIS_MONTH', label: 'Bulan Ini' },
              { key: 'LAST_30', label: '30 Hari Terakhir' },
              { key: 'LAST_7', label: '7 Hari Terakhir' },
              { key: 'TODAY', label: 'Hari Ini' },
            ].map((p) => {
              const isSelected = ledgerDatePreset === p.key;
              return (
                <button
                  key={p.key}
                  type="button"
                  onClick={() => setLedgerDatePreset(p.key as any)}
                  className={`px-2.5 py-1 rounded-xl text-xs font-bold transition shrink-0 cursor-pointer ${
                    isSelected
                      ? 'bg-emerald-600 text-white shadow-xs'
                      : 'bg-white dark:bg-slate-900 text-slate-600 dark:text-slate-300 border border-slate-200 dark:border-slate-800 hover:bg-slate-100'
                  }`}
                >
                  {p.label}
                </button>
              );
            })}
          </div>

          {/* 4. Transactions Ledger List */}
          <div className="space-y-2">
            <div className="flex items-center justify-between px-1">
              <h4 className="text-xs font-extrabold uppercase tracking-wider text-slate-500 dark:text-slate-400">
                Rincian Mutasi Transaksi ({ledgerData.transactionCount} Transaksi)
              </h4>
              <span className="text-xs text-slate-400">
                Urutan: Terbaru ke Terlama
              </span>
            </div>

            {ledgerData.entries.length === 0 ? (
              <div className="rounded-3xl bg-white dark:bg-slate-900 p-10 text-center border border-slate-200/80 dark:border-slate-800">
                <Receipt className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2.5" />
                <h5 className="text-sm font-bold text-slate-700 dark:text-slate-300">
                  Belum ada transaksi untuk akun ini
                </h5>
                <p className="text-xs text-slate-400 mt-1 max-w-sm mx-auto">
                  Transaksi yang melibatkan akun{' '}
                  <strong>{selectedAccountInfo?.account.name}</strong> akan otomatis tercatat dan menghitung saldo berjalan di sini.
                </p>
              </div>
            ) : (
              <div className="space-y-2">
                {ledgerData.entries.map((item) => {
                  const isInflow = item.isInflow;
                  const isClosing = item.isClosing;

                  return (
                    <div
                      key={item.id}
                      className={`p-3.5 rounded-2xl border shadow-xs transition ${
                        isClosing
                          ? 'bg-indigo-50/60 dark:bg-indigo-950/20 border-indigo-200/80 dark:border-indigo-800/60'
                          : 'bg-white dark:bg-slate-900 border-slate-200/80 dark:border-slate-800 hover:border-slate-300 dark:hover:border-slate-700'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-3">
                        {/* Left Side: Icon & Details */}
                        <div className="flex items-start gap-3 min-w-0">
                          <div
                            className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 mt-0.5 ${
                              isClosing
                                ? 'bg-indigo-500/20 text-indigo-600 dark:text-indigo-400'
                                : isInflow
                                ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                                : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isClosing ? (
                              <BookCheck className="w-4 h-4 stroke-[2.3]" />
                            ) : isInflow ? (
                              <ArrowDownLeft className="w-4 h-4 stroke-[2.4]" />
                            ) : (
                              <ArrowUpRight className="w-4 h-4 stroke-[2.4]" />
                            )}
                          </div>

                          <div className="min-w-0">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              <p className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                                {item.description}
                              </p>
                              {isClosing && (
                                <span className="px-1.5 py-0.5 rounded-md text-[10px] font-black bg-indigo-500/20 text-indigo-600 dark:text-indigo-400">
                                  TUTUP BUKU
                                </span>
                              )}
                            </div>

                            <div className="flex flex-wrap items-center gap-1.5 mt-1 text-[11px]">
                              <span className="text-slate-400">
                                {formatDateTime(item.date)}
                              </span>
                              <span className="text-slate-300 dark:text-slate-600">•</span>
                              <span className="font-mono text-slate-400">
                                {item.referenceNumber}
                              </span>
                              {item.contraName && (
                                <>
                                  <span className="text-slate-300 dark:text-slate-600">•</span>
                                  <span className="px-1.5 py-0.5 rounded-md bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 font-medium">
                                    Lawan: {item.contraName}
                                  </span>
                                </>
                              )}
                            </div>
                          </div>
                        </div>

                        {/* Right Side: Mutation Amount & Running Balance */}
                        <div className="text-right shrink-0">
                          <span
                            className={`text-xs sm:text-sm font-black block ${
                              isInflow
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-amber-600 dark:text-amber-400'
                            }`}
                          >
                            {isInflow ? '+' : '-'} {formatRupiah(item.mutationAmount)}
                          </span>

                          <span className="inline-block mt-1 px-2 py-0.5 rounded-md text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                            Saldo: {formatRupiah(item.runningBalance)}
                          </span>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 4: TUTUP BUKU BULANAN (PERIOD CLOSE) */}
      {/* ========================================================================= */}
      {activeTab === 'closing' && (
        <div className="space-y-4">
          {/* Hero Banner */}
          <div className="relative overflow-hidden rounded-3xl bg-linear-to-br from-indigo-900 via-slate-900 to-slate-950 p-5 sm:p-6 text-white border border-indigo-500/30 shadow-lg">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 relative z-10">
              <div className="space-y-1">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full bg-indigo-500/20 border border-indigo-400/30 text-[11px] font-bold text-indigo-300">
                  <BookCheck className="w-3.5 h-3.5" />
                  <span>Siklus Pembukuan Bulanan</span>
                </div>
                <h3 className="text-lg sm:text-xl font-black tracking-tight text-white">
                  Tutup Buku & Alokasi Laba Ditahan
                </h3>
                <p className="text-xs text-indigo-200/80 max-w-xl">
                  Segel pembukuan transaksi tiap akhir bulan. Laba atau rugi bersih periode berjalan akan otomatis dipindahkan ke akun <strong>Laba Ditahan (Ekuitas/Modal)</strong> pada Neraca Keuangan.
                </p>
              </div>

              {/* Retained Earnings Quick Metric */}
              <div className="p-3.5 rounded-2xl bg-white/10 backdrop-blur-xs border border-white/10 shrink-0 w-full sm:w-auto">
                <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-200 block">
                  Total Saldo Akun Laba Ditahan
                </span>
                <span className="text-base sm:text-lg font-black text-white block mt-0.5">
                  {formatRupiah(
                    accountsWithBalances.find((a) => a.account.id === targetRetainedAccountId)?.balance || 0
                  )}
                </span>
                <button
                  type="button"
                  onClick={() => handleJumpToAccountLedger(targetRetainedAccountId)}
                  className="text-[11px] font-bold text-indigo-300 hover:text-white flex items-center gap-1 mt-1 transition cursor-pointer"
                >
                  <span>Lihat Buku Besar Akun</span>
                  <ChevronRight className="w-3 h-3" />
                </button>
              </div>
            </div>
          </div>

          {/* Feedback banner if any */}
          {actionFeedback && (
            <div
              className={`p-4 rounded-2xl flex items-center gap-3 border animate-in fade-in ${
                actionFeedback.type === 'success'
                  ? 'bg-emerald-500/15 border-emerald-500/30 text-emerald-800 dark:text-emerald-300'
                  : 'bg-red-500/15 border-red-500/30 text-red-800 dark:text-red-300'
              }`}
            >
              {actionFeedback.type === 'success' ? (
                <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600 dark:text-emerald-400" />
              ) : (
                <AlertTriangle className="w-5 h-5 shrink-0 text-red-600 dark:text-red-400" />
              )}
              <span className="text-xs sm:text-sm font-bold flex-1">{actionFeedback.message}</span>
              <button
                onClick={() => setActionFeedback(null)}
                className="text-xs opacity-60 hover:opacity-100 cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
          )}

          {/* Month & Year Selection Box */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-4">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div>
                <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
                  <span>Pilih Periode Pembukuan</span>
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Pilih bulan dan tahun yang ingin ditutup atau diperiksa statusnya
                </p>
              </div>

              {/* Year Selector & Quick shortcuts */}
              <div className="flex items-center gap-2 w-full sm:w-auto">
                <button
                  type="button"
                  onClick={() => {
                    const d = new Date();
                    setClosingYear(d.getFullYear());
                    setClosingMonth(d.getMonth() + 1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    closingYear === now.getFullYear() && closingMonth === now.getMonth() + 1
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bulan Ini
                </button>

                <button
                  type="button"
                  onClick={() => {
                    const prevD = new Date(now.getFullYear(), now.getMonth() - 1, 1);
                    setClosingYear(prevD.getFullYear());
                    setClosingMonth(prevD.getMonth() + 1);
                  }}
                  className={`px-3 py-1.5 rounded-xl text-xs font-bold transition cursor-pointer border ${
                    closingYear === (now.getMonth() === 0 ? now.getFullYear() - 1 : now.getFullYear()) &&
                    closingMonth === (now.getMonth() === 0 ? 12 : now.getMonth())
                      ? 'bg-emerald-600 text-white border-emerald-600'
                      : 'bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:bg-slate-200'
                  }`}
                >
                  Bulan Kemarin
                </button>

                {/* Year Select */}
                <select
                  value={closingYear}
                  onChange={(e) => setClosingYear(Number(e.target.value))}
                  className="px-3 py-1.5 rounded-xl bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                >
                  {[now.getFullYear() - 2, now.getFullYear() - 1, now.getFullYear(), now.getFullYear() + 1].map((y) => (
                    <option key={y} value={y}>
                      Tahun {y}
                    </option>
                  ))}
                </select>
              </div>
            </div>

            {/* 12 Month Grid */}
            <div className="grid grid-cols-3 sm:grid-cols-6 md:grid-cols-12 gap-1.5 pt-1">
              {INDONESIAN_MONTHS.map((m) => {
                const isSelected = closingMonth === m.num;
                const monthClosingId = `CLOSING-${closingYear}-${String(m.num).padStart(2, '0')}`;
                const isMonthClosed = monthlyClosings.some((c) => c.id === monthClosingId);

                return (
                  <button
                    key={m.num}
                    type="button"
                    onClick={() => setClosingMonth(m.num)}
                    className={`relative py-2.5 px-2 rounded-2xl text-xs font-bold transition flex flex-col items-center justify-center gap-1 cursor-pointer border ${
                      isSelected
                        ? 'bg-emerald-600 text-white border-emerald-600 shadow-md scale-102 z-10'
                        : isMonthClosed
                        ? 'bg-emerald-500/10 dark:bg-emerald-500/15 border-emerald-500/30 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-500/20'
                        : 'bg-slate-50 dark:bg-slate-800/60 border-slate-200/80 dark:border-slate-700/80 text-slate-700 dark:text-slate-300 hover:bg-slate-100'
                    }`}
                  >
                    <span className="text-[11px] leading-none">{m.short}</span>
                    {isMonthClosed && (
                      <span
                        className={`inline-flex items-center gap-0.5 text-[9px] font-extrabold ${
                          isSelected ? 'text-white' : 'text-emerald-600 dark:text-emerald-400'
                        }`}
                      >
                        <Check className="w-2.5 h-2.5 stroke-[3]" /> Ditutup
                      </span>
                    )}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Status & Action Card for Selected Month */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-5">
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800 gap-3">
              <div>
                <span className="text-[11px] font-bold uppercase tracking-wider text-slate-400 block">
                  Status Pembukuan Periode
                </span>
                <h3 className="text-lg font-black text-slate-900 dark:text-white mt-0.5">
                  {INDONESIAN_MONTHS.find((m) => m.num === closingMonth)?.name} {closingYear}
                </h3>
              </div>

              {selectedMonthPL.isClosed ? (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-emerald-500/15 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400 text-xs font-black">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>SUDAH DITUTUP BUKU</span>
                </div>
              ) : (
                <div className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-amber-500/15 border border-amber-500/30 text-amber-600 dark:text-amber-400 text-xs font-black">
                  <Lock className="w-4 h-4" />
                  <span>BELUM DITUTUP (TERBUKA)</span>
                </div>
              )}
            </div>

            {/* Performance Stats of Selected Month */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              {/* Pendapatan */}
              <div className="p-4 rounded-2xl bg-cyan-500/10 border border-cyan-500/20 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-cyan-600 dark:text-cyan-400 flex items-center justify-between">
                  <span>Pendapatan Bulan Ini</span>
                  <ArrowDownLeft className="w-3.5 h-3.5" />
                </span>
                <span className="text-base sm:text-lg font-black text-cyan-600 dark:text-cyan-400 block">
                  +{formatRupiah(selectedMonthPL.totalPendapatan)}
                </span>
              </div>

              {/* Biaya */}
              <div className="p-4 rounded-2xl bg-amber-500/10 border border-amber-500/20 space-y-1">
                <span className="text-[11px] font-bold uppercase tracking-wider text-amber-600 dark:text-amber-400 flex items-center justify-between">
                  <span>Biaya / Pengeluaran</span>
                  <ArrowUpRight className="w-3.5 h-3.5" />
                </span>
                <span className="text-base sm:text-lg font-black text-amber-600 dark:text-amber-400 block">
                  -{formatRupiah(selectedMonthPL.totalBiaya)}
                </span>
              </div>

              {/* Laba Bersih */}
              <div
                className={`p-4 rounded-2xl border space-y-1 ${
                  selectedMonthPL.netProfitOrLoss >= 0
                    ? 'bg-emerald-500/15 border-emerald-500/30'
                    : 'bg-red-500/15 border-red-500/30'
                }`}
              >
                <span
                  className={`text-[11px] font-bold uppercase tracking-wider flex items-center justify-between ${
                    selectedMonthPL.netProfitOrLoss >= 0
                      ? 'text-emerald-700 dark:text-emerald-300'
                      : 'text-red-700 dark:text-red-300'
                  }`}
                >
                  <span>
                    {selectedMonthPL.netProfitOrLoss >= 0 ? 'Laba Bersih (Surplus)' : 'Rugi Bersih (Defisit)'}
                  </span>
                  <Scale className="w-3.5 h-3.5" />
                </span>
                <span
                  className={`text-base sm:text-lg font-black block ${
                    selectedMonthPL.netProfitOrLoss >= 0
                      ? 'text-emerald-600 dark:text-emerald-400'
                      : 'text-red-600 dark:text-red-400'
                  }`}
                >
                  {selectedMonthPL.netProfitOrLoss >= 0 ? '+' : '-'} {formatRupiah(Math.abs(selectedMonthPL.netProfitOrLoss))}
                </span>
              </div>
            </div>

            {/* If Closed: Details of the closing record */}
            {selectedMonthPL.isClosed && selectedMonthPL.closingRecord && (
              <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/80 space-y-3">
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Tanggal Eksekusi Tutup Buku:</span>
                  <span className="font-bold text-slate-900 dark:text-white">
                    {formatDateTime(selectedMonthPL.closingRecord.closedAt)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Akun Penampung Ekuitas:</span>
                  <span className="font-bold text-emerald-600 dark:text-emerald-400">
                    {selectedMonthPL.closingRecord.retainedEarningsAccountName}
                  </span>
                </div>
                <div className="flex items-center justify-between text-xs">
                  <span className="text-slate-500 dark:text-slate-400">Nominal Laba Ditahan Dialokasikan:</span>
                  <span className="font-black text-slate-900 dark:text-white font-mono">
                    {formatRupiah(selectedMonthPL.closingRecord.netProfitOrLoss)}
                  </span>
                </div>
                {selectedMonthPL.closingRecord.notes && (
                  <div className="pt-2 border-t border-slate-200/60 dark:border-slate-700/60 text-xs">
                    <span className="text-slate-500 dark:text-slate-400 block text-[11px] mb-0.5">Catatan:</span>
                    <p className="text-slate-700 dark:text-slate-300 italic">
                      "{selectedMonthPL.closingRecord.notes}"
                    </p>
                  </div>
                )}

                <div className="pt-2 flex justify-end">
                  <button
                    type="button"
                    onClick={() =>
                      setConfirmModalData({
                        isOpen: true,
                        type: 'REOPEN',
                        closingId: selectedMonthPL.closingRecord!.id,
                        monthLabel: selectedMonthPL.closingRecord!.monthLabel,
                        netProfitOrLoss: selectedMonthPL.closingRecord!.netProfitOrLoss,
                        accountName: selectedMonthPL.closingRecord!.retainedEarningsAccountName,
                      })
                    }
                    className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500/10 hover:bg-amber-500/20 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-bold transition cursor-pointer"
                  >
                    <RotateCcw className="w-3.5 h-3.5" />
                    <span>Buka Kembali Periode Ini (Batalkan Tutup Buku)</span>
                  </button>
                </div>
              </div>
            )}

            {/* If NOT Closed: Closing form */}
            {!selectedMonthPL.isClosed && (
              <div className="space-y-4 pt-2">
                <div className="p-4 rounded-2xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-3">
                  <div className="flex items-start gap-2.5">
                    <Info className="w-4 h-4 text-indigo-600 dark:text-indigo-400 shrink-0 mt-0.5" />
                    <div className="text-xs text-indigo-900 dark:text-indigo-200 leading-relaxed">
                      <p className="font-bold">Ketentuan Tutup Buku Otomatis:</p>
                      <ul className="list-disc list-inside mt-1 space-y-0.5 text-indigo-700 dark:text-indigo-300">
                        <li>
                          Laba/rugi bersih sebesar <strong>{formatRupiah(selectedMonthPL.netProfitOrLoss)}</strong> akan otomatis dialokasikan ke akun <strong>Laba Ditahan</strong>.
                        </li>
                        <li>
                          Persamaan Neraca Keuangan tetap 100% seimbang (Harta = Utang + Modal + Laba Berjalan).
                        </li>
                        <li>
                          Anda tetap bisa membuka kembali (re-open) periode ini sewaktu-waktu jika perlu koreksi transaksi.
                        </li>
                      </ul>
                    </div>
                  </div>

                  {/* Target Retained Earnings Account */}
                  <div className="pt-2 border-t border-indigo-200/50 dark:border-indigo-800/50">
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                      Pilih Akun Penampung Laba Ditahan (Ekuitas/Modal):
                    </label>
                    <select
                      value={targetRetainedAccountId}
                      onChange={(e) => setTargetRetainedAccountId(Number(e.target.value))}
                      className="w-full px-3.5 py-2.5 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs font-bold text-slate-900 dark:text-white cursor-pointer focus:ring-2 focus:ring-emerald-500"
                    >
                      {modalAccounts.map((a) => (
                        <option key={a.id} value={a.id}>
                          [{a.code}] {a.name} (Saldo saat ini: {formatRupiah(a.initialBalance)})
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Notes / Memo */}
                  <div>
                    <label className="text-[11px] font-bold uppercase tracking-wider text-slate-500 dark:text-slate-400 block mb-1.5">
                      Catatan / Memo Tutup Buku (Opsional):
                    </label>
                    <input
                      type="text"
                      value={closingNotes}
                      onChange={(e) => setClosingNotes(e.target.value)}
                      placeholder={`Contoh: Tutup buku ${INDONESIAN_MONTHS.find((m) => m.num === closingMonth)?.name} ${closingYear}`}
                      className="w-full px-3.5 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-xs text-slate-900 dark:text-white placeholder:text-slate-400 focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>
                </div>

                {/* Submit Action */}
                <div className="flex justify-end pt-1">
                  <button
                    type="button"
                    onClick={() => {
                      const selectedModalAcc = accounts.find((a) => a.id === targetRetainedAccountId);
                      setConfirmModalData({
                        isOpen: true,
                        type: 'CLOSE',
                        monthLabel: `${INDONESIAN_MONTHS.find((m) => m.num === closingMonth)?.name} ${closingYear}`,
                        netProfitOrLoss: selectedMonthPL.netProfitOrLoss,
                        accountName: selectedModalAcc ? `[${selectedModalAcc.code}] ${selectedModalAcc.name}` : 'Laba Ditahan',
                      });
                    }}
                    className="flex items-center gap-2 px-5 py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-98 text-white font-extrabold text-xs sm:text-sm shadow-md transition cursor-pointer"
                  >
                    <BookCheck className="w-4 h-4 stroke-[2.2]" />
                    <span>Tutup Buku Bulan {INDONESIAN_MONTHS.find((m) => m.num === closingMonth)?.name} {closingYear}</span>
                  </button>
                </div>
              </div>
            )}
          </div>

          {/* Riwayat Tutup Buku (History List) */}
          <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 sm:p-6 border border-slate-200/80 dark:border-slate-800 shadow-sm space-y-3">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
              <h4 className="text-sm font-extrabold text-slate-900 dark:text-white flex items-center gap-2">
                <History className="w-4 h-4 text-indigo-500" />
                <span>Riwayat Tutup Buku ({monthlyClosings.length} Periode)</span>
              </h4>
              <span className="text-xs text-slate-400">
                Data tersinkronisasi otomatis
              </span>
            </div>

            {monthlyClosings.length === 0 ? (
              <div className="p-8 text-center">
                <BookCheck className="w-10 h-10 text-slate-300 dark:text-slate-600 mx-auto mb-2" />
                <h5 className="text-xs sm:text-sm font-bold text-slate-700 dark:text-slate-300">
                  Belum ada periode tutup buku
                </h5>
                <p className="text-xs text-slate-400 max-w-sm mx-auto mt-1">
                  Pilih bulan pada menu di atas, lalu tekan tombol "Tutup Buku" untuk memindahkan laba/rugi ke akun Laba Ditahan.
                </p>
              </div>
            ) : (
              <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                {monthlyClosings.map((c) => {
                  const isProfit = c.netProfitOrLoss >= 0;
                  return (
                    <div key={c.id} className="py-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-extrabold text-slate-900 dark:text-white">
                            {c.monthLabel}
                          </span>
                          <span className="px-2 py-0.5 rounded-md text-[10px] font-black bg-emerald-500/15 text-emerald-600 dark:text-emerald-400 flex items-center gap-1">
                            <Check className="w-3 h-3 stroke-[3]" /> Ditutup
                          </span>
                        </div>
                        <p className="text-xs text-slate-500 dark:text-slate-400">
                          Ditutup pada {formatDateTime(c.closedAt)} • Akun: <strong className="text-slate-700 dark:text-slate-300">{c.retainedEarningsAccountName}</strong>
                        </p>
                        {c.notes && (
                          <p className="text-[11px] text-slate-400 italic">
                            {c.notes}
                          </p>
                        )}
                      </div>

                      <div className="flex items-center gap-3 shrink-0 self-end sm:self-center">
                        <div className="text-right">
                          <span
                            className={`text-xs sm:text-sm font-black block font-mono ${
                              isProfit
                                ? 'text-emerald-600 dark:text-emerald-400'
                                : 'text-red-600 dark:text-red-400'
                            }`}
                          >
                            {isProfit ? '+' : '-'} {formatRupiah(Math.abs(c.netProfitOrLoss))}
                          </span>
                          <span className="text-[10px] text-slate-400 block">
                            Laba Ditahan
                          </span>
                        </div>

                        <button
                          type="button"
                          onClick={() =>
                            setConfirmModalData({
                              isOpen: true,
                              type: 'REOPEN',
                              closingId: c.id,
                              monthLabel: c.monthLabel,
                              netProfitOrLoss: c.netProfitOrLoss,
                              accountName: c.retainedEarningsAccountName,
                            })
                          }
                          className="px-2.5 py-1.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-600 dark:text-slate-300 text-xs font-bold transition flex items-center gap-1 cursor-pointer"
                          title="Buka kembali periode ini"
                        >
                          <RotateCcw className="w-3 h-3" />
                          <span className="hidden sm:inline">Buka Kembali</span>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* TAB 5: GRAFIK BIAYA */}
      {/* ========================================================================= */}
      {activeTab === 'charts' && (
        <div className="space-y-4">
          <ExpenseDonutChartCard
            breakdownList={incomeStatement.expenseBreakdown}
            totalExpense={incomeStatement.totalBiaya}
          />
          <DailyExpenseBarChartCard dailyData={dailyExpenses} />
        </div>
      )}

      {/* Confirmation Modal for Close / Reopen */}
      {confirmModalData.isOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white dark:bg-slate-900 rounded-3xl p-6 max-w-md w-full border border-slate-200/80 dark:border-slate-800 shadow-2xl space-y-4 animate-in fade-in zoom-in-95">
            <div className="flex items-center gap-3">
              <div
                className={`w-11 h-11 rounded-2xl flex items-center justify-center shrink-0 ${
                  confirmModalData.type === 'CLOSE'
                    ? 'bg-emerald-500/15 text-emerald-600 dark:text-emerald-400'
                    : 'bg-amber-500/15 text-amber-600 dark:text-amber-400'
                }`}
              >
                {confirmModalData.type === 'CLOSE' ? (
                  <BookCheck className="w-6 h-6 stroke-[2.2]" />
                ) : (
                  <RotateCcw className="w-6 h-6 stroke-[2.2]" />
                )}
              </div>
              <div>
                <h4 className="text-base font-black text-slate-900 dark:text-white">
                  {confirmModalData.type === 'CLOSE'
                    ? `Konfirmasi Tutup Buku ${confirmModalData.monthLabel}`
                    : `Buka Kembali Periode ${confirmModalData.monthLabel}?`}
                </h4>
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  {confirmModalData.type === 'CLOSE'
                    ? 'Alokasi otomatis laba bersih ke ekuitas'
                    : 'Membatalkan penutupan buku periode ini'}
                </p>
              </div>
            </div>

            <div className="p-4 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800 text-xs space-y-2">
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Periode:</span>
                <span className="font-extrabold text-slate-900 dark:text-white">{confirmModalData.monthLabel}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Laba / Rugi Bersih:</span>
                <span className="font-black text-slate-900 dark:text-white font-mono">
                  {formatRupiah(confirmModalData.netProfitOrLoss || 0)}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-slate-500 dark:text-slate-400">Akun Ekuitas:</span>
                <span className="font-bold text-emerald-600 dark:text-emerald-400">
                  {confirmModalData.accountName || 'Laba Ditahan'}
                </span>
              </div>
            </div>

            <p className="text-xs text-slate-500 dark:text-slate-400 leading-relaxed">
              {confirmModalData.type === 'CLOSE'
                ? 'Setelah ditutup, nominal laba/rugi di atas akan dipindahkan ke saldo akun Laba Ditahan. Persamaan Neraca akan otomatis diseimbangkan.'
                : 'Membuka kembali periode ini akan mengembalikan alokasi laba/rugi dari akun Laba Ditahan dan memungkinkan Anda untuk melakukan koreksi transaksi.'}
            </p>

            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                type="button"
                disabled={isExecutingClosing}
                onClick={() => setConfirmModalData({ isOpen: false, type: 'CLOSE' })}
                className="px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-300 text-xs font-bold transition cursor-pointer"
              >
                Batal
              </button>
              <button
                type="button"
                disabled={isExecutingClosing}
                onClick={handleConfirmAction}
                className={`flex items-center gap-1.5 px-5 py-2.5 rounded-xl text-white text-xs font-black shadow-md transition cursor-pointer ${
                  confirmModalData.type === 'CLOSE'
                    ? 'bg-emerald-600 hover:bg-emerald-700'
                    : 'bg-amber-600 hover:bg-amber-700'
                }`}
              >
                {isExecutingClosing ? (
                  <span>Memproses...</span>
                ) : confirmModalData.type === 'CLOSE' ? (
                  <>
                    <BookCheck className="w-4 h-4" />
                    <span>Ya, Tutup Buku Sekarang</span>
                  </>
                ) : (
                  <>
                    <RotateCcw className="w-4 h-4" />
                    <span>Ya, Buka Kembali</span>
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

interface ReportSectionProps {
  title: string;
  category: AccountCategory;
  accounts: { account: { id: number; code: string; name: string }; balance: number }[];
  totalAmount: number;
  onSelectAccount?: (accountId: number) => void;
}

const ReportSection: React.FC<ReportSectionProps> = ({
  title,
  category,
  accounts,
  totalAmount,
  onSelectAccount,
}) => {
  const { formatRupiah } = useFinance();
  const details = CATEGORY_DETAILS[category];

  return (
    <div className="rounded-3xl bg-white dark:bg-slate-900 p-5 border border-slate-200/80 dark:border-slate-800 shadow-sm">
      <div className="flex items-center justify-between pb-3 border-b border-slate-100 dark:border-slate-800">
        <h4 className="text-sm font-extrabold text-slate-900 dark:text-white" style={{ color: details.color }}>
          {title}
        </h4>
        <span className="text-sm font-black text-slate-900 dark:text-white">
          {formatRupiah(totalAmount)}
        </span>
      </div>

      <div className="divide-y divide-slate-100 dark:divide-slate-800/60 mt-2">
        {accounts.length === 0 ? (
          <p className="text-xs text-slate-400 py-3 text-center">Tidak ada subakun</p>
        ) : (
          accounts.map((item) => (
            <div
              key={item.account.id}
              onClick={() => onSelectAccount && onSelectAccount(item.account.id)}
              className="flex items-center justify-between py-2 text-xs hover:bg-slate-50 dark:hover:bg-slate-800/50 px-2 rounded-xl transition cursor-pointer group"
              title="Klik untuk melihat buku besar dan transaksi akun ini"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span className="font-mono text-slate-400 group-hover:text-emerald-500 transition">
                  {item.account.code}
                </span>
                <span className="text-slate-600 dark:text-slate-300 font-medium group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition truncate">
                  {item.account.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 ml-2">
                <span className="font-bold text-slate-900 dark:text-white">
                  {formatRupiah(item.balance)}
                </span>
                <ChevronRight className="w-3.5 h-3.5 text-slate-300 group-hover:text-emerald-500 group-hover:translate-x-0.5 transition" />
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
