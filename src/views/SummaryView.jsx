import { useState } from 'react';
import { formatMl, formatDateFull } from '../store';

export default function SummaryView({ data, showToast }) {
    const [selectedDate, setSelectedDate] = useState(new Date().toISOString().split('T')[0]);
    const { dailyTotals, getTotalsForDay, recordDailyTotal } = data;

    const dayTotals = getTotalsForDay(selectedDate);

    const handleRecordEndOfDay = async () => {
        await recordDailyTotal(selectedDate, dayTotals.bagMl, dayTotals.urinalMl, dayTotals.intakeMl);
        showToast(`Recorded totals for ${new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}`);
    };

    const isToday = selectedDate === new Date().toISOString().split('T')[0];

    return (
        <div className="page">
            {/* Header */}
            <header className="screen-header">
                <h1 className="screen-header__title">Summary</h1>
                <p className="screen-header__subtitle">{new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</p>
            </header>

            <div className="page__content">
                {/* Day Picker */}
                <div className="glass-card">
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px' }}>
                        <span style={{ fontWeight: 700 }}>Day</span>
                        <input
                            type="date"
                            value={selectedDate}
                            onChange={(e) => setSelectedDate(e.target.value)}
                            style={{
                                background: 'rgba(255,255,255,0.1)',
                                border: '1px solid var(--glass-border)',
                                borderRadius: '12px',
                                padding: '8px 12px',
                                color: 'var(--text-primary)',
                                fontSize: '16px',
                            }}
                        />
                    </div>
                    <button
                        className={`liquid-button--chip ${isToday ? 'active' : ''}`}
                        onClick={() => setSelectedDate(new Date().toISOString().split('T')[0])}
                    >
                        Jump to Today
                    </button>
                </div>

                {/* Summary Card */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>
                        Totals for {new Date(selectedDate).toLocaleDateString([], { month: 'short', day: 'numeric' })}
                    </h2>

                    <div className="stats-grid">
                        <div className="stat-card">
                            <div className="stat-card__label">Bag Output</div>
                            <div className="stat-card__value">{formatMl(dayTotals.bagMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Voided Output</div>
                            <div className="stat-card__value">{formatMl(dayTotals.urinalMl)}</div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Total Output</div>
                            <div className="stat-card__value" style={{ color: 'var(--accent-secondary)' }}>
                                {formatMl(dayTotals.bagMl + dayTotals.urinalMl)}
                            </div>
                        </div>
                        <div className="stat-card">
                            <div className="stat-card__label">Intake</div>
                            <div className="stat-card__value" style={{ color: 'var(--accent)' }}>
                                {formatMl(dayTotals.intakeMl)}
                            </div>
                        </div>
                    </div>

                    <div style={{ display: 'flex', gap: '12px', marginTop: '16px' }}>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Flushes</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.flushCount}</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>BM</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.bowelCount}</div>
                        </div>
                        <div style={{ flex: 1, padding: '12px', background: 'rgba(255,255,255,0.03)', borderRadius: '16px', textAlign: 'center' }}>
                            <div style={{ fontSize: '12px', color: 'var(--text-secondary)', marginBottom: '4px' }}>Dressing</div>
                            <div style={{ fontSize: '18px', fontWeight: 700 }}>{dayTotals.latestDressing || 'None'}</div>
                        </div>
                    </div>
                </div>

                {/* End of Day Action */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>End of Day</h2>
                    <button className="liquid-button" onClick={handleRecordEndOfDay}>
                        ✓ Record End of Day Totals
                    </button>
                </div>

                {/* Daily Totals History */}
                <div className="glass-card">
                    <h2 style={{ fontSize: '16px', fontWeight: 700, marginBottom: '16px' }}>Recorded Daily Totals</h2>
                    {dailyTotals.length === 0 ? (
                        <p style={{ color: 'var(--text-secondary)', fontSize: '14px' }}>No totals recorded yet.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {dailyTotals.slice(0, 7).map((total) => (
                                <div
                                    key={total.id}
                                    style={{
                                        padding: '12px',
                                        background: 'rgba(255,255,255,0.03)',
                                        borderRadius: '12px',
                                    }}
                                >
                                    <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                                        {formatDateFull(total.date)}
                                    </div>
                                    <div style={{ fontSize: '13px', color: 'var(--text-secondary)' }}>
                                        Bag {formatMl(total.bagMl)} • Voided {formatMl(total.urinalMl)} • Total {formatMl(total.totalMl)}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
