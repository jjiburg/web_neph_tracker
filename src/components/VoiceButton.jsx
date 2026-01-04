import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

export default function VoiceButton({ onCommand, showToast }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        console.log('[VoiceButton] Starting recording...');
        try {
            console.log('[VoiceButton] Requesting microphone access...');
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            console.log('[VoiceButton] Microphone access granted');

            // Check supported mime types
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
                console.log('[VoiceButton] Data available, size:', e.data.size);
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                console.log('[VoiceButton] Recording stopped, chunks:', chunksRef.current.length);
                stream.getTracks().forEach(track => track.stop());
                await processAudio();
            };

            mediaRecorder.onerror = (e) => {
                console.error('[VoiceButton] MediaRecorder error:', e);
            };

            mediaRecorder.start(1000); // Collect data every second
            setIsRecording(true);
            console.log('[VoiceButton] Recording started');
        } catch (error) {
            console.error('[VoiceButton] Microphone access error:', error);
            showToast('Microphone access denied');
        }
    };

    const stopRecording = () => {
        console.log('[VoiceButton] Stop recording requested');
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
            console.log('[VoiceButton] MediaRecorder.stop() called');
        }
    };

    const processAudio = async () => {
        console.log('[VoiceButton] Processing audio...');
        setIsProcessing(true);
        try {
            const mimeType = mediaRecorderRef.current?.mimeType || 'audio/webm';
            console.log('[VoiceButton] Creating blob with mimeType:', mimeType);

            const audioBlob = new Blob(chunksRef.current, { type: mimeType });
            console.log('[VoiceButton] Audio blob size:', audioBlob.size, 'bytes');

            if (audioBlob.size === 0) {
                console.error('[VoiceButton] Audio blob is empty!');
                showToast('No audio recorded');
                return;
            }

            console.log('[VoiceButton] Converting to base64...');
            const base64 = await blobToBase64(audioBlob);
            console.log('[VoiceButton] Base64 length:', base64.length);

            console.log('[VoiceButton] Sending to /api/voice...');
            const response = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64, mimeType })
            });

            console.log('[VoiceButton] Response status:', response.status);
            const result = await response.json();
            console.log('[VoiceButton] Response body:', JSON.stringify(result));

            if (result.error) {
                console.error('[VoiceButton] API error:', result.error, result.details);
                showToast(result.error + (result.details ? `: ${result.details}` : ''));
            } else {
                console.log('[VoiceButton] Success! Calling onCommand with:', result);
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
            reader.onloadend = () => {
                const base64 = reader.result.split(',')[1];
                resolve(base64);
            };
            reader.onerror = (e) => {
                console.error('[VoiceButton] FileReader error:', e);
                reject(e);
            };
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

    return (
        <motion.button
            className={`voice-button ${isRecording ? 'recording' : ''} ${isProcessing ? 'processing' : ''}`}
            onClick={handleClick}
            disabled={isProcessing}
            whileTap={{ scale: 0.95 }}
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
