import React, { useState } from 'react';
import { X } from 'lucide-react';
import { useFinance } from '../context/FinanceContext';
import { AccountCategory, CATEGORY_DETAILS } from '../types/finance';

interface AddSubAccountModalProps {
  isOpen: boolean;
  category: AccountCategory;
  onClose: () => void;
}

export const AddSubAccountModal: React.FC<AddSubAccountModalProps> = ({ isOpen, category, onClose }) => {
  const { addSubAccount, categorySummaries } = useFinance();

  const details = CATEGORY_DETAILS[category];
  const existingCount = categorySummaries[category]?.accounts.length || 0;
  const defaultCode = `${details.codePrefix}.${existingCount + 1}.1`;

  const [name, setName] = useState('');
  const [code, setCode] = useState(defaultCode);
  const [initialBalanceStr, setInitialBalanceStr] = useState('0');

  React.useEffect(() => {
    setCode(`${details.codePrefix}.${existingCount + 1}.1`);
  }, [category, existingCount, details.codePrefix]);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !code.trim()) return;

    addSubAccount({
      category,
      name: name.trim(),
      code: code.trim(),
      initialBalance: parseFloat(initialBalanceStr) || 0,
    });

    setName('');
    setInitialBalanceStr('0');
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-md rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-5 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-lg font-extrabold text-slate-900 dark:text-white">
              Tambah Subakun {details.displayName}
            </h3>
            <p className="text-xs text-slate-500 dark:text-slate-400">
              Klasifikasi kode bagan akun standar
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nama Subakun
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="Misal: Tabungan Haji / Dompet Fisik"
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              autoFocus
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nomor Akun (Kode)
            </label>
            <input
              type="text"
              value={code}
              onChange={(e) => setCode(e.target.value)}
              placeholder={defaultCode}
              className="w-full px-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              required
            />
          </div>

          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Saldo Awal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={initialBalanceStr}
                onChange={(e) => setInitialBalanceStr(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              disabled={!name.trim() || !code.trim()}
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 active:scale-[0.99] text-white font-extrabold text-sm transition-all shadow-md disabled:opacity-50"
            >
              Simpan Subakun
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

interface EditSingleSaldoModalProps {
  isOpen: boolean;
  account: { id: number; name: string; code: string; initialBalance: number; category: AccountCategory } | null;
  onClose: () => void;
}

export const EditSingleSaldoModal: React.FC<EditSingleSaldoModalProps> = ({ isOpen, account, onClose }) => {
  const { updateSubAccountInitialBalance } = useFinance();
  const [val, setVal] = useState('');

  React.useEffect(() => {
    if (account) {
      setVal(account.initialBalance > 0 ? String(account.initialBalance) : '');
    }
  }, [account]);

  if (!isOpen || !account) return null;

  const details = CATEGORY_DETAILS[account.category];

  const handleSave = (e: React.FormEvent) => {
    e.preventDefault();
    const parsed = parseFloat(val) || 0;
    updateSubAccountInitialBalance(account.id, parsed);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/60 backdrop-blur-sm animate-fade-in">
      <div className="w-full max-w-sm rounded-3xl bg-white dark:bg-slate-900 shadow-2xl border border-slate-200 dark:border-slate-800 overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-4 border-b border-slate-100 dark:border-slate-800">
          <div>
            <h3 className="text-base font-extrabold text-slate-900 dark:text-white">Ubah Saldo Awal</h3>
            <p className="text-xs font-semibold" style={{ color: details.color }}>
              {account.code} {account.name} ({details.displayName})
            </p>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 rounded-full flex items-center justify-center text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 transition"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        <form onSubmit={handleSave} className="p-4 space-y-4">
          <div>
            <label className="text-xs font-bold text-slate-700 dark:text-slate-300 block mb-1">
              Nominal Saldo Awal (Rp)
            </label>
            <div className="relative">
              <span className="absolute left-3.5 top-1/2 -translate-y-1/2 text-xs font-bold text-slate-400">
                Rp
              </span>
              <input
                type="number"
                min="0"
                step="any"
                value={val}
                onChange={(e) => setVal(e.target.value)}
                placeholder="0"
                className="w-full pl-10 pr-4 py-2.5 rounded-xl bg-slate-50 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 text-slate-900 dark:text-white text-sm font-bold focus:outline-none focus:ring-2 focus:ring-emerald-500"
                autoFocus
              />
            </div>

            {/* Quick Chips */}
            <div className="flex gap-1.5 mt-2">
              {[
                { valAdd: 500000, label: '+500rb' },
                { valAdd: 1000000, label: '+1jt' },
                { valAdd: 5000000, label: '+5jt' },
                { valAdd: 10000000, label: '+10jt' },
              ].map((chip) => (
                <button
                  key={chip.valAdd}
                  type="button"
                  onClick={() => {
                    const current = parseFloat(val) || 0;
                    setVal(String(current + chip.valAdd));
                  }}
                  className="px-2 py-1 rounded-lg text-[10px] font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-emerald-500/20 hover:text-emerald-600 transition"
                >
                  {chip.label}
                </button>
              ))}
            </div>
          </div>

          <div className="pt-2">
            <button
              type="submit"
              className="w-full py-3 rounded-2xl bg-emerald-600 hover:bg-emerald-700 text-white font-extrabold text-sm transition-all shadow-md cursor-pointer"
            >
              Simpan Saldo Awal
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};
