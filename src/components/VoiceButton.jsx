import { useState, useRef } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Icons } from './Icons';

export default function VoiceButton({ onCommand, showToast }) {
    const [isRecording, setIsRecording] = useState(false);
    const [isProcessing, setIsProcessing] = useState(false);
    const mediaRecorderRef = useRef(null);
    const chunksRef = useRef([]);

    const startRecording = async () => {
        try {
            const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
            const mediaRecorder = new MediaRecorder(stream, { mimeType: 'audio/webm' });
            mediaRecorderRef.current = mediaRecorder;
            chunksRef.current = [];

            mediaRecorder.ondataavailable = (e) => {
                if (e.data.size > 0) {
                    chunksRef.current.push(e.data);
                }
            };

            mediaRecorder.onstop = async () => {
                stream.getTracks().forEach(track => track.stop());
                await processAudio();
            };

            mediaRecorder.start();
            setIsRecording(true);
        } catch (error) {
            console.error('Microphone access error:', error);
            showToast('Microphone access denied');
        }
    };

    const stopRecording = () => {
        if (mediaRecorderRef.current && isRecording) {
            mediaRecorderRef.current.stop();
            setIsRecording(false);
        }
    };

    const processAudio = async () => {
        setIsProcessing(true);
        try {
            const audioBlob = new Blob(chunksRef.current, { type: 'audio/webm' });
            const base64 = await blobToBase64(audioBlob);

            const response = await fetch('/api/voice', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ audio: base64, mimeType: 'audio/webm' })
            });

            const result = await response.json();

            if (result.error) {
                showToast(result.error);
            } else {
                onCommand(result);
            }
        } catch (error) {
            console.error('Voice processing error:', error);
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
