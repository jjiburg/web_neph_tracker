import { useState, useRef } from 'react';
import { motion } from 'framer-motion';
import { importBackup } from '../import';
import { Icons } from './Icons';

export default function ImportSheet({ onClose, onSuccess }) {
    const [status, setStatus] = useState(null);
    const [loading, setLoading] = useState(false);
    const [replaceExisting, setReplaceExisting] = useState(false);
    const fileInputRef = useRef(null);

    const handleFileSelect = async (e) => {
        const file = e.target.files?.[0];
        if (!file) return;

        setLoading(true);
        setStatus(null);

        try {
            const text = await file.text();
            // Wrap in setTimeout to allow UI to update if it's blocking
            setTimeout(async () => {
                try {
                    const result = await importBackup(text, replaceExisting);
                    setStatus(result);
                    if (result.success && onSuccess) {
                        setTimeout(() => onSuccess(), 1500);
                    }
                } catch (innerErr) {
                    setStatus({ success: false, message: innerErr.message });
                } finally {
                    setLoading(false);
                }
            }, 50);

        } catch (err) {
            setStatus({ success: false, message: err.message });
            setLoading(false);
        }
    };

    return (
        <motion.div
            className="sheet-overlay"
            onClick={onClose}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
        >
            <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                onClick={(e) => e.stopPropagation()}
            >
                <div className="sheet__handle" />
                <div className="sheet__header">
                    <span className="sheet__icon" style={{ color: 'var(--secondary)' }}><Icons.Download /></span>
                    <h2 className="sheet__title">Import Backup</h2>
                </div>

                <div className="sheet__content">
                    <p style={{ marginBottom: '20px', color: 'var(--text-secondary)', fontSize: '14px', lineHeight: '1.5' }}>
                        Restore your history from a NephTrack iOS JSON backup file.
                    </p>

                    <div className="glass-card glass-card--compact" style={{ marginBottom: '20px' }}>
                        <div className="toggle-row">
                            <div className="toggle-row__label">
                                <span style={{ display: 'block', fontWeight: 600 }}>Replace all data</span>
                                <span style={{ fontSize: '12px', color: 'var(--text-dim)' }}>Overwrite local database</span>
                            </div>
                            <div
                                className={`toggle ${replaceExisting ? 'active' : ''}`}
                                onClick={() => setReplaceExisting(!replaceExisting)}
                            >
                                <div className="toggle__thumb" />
                            </div>
                        </div>
                        {replaceExisting && (
                            <div style={{ marginTop: '12px', padding: '8px 12px', background: 'rgba(255, 59, 48, 0.1)', borderRadius: '8px', display: 'flex', gap: '8px', alignItems: 'center' }}>
                                <Icons.AlertCircle size={16} color="var(--accent)" />
                                <span style={{ fontSize: '12px', color: 'var(--accent)', fontWeight: 500 }}>
                                    Warning: This will delete all current entries.
                                </span>
                            </div>
                        )}
                    </div>

                    <input
                        type="file"
                        accept=".json,application/json"
                        ref={fileInputRef}
                        onChange={handleFileSelect}
                        style={{ display: 'none' }}
                    />

                    <button
                        className="liquid-button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={loading}
                        style={{ width: '100%' }}
                    >
                        {loading ? 'Importing Data...' : (
                            <span style={{ display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center' }}>
                                <Icons.Download size={18} /> Select Backup File
                            </span>
                        )}
                    </button>

                    {status && (
                        <motion.div
                            initial={{ opacity: 0, y: 10 }}
                            animate={{ opacity: 1, y: 0 }}
                            style={{
                                marginTop: '20px',
                                padding: '16px',
                                borderRadius: '16px',
                                background: status.success ? 'rgba(52, 199, 89, 0.15)' : 'rgba(255, 69, 58, 0.15)',
                                border: `1px solid ${status.success ? 'rgba(52, 199, 89, 0.3)' : 'rgba(255, 69, 58, 0.3)'}`,
                                color: status.success ? '#34C759' : '#FF453A',
                                fontSize: '14px'
                            }}
                        >
                            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', fontWeight: 600 }}>
                                {status.success ? <Icons.Check size={18} /> : <Icons.AlertCircle size={18} />}
                                {status.message}
                            </div>

                            {status.counts && (
                                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px', fontSize: '12px', color: 'var(--text-secondary)' }}>
                                    <div>Intakes: <b style={{ color: 'var(--text-primary)' }}>{status.counts.intakes}</b></div>
                                    <div>Outputs: <b style={{ color: 'var(--text-primary)' }}>{status.counts.outputs}</b></div>
                                    <div>Flushes: <b style={{ color: 'var(--text-primary)' }}>{status.counts.flushes}</b></div>
                                    <div>Bowels: <b style={{ color: 'var(--text-primary)' }}>{status.counts.bowelMovements}</b></div>
                                </div>
                            )}
                        </motion.div>
                    )}
                </div>
            </motion.div>
        </motion.div>
    );
}
