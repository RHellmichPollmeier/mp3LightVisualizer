import { useState, useCallback } from 'react';
import { analyzeAudioFile } from '../utils/audioAnalysis.js';

export const useAudioAnalysis = () => {
    const [audioFile, setAudioFile] = useState(null);
    const [audioData, setAudioData] = useState(null);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [error, setError] = useState(null);

    const analyzeFile = useCallback(async (file) => {
        if (!file) return;

        setIsAnalyzing(true);
        setError(null);

        try {
            const data = await analyzeAudioFile(file);
            setAudioData(data);
            setAudioFile(file);
        } catch (err) {
            setError(err.message);
            console.error('Audio-Analyse Fehler:', err);
        } finally {
            setIsAnalyzing(false);
        }
    }, []);

    const resetAnalysis = useCallback(() => {
        setAudioFile(null);
        setAudioData(null);
        setError(null);
    }, []);

    return {
        audioFile,
        audioData,
        isAnalyzing,
        error,
        analyzeFile,
        resetAnalysis
    };
};