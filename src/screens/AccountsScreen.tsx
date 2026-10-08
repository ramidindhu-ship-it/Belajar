import React, { useState } from 'react';
import { SlidersHorizontal, Plus, Edit2, Trash2 } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory, CATEGORY_DETAILS, SubAccount } from '../types/finance';
import { AccountIcon } from '../components/AccountIcon';
import { AddSubAccountModal, EditSingleSaldoModal } from '../components/AddSubAccountModal';

interface AccountsScreenProps {
  onOpenInputSaldoAwal: () => void;
}

export const AccountsScreen: React.FC<AccountsScreenProps> = ({ onOpenInputSaldoAwal }) => {
  const { categorySummaries, deleteSubAccount, formatRupiah } = useFinance();

  const [selectedCategory, setSelectedCategory] = useState<AccountCategory>('HARTA');
  const [isAddAccountModalOpen, setIsAddAccountModalOpen] = useState(false);
  const [accountToEditSaldo, setAccountToEditSaldo] = useState<SubAccount | null>(null);

  const categories: AccountCategory[] = ['HARTA', 'UTANG', 'MODAL', 'BIAYA', 'PENDAPATAN'];
  const currentSummary = categorySummaries[selectedCategory];
  const currentAccounts = currentSummary?.accounts || [];
  const currentDetails = CATEGORY_DETAILS[selectedCategory];

  return (
    <div className="space-y-4 pb-24">
      {/* Screen Header */}
      <div className="flex items-center justify-between px-1">
        <div>
          <h2 className="text-xl font-extrabold text-slate-900 dark:text-white">Bagan Akun Keuangan</h2>
          <p className="text-xs text-slate-500 dark:text-slate-400">
            Kelompok 5 Akun Standar Akuntansi & Subakun
          </p>
        </div>

        <button
          onClick={onOpenInputSaldoAwal}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-xl bg-emerald-600 hover:bg-emerald-700 text-white text-xs font-bold transition shadow-sm active:scale-95"
        >
          <SlidersHorizontal className="w-3.5 h-3.5 stroke-[2.2]" />
          <span>Saldo Awal</span>
        </button>
      </div>

      {/* Category Tab Row */}
      <div className="flex gap-1.5 overflow-x-auto pb-1 scrollbar-none">
        {categories.map((cat) => {
          const isSelected = selectedCategory === cat;
          const details = CATEGORY_DETAILS[cat];
          return (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-2 rounded-2xl text-xs font-bold transition whitespace-nowrap flex items-center gap-1.5 ${
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

      {/* Category Overview Card */}
      <div
        className="rounded-3xl p-5 border"
        style={{
          backgroundColor: `${currentDetails.color}10`,
          borderColor: `${currentDetails.color}30`,
        }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div
              className="w-10 h-10 rounded-2xl flex items-center justify-center font-black text-sm"
              style={{
                backgroundColor: `${currentDetails.color}25`,
                color: currentDetails.color,
              }}
            >
              {currentDetails.codePrefix}
            </div>
            <div>
              <h3 className="text-base font-extrabold text-slate-900 dark:text-white">
                Kelompok {currentDetails.displayName}
              </h3>
              <span
                className="text-xs font-bold"
                style={{ color: currentDetails.color }}
              >
                {currentDetails.isDebitNormal ? 'Saldo Normal: Debit' : 'Saldo Normal: Kredit'}
              </span>
            </div>
          </div>

          <div className="text-right">
            <span className="text-[10px] uppercase font-bold text-slate-500 dark:text-slate-400 block">
              Total Saldo
            </span>
            <span
              className="text-base sm:text-lg font-black block"
              style={{ color: currentDetails.color }}
            >
              {formatRupiah(currentSummary?.totalBalance || 0)}
            </span>
          </div>
        </div>

        <p className="text-xs text-slate-600 dark:text-slate-300 mt-3 pt-2.5 border-t border-slate-200/40 dark:border-slate-700/40">
          {currentDetails.description}
        </p>
      </div>

      {/* Dedicated Saldo Awal Banner for Harta, Utang, Modal */}
      {(selectedCategory === 'HARTA' || selectedCategory === 'UTANG' || selectedCategory === 'MODAL') && (
        <div
          onClick={onOpenInputSaldoAwal}
          className="flex items-center justify-between p-3.5 rounded-2xl cursor-pointer hover:opacity-95 transition border"
          style={{
            backgroundColor: `${currentDetails.color}15`,
            borderColor: `${currentDetails.color}35`,
          }}
        >
          <div className="flex items-center gap-2.5">
            <SlidersHorizontal
              className="w-4 h-4"
              style={{ color: currentDetails.color }}
            />
            <div>
              <h4 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white">
                Input Saldo Awal {currentDetails.displayName}
              </h4>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Atur modal awal atau saldo kas/rekening/utang
              </p>
            </div>
          </div>
          <span
            className="text-xs font-extrabold"
            style={{ color: currentDetails.color }}
          >
            Atur Saldo &gt;
          </span>
        </div>
      )}

      {/* Subaccounts List Header */}
      <div className="flex items-center justify-between px-1 pt-1">
        <h4 className="text-sm font-bold text-slate-900 dark:text-white">
          Daftar Subakun ({currentAccounts.length})
        </h4>
        <button
          onClick={() => setIsAddAccountModalOpen(true)}
          className="text-xs font-bold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
        >
          <Plus className="w-3.5 h-3.5" />
          <span>Tambah Subakun</span>
        </button>
      </div>

      {/* Subaccounts List */}
      <div className="space-y-2">
        {currentAccounts.map((item) => {
          const isEditable =
            item.account.category === 'HARTA' ||
            item.account.category === 'UTANG' ||
            item.account.category === 'MODAL';

          return (
            <div
              key={item.account.id}
              className="flex items-center justify-between p-3.5 sm:p-4 rounded-2xl bg-white dark:bg-slate-900 border border-slate-200/80 dark:border-slate-800 shadow-xs hover:border-slate-300 dark:hover:border-slate-700 transition"
            >
              <div className="flex items-center gap-3 min-w-0">
                <div
                  className="w-10 h-10 rounded-2xl flex items-center justify-center shrink-0"
                  style={{
                    backgroundColor: `${currentDetails.color}15`,
                    color: currentDetails.color,
                  }}
                >
                  <AccountIcon name={item.account.iconName} className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <div className="flex items-center gap-1.5">
                    <span className="px-1.5 py-0.5 rounded text-[10px] font-mono font-bold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300">
                      {item.account.code}
                    </span>
                    <h5 className="text-xs sm:text-sm font-bold text-slate-900 dark:text-white truncate">
                      {item.account.name}
                    </h5>
                  </div>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-slate-400">
                      {item.transactionCount} transaksi
                    </span>
                    {item.account.initialBalance > 0 && (
                      <span
                        className="text-[10px] font-semibold"
                        style={{ color: currentDetails.color }}
                      >
                        • Awal: {formatRupiah(item.account.initialBalance)}
                      </span>
                    )}
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0 ml-2">
                <div className="text-right">
                  <span className="text-xs sm:text-sm font-black text-slate-900 dark:text-white block">
                    {formatRupiah(item.balance)}
                  </span>
                  {isEditable && (
                    <button
                      onClick={() => setAccountToEditSaldo(item.account)}
                      className="text-[10px] font-bold text-emerald-600 dark:text-emerald-400 hover:underline"
                    >
                      Ubah Saldo
                    </button>
                  )}
                </div>

                {isEditable && (
                  <button
                    onClick={() => setAccountToEditSaldo(item.account)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-950/40 transition"
                    title="Ubah Saldo Awal"
                  >
                    <Edit2 className="w-3.5 h-3.5" />
                  </button>
                )}

                {!item.account.isDefault && (
                  <button
                    onClick={() => deleteSubAccount(item.account.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-slate-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-950/40 transition"
                    title="Hapus Subakun"
                  >
                    <Trash2 className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Add Subaccount Modal */}
      <AddSubAccountModal
        isOpen={isAddAccountModalOpen}
        category={selectedCategory}
        onClose={() => setIsAddAccountModalOpen(false)}
      />

      {/* Edit Single Saldo Modal */}
      <EditSingleSaldoModal
        isOpen={accountToEditSaldo !== null}
        account={accountToEditSaldo}
        onClose={() => setAccountToEditSaldo(null)}
      />
    </div>
  );
};
