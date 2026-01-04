import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

const SILENCE_THRESHOLD = 0.01; // Audio level below this is considered silence
const SILENCE_DURATION = 1500; // Stop after 1.5 seconds of silence

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
    const streamRef = useRef(null);

    useEffect(() => {
        return () => {
            // Cleanup on unmount
            if (animationFrameRef.current) {
                cancelAnimationFrame(animationFrameRef.current);
            }
            if (audioContextRef.current) {
                audioContextRef.current.close();
            }
        };
    }, []);

    const startRecording = async () => {
        console.log('[VoiceButton] Starting recording...');
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            streamRef.current = stream;
            console.log('[VoiceButton] Microphone access granted');

            // Set up audio analysis for VAD
            audioContextRef.current = new (window.AudioContext || window.webkitAudioContext)();
            analyserRef.current = audioContextRef.current.createAnalyser();
            analyserRef.current.fftSize = 256;
            const source = audioContextRef.current.createMediaStreamSource(stream);
            source.connect(analyserRef.current);

            // Start monitoring audio levels
            silenceStartRef.current = null;
            monitorAudioLevel();

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
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[VoiceButton] Recording stopped, chunks:', chunksRef.current.length);
                stream.getTracks().forEach(track => track.stop());
                if (animationFrameRef.current) {
                    cancelAnimationFrame(animationFrameRef.current);
                }
                await processAudio();
            };

            mediaRecorder.start(500); // Collect every 500ms for faster response
            setIsRecording(true);
            console.log('[VoiceButton] Recording started with VAD');
            showToast('Listening...');
        } catch (error) {
            console.error('[VoiceButton] Microphone access error:', error);
            showToast('Microphone access denied');
        }
    };

    const monitorAudioLevel = () => {
        if (!analyserRef.current) return;

        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        // Calculate average volume
        const average = dataArray.reduce((a, b) => a + b) / dataArray.length / 255;
        setAudioLevel(average);

        if (average < SILENCE_THRESHOLD) {
            // Below threshold - start silence timer
            if (!silenceStartRef.current) {
                silenceStartRef.current = Date.now();
                console.log('[VoiceButton] Silence detected, starting timer...');
            } else if (Date.now() - silenceStartRef.current > SILENCE_DURATION) {
                // Silence exceeded threshold - stop recording
                console.log('[VoiceButton] Auto-stopping after silence');
                stopRecording();
                return;
            }
        } else {
            // Sound detected - reset silence timer
            if (silenceStartRef.current) {
                console.log('[VoiceButton] Speech detected, resetting timer');
            }
            silenceStartRef.current = null;
        }

        animationFrameRef.current = requestAnimationFrame(monitorAudioLevel);
    };

    const stopRecording = () => {
        console.log('[VoiceButton] Stop recording requested');
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            setAudioLevel(0);
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
                console.error('[VoiceButton] Audio too short');
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
        if (isRecording) {
            stopRecording();
        } else if (!isProcessing) {
            startRecording();
        }
    };

    return (
        <motion.button
            className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleClick}
            disabled={isProcessing}
            whileTap={{ scale: 0.95 }}
            style={{
                // Scale the button slightly based on audio level when recording
                transform: isRecording ? `scale(${1 + audioLevel * 0.3})` : undefined
            }}
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
