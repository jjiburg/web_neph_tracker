import { useState, useRef, useEffect, useCallback } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

const SILENCE_THRESHOLD = 0.02; // Audio level below this is considered silence (increased)
const SILENCE_DURATION = 1500; // Stop after 1.5 seconds of silence
const MIN_RECORD_TIME = 500; // Minimum recording time before VAD kicks in

export default function VoiceButton({ onCommand, showToast }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const [audioLevel, setAudioLevel] = useState(0);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);
    const audioContextRef = useRef(null);
    const analyserRef = useRef(null);
    const silenceStartRef = useRef(null);
    const animationFrameRef = useRef(null);
    const recordingStartRef = useRef(null);
    const isRecordingRef = useRef(false); // Track recording state for callbacks

    useEffect(() => {
        return () => {
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                audioContextRef.current.close();
            }
        };
    }, []);

    const stopRecording = useCallback(() => {
        console.log('[VoiceButton] Stop recording called, isRecordingRef:', isRecordingRef.current);
        if (mediaRecorderRef.current && isRecordingRef.current) {
            isRecordingRef.current = false;
            setIsRecording(false);
            setAudioLevel(0);
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
                animationFrameRef.current = null;
            }
            mediaRecorderRef.current.stop();
            console.log('[VoiceButton] MediaRecorder.stop() called');
        }
    }, []);

    const monitorAudioLevel = useCallback(() => {
        if (!analyserRef.current || !isRecordingRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate RMS (root mean square) for better volume detection
        let sum = 0;
        for (let i = 0; i < dataArray.length; i++) {
            sum += (dataArray[i] / 255) ** 2;
        }
        const rms = Math.sqrt(sum / dataArray.length);
        setAudioLevel(rms);

        // Log periodically for debugging
        if (Math.random() < 0.1) {
            console.log('[VoiceButton] Audio level:', rms.toFixed(4), 'Threshold:', SILENCE_THRESHOLD);
        }

        // Don't check VAD until minimum recording time passed
        const elapsed = Date.now() - recordingStartRef.current;
        if (elapsed < MIN_RECORD_TIME) {
            animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
            return;
        }

        if (rms < SILENCE_THRESHOLD) {
            if (!silenceStartRef.current) {
                silenceStartRef.current = Date.now();
                console.log('[VoiceButton] Silence detected, starting timer...');
            } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
                console.log('[VoiceButton] Auto-stopping after', SILENCE_DURATION, 'ms of silence');
                stopRecording();
                return;
            }
        } else {
            if (silenceStartRef.current) {
                console.log('[VoiceButton] Speech detected, resetting silence timer');
            }
            silenceStartRef.current = null;
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    }, [stopRecording]);

    const startRecording = async () => {
        console.log('[VoiceButton] Starting recording...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[VoiceButton] Microphone access granted');

            // Set up AudioContext for VAD
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();

            // Safari requires resuming AudioContext after user interaction
            if (audioContextRef.current.state === 'suspended') {
                await audioContextRef.current.resume();
                console.log('[VoiceButton] AudioContext resumed');
            }

            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 512;
            analyserRef.current.smoothingTimeConstant = 0.3;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            // Reset timers
            silenceStartRef.current = null;
            recordingStartRef.current = Date.now();

            // Set up MediaRecorder
            const mimeType = MediaRecorder.isTypeSupported('audio/webm;codecs=opus')
                ? 'audio/webm;codecs=opus'
                : MediaRecorder.isTypeSupported('audio/webm')
                    ? 'audio/webm'
                    : 'audio/mp4';
            console.log('[VoiceButton] Using mimeType:', mimeType);

            const mediaRecorder = new MediaRecorder(stream, { mimeType });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                    console.log('[VoiceButton] Data chunk:', e.data.size, 'bytes');
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[VoiceButton] MediaRecorder onstop, chunks:', chunksRef.current.length);
                stream.getTracks().forEach(track => track.stop());
                if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
                    audioContextRef.current.close();
                }
                await processAudio();
            };

            mediaRecorder.start(500);
            isRecordingRef.current = true;
            setIsRecording(true);

            // Start monitoring audio level
            monitorAudioLevel();

            console.log('[VoiceButton] Recording started with VAD enabled');
            showToast('Listening... (speak then pause)');
        } catch (error) {
            console.error('[VoiceButton] Microphone access error:', error);
            showToast('Microphone access denied');
        }
    };

    const processAudio = async () => {
        console.log('[VoiceButton] Processing audio...');
        setIsProcessing(true);
        try {
            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            console.log('[VoiceButton] Audio blob size:', audioBlob.size, 'bytes');

            if (audioBlob.size < 1000) {
                showToast('Recording too short');
                return;
            }

            const base64 = await blobToBase64(audioBlob);
            console.log('[VoiceButton] Sending to /api/voice...');

            const response = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64, mimeType })
            });

            console.log('[VoiceButton] Response status:', response.status);
            const result = await response.json();
            console.log('[VoiceButton] Response:', JSON.stringify(result));

            if (result.error) {
                showToast(result.error);
            } else {
                onCommand(result);
            }
        } catch (error) {
            console.error('[VoiceButton] Processing error:', error);
            showToast('Failed to process voice');
        } finally {
            setIsProcessing(false);
        }
    };

    const blobToBase64 = (blob) => {
        return new Promise((resolve, reject) => {
            const reader = new FileReader();
            reader.onloadend = () => resolve(reader.result.split(',')[1]);
            reader.onerror = reject;
            reader.readAsDataURL(blob);
        });
    };

    const handleClick = () => {
        console.log('[VoiceButton] Button clicked, isRecording:', isRecording, 'isProcessing:', isProcessing);
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    };

    // Visual scale based on audio level
    const visualScale = isRecording ? 1 + (audioLevel * 0.5) : 1;

    return (
        <motion.button
            className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleClick}
            disabled={isProcessing}
            whileTap={{ scale: 0.95 }}
            animate={{ scale: visualScale }}
            transition={{ type: 'spring', stiffness: 300, damping: 20 }}
        >
            <AnimatePresence mode="wait">
                {isProcessing ? (
                    <motion.div
                        key="processing"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                        className="voice-button__spinner"
                    />
                ) : (
                    <motion.div
                        key="mic"
                        initial={{ opacity: 0, scale: 0.8 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.8 }}
                    >
                        <Icons.Mic />
                    </motion.div>
                )}
            </AnimatePresence>
            {isRecording && <div className="voice-button__pulse" />}
        </motion.button>
    );
}
