import React, { useState } from 'react';
import { AuthProvider } from './context/AuthContext';
import { FinanceProvider } from './context/FinanceContext';
import { Navbar, NavigationTab } from './components/Navbar';
import { DashboardScreen } from './screens/DashboardScreen';
import { TransactionsScreen } from './screens/TransactionsScreen';
import { AccountsScreen } from './screens/AccountsScreen';
import { ReportsScreen } from './screens/ReportsScreen';
import { SettingsScreen } from './screens/SettingsScreen';
import { AddTransactionModal } from './components/AddTransactionModal';
import { InputSaldoAwalModal } from './components/InputSaldoAwalModal';
import { TransactionRecord } from './types/finance';

const AppContent: React.FC = () => {
  const [currentTab, setCurrentTab] = useState<NavigationTab>('dashboard');
  const [isAddTxOpen, setIsAddTxOpen] = useState(false);
  const [transactionToEdit, setTransactionToEdit] = useState<TransactionRecord | null>(null);
  const [isInputSaldoAwalOpen, setIsInputSaldoAwalOpen] = useState(false);

  const handleOpenAddTx = () => {
    setTransactionToEdit(null);
    setIsAddTxOpen(true);
  };

  const handleOpenEditTx = (tx: TransactionRecord) => {
    setTransactionToEdit(tx);
    setIsAddTxOpen(true);
  };

  const handleCloseTxModal = () => {
    setIsAddTxOpen(false);
    setTransactionToEdit(null);
  };

  return (
    <div className="min-h-screen bg-slate-100/70 dark:bg-slate-950 text-slate-900 dark:text-slate-100 transition-colors">
      {/* Navigation Component */}
      <Navbar
        currentTab={currentTab}
        onTabChange={setCurrentTab}
        onOpenAddTransaction={handleOpenAddTx}
      />

      {/* Main Screen Content */}
      <main className="md:pl-20 lg:pl-60 min-h-screen">
        <div className="max-w-4xl mx-auto px-3 sm:px-6 pt-3 sm:pt-6">
          {currentTab === 'dashboard' && (
            <DashboardScreen
              onOpenAddTransaction={handleOpenAddTx}
              onOpenInputSaldoAwal={() => setIsInputSaldoAwalOpen(true)}
              onNavigateTab={(tab) => setCurrentTab(tab)}
              onEditTransaction={handleOpenEditTx}
            />
          )}

          {currentTab === 'transactions' && (
            <TransactionsScreen
              onOpenAddTransaction={handleOpenAddTx}
              onEditTransaction={handleOpenEditTx}
            />
          )}

          {currentTab === 'accounts' && (
            <AccountsScreen
              onOpenInputSaldoAwal={() => setIsInputSaldoAwalOpen(true)}
            />
          )}

          {currentTab === 'reports' && <ReportsScreen />}

          {currentTab === 'settings' && (
            <SettingsScreen
              onOpenInputSaldoAwal={() => setIsInputSaldoAwalOpen(true)}
            />
          )}
        </div>
      </main>

      {/* Global Modals */}
      <AddTransactionModal
        isOpen={isAddTxOpen}
        transactionToEdit={transactionToEdit}
        onClose={handleCloseTxModal}
      />

      <InputSaldoAwalModal
        isOpen={isInputSaldoAwalOpen}
        onClose={() => setIsInputSaldoAwalOpen(false)}
      />
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <FinanceProvider>
        <AppContent />
      </FinanceProvider>
    </AuthProvider>
  );
}
