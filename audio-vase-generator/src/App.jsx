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

  // NEUER STATE: Lichtmodus Toggle
  const [isRefractionMode, setIsRefractionMode] = useState(false);

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
        baseMaterial = createCoolLampshade(isRefractionMode);
        break;
      case 'amber':
        baseMaterial = createAmberLampshade(isRefractionMode);
        break;
      case 'smoked':
        baseMaterial = createSmokedLampshade(isRefractionMode);
        break;
      default:
        baseMaterial = createWarmLampshade(isRefractionMode);
    }

    // Beleuchtungseinstellungen anwenden
    baseMaterial.envMapIntensity = lightingSettings.envMapIntensity;
    baseMaterial.ior = lightingSettings.ior;
    baseMaterial.transmission = lightingSettings.transmission;

    return baseMaterial;
  }, [lampshadeStyle, lightingSettings, isRefractionMode]);

  const generateVase = useCallback(() => {
    if (!audioData) return;

    const geometry = createVaseGeometry(audioData, settings, perlinNoise.current);
    setVaseGeometry(geometry);
  }, [audioData, settings]);

  return (
    <Layout>
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Kontrollen - Scrollbar */}
        <div className="lg:col-span-1">
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-300/20">
            <AudioUpload
              audioFile={audioFile}
              isAnalyzing={isAnalyzing}
              error={error}
              onFileUpload={analyzeFile}
            />

            {/* NEUER LICHTMODUS TOGGLE */}
            <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                💡 Lichtmodus
              </h2>

              <div className="space-y-4">
                <div className="flex items-center justify-between p-4 bg-white/5 rounded-lg border border-white/10">
                  <div className="flex items-center gap-3">
                    <span className="text-2xl">{isRefractionMode ? '🌈' : '🔆'}</span>
                    <div>
                      <div className="text-white font-medium">
                        {isRefractionMode ? 'Lichtbrechungs-Modus' : 'Hell-Modus'}
                      </div>
                      <div className="text-blue-200 text-sm">
                        {isRefractionMode
                          ? 'Spektakuläre Lichtbrechungseffekte'
                          : 'Optimale Sicht auf die Vase'
                        }
                      </div>
                    </div>
                  </div>

                  <button
                    onClick={() => setIsRefractionMode(!isRefractionMode)}
                    className={`relative w-16 h-8 rounded-full transition-all duration-300 ${isRefractionMode
                        ? 'bg-purple-600 shadow-lg shadow-purple-500/50'
                        : 'bg-yellow-500 shadow-lg shadow-yellow-500/50'
                      }`}
                  >
                    <div
                      className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full transition-transform duration-300 ${isRefractionMode ? 'transform translate-x-8' : ''
                        }`}
                    />
                  </button>
                </div>

                <div className="text-xs text-blue-200 space-y-1">
                  <p><strong>Hell-Modus:</strong> Normale Beleuchtung, perfekt zum Betrachten der Vasenform</p>
                  <p><strong>Lichtbrechungs-Modus:</strong> Dunkle Szene mit Bodenlichtern für Glaseffekte</p>
                </div>
              </div>
            </div>

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
        </div>

        {/* 3D Vorschau */}
        <div className="lg:col-span-2">
          <VasePreview
            geometry={vaseGeometry}
            material={getMaterial()}
            lightingSettings={lightingSettings}
            isRefractionMode={isRefractionMode}
          />
        </div>
      </div>

      {/* Info - Aktualisiert */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-3">✨ Dualer Beleuchtungsmodus</h3>
        <div className="text-blue-200 space-y-2">
          <p>🔆 <strong>Hell-Modus:</strong> Optimale Beleuchtung zum Betrachten und Anpassen der Vasenform</p>
          <p>🌈 <strong>Lichtbrechungs-Modus:</strong> Spektakuläre Lichteffekte mit Bodenbeleuchtung</p>
          <p>💎 Realistische Lichtbrechung mit Environment-Mapping und mehreren Lichtquellen</p>
          <p>🎛️ Vollständige Kontrolle über Brechungsindex, Transmission und Umgebungslicht</p>
          <p>🎨 4 Materialstile: Warm, Kühl, Bernstein und Rauchglas</p>
          <p>🔄 Echtzeit-Animation der Lichtquellen für lebendige Brechungseffekte</p>
        </div>
      </div>
    </Layout>
  );
};

export default App;