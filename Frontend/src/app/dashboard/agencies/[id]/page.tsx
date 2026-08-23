/**
 * Agency Detail Page — Thin page composing hook + tab components.
 * 
 * Architecture:
 *   Page → useAgencyDetail (hook) → AgencyComponents (UI)
 */
'use client';

import { useRouter } from 'next/navigation';
import { ArrowLeft, Save, Building2, Users, FileText, Percent } from 'lucide-react';
import { DashboardLayout } from '@/components/layout/dashboard';
import { TabBar, Button, LoadingSpinner } from '@/components/ui/shared';
import {
  OverviewTab, EmployeesTab, BillingTab, SurchargesSection, GenerateInvoiceModal,
} from '@/components/features/agencies/AgencyComponents';
import { useAgencyDetail } from '@/hooks/useAgencyDetail';
import styles from './page.module.css';

const TABS = [
  { key: 'overview', label: 'Overview', icon: <Building2 size={15} /> },
  { key: 'employees', label: 'Employees', icon: <Users size={15} /> },
  { key: 'billing', label: 'Billing', icon: <FileText size={15} /> },
  { key: 'surcharges', label: 'Surcharges', icon: <Percent size={15} /> },
];

export default function AgencyDetailPage() {
  const vm = useAgencyDetail();
  const router = useRouter();

  if (vm.loading) {
    return <DashboardLayout><LoadingSpinner /></DashboardLayout>;
  }

  return (
    <DashboardLayout>
      <div className={styles.container}>
        {/* Header */}
        <div className={styles.header}>
          <div className={styles.headerLeft}>
            <Button variant="secondary" size="sm" icon={<ArrowLeft size={16} />} onClick={vm.goBack}>Back</Button>
            <div>
              <h1 className={styles.title}>{vm.isNew ? 'New Agency' : vm.formData.name}</h1>
              {!vm.isNew && vm.formData.code && (
                <span className={styles.subtitle}>Code: {vm.formData.code}</span>
              )}
            </div>
          </div>
          <Button onClick={vm.handleSave} loading={vm.saving} icon={<Save size={16} />}>
            {vm.saving ? 'Saving...' : 'Save'}
          </Button>
        </div>

        {/* Tabs */}
        {!vm.isNew && (
          <TabBar tabs={TABS} active={vm.activeTab} onChange={(k) => vm.setActiveTab(k as 'overview' | 'employees' | 'billing' | 'surcharges')} />
        )}

        {/* Tab Content */}
        {(vm.activeTab === 'overview' || vm.isNew) && (
          <OverviewTab
            form={vm.formData}
            isNew={vm.isNew}
            onChange={vm.updateForm}
            surchargeTypes={vm.surchargeTypes}
            selectedSurcharges={vm.selectedSurcharges}
            setSelectedSurcharges={vm.setSelectedSurcharges}
          />
        )}

        {vm.activeTab === 'employees' && (
          <EmployeesTab
            employees={vm.employees}
            loading={vm.loadingEmployees}
            agencyName={vm.formData.name}
          />
        )}

        {vm.activeTab === 'billing' && (
          <BillingTab
            invoices={vm.invoices}
            loading={vm.loadingInvoices}
            onGenerate={() => vm.setShowGenerateModal(true)}
            onRowClick={(inv) => router.push(`/dashboard/agencies/${vm.params.id}/invoice/${inv.id}`)}
          />
        )}

        {vm.activeTab === 'surcharges' && (
          <SurchargesSection
            hasEnabled={vm.formData.has_surcharges}
            onToggle={v => vm.updateForm({ has_surcharges: v })}
            types={vm.surchargeTypes}
            selected={vm.selectedSurcharges}
            setSelected={vm.setSelectedSurcharges}
          />
        )}

        {/* Generate Invoice Modal */}
        <GenerateInvoiceModal
          open={vm.showGenerateModal}
          onClose={() => vm.setShowGenerateModal(false)}
          periodStart={vm.generatePeriodStart}
          periodEnd={vm.generatePeriodEnd}
          setPeriodStart={vm.setGeneratePeriodStart}
          setPeriodEnd={vm.setGeneratePeriodEnd}
          onGenerate={vm.handleGenerateInvoice}
          generating={vm.generating}
        />
      </div>
    </DashboardLayout>
  );
}
