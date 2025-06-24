import React, { useState, useRef, useCallback } from 'react';
import Layout from './components/Layout.jsx';
import AudioUpload from './components/AudioUpload.jsx';
import VaseSettings from './components/VaseSettings.jsx';
import VasePreview from './components/VasePreview.jsx';
import ExportControls from './components/ExportControls.jsx';
import LampshadeStyleSelector from './components/LampshadeStyleSelector.jsx';
import LightingControls from './components/LightingControls.jsx';
import BaseUpload from './components/BaseUpload.jsx';
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

  // TAB-SYSTEM - ERWEITERT auf 3 Tabs
  const [activeTab, setActiveTab] = useState('upload'); // 'upload', 'lighting', 'vase'

  // NEUER STATE: STL-Sockel
  const [baseSTL, setBaseSTL] = useState(null);
  const [baseGeometry, setBaseGeometry] = useState(null);
  const [basePlacementPosition, setBasePlacementPosition] = useState({ x: 0, z: 0 });

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
    verticalDistortion: 0.8,
    // NEUE WELLENMUSTER-EINSTELLUNGEN
    wavePattern: {
      enabled: true,
      type: 'spiral',        // 'spiral', 'vertical', 'horizontal', 'diamond'
      amplitude: 0.4,        // Stärke der Wellen
      frequency: 12,         // Anzahl der Wellen
      spiralTurns: 3.0,      // Spiralwindungen (nur für Spiral-Typ)
      phase: 0               // Phasenverschiebung in Grad
    }
  });

  const [lightingSettings, setLightingSettings] = useState({
    keyLightIntensity: 1.2,
    colorTemperature: 3000,
    envMapIntensity: 2.0,
    ior: 1.45,
    transmission: 0.95,
    ambientIntensity: 0.15,
    animationSpeed: 1.0,
    shadowIntensity: 0.7,
    materialThickness: 1.5,  // NEUE MATERIALSTÄRKE
    // NEUE VOLUMETRISCHE PARAMETER
    volumetricIntensity: 0.4,
    causticStrength: 0.3,
    particleDensity: 0.8,
    // Y-POSITION der Innenbeleuchtung
    innerLightY: 0.33  // 0 = Boden, 1 = Top, 0.33 = 1/3 von unten
  });

  const perlinNoise = useRef(new PerlinNoise());

  // Material basierend auf Stil und Beleuchtungseinstellungen erstellen
  const getMaterial = useCallback(() => {
    let baseMaterial;
    switch (lampshadeStyle) {
      case 'cool':
        baseMaterial = createCoolLampshade(isRefractionMode, lightingSettings.materialThickness);
        break;
      case 'amber':
        baseMaterial = createAmberLampshade(isRefractionMode, lightingSettings.materialThickness);
        break;
      case 'smoked':
        baseMaterial = createSmokedLampshade(isRefractionMode, lightingSettings.materialThickness);
        break;
      default:
        baseMaterial = createWarmLampshade(isRefractionMode, lightingSettings.materialThickness);
    }

    // Beleuchtungseinstellungen anwenden
    baseMaterial.envMapIntensity = lightingSettings.envMapIntensity;
    baseMaterial.ior = lightingSettings.ior;
    baseMaterial.transmission = lightingSettings.transmission;
    baseMaterial.thickness = lightingSettings.materialThickness; // MATERIALSTÄRKE ANWENDEN

    return baseMaterial;
  }, [lampshadeStyle, lightingSettings, isRefractionMode]);

  const generateVase = useCallback(() => {
    if (!audioData) return;

    const geometry = createVaseGeometry(audioData, settings, perlinNoise.current);
    setVaseGeometry(geometry);
  }, [audioData, settings]);

  return (
    <Layout>
      {/* Export Controls ganz oben */}
      <div className="mb-6">
        <ExportControls
          audioData={audioData}
          geometry={vaseGeometry}
          baseGeometry={baseGeometry}
          vaseSettings={settings}
          onGenerate={generateVase}
        />
      </div>

      {/* NEUES 30/70 LAYOUT */}
      <div className="grid grid-cols-10 gap-6">
        {/* SETTINGS LINKS - 30% */}
        <div className="col-span-3">
          {/* Tab Navigation - 3 Tabs */}
          <div className="flex bg-white/10 rounded-xl p-1 mb-4 border border-white/20">
            <button
              onClick={() => setActiveTab('upload')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'upload'
                ? 'bg-blue-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              📁 Upload
            </button>
            <button
              onClick={() => setActiveTab('lighting')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'lighting'
                ? 'bg-purple-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              💡 Licht
            </button>
            <button
              onClick={() => setActiveTab('vase')}
              className={`flex-1 py-2 px-3 rounded-lg font-medium transition-all text-sm ${activeTab === 'vase'
                ? 'bg-green-600 text-white shadow-lg'
                : 'text-blue-200 hover:text-white hover:bg-white/10'
                }`}
            >
              🏺 Vase
            </button>
          </div>

          {/* Tab Content mit Scrollbar */}
          <div className="max-h-[calc(100vh-12rem)] overflow-y-auto pr-2 space-y-6 scrollbar-thin scrollbar-thumb-blue-600 scrollbar-track-blue-300/20">
            {/* UPLOAD TAB */}
            {activeTab === 'upload' && (
              <>
                <AudioUpload
                  audioFile={audioFile}
                  isAnalyzing={isAnalyzing}
                  error={error}
                  onFileUpload={analyzeFile}
                />

                <BaseUpload
                  baseSTL={baseSTL}
                  baseGeometry={baseGeometry}
                  onSTLUpload={setBaseSTL}
                  onGeometryLoaded={setBaseGeometry}
                  onPlacementChange={setBasePlacementPosition}
                />
              </>
            )}

            {/* LIGHTING TAB */}
            {activeTab === 'lighting' && (
              <>
                {/* LICHTMODUS TOGGLE */}
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
                      <p><strong>Lichtbrechungs-Modus:</strong> Dunkle Szene mit volumetrischen Lichteffekten</p>
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
              </>
            )}

            {/* VASE TAB */}
            {activeTab === 'vase' && (
              <>
                <VaseSettings
                  settings={settings}
                  onChange={setSettings}
                />
              </>
            )}
          </div>
        </div>

        {/* 3D VORSCHAU RECHTS - 70% */}
        <div className="col-span-7">
          <VasePreview
            geometry={vaseGeometry}
            material={getMaterial()}
            lightingSettings={lightingSettings}
            isRefractionMode={isRefractionMode}
            baseGeometry={baseGeometry}
            vaseSettings={settings}
            basePlacementPosition={basePlacementPosition}
          />
        </div>
      </div>

      {/* Info - Aktualisiert mit volumetrischen Effekten */}
      <div className="mt-8 bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
        <h3 className="text-lg font-semibold text-white mb-3">✨ Vollständige Audio-Vase mit Volumetrischen Lichteffekten</h3>
        <div className="text-blue-200 space-y-2">
          <p>🔆 <strong>Hell-Modus:</strong> Optimale Beleuchtung zum Betrachten und Anpassen der Vasenform</p>
          <p>🌈 <strong>Lichtbrechungs-Modus:</strong> Spektakuläre Lichteffekte mit volumetrischen Lichtstrahlen</p>
          <p>🌟 <strong>Volumetrische Lichtstrahlen:</strong> Sichtbare Lichtkegel zeigen den Lichtweg durch die Vase</p>
          <p>✨ <strong>Caustic-Effekte:</strong> Realistische Lichtbrechungsmuster am Boden wie in echten Glasvasen</p>
          <p>💫 <strong>Lichtpartikel:</strong> Schwebende "Staub"-Teilchen machen Lichtstrahlen in der Luft sichtbar</p>
          <p>🏺 <strong>STL-Sockel:</strong> Perfekt passender Sockel - Vase sitzt exakt auf der Oberseite</p>
          <p>🌀 <strong>Spiralwellen:</strong> Elegante gedrehte Rillen wie in handwerklichen Glasvasen</p>
          <p>🧱 <strong>Materialstärke:</strong> Von hauchzartem 0.5mm bis zu massiven 8mm Glas</p>
          <p>🎯 <strong>Y-Position:</strong> Präzise Kontrolle der Innenlicht-Position von Boden bis Spitze</p>
          <p>💎 Realistische Lichtbrechung mit Environment-Mapping und mehreren Lichtquellen</p>
          <p>🎛️ Vollständige Kontrolle über Brechungsindex, Transmission und Glasdicke</p>
          <p>🎨 4 Materialstile + 4 Oberflächenmuster + STL-Sockel für einzigartige Designs</p>
          <p>🔄 Echtzeit-Animation aller Lichteffekte für lebendige Brechungseffekte</p>
          <p>🌊 Physikalisch korrekte Caustics simulieren echte Glaslichtbrechung</p>
          <p>📱 <strong>Neues Layout:</strong> 30% Settings-Panel, 70% 3D-Vorschau für optimale Bedienung</p>
          <p>🔧 <strong>Getrennte Tabs:</strong> Upload, Licht-Einstellungen und Vase-Einstellungen für bessere Organisation</p>
        </div>
      </div>
    </Layout>
  );
};

export default App;