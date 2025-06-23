import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout.jsx';
import AudioUpload from './components/AudioUpload.jsx';
import VaseSettings from './components/VaseSettings.jsx';
import VasePreview from './components/VasePreview.jsx';
import ExportControls from './components/ExportControls.jsx';
import LampshadeStyleSelector from './components/LampshadeStyleSelector.jsx';
import { useAudioAnalysis } from './hooks/useAudioAnalysis.js';
import {
  createVaseGeometry,
  createVaseMaterial,
  createWarmLampshade,
  createCoolLampshade,
  createAmberLampshade,
  createSmokedLampshade
} from './mesh/vaseGeometry.js';
import { PerlinNoise } from './utils/perlinNoise.js';

const App = () => {
  const { audioFile, audioData, isAnalyzing, error, analyzeFile } = useAudioAnalysis();
  const [vaseGeometry, setVaseGeometry] = useState(null);
  const [lampshadeStyle, setLampshadeStyle] = useState('warm');
  const [settings, setSettings] = useState({
    height: 20,
    baseRadius: 8,
    topRadius: 6,
    segments: 64,
    heightSegments: 100,
    amplification: 3,
    noiseIntensity: 1.2,
    smoothing: 0.2,
    frequencyInfluence: 1.5,
    organicComplexity: 1.3,
    verticalDistortion: 0.8
  });

  const perlinNoise = useRef(new PerlinNoise());

  // Material basierend auf Stil erstellen
  const getMaterial = useCallback(() => {
    switch (lampshadeStyle) {
      case 'cool':
        return createCoolLampshade();
      case 'amber':
        return createAmberLampshade();
      case 'smoked':
        return createSmokedLampshade();
      default:
        return createWarmLampshade();
    }
  }, [lampshadeStyle]);

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

          <LampshadeStyleSelector
            selectedStyle={lampshadeStyle}
            onStyleChange={setLampshadeStyle}
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
            material={getMaterial()}
          />
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-3">💡 Lampenschirm Vorschau</h3>
        <div className="text-blue-200 space-y-2">
          <p>✨ Die Vase wird jetzt als durchsichtiger Lampenschirm mit warmem Innenlicht dargestellt</p>
          <p>🎨 Wählen Sie verschiedene Glasstile aus: Warm, Kühl, Bernstein oder Rauchglas</p>
          <p>🌊 Die organischen Formen entstehen durch Ihre Audio-Daten kombiniert mit Perlin Noise</p>
          <p>🖨️ Das Ergebnis kann direkt als STL für den 3D-Druck exportiert werden</p>
        </div>
      </div>
    </Layout>
  );
};

export default App;