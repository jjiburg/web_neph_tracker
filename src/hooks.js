import { useState, useEffect, useCallback } from 'react';
import {
    getAllIntakes,
    getAllOutputs,
    getAllFlushes,
    getAllBowels,
    getAllDressings,
    getAllDailyTotals,
    addIntake,
    addOutput,
    addFlush,
    addBowel,
    addDressing,
    addOrUpdateDailyTotal,
    deleteIntake,
    deleteOutput,
    deleteFlush,
    deleteBowel,
    deleteDressing,
    isToday,
    isSameDay,
} from './store';

// Hook for loading and managing all data
export function useData() {
    const [intakes, setIntakes] = useState([]);
    const [outputs, setOutputs] = useState([]);
    const [flushes, setFlushes] = useState([]);
    const [bowels, setBowels] = useState([]);
    const [dressings, setDressings] = useState([]);
    const [dailyTotals, setDailyTotals] = useState([]);
    const [loading, setLoading] = useState(true);

    const refresh = useCallback(async () => {
        const [i, o, f, b, d, dt] = await Promise.all([
            getAllIntakes(),
            getAllOutputs(),
            getAllFlushes(),
            getAllBowels(),
            getAllDressings(),
            getAllDailyTotals(),
        ]);
        setIntakes(i.reverse());
        setOutputs(o.reverse());
        setFlushes(f.reverse());
        setBowels(b.reverse());
        setDressings(d.reverse());
        setDailyTotals(dt);
        setLoading(false);
    }, []);

    useEffect(() => {
        refresh();
    }, [refresh]);

    // Today's totals
    const todayIntakes = intakes.filter((e) => isToday(e.timestamp));
    const todayOutputs = outputs.filter((e) => isToday(e.timestamp));

    const todayIntakeMl = todayIntakes.reduce((sum, e) => sum + e.amountMl, 0);
    const todayBagMl = todayOutputs.filter((e) => e.type === 'bag').reduce((sum, e) => sum + e.amountMl, 0);
    const todayUrinalMl = todayOutputs.filter((e) => e.type === 'urinal').reduce((sum, e) => sum + e.amountMl, 0);
    const todayTotalOutputMl = todayBagMl + todayUrinalMl;

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
            urinalMl: dayOutputs.filter((e) => e.type === 'urinal').reduce((sum, e) => sum + e.amountMl, 0),
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
        loading,
        refresh,
        todayIntakeMl,
        todayBagMl,
        todayUrinalMl,
        todayTotalOutputMl,
        getTotalsForDay,
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
