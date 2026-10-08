import React, { useState, useMemo } from 'react';
import { X, CheckCircle2, AlertTriangle, Wand2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory, CATEGORY_DETAILS } from '../types/finance';
import { AccountIcon } from './AccountIcon';

interface InputSaldoAwalModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const InputSaldoAwalModal: React.FC<InputSaldoAwalModalProps> = ({ isOpen, onClose }) => {
  const { accountsWithBalances, updateMultipleInitialBalances, formatRupiah } = useFinance();

  const balanceCategories: AccountCategory[] = ['HARTA', 'UTANG', 'MODAL'];
  const [activeCategory, setActiveCategory] = useState<AccountCategory>('HARTA');

  // Local draft map of initial balances
  const [balanceMap, setBalanceMap] = useState<Record<number, number>>(() => {
    const initial: Record<number, number> = {};
    accountsWithBalances.forEach((a) => {
      initial[a.account.id] = a.account.initialBalance || 0;
    });
    return initial;
  });

  // Keep synced if accounts change while closed
  React.useEffect(() => {
    if (isOpen) {
      const initial: Record<number, number> = {};
      accountsWithBalances.forEach((a) => {
        initial[a.account.id] = a.account.initialBalance || 0;
      });
      setBalanceMap(initial);
    }
  }, [isOpen, accountsWithBalances]);

  if (!isOpen) return null;

  // Accounting verification: Harta = Utang + Modal
  const totalHartaAwal = accountsWithBalances
    .filter((a) => a.account.category === 'HARTA')
    .reduce((sum, a) => sum + (balanceMap[a.account.id] || 0), 0);

  const totalUtangAwal = accountsWithBalances
    .filter((a) => a.account.category === 'UTANG')
    .reduce((sum, a) => sum + (balanceMap[a.account.id] || 0), 0);

  const totalModalAwal = accountsWithBalances
    .filter((a) => a.account.category === 'MODAL')
    .reduce((sum, a) => sum + (balanceMap[a.account.id] || 0), 0);

  const totalPasivaAwal = totalUtangAwal + totalModalAwal;
  const selisih = totalHartaAwal - totalPasivaAwal;
  const isBalanced = Math.abs(selisih) < 1.0;

  const currentCategoryAccounts = accountsWithBalances.filter(
    (a) => a.account.category === activeCategory
  );

  const handleBalanceChange = (accountId: number, val: string) => {
    const numeric = parseFloat(val) || 0;
    setBalanceMap((prev) => ({
      ...prev,
      [accountId]: Math.max(0, numeric),
    }));
  };

  const handleQuickAdd = (accountId: number, addVal: number) => {
    setBalanceMap((prev) => ({
      ...prev,
      [accountId]: (prev[accountId] || 0) + addVal,
    }));
  };

  const handleAutoBalance = () => {
    // Set Modal Awal Pribadi (code 3.1.1) to Harta - Utang
    const modalAwalAccount = accountsWithBalances.find((a) => a.account.code === '3.1.1');
    if (modalAwalAccount) {
      const neededModal = Math.max(0, totalHartaAwal - totalUtangAwal);
      setBalanceMap((prev) => ({
        ...prev,
        [modalAwalAccount.account.id]: neededModal,
      }));
    }
  };

  const handleSave = () => {
    updateMultipleInitialBalances(balanceMap);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-3 sm:p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-2xl rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col max-h-[92vh]">
        {/* Modal Header */}
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">Input Saldo Awal</h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Kelompok Harta, Utang & Modal (Buku Besar)
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-4 sm:p-5 overflow-y-auto space-y-4 flex-1">
          {/* Persamaan Dasar Akuntansi Bar */}
          <div
            className={`p-4 rounded-2xl border transition-all ${
              isBalanced
                ? 'bg-emerald-500/10 border-emerald-500/30'
                : 'bg-amber-500/10 border-amber-500/30'
            }`}
          >
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-700 dark:text-slate-300">
                Persamaan Saldo Awal
              </span>
              <span
                className={`inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-extrabold ${
                  isBalanced
                    ? 'bg-emerald-500 text-white'
                    : 'bg-amber-500 text-white'
                }`}
              >
                {isBalanced ? (
                  <>
                    <CheckCircle2 className="w-3.5 h-3.5" /> Seimbang
                  </>
                ) : (
                  <>
                    <AlertTriangle className="w-3.5 h-3.5" /> Selisih {formatRupiah(Math.abs(selisih))}
                  </>
                )}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2 mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/40 text-center">
              <div>
                <span className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 uppercase">
                  Harta (Aktiva)
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {formatRupiah(totalHartaAwal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-red-500 dark:text-red-400 uppercase">
                  Utang
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {formatRupiah(totalUtangAwal)}
                </span>
              </div>
              <div>
                <span className="text-[10px] font-bold text-indigo-500 dark:text-indigo-400 uppercase">
                  Modal (Ekuitas)
                </span>
                <span className="text-xs sm:text-sm font-extrabold text-slate-900 dark:text-white block mt-0.5">
                  {formatRupiah(totalModalAwal)}
                </span>
              </div>
            </div>

            {/* Quick Auto Balance Button */}
            {!isBalanced && (totalHartaAwal > 0 || totalUtangAwal > 0) && (
              <button
                type="button"
                onClick={handleAutoBalance}
                className="w-full mt-3 py-2 px-3 rounded-xl bg-amber-500/20 hover:bg-amber-500/30 text-amber-700 dark:text-amber-300 border border-amber-500/30 text-xs font-bold flex items-center justify-center gap-1.5 transition"
              >
                <Wand2 className="w-3.5 h-3.5" />
                <span>Seimbangkan: Modal = Harta - Utang</span>
              </button>
            )}
          </div>

          {/* Category Tabs: Harta, Utang, Modal */}
          <div className="flex rounded-xl bg-slate-100 dark:bg-slate-800 p-1 gap-1">
            {balanceCategories.map((cat) => {
              const isSelected = activeCategory === cat;
              const details = CATEGORY_DETAILS[cat];
              return (
                <button
                  key={cat}
                  onClick={() => setActiveCategory(cat)}
                  className={`flex-1 py-2 rounded-lg text-xs font-extrabold transition-all ${
                    isSelected
                      ? 'bg-white dark:bg-slate-900 text-slate-900 dark:text-white shadow-sm'
                      : 'text-slate-500 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
                  }`}
                >
                  <span style={{ color: isSelected ? details.color : undefined }}>
                    {details.displayName}
                  </span>
                </button>
              );
            })}
          </div>

          {/* Subaccounts Input List */}
          <div className="space-y-2.5">
            {currentCategoryAccounts.map((item) => {
              const currentVal = balanceMap[item.account.id] || 0;
              const details = CATEGORY_DETAILS[item.account.category];

              return (
                <div
                  key={item.account.id}
                  className="p-3 rounded-2xl bg-slate-50 dark:bg-slate-800/60 border border-slate-200/80 dark:border-slate-700/60"
                >
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2.5">
                      <div
                        className="w-8 h-8 rounded-full flex items-center justify-center"
                        style={{ backgroundColor: `${details.color}20`, color: details.color }}
                      >
                        <AccountIcon name={item.account.iconName} className="w-4 h-4" />
                      </div>
                      <div>
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-bold px-1.5 py-0.5 rounded bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-300">
                            {item.account.code}
                          </span>
                          <span className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                            {item.account.name}
                          </span>
                        </div>
                        <span className="text-[10px] text-slate-400">
                          Saldo berjalan: {formatRupiah(item.balance)}
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Input */}
                  <div className="relative">
                    <span
                      className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-black"
                      style={{ color: details.color }}
                    >
                      Rp
                    </span>
                    <input
                      type="number"
                      min="0"
                      step="any"
                      value={currentVal > 0 ? currentVal : ''}
                      onChange={(e) => handleBalanceChange(item.account.id, e.target.value)}
                      placeholder="0"
                      className="w-full pl-10 pr-3 py-2 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white font-bold text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
                    />
                  </div>

                  {/* Quick Chips */}
                  <div className="flex gap-1.5 mt-2 overflow-x-auto pb-0.5">
                    {[
                      { val: 100000, label: '+100rb' },
                      { val: 500000, label: '+500rb' },
                      { val: 1000000, label: '+1jt' },
                      { val: 5000000, label: '+5jt' },
                    ].map((chip) => (
                      <button
                        key={chip.val}
                        type="button"
                        onClick={() => handleQuickAdd(item.account.id, chip.val)}
                        className="px-2 py-0.5 rounded-lg text-[10px] font-semibold bg-slate-200/70 dark:bg-slate-700 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-600 dark:hover:text-emerald-400 transition"
                      >
                        {chip.label}
                      </button>
                    ))}
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Modal Footer */}
        <div className="p-4 border-t border-slate-100 dark:border-slate-800 bg-slate-50/50 dark:bg-slate-900/50">
          <button
            onClick={handleSave}
            className="w-full py-3.5 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm transition-all shadow-md cursor-pointer"
          >
            Simpan Saldo Awal
          </button>
        </div>
      </div>
    </div>
  );
};
