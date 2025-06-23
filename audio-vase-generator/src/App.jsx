import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout.jsx';
import AudioUpload from './components/AudioUpload.jsx';
import VaseSettings from './components/VaseSettings.jsx';
import VasePreview from './components/VasePreview.jsx';
import ExportControls from './components/ExportControls.jsx';
import LampshadeStyleSelector from './components/LampshadeStyleSelector.jsx';
import LightingControls from './components/LightingControls.jsx';
import { useAudioAnalysis } from './hooks/useAudioAnalysis.js';
import { createVaseGeometry } from './mesh/vaseGeometry.js';
import {
  createWarmLampshade,
  createCoolLampshade,
  createAmberLampshade,
  createSmokedLampshade
} from './hooks/useThreeJS.js';
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

  const [lightingSettings, setLightingSettings] = useState({
    keyLightIntensity: 1.2,
    colorTemperature: 3000,
    envMapIntensity: 2.0,
    ior: 1.45,
    transmission: 0.95,
    ambientIntensity: 0.15,
    animationSpeed: 1.0,
    shadowIntensity: 0.7
  });

  const perlinNoise = useRef(new PerlinNoise());

  // Material basierend auf Stil und Beleuchtungseinstellungen erstellen
  const getMaterial = useCallback(() => {
    let baseMaterial;
    switch (lampshadeStyle) {
      case 'cool':
        baseMaterial = createCoolLampshade();
        break;
      case 'amber':
        baseMaterial = createAmberLampshade();
        break;
      case 'smoked':
        baseMaterial = createSmokedLampshade();
        break;
      default:
        baseMaterial = createWarmLampshade();
    }

    // Beleuchtungseinstellungen anwenden
    baseMaterial.envMapIntensity = lightingSettings.envMapIntensity;
    baseMaterial.ior = lightingSettings.ior;
    baseMaterial.transmission = lightingSettings.transmission;

    return baseMaterial;
  }, [lampshadeStyle, lightingSettings]);

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

          <LightingControls
            lightingSettings={lightingSettings}
            onLightingChange={setLightingSettings}
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
            lightingSettings={lightingSettings}
          />
        </div>
      </div>

      {/* Info */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-3">✨ Erweiterte Lichtbrechung</h3>
        <div className="text-blue-200 space-y-2">
          <p>💎 Realistische Lichtbrechung mit Environment-Mapping und mehreren Lichtquellen</p>
          <p>🌈 Dynamische Beleuchtung mit animierten Point Lights für komplexe Reflexionen</p>
          <p>🎛️ Vollständige Kontrolle über Brechungsindex, Transmission und Umgebungslicht</p>
          <p>🎨 4 Beleuchtungs-Presets: Warm, Kühl, Dramatisch und Sanft</p>
          <p>🔄 Echtzeit-Animation der Lichtquellen für lebendige Brechungseffekte</p>
        </div>
      </div>
    </Layout>
  );
};

export default App;