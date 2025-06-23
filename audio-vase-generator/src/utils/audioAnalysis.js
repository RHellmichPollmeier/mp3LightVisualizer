export const analyzeAudioFile = async (file) => {
    try {
        const audioContext = new (window.AudioContext || window.webkitAudioContext)();
        const arrayBuffer = await file.arrayBuffer();
        const audioBuffer = await audioContext.decodeAudioData(arrayBuffer);

        const channelData = audioBuffer.getChannelData(0);
        const sampleRate = audioBuffer.sampleRate;

        // Segment-basierte Analyse
        const segmentDuration = 0.1; // 100ms Segmente
        const segmentSamples = Math.floor(segmentDuration * sampleRate);
        const numSegments = Math.floor(channelData.length / segmentSamples);

        const frequencyData = [];

        for (let i = 0; i < numSegments; i++) {
            const segmentStart = i * segmentSamples;
            const segmentEnd = Math.min(segmentStart + segmentSamples, channelData.length);
            const segment = channelData.slice(segmentStart, segmentEnd);

            // RMS für Amplitude
            const rms = Math.sqrt(segment.reduce((sum, sample) => sum + sample * sample, 0) / segment.length);

            // Spektrale Zentroide für Frequenzanalyse
            let spectralCentroid = 0;
            let magnitude = 0;

            for (let j = 0; j < segment.length - 1; j++) {
                const freq = (j / segment.length) * (sampleRate / 2);
                const mag = Math.abs(segment[j]);
                spectralCentroid += freq * mag;
                magnitude += mag;
            }

            spectralCentroid = magnitude > 0 ? spectralCentroid / magnitude : 0;

            frequencyData.push({
                amplitude: rms,
                frequency: spectralCentroid,
                time: i * segmentDuration
            });
        }

        await audioContext.close();
        return frequencyData;
    } catch (error) {
        console.error('Fehler bei der Audio-Analyse:', error);
        throw error;
    }
};

export const smoothAudioData = (audioData, smoothing) => {
    const smoothedAudio = [...audioData];
    for (let i = 1; i < smoothedAudio.length - 1; i++) {
        smoothedAudio[i].amplitude =
            (audioData[i - 1].amplitude * smoothing +
                audioData[i].amplitude * (1 - 2 * smoothing) +
                audioData[i + 1].amplitude * smoothing);
    }
    return smoothedAudio;
};