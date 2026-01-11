import { useState } from 'react';
import { motion, useDragControls } from 'framer-motion';
import { Icons } from './Icons';

const parseGoalValue = (value) => {
    const number = Number(value);
    if (!Number.isFinite(number) || number <= 0) return null;
    return Math.round(number);
};

export default function GoalSheet({ initialValues, onSave, onClose }) {
    const dragControls = useDragControls();
    const [intakeGoal, setIntakeGoal] = useState(
        initialValues?.intakeMl ? String(initialValues.intakeMl) : ''
    );
    const [outputGoal, setOutputGoal] = useState(
        initialValues?.outputMl ? String(initialValues.outputMl) : ''
    );

    const handleSave = () => {
        onSave({
            intakeMl: parseGoalValue(intakeGoal),
            outputMl: parseGoalValue(outputGoal),
        });
    };

    const handleClear = () => {
        setIntakeGoal('');
        setOutputGoal('');
        onSave({ intakeMl: null, outputMl: null });
    };

    return (
        <motion.div
            className="sheet-overlay"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onClick={onClose}
        >
            <motion.div
                className="sheet"
                initial={{ y: '100%' }}
                animate={{ y: 0 }}
                exit={{ y: '100%' }}
                transition={{ type: 'spring', damping: 25, stiffness: 300 }}
                drag="y"
                dragControls={dragControls}
                dragListener={false}
                dragConstraints={{ top: 0, bottom: 0 }}
                dragElastic={0.15}
                onDragEnd={(_, info) => {
                    if (info.offset.y > 120 || info.velocity.y > 900) {
                        onClose();
                    }
                }}
                onClick={(e) => e.stopPropagation()}
            >
                <div
                    className="sheet__handle"
                    onPointerDown={(event) => dragControls.start(event)}
                />
                <div className="sheet__header">
                    <span className="sheet__icon text-accent"><Icons.Target /></span>
                    <h2 className="sheet__title">Daily Goals</h2>
                </div>

                <div className="sheet__content">
                    <div className="input-group">
                        <label className="input-group__label">Intake goal (ml)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="e.g. 2000"
                            value={intakeGoal}
                            onChange={(e) => setIntakeGoal(e.target.value)}
                            inputMode="numeric"
                        />
                    </div>

                    <div className="input-group">
                        <label className="input-group__label">Output goal (ml)</label>
                        <input
                            type="number"
                            className="input"
                            placeholder="e.g. 1800"
                            value={outputGoal}
                            onChange={(e) => setOutputGoal(e.target.value)}
                            inputMode="numeric"
                        />
                    </div>

                    <button className="liquid-button" onClick={handleSave}>
                        Save Goals
                    </button>
                    <button
                        className="liquid-button liquid-button--secondary"
                        onClick={handleClear}
                        style={{ marginTop: 10 }}
                    >
                        Clear Goals
                    </button>
                    <p className="text-dim" style={{ fontSize: 12, marginTop: 12 }}>
                        Goals apply to total daily intake and total output.
                    </p>
                </div>
            </motion.div>
        </motion.div>
    );
}
