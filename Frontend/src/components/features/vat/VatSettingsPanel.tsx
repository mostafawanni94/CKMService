/**
 * BTW settings for a customer or a project.
 *
 * These are the facts the VAT engine needs before it will decide anything. It
 * refuses to guess: a supply whose treatment nobody has stated is held for
 * review and blocks the invoice, which is why this panel has to exist — without
 * it there is no way to tell the system what the work actually is.
 *
 * Saves itself, so it can be dropped into any page that has a record id.
 */
'use client';

import React, { useEffect, useState } from 'react';
import { AlertTriangle, Check, Info } from 'lucide-react';
import { Button, SectionCard, Select, TextArea } from '@/components/ui/shared';
import { apiGet, apiMutate } from '@/hooks/useApi';
import { colors, fontSize, fontWeight, radius, spacing } from '@/styles/tokens';
import { useLanguage } from '@/lib/i18n';

export interface VatFacts {
    vat_treatment_code: string;
    is_staff_lending_or_subcontracting: boolean | null;
    is_physical_work_on_immovable_property: boolean | null;
    majority_work_in_own_workshop: boolean | null;
    lent_to_subcontractor_working_own_premises: boolean | null;
    ancillary_to_goods_sold: boolean | null;
    is_design_work: boolean | null;
    is_guarding_or_rental: boolean | null;
    vat_notes: string;
}

const TREATMENTS = [
    { value: 'UNKNOWN', label: 'Nog niet vastgesteld' },
    { value: 'NORMAL', label: 'Normaal belast (21%)' },
    { value: 'REVERSE_CHARGE', label: 'Btw verlegd (verleggingsregeling)' },
    { value: 'ZERO_RATE', label: '0%-tarief' },
    { value: 'EXEMPT', label: 'Vrijgesteld' },
    { value: 'OUT_OF_SCOPE', label: 'Buiten de heffing' },
];

const TRISTATE = [
    { value: '', label: 'Niet vastgesteld' },
    { value: 'true', label: 'Ja' },
    { value: 'false', label: 'Nee' },
];

/** The two facts the verleggingsregeling turns on. */
const CONDITIONS: Array<{ key: keyof VatFacts; label: string; help: string }> = [
    {
        key: 'is_staff_lending_or_subcontracting',
        label: 'Uitlening van personeel of onderaanneming?',
        help: 'De verleggingsregeling geldt alleen bij uitlening of onderaanneming.',
    },
    {
        key: 'is_physical_work_on_immovable_property',
        label: 'Fysiek werk aan onroerend goed?',
        help: 'Schoonmaak van een pand telt mee; advies erover niet.',
    },
];

/** Each of these takes the supply back out of the scheme. */
const EXCEPTIONS: Array<{ key: keyof VatFacts; label: string }> = [
    { key: 'majority_work_in_own_workshop',
      label: 'Grootste deel van het werk in de eigen werkplaats' },
    { key: 'lent_to_subcontractor_working_own_premises',
      label: 'Uitgeleend aan een onderaannemer die op eigen terrein werkt' },
    { key: 'ancillary_to_goods_sold', label: 'Bijkomend bij geleverde goederen' },
    { key: 'is_design_work', label: 'Ontwerpwerkzaamheden' },
    { key: 'is_guarding_or_rental', label: 'Bewaking of verhuur' },
];

const toTristate = (value: boolean | null) =>
    value === null || value === undefined ? '' : String(value);
const fromTristate = (value: string) =>
    value === '' ? null : value === 'true';

export function VatSettingsPanel({ endpoint, title, subtitle }: {
    /** The detail endpoint of the record, e.g. `/customers/customers/<id>/`. */
    endpoint: string;
    title?: string;
    subtitle?: string;
}) {
    const { t } = useLanguage();
    const [facts, setFacts] = useState<VatFacts | null>(null);
    const [loading, setLoading] = useState(true);
    const [saving, setSaving] = useState(false);
    const [saved, setSaved] = useState(false);
    const [error, setError] = useState<string | null>(null);

    useEffect(() => {
        let cancelled = false;
        (async () => {
            try {
                const data = await apiGet<VatFacts>(endpoint);
                if (!cancelled) setFacts(data);
            } catch {
                if (!cancelled) setError('De btw-instellingen konden niet worden geladen.');
            } finally {
                if (!cancelled) setLoading(false);
            }
        })();
        return () => { cancelled = true; };
    }, [endpoint]);

    const update = (key: keyof VatFacts, value: string | boolean | null) => {
        setFacts(current => (current ? { ...current, [key]: value } : current));
        setSaved(false);
    };

    const save = async () => {
        if (!facts) return;
        setSaving(true);
        setError(null);
        try {
            await apiMutate(endpoint, 'PATCH', {
                vat_treatment_code: facts.vat_treatment_code,
                is_staff_lending_or_subcontracting: facts.is_staff_lending_or_subcontracting,
                is_physical_work_on_immovable_property:
                    facts.is_physical_work_on_immovable_property,
                majority_work_in_own_workshop: facts.majority_work_in_own_workshop,
                lent_to_subcontractor_working_own_premises:
                    facts.lent_to_subcontractor_working_own_premises,
                ancillary_to_goods_sold: facts.ancillary_to_goods_sold,
                is_design_work: facts.is_design_work,
                is_guarding_or_rental: facts.is_guarding_or_rental,
                vat_notes: facts.vat_notes ?? '',
            });
            setSaved(true);
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Opslaan is niet gelukt.');
        } finally {
            setSaving(false);
        }
    };

    if (loading) return null;
    if (!facts) {
        return (
            <SectionCard title={title ?? 'Btw-instellingen'}>
                <span style={{ color: colors.dangerDark }}>{error}</span>
            </SectionCard>
        );
    }

    const reverseCharge = facts.vat_treatment_code === 'REVERSE_CHARGE';
    const unresolved = reverseCharge && CONDITIONS.some(
        c => facts[c.key] === null || facts[c.key] === undefined);
    const exceptionApplies = EXCEPTIONS.some(e => facts[e.key] === true);

    return (
        <SectionCard
            title={title ?? 'Btw-instellingen'}
            subtitle={subtitle ?? 'Wat hier staat bepaalt de btw op elke factuurregel'}
            actions={
                <Button onClick={save} loading={saving}
                        icon={saved ? <Check size={16} /> : undefined}>
                    {saved ? 'Opgeslagen' : 'Opslaan'}
                </Button>
            }
        >
            {error && (
                <div style={{ padding: spacing.md, marginBottom: spacing.lg,
                              borderRadius: radius.md, background: colors.dangerBg,
                              border: `1px solid ${colors.dangerBorder}`,
                              color: colors.dangerDark }}>{error}</div>
            )}

            <div style={{ display: 'flex', gap: spacing.sm, padding: spacing.md,
                          marginBottom: spacing.lg, borderRadius: radius.md,
                          background: colors.infoBg, color: colors.primary,
                          fontSize: fontSize.sm }}>
                <Info size={16} style={{ flexShrink: 0, marginTop: 2 }} />
                <span>
                    Niets wordt geraden. Wat hier niet is vastgesteld, houdt de
                    factuurregel tegen in plaats van er 21% van te maken.
                </span>
            </div>

            <div style={{ maxWidth: 520, marginBottom: spacing.xl }}>
                <Select
                    label={t('Btw-behandeling')}
                    value={facts.vat_treatment_code || 'UNKNOWN'}
                    onChange={value => update('vat_treatment_code', value)}
                    options={TREATMENTS}
                />
            </div>

            {reverseCharge && (
                <>
                    <h4 style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold,
                                 margin: `0 0 ${spacing.sm}` }}>
                        {t('Voorwaarden voor verlegging')}
                    </h4>
                    <p style={{ fontSize: fontSize.sm, color: colors.textSecondary,
                                margin: `0 0 ${spacing.lg}` }}>
                        Beide moeten "Ja" zijn voordat de btw verlegd wordt.
                    </p>
                    <div style={{ display: 'grid', gap: spacing.lg, maxWidth: 520,
                                  marginBottom: spacing.xl }}>
                        {CONDITIONS.map(condition => (
                            <div key={condition.key}>
                                <Select
                                    label={condition.label}
                                    value={toTristate(facts[condition.key] as boolean | null)}
                                    onChange={value =>
                                        update(condition.key, fromTristate(value))}
                                    options={TRISTATE}
                                />
                                <div style={{ fontSize: fontSize.xs,
                                              color: colors.textMuted, marginTop: 4 }}>
                                    {condition.help}
                                </div>
                            </div>
                        ))}
                    </div>

                    <h4 style={{ fontSize: fontSize.md, fontWeight: fontWeight.bold,
                                 margin: `0 0 ${spacing.sm}` }}>
                        {t('Uitzonderingen')}
                    </h4>
                    <p style={{ fontSize: fontSize.sm, color: colors.textSecondary,
                                margin: `0 0 ${spacing.lg}` }}>
                        Eén "Ja" haalt de dienst uit de verleggingsregeling.
                    </p>
                    <div style={{ display: 'grid', gap: spacing.md, maxWidth: 520,
                                  marginBottom: spacing.xl }}>
                        {EXCEPTIONS.map(exception => (
                            <Select
                                key={exception.key}
                                label={exception.label}
                                value={toTristate(facts[exception.key] as boolean | null)}
                                onChange={value => update(exception.key, fromTristate(value))}
                                options={TRISTATE}
                            />
                        ))}
                    </div>

                    {unresolved && (
                        <div style={{ display: 'flex', gap: spacing.sm,
                                      padding: spacing.md, marginBottom: spacing.lg,
                                      borderRadius: radius.md,
                                      background: colors.warningBg,
                                      border: `1px solid ${colors.warningBorder}`,
                                      color: colors.warning, fontSize: fontSize.sm }}>
                            <AlertTriangle size={16} style={{ flexShrink: 0 }} />
                            Zolang een voorwaarde niet is vastgesteld, wordt elke
                            regel aangehouden en kan de factuur niet worden verstuurd.
                        </div>
                    )}
                    {exceptionApplies && (
                        <div style={{ padding: spacing.md, marginBottom: spacing.lg,
                                      borderRadius: radius.md, background: colors.bgAlt,
                                      color: colors.textSecondary, fontSize: fontSize.sm }}>
                            Er geldt een uitzondering, dus de btw wordt niet verlegd.
                            Kies de behandeling die dan wél van toepassing is.
                        </div>
                    )}
                </>
            )}

            <div style={{ maxWidth: 640 }}>
                <TextArea
                    label={t('Onderbouwing')}
                    value={facts.vat_notes ?? ''}
                    onChange={value => update('vat_notes', value)}
                    placeholder="Waarop is deze behandeling gebaseerd? Bijvoorbeeld: wat het werk inhoudt, of de tekst op het contract."
                    rows={3}
                />
            </div>
        </SectionCard>
    );
}
