import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout.jsx';
import AudioUpload from './components/AudioUpload.jsx';
import VaseSettings from './components/VaseSettings.jsx';
import VasePreview from './components/VasePreview.jsx';
import ExportControls from './components/ExportControls.jsx';
import { useAudioAnalysis } from './hooks/useAudioAnalysis.js';
import { createVaseGeometry, createVaseMaterial } from './mesh/vaseGeometry.js';
import { PerlinNoise } from './utils/perlinNoise.js';

const App = () => {
  const { audioFile, audioData, isAnalyzing, error, analyzeFile } = useAudioAnalysis();
  const [vaseGeometry, setVaseGeometry] = useState(null);
  const [vaseMaterial] = useState(createVaseMaterial());
  const [settings, setSettings] = useState({
    height: 20,
    baseRadius: 8,
    topRadius: 6,
    segments: 64,
    heightSegments: 100,
    amplification: 2,
    noiseScale: 0.1,
    noiseIntensity: 0.5,
    smoothing: 0.3
  });

  const perlinNoise = useRef(new PerlinNoise());

  const generateVase = useCallback(() => {
    if (!audioData) return;

    const geometry = createVaseGeometry(audioData, settings, perlinNoise.current);
    setVaseGeometry(geometry);
  }, [audioData, settings]);

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrollen */}
        <div className="lg:col-span-1 space-y-6">
          <AudioUpload
            audioFile={audioFile}
            isAnalyzing={isAnalyzing}
            error={error}
            onFileUpload={analyzeFile}
          />

          <VaseSettings
            settings={settings}
            onChange={setSettings}
          />

          <ExportControls
            audioData={audioData}
            geometry={vaseGeometry}
            onGenerate={generateVase}
          />
        </div>

        {/* 3D Vorschau */}
        <div className="lg:col-span-2">
          <VasePreview
            geometry={vaseGeometry}
            material={vaseMaterial}
          />
        </div>
      </div>
    </Layout>
  );
};

export default App;