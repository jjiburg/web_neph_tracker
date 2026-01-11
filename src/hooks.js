import { useState, useEffect, useCallback } from 'react';
import {
    getAllIntakes,
    getAllOutputs,
    getAllFlushes,
    getAllBowels,
    getAllDressings,
    getAllDailyTotals,
    getAllGoals,
    addIntake,
    addOutput,
    addFlush,
    addBowel,
    addDressing,
    addOrUpdateDailyTotal,
    addGoal,
    deleteIntake,
    deleteOutput,
    deleteFlush,
    deleteBowel,
    deleteDressing,
    updateIntake,
    updateOutput,
    updateFlush,
    updateBowel,
    updateDressing,
    isToday,
    isSameDay,
} from './store';

const GOALS_KEY = 'nephtrack-daily-goals';

const normalizeGoalValue = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return Math.round(number);
};

const normalizeLegacyGoals = (goals) => ({
    intakeMl: normalizeGoalValue(goals?.intakeMl),
    outputMl: normalizeGoalValue(goals?.outputMl),
});

const loadLegacyGoals = () => {
    if (typeof localStorage === 'undefined') return null;
    try {
        const raw = localStorage.getItem(GOALS_KEY);
        if (!raw) return null;
        const parsed = normalizeLegacyGoals(JSON.parse(raw));
        if (!parsed.intakeMl && !parsed.outputMl) return null;
        return parsed;
    } catch {
        return null;
    }
};

// Hook for loading and managing all data
export function useData() {
    const [intakes, setIntakes] = useState([]);
    const [outputs, setOutputs] = useState([]);
    const [flushes, setFlushes] = useState([]);
    const [bowels, setBowels] = useState([]);
    const [dressings, setDressings] = useState([]);
    const [dailyTotals, setDailyTotals] = useState([]);
    const [goals, setGoals] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const [i, o, f, b, d, dt, g] = await Promise.all([
            getAllIntakes(),
            getAllOutputs(),
            getAllFlushes(),
            getAllBowels(),
            getAllDressings(),
            getAllDailyTotals(),
            getAllGoals(),
        ]);
        setIntakes(i.reverse());
        setOutputs(o.reverse());
        setFlushes(f.reverse());
        setBowels(b.reverse());
        setDressings(d.reverse());
        setDailyTotals(dt);
        setGoals(g);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    useEffect(() => {
        const maybeMigrate = async () => {
            if (loading) return;
            if (goals.length > 0) return;
            const legacy = loadLegacyGoals();
            if (!legacy) return;
            await addGoal(legacy.intakeMl, legacy.outputMl, Date.now());
            localStorage.removeItem(GOALS_KEY);
            refresh();
        };
        maybeMigrate();
    }, [goals.length, loading, refresh]);

    // Today's totals
    const todayIntakes = intakes.filter((e) => isToday(e.timestamp));
    const todayOutputs = outputs.filter((e) => isToday(e.timestamp));

    const todayIntakeMl = todayIntakes.reduce((sum, e) => sum + e.amountMl, 0);
    const todayBagMl = todayOutputs.filter((e) => e.type === 'bag').reduce((sum, e) => sum + e.amountMl, 0);
    const todayUrinalMl = todayOutputs
        .filter((e) => e.type === 'urinal' || e.type === 'void')
        .reduce((sum, e) => sum + e.amountMl, 0);
    const todayTotalOutputMl = todayBagMl + todayUrinalMl;

    const getGoalForDate = (date) => {
        if (!goals.length) return null;
        const endOfDay = new Date(date);
        endOfDay.setHours(23, 59, 59, 999);
        const sorted = [...goals].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        let matched = null;
        for (const entry of sorted) {
            if ((entry.timestamp || 0) <= endOfDay.getTime()) {
                matched = entry;
            } else {
                break;
            }
        }
        if (!matched) {
            matched = sorted[0];
        }
        if (!matched) return null;
        if (matched.intakeMl == null && matched.outputMl == null) return null;
        return {
            intakeMl: matched.intakeMl ?? null,
            outputMl: matched.outputMl ?? null,
            timestamp: matched.timestamp,
        };
    };

    const getLatestGoal = () => {
        if (!goals.length) return null;
        const sorted = [...goals].sort((a, b) => (a.timestamp || 0) - (b.timestamp || 0));
        return sorted[sorted.length - 1];
    };

    // Totals for a specific day
    const getTotalsForDay = (date) => {
        const dayIntakes = intakes.filter((e) => isSameDay(e.timestamp, date));
        const dayOutputs = outputs.filter((e) => isSameDay(e.timestamp, date));
        const dayFlushes = flushes.filter((e) => isSameDay(e.timestamp, date));
        const dayBowels = bowels.filter((e) => isSameDay(e.timestamp, date));
        const dayDressings = dressings.filter((e) => isSameDay(e.timestamp, date));

        return {
            intakeMl: dayIntakes.reduce((sum, e) => sum + e.amountMl, 0),
            bagMl: dayOutputs.filter((e) => e.type === 'bag').reduce((sum, e) => sum + e.amountMl, 0),
            urinalMl: dayOutputs
                .filter((e) => e.type === 'urinal' || e.type === 'void')
                .reduce((sum, e) => sum + e.amountMl, 0),
            flushCount: dayFlushes.length,
            bowelCount: dayBowels.length,
            latestDressing: dayDressings.length > 0 ? dayDressings[0].state : null,
        };
    };

    return {
        intakes,
        outputs,
        flushes,
        bowels,
        dressings,
        dailyTotals,
        goals,
        loading,
        refresh,
        todayIntakeMl,
        todayBagMl,
        todayUrinalMl,
        todayTotalOutputMl,
        getTotalsForDay,
        getGoalForDate,
        getLatestGoal,
        // Actions
        logIntake: async (amountMl, note = '', timestamp = Date.now()) => {
            await addIntake(amountMl, note, timestamp);
            refresh();
        },
        logOutput: async (type, amountMl, colorNote = '', symptoms = {}, otherNote = '', timestamp = Date.now()) => {
            await addOutput(type, amountMl, colorNote, symptoms, otherNote, timestamp);
            refresh();
        },
        logFlush: async (amountMl = 30, note = '', timestamp = Date.now()) => {
            await addFlush(amountMl, note, timestamp);
            refresh();
        },
        logBowel: async (bristolScale = 0, note = '', timestamp = Date.now()) => {
            await addBowel(bristolScale, note, timestamp);
            refresh();
        },
        logDressing: async (state, note = '', timestamp = Date.now()) => {
            await addDressing(state, note, timestamp);
            refresh();
        },
        recordDailyTotal: async (date, bagMl, urinalMl, intakeMl) => {
            await addOrUpdateDailyTotal(date, bagMl, urinalMl, intakeMl);
            refresh();
        },
        setGoals: async (intakeMl, outputMl, timestamp = Date.now()) => {
            await addGoal(intakeMl, outputMl, timestamp);
            refresh();
        },
        deleteIntakeEntry: async (id) => {
            await deleteIntake(id);
            refresh();
        },
        deleteOutputEntry: async (id) => {
            await deleteOutput(id);
            refresh();
        },
        deleteFlushEntry: async (id) => {
            await deleteFlush(id);
            refresh();
        },
        deleteBowelEntry: async (id) => {
            await deleteBowel(id);
            refresh();
        },
        deleteDressingEntry: async (id) => {
            await deleteDressing(id);
            refresh();
        },
        updateIntakeEntry: async (entry) => {
            await updateIntake(entry);
            refresh();
        },
        updateOutputEntry: async (entry) => {
            await updateOutput(entry);
            refresh();
        },
        updateFlushEntry: async (entry) => {
            await updateFlush(entry);
            refresh();
        },
        updateBowelEntry: async (entry) => {
            await updateBowel(entry);
            refresh();
        },
        updateDressingEntry: async (entry) => {
            await updateDressing(entry);
            refresh();
        },
    };
}

// Toast hook
export function useToast() {
    const [toast, setToast] = useState(null);

    const showToast = useCallback((message) => {
        setToast(message);
        setTimeout(() => setToast(null), 3000);
    }, []);

    return { toast, showToast };
}
