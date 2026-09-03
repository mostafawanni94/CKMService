/**
 * Expenses Page — Thin page composing hook + components.
 */
'use client';

import { Plus, Download } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { PageHeader, SectionCard, SearchBar, Select, Button } from '@/components/ui/shared';
import { ExpenseStats, ExpenseTable, ExpenseModal } from '@/components/features/expenses/ExpenseComponents';
import { useExpenses } from '@/hooks/useExpenses';
import styles from './page.module.css';
import { spacing } from '@/styles/tokens';
import { useLanguage } from '@/lib/i18n';

const YEAR_OPTIONS = [2024, 2025, 2026, 2027].map(y => ({ value: String(y), label: String(y) }));

export default function ExpensesPage() {
    const { t } = useLanguage();
  const vm = useExpenses();

  const categoryOptions = vm.categories.map(c => ({ value: c.id, label: c.name }));

  return (
    <DashboardLayout>
      <div className={styles.container}>
        <PageHeader
          title={t('Expenses')}
          subtitle={t('Track and manage business expenses for Aangifte')}
          actions={
            <>
              <Button variant="secondary" onClick={vm.handleExport} icon={<Download size={16} />}>{t('Export')}</Button>
              <Button onClick={vm.openCreate} icon={<Plus size={16} />}>{t('Add Expense')}</Button>
            </>
          }
        />

        <ExpenseStats count={vm.expenseCount} total={vm.totalExpenses} totalVat={vm.totalVat} />

        {/* Filters */}
        <div className={styles.filterRow}>
          <SearchBar value={vm.searchQuery} onChange={vm.setSearchQuery} placeholder={t('Search vendor, description...')} style={{ flex: 1 }} />
          <Select value={vm.yearFilter} onChange={vm.setYearFilter} options={YEAR_OPTIONS} />
          <Select value={vm.categoryFilter} onChange={vm.setCategoryFilter} options={categoryOptions} placeholder={t('All categories')} />
        </div>

        <SectionCard>
          <ExpenseTable
            expenses={vm.expenses}
            loading={vm.loading}
            onEdit={vm.openEdit}
            onDelete={vm.handleDelete}
          />
        </SectionCard>

        <ExpenseModal
          open={vm.showModal}
          onClose={() => vm.setShowModal(false)}
          title={vm.editingId ? 'Edit Expense' : t('Add Expense')}
          form={vm.form}
          updateForm={vm.updateForm}
          categories={vm.categories}
          receiptFile={vm.receiptFile}
          setReceiptFile={vm.setReceiptFile}
          onSave={vm.handleSave}
          saving={vm.saving}
        />
      </div>
    </DashboardLayout>
  );
}
