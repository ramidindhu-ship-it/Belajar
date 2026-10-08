export type AccountCategory = 'HARTA' | 'UTANG' | 'MODAL' | 'PENDAPATAN' | 'BIAYA';

export interface CategoryInfo {
  category: AccountCategory;
  displayName: string;
  description: string;
  codePrefix: string;
  isDebitNormal: boolean;
  color: string;
  textColor: string;
  bgColor: string;
  borderColor: string;
}

export const CATEGORY_DETAILS: Record<AccountCategory, CategoryInfo> = {
  HARTA: {
    category: 'HARTA',
    displayName: 'Harta',
    description: 'Aset berharga seperti Kas, Tabungan Bank, E-Wallet, Piutang',
    codePrefix: '1',
    isDebitNormal: true,
    color: '#10B981',
    textColor: 'text-emerald-500 dark:text-emerald-400',
    bgColor: 'bg-emerald-500/15',
    borderColor: 'border-emerald-500/30',
  },
  UTANG: {
    category: 'UTANG',
    displayName: 'Utang',
    description: 'Kewajiban seperti Kartu Kredit, Paylater, Pinjaman Bank',
    codePrefix: '2',
    isDebitNormal: false,
    color: '#EF4444',
    textColor: 'text-red-500 dark:text-red-400',
    bgColor: 'bg-red-500/15',
    borderColor: 'border-red-500/30',
  },
  MODAL: {
    category: 'MODAL',
    displayName: 'Modal',
    description: 'Ekuitas & modal awal keuangan pribadi',
    codePrefix: '3',
    isDebitNormal: false,
    color: '#6366F1',
    textColor: 'text-indigo-500 dark:text-indigo-400',
    bgColor: 'bg-indigo-500/15',
    borderColor: 'border-indigo-500/30',
  },
  PENDAPATAN: {
    category: 'PENDAPATAN',
    displayName: 'Pendapatan',
    description: 'Penghasilan seperti Gaji, Bunga Bank, Deposito, Lain-lain',
    codePrefix: '6',
    isDebitNormal: false,
    color: '#06B6D4',
    textColor: 'text-cyan-500 dark:text-cyan-400',
    bgColor: 'bg-cyan-500/15',
    borderColor: 'border-cyan-500/30',
  },
  BIAYA: {
    category: 'BIAYA',
    displayName: 'Biaya',
    description: 'Beban pengeluaran seperti Makanan, Transport, Tagihan, Belanja',
    codePrefix: '5',
    isDebitNormal: true,
    color: '#F59E0B',
    textColor: 'text-amber-500 dark:text-amber-400',
    bgColor: 'bg-amber-500/15',
    borderColor: 'border-amber-500/30',
  },
};

export type TransactionType =
  | 'PENGELUARAN'
  | 'PEMASUKAN'
  | 'TRANSFER'
  | 'BAYAR_UTANG'
  | 'TAMBAH_MODAL';

export interface TransactionTypeInfo {
  type: TransactionType;
  title: string;
  subtitle: string;
}

export const TRANSACTION_TYPES: Record<TransactionType, TransactionTypeInfo> = {
  PENGELUARAN: {
    type: 'PENGELUARAN',
    title: 'Pengeluaran (Biaya)',
    subtitle: 'Catat belanja, makanan, tagihan, transportasi',
  },
  PEMASUKAN: {
    type: 'PEMASUKAN',
    title: 'Pemasukan (Pendapatan)',
    subtitle: 'Catat gaji, bonus, pendapatan usaha, dll',
  },
  TRANSFER: {
    type: 'TRANSFER',
    title: 'Transfer Antar Akun',
    subtitle: 'Pindah dana antar rekening, kas, e-wallet',
  },
  BAYAR_UTANG: {
    type: 'BAYAR_UTANG',
    title: 'Bayar Utang',
    subtitle: 'Pelunasan tagihan kartu kredit, pinjaman, utang',
  },
  TAMBAH_MODAL: {
    type: 'TAMBAH_MODAL',
    title: 'Setor Modal',
    subtitle: 'Pemasukan modal awal atau tambahan dana sendiri',
  },
};

export interface SubAccount {
  id: number;
  category: AccountCategory;
  code: string;
  name: string;
  iconName: string;
  initialBalance: number;
  isDefault: boolean;
  notes?: string;
  updatedAt: number;
}

export interface TransactionRecord {
  id: number;
  date: number;
  amount: number;
  fromAccountId: number;
  toAccountId: number;
  type: TransactionType;
  category: AccountCategory;
  description: string;
  referenceNumber: string;
  isSynced: boolean;
  updatedAt: number;
}

export interface AccountWithBalance {
  account: SubAccount;
  balance: number;
  transactionCount: number;
}

export interface CategorySummary {
  category: AccountCategory;
  totalBalance: number;
  accounts: AccountWithBalance[];
}

export interface ExpenseCategoryBreakdown {
  subAccountId: number;
  subAccountName: string;
  category: AccountCategory;
  totalAmount: number;
  percentage: number;
  color: string;
  transactionCount: number;
}

export interface DailyExpenseBarData {
  dayLabel: string;
  fullDate: string;
  amount: number;
  isToday: boolean;
}

export interface FinancialBalanceSheet {
  totalHarta: number;
  totalUtang: number;
  totalModal: number;
  currentPeriodNetProfit: number;
  totalPasiva: number;
  isBalanced: boolean;
}

export interface IncomeStatementReport {
  totalPendapatan: number;
  totalBiaya: number;
  netProfitOrLoss: number;
  revenueBreakdown: ExpenseCategoryBreakdown[];
  expenseBreakdown: ExpenseCategoryBreakdown[];
}

export interface SyncLogEntry {
  timestamp: number;
  itemsCount: number;
  isSuccess: boolean;
  message: string;
}

export interface CloudSyncState {
  isSyncing: boolean;
  lastSyncTimestamp: number;
  pendingSyncCount: number;
  syncSuccess: boolean;
  statusMessage: string;
  cloudEndpoint: string;
  autoSyncEnabled: boolean;
}

export type ThemeMode = 'SYSTEM' | 'LIGHT' | 'DARK';
export type ColorPalette = 'EMERALD' | 'OCEAN' | 'ROYAL' | 'AMBER' | 'TEAL';
export type DateFormatOption = 'DAY_MONTH_YEAR' | 'SLASH_DMY' | 'FULL_DATE' | 'ISO_DATE';
export type TimeFormatOption = 'HOUR_24' | 'HOUR_12';

export interface GoogleUser {
  id: string;
  name: string;
  email: string;
  picture: string;
  createdAt: number;
  lastLoginAt: number;
  lastBackupAt?: number;
}

export interface AppSettings {
  themeMode: ThemeMode;
  colorPalette: ColorPalette;
  dateFormat: DateFormatOption;
  timeFormat: TimeFormatOption;
  googleAccountEmail: string;
  isGoogleConnected: boolean;
  realtimeSyncEnabled: boolean;
  deviceId: string;
  lastGoogleSyncTimestamp: number;
}

export interface MonthlyClosingRecord {
  id: string; // e.g. "CLOSING-2026-10"
  year: number;
  month: number; // 1-12
  monthLabel: string; // "Oktober 2026"
  closedAt: number;
  totalPendapatan: number;
  totalBiaya: number;
  netProfitOrLoss: number;
  retainedEarningsAccountId: number;
  retainedEarningsAccountName: string;
  closingTransactionIds: number[];
  notes?: string;
}
