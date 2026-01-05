'use client';

import { useState } from 'react';
import { FileText, Upload, X, Calendar, File, Eye, Trash2, Plus } from 'lucide-react';
import { FormCard, inputStyle, labelStyle } from './FormCard';

export interface PendingContract {
    file: File;
    effectiveFrom: string;
    notes: string;
}

interface ContractUploaderProps {
    contracts: PendingContract[];
    onAdd: (contract: PendingContract) => void;
    onRemove: (index: number) => void;
    mode?: 'create' | 'edit';
}

/**
 * Component for uploading contracts during customer creation.
 * Contracts are queued and uploaded after the customer is created.
 */
export function ContractUploader({
    contracts,
    onAdd,
    onRemove,
    mode = 'create'
}: ContractUploaderProps) {
    const [showUploadForm, setShowUploadForm] = useState(false);
    const [newContract, setNewContract] = useState<{
        file: File | null;
        effectiveFrom: string;
        notes: string;
    }>({
        file: null,
        effectiveFrom: new Date().toISOString().split('T')[0],
        notes: ''
    });

    const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (file) {
            setNewContract(prev => ({ ...prev, file }));
        }
    };

    const handleAdd = () => {
        if (!newContract.file) {
            alert('Please select a contract file');
            return;
        }
        if (!newContract.effectiveFrom) {
            alert('Please enter an effective date');
            return;
        }
        onAdd({
            file: newContract.file,
            effectiveFrom: newContract.effectiveFrom,
            notes: newContract.notes
        });
        setNewContract({
            file: null,
            effectiveFrom: new Date().toISOString().split('T')[0],
            notes: ''
        });
        setShowUploadForm(false);
    };

    const formatFileSize = (bytes: number) => {
        if (bytes < 1024) return bytes + ' B';
        if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
        return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
    };

    return (
        <FormCard
            title="Contract Documents"
            subtitle={mode === 'create' ? 'Contracts will be uploaded after customer is created' : 'Upload contract documents'}
            icon={<FileText style={{ width: '20px', height: '20px', color: '#3B82F6' }} />}
            iconBgColor="#DBEAFE"
            headerRight={
                !showUploadForm && (
                    <button
                        onClick={() => setShowUploadForm(true)}
                        style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '6px',
                            padding: '8px 16px',
                            backgroundColor: '#3B82F6',
                            color: 'white',
                            border: 'none',
                            borderRadius: '8px',
                            fontSize: '13px',
                            fontWeight: 600,
                            cursor: 'pointer'
                        }}
                    >
                        <Upload style={{ width: '14px', height: '14px' }} />
                        Add Contract
                    </button>
                )
            }
        >
            {/* Pending Contracts List */}
            {contracts.length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '12px', marginBottom: showUploadForm ? '24px' : '0' }}>
                    {contracts.map((contract, idx) => (
                        <div
                            key={idx}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '16px',
                                padding: '16px',
                                backgroundColor: '#F9FAFB',
                                borderRadius: '12px',
                                border: '1px solid #E5E7EB'
                            }}
                        >
                            <div style={{
                                padding: '12px',
                                backgroundColor: '#DBEAFE',
                                borderRadius: '10px'
                            }}>
                                <File style={{ width: '20px', height: '20px', color: '#3B82F6' }} />
                            </div>
                            <div style={{ flex: 1 }}>
                                <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                    {contract.file.name}
                                </p>
                                <div style={{ display: 'flex', gap: '16px', marginTop: '4px' }}>
                                    <span style={{ fontSize: '13px', color: '#6B7280' }}>
                                        {formatFileSize(contract.file.size)}
                                    </span>
                                    <span style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '13px', color: '#6B7280' }}>
                                        <Calendar style={{ width: '12px', height: '12px' }} />
                                        Effective: {new Date(contract.effectiveFrom).toLocaleDateString()}
                                    </span>
                                </div>
                                {contract.notes && (
                                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
                                        {contract.notes}
                                    </p>
                                )}
                            </div>
                            <span style={{
                                padding: '4px 8px',
                                backgroundColor: '#FEF3C7',
                                color: '#D97706',
                                borderRadius: '6px',
                                fontSize: '12px',
                                fontWeight: 500
                            }}>
                                Pending
                            </span>
                            <button
                                onClick={() => onRemove(idx)}
                                style={{
                                    padding: '8px',
                                    backgroundColor: '#FEE2E2',
                                    border: 'none',
                                    borderRadius: '8px',
                                    cursor: 'pointer'
                                }}
                            >
                                <Trash2 style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                            </button>
                        </div>
                    ))}
                </div>
            )}

            {/* Upload Form */}
            {showUploadForm && (
                <div style={{
                    padding: '20px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '1px dashed #3B82F6'
                }}>
                    <div style={{ marginBottom: '16px' }}>
                        <label style={labelStyle}>Contract File *</label>
                        <div
                            onClick={() => document.getElementById('contract-file-input')?.click()}
                            style={{
                                padding: '24px',
                                border: '2px dashed #D1D5DB',
                                borderRadius: '10px',
                                textAlign: 'center',
                                cursor: 'pointer',
                                backgroundColor: 'white',
                                transition: 'all 0.2s'
                            }}
                        >
                            <input
                                id="contract-file-input"
                                type="file"
                                accept=".pdf,.doc,.docx"
                                onChange={handleFileChange}
                                style={{ display: 'none' }}
                            />
                            {newContract.file ? (
                                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '12px' }}>
                                    <File style={{ width: '24px', height: '24px', color: '#3B82F6' }} />
                                    <div>
                                        <p style={{ fontSize: '14px', fontWeight: 600, color: '#111827', margin: 0 }}>
                                            {newContract.file.name}
                                        </p>
                                        <p style={{ fontSize: '12px', color: '#6B7280', margin: 0 }}>
                                            {formatFileSize(newContract.file.size)}
                                        </p>
                                    </div>
                                    <button
                                        onClick={(e) => {
                                            e.stopPropagation();
                                            setNewContract(prev => ({ ...prev, file: null }));
                                        }}
                                        style={{ padding: '4px', backgroundColor: '#FEE2E2', border: 'none', borderRadius: '4px', cursor: 'pointer' }}
                                    >
                                        <X style={{ width: '14px', height: '14px', color: '#DC2626' }} />
                                    </button>
                                </div>
                            ) : (
                                <>
                                    <Upload style={{ width: '32px', height: '32px', color: '#9CA3AF', margin: '0 auto 8px' }} />
                                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                                        Click to upload or drag and drop
                                    </p>
                                    <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
                                        PDF, DOC, DOCX up to 10MB
                                    </p>
                                </>
                            )}
                        </div>
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '16px', marginBottom: '16px' }}>
                        <div>
                            <label style={labelStyle}>Effective From *</label>
                            <input
                                type="date"
                                value={newContract.effectiveFrom}
                                onChange={(e) => setNewContract(prev => ({ ...prev, effectiveFrom: e.target.value }))}
                                style={inputStyle}
                            />
                        </div>
                        <div>
                            <label style={labelStyle}>Notes (Optional)</label>
                            <input
                                type="text"
                                value={newContract.notes}
                                onChange={(e) => setNewContract(prev => ({ ...prev, notes: e.target.value }))}
                                placeholder="e.g., Annual renewal contract"
                                style={inputStyle}
                            />
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                        <button
                            onClick={() => {
                                setShowUploadForm(false);
                                setNewContract({ file: null, effectiveFrom: new Date().toISOString().split('T')[0], notes: '' });
                            }}
                            style={{
                                padding: '10px 16px',
                                backgroundColor: 'white',
                                color: '#374151',
                                border: '1px solid #E5E7EB',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            Cancel
                        </button>
                        <button
                            onClick={handleAdd}
                            style={{
                                display: 'flex',
                                alignItems: 'center',
                                gap: '6px',
                                padding: '10px 16px',
                                backgroundColor: '#3B82F6',
                                color: 'white',
                                border: 'none',
                                borderRadius: '8px',
                                fontSize: '13px',
                                fontWeight: 600,
                                cursor: 'pointer'
                            }}
                        >
                            <Plus style={{ width: '14px', height: '14px' }} />
                            Add Contract
                        </button>
                    </div>
                </div>
            )}

            {contracts.length === 0 && !showUploadForm && (
                <div style={{
                    textAlign: 'center',
                    padding: '40px',
                    backgroundColor: '#F9FAFB',
                    borderRadius: '12px',
                    border: '2px dashed #E5E7EB'
                }}>
                    <FileText style={{ width: '32px', height: '32px', color: '#9CA3AF', margin: '0 auto 12px' }} />
                    <p style={{ fontSize: '14px', color: '#6B7280', margin: 0 }}>
                        No contracts added yet. Click "Add Contract" to upload.
                    </p>
                    {mode === 'create' && (
                        <p style={{ fontSize: '12px', color: '#9CA3AF', margin: '4px 0 0' }}>
                            Contracts will be uploaded after the customer is created.
                        </p>
                    )}
                </div>
            )}
        </FormCard>
    );
}
