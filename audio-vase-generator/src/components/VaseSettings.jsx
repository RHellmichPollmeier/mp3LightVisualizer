import React from 'react';
import { Settings, Waves, Target, Printer } from 'lucide-react';

const VaseSettings = ({ settings, onChange }) => {
    const handleChange = (key, value) => {
        onChange(prev => ({ ...prev, [key]: value }));
    };

    const handleWaveChange = (key, value) => {
        onChange(prev => ({
            ...prev,
            wavePattern: {
                ...prev.wavePattern,
                [key]: value
            }
        }));
    };

    const handlePrintOptimizationChange = (key, value) => {
        onChange(prev => ({
            ...prev,
            printOptimization: {
                ...prev.printOptimization,
                [key]: value
            }
        }));
    };

    // Smart Presets für 3D-Druck Optimierung
    const applyPrintOptimizationPreset = (presetName) => {
        switch (presetName) {
            case 'perfect':
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 30,
                        audioPreservation: 0.3,
                        smoothingStrength: 0.6,
                        spikeThreshold: 1.5,
                        contourPoints: 6  // SEHR ORGANISCH
                    }
                }));
                break;
            case 'audio':
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 50,
                        audioPreservation: 0.9,
                        smoothingStrength: 0.2,
                        spikeThreshold: 3.0,
                        contourPoints: 12  // AUDIO-DETAILLIERT
                    }
                }));
                break;
            default:
                onChange(prev => ({
                    ...prev,
                    printOptimization: {
                        enabled: true,
                        maxOverhang: 45,
                        audioPreservation: 0.7,
                        smoothingStrength: 0.3,
                        spikeThreshold: 2.0,
                        contourPoints: 8  // AUSGEWOGEN
                    }
                }));
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Leuchte Einstellungen
            </h2>

            <div className="space-y-4 max-h-96 overflow-y-auto">
                

                {/* Basis Geometrie */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Basis Geometrie</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Höhe: {settings.height}
                            </label>
                            <input
                                type="range"
                                min="10"
                                max="50"
                                value={settings.height}
                                onChange={(e) => handleChange('height', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Basis Radius: {settings.baseRadius}
                            </label>
                            <input
                                type="range"
                                min="4"
                                max="15"
                                step="0.5"
                                value={settings.baseRadius}
                                onChange={(e) => handleChange('baseRadius', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Top Radius: {settings.topRadius}
                            </label>
                            <input
                                type="range"
                                min="2"
                                max="12"
                                step="0.5"
                                value={settings.topRadius}
                                onChange={(e) => handleChange('topRadius', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* LAMELLEN SEKTION */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        Vertikale Lamellen
                    </h3>

                    <div className="space-y-3">
                        {/* Lamellen Ein/Aus */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Lamellen aktivieren</div>
                                <div className="text-blue-200 text-sm">Vertikale Rillen von oben nach unten</div>
                            </div>
                            <button
                                onClick={() => handleChange('lamellen', { ...settings.lamellen, enabled: !settings.lamellen?.enabled })}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.lamellen?.enabled
                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                                    : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.lamellen?.enabled ? 'transform translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.lamellen?.enabled && (
                            <>
                                {/* Lamellen-Anzahl */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Anzahl Lamellen: {settings.lamellen?.count || 24}
                                    </label>
                                    <input
                                        type="range"
                                        min="8"
                                        max="64"
                                        step="4"
                                        value={settings.lamellen?.count || 24}
                                        onChange={(e) => handleChange('lamellen', { ...settings.lamellen, count: Number(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>

                                {/* Lamellen-Tiefe */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Lamellen-Tiefe: {(settings.lamellen?.depth || 0.6).toFixed(1)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.2"
                                        max="2.0"
                                        step="0.1"
                                        value={settings.lamellen?.depth || 0.6}
                                        onChange={(e) => handleChange('lamellen', { ...settings.lamellen, depth: Number(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>

                                {/* NEUE LAMELLEN-BREITE */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Lamellen-Breite: {Math.round((settings.lamellen?.width || 0.5) * 100)}%
                                        <span className="text-xs text-blue-300 ml-2">
                                            ({(settings.lamellen?.width || 0.5) <= 0.3 ? 'Schmale Rillen' :
                                                (settings.lamellen?.width || 0.5) <= 0.7 ? 'Ausgewogene Rillen' : 'Breite Rillen'})
                                        </span>
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="0.9"
                                        step="0.05"
                                        value={settings.lamellen?.width || 0.5}
                                        onChange={(e) => handleChange('lamellen', { ...settings.lamellen, width: Number(e.target.value) })}
                                        className="w-full"
                                    />
                                </div>

                                {/* Lamellen Presets */}
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <button
                                        onClick={() => handleChange('lamellen', { enabled: true, count: 16, depth: 0.4, width: 0.3 })}
                                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🪴 Subtil<br />16 × 0.4 × 30%
                                    </button>
                                    <button
                                        onClick={() => handleChange('lamellen', { enabled: true, count: 24, depth: 0.6, width: 0.5 })}
                                        className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🏺 Klassisch<br />24 × 0.6 × 50%
                                    </button>
                                    <button
                                        onClick={() => handleChange('lamellen', { enabled: true, count: 40, depth: 1.0, width: 0.7 })}
                                        className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        💫 Stark<br />40 × 1.0 × 70%
                                    </button>
                                </div>

                                <div className="text-xs text-blue-200 bg-blue-900/20 rounded p-2">
                                    🏺 <strong>Vertikale Lamellen werden als finale Schicht aufgetragen:</strong><br />
                                    - Vertikale Rillen von oben nach unten entlang der Außenkontur<br />
                                    - Anzahl bestimmt wie viele Rillen um den Umfang verteilt sind<br />
                                    • Tiefe bestimmt wie stark sie hervortreten/eingedrückt sind<br />
                                    • Werden nach allen anderen Effekten angewendet
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* WELLENMUSTER SEKTION */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Waves className="w-4 h-4" />
                        Oberflächenstruktur
                    </h3>

                    <div className="space-y-3">
                        {/* Wellenmuster Ein/Aus */}
                        <div className="flex items-center justify-between p-3 bg-white/5 rounded-lg border border-white/10">
                            <div>
                                <div className="text-white font-medium">Wellenmuster</div>
                                <div className="text-blue-200 text-sm">Spiralförmige Oberflächenrillen</div>
                            </div>
                            <button
                                onClick={() => handleWaveChange('enabled', !settings.wavePattern.enabled)}
                                className={`relative w-12 h-6 rounded-full transition-all duration-300 ${settings.wavePattern.enabled
                                    ? 'bg-blue-600 shadow-lg shadow-blue-500/50'
                                    : 'bg-gray-600'
                                    }`}
                            >
                                <div
                                    className={`absolute top-1 left-1 w-4 h-4 bg-white rounded-full transition-transform duration-300 ${settings.wavePattern.enabled ? 'transform translate-x-6' : ''
                                        }`}
                                />
                            </button>
                        </div>

                        {settings.wavePattern.enabled && (
                            <>
                                {/* Wellenmuster-Typ */}
                                <div>
                                    <label className="block text-white text-sm mb-2">Mustertyp</label>
                                    <div className="grid grid-cols-2 gap-2">
                                        {[
                                            { id: 'spiral', name: '🌀 Spiral', desc: 'Wie im Bild' },
                                            { id: 'vertical', name: '📏 Vertikal', desc: 'Gerade Linien' },
                                            { id: 'horizontal', name: '〰️ Horizontal', desc: 'Ringe' },
                                            { id: 'diamond', name: '💠 Diamant', desc: 'Rautenmuster' }
                                        ].map(type => (
                                            <button
                                                key={type.id}
                                                onClick={() => handleWaveChange('type', type.id)}
                                                className={`p-2 rounded text-xs transition-all ${settings.wavePattern.type === type.id
                                                    ? 'bg-blue-600/50 border border-blue-400 text-white'
                                                    : 'bg-white/10 border border-white/20 text-blue-200 hover:bg-white/20'
                                                    }`}
                                            >
                                                <div className="font-medium">{type.name}</div>
                                                <div className="text-xs opacity-80">{type.desc}</div>
                                            </button>
                                        ))}
                                    </div>
                                </div>

                                {/* Wellenstärke */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Wellenstärke: {settings.wavePattern.amplitude.toFixed(2)}
                                    </label>
                                    <input
                                        type="range"
                                        min="0.1"
                                        max="1.5"
                                        step="0.05"
                                        value={settings.wavePattern.amplitude}
                                        onChange={(e) => handleWaveChange('amplitude', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Wellenfrequenz */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Wellenfrequenz: {settings.wavePattern.frequency}
                                    </label>
                                    <input
                                        type="range"
                                        min="2"
                                        max="20"
                                        step="1"
                                        value={settings.wavePattern.frequency}
                                        onChange={(e) => handleWaveChange('frequency', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Spiral-spezifische Einstellungen */}
                                {settings.wavePattern.type === 'spiral' && (
                                    <div>
                                        <label className="block text-white text-sm mb-2">
                                            Spiral Windungen: {settings.wavePattern.spiralTurns}
                                        </label>
                                        <input
                                            type="range"
                                            min="1"
                                            max="8"
                                            step="0.5"
                                            value={settings.wavePattern.spiralTurns}
                                            onChange={(e) => handleWaveChange('spiralTurns', Number(e.target.value))}
                                            className="w-full"
                                        />
                                    </div>
                                )}

                                {/* Phasenverschiebung */}
                                <div>
                                    <label className="block text-white text-sm mb-2">
                                        Phasenverschiebung: {settings.wavePattern.phase.toFixed(1)}°
                                    </label>
                                    <input
                                        type="range"
                                        min="0"
                                        max="360"
                                        step="10"
                                        value={settings.wavePattern.phase}
                                        onChange={(e) => handleWaveChange('phase', Number(e.target.value))}
                                        className="w-full"
                                    />
                                </div>

                                {/* Wellenmuster Presets */}
                                <div className="grid grid-cols-3 gap-2 mt-4">
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'spiral',
                                                amplitude: 0.4,
                                                frequency: 12,
                                                spiralTurns: 3,
                                                phase: 0,
                                                lamellenDepth: 0.6
                                            }
                                        }))}
                                        className="p-2 bg-yellow-600/30 hover:bg-yellow-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🏺 Klassisch
                                    </button>
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'lamellen',
                                                amplitude: 0.4,
                                                frequency: 24,         // Mehr Rillen für feinere Struktur
                                                spiralTurns: 3,
                                                phase: 0,
                                                lamellenDepth: 0.8
                                            }
                                        }))}
                                        className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        🏺 Lamellen
                                    </button>
                                    <button
                                        onClick={() => handleWaveChange('enabled', true) || onChange(prev => ({
                                            ...prev,
                                            wavePattern: {
                                                enabled: true,
                                                type: 'spiral',
                                                amplitude: 0.6,
                                                frequency: 16,
                                                spiralTurns: 5,
                                                phase: 45,
                                                lamellenDepth: 0.6
                                            }
                                        }))}
                                        className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-xs transition-colors"
                                    >
                                        💫 Dynamisch
                                    </button>
                                </div>
                            </>
                        )}
                    </div>
                </div>

                {/* Audio Einfluss */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Hybrid Audio-Pipeline</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Audio-Verstärkung: {settings.amplification}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="8"
                                step="0.2"
                                value={settings.amplification}
                                onChange={(e) => handleChange('amplification', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Kontrollpunkte: {settings.controlPoints || 12}
                            </label>
                            <input
                                type="range"
                                min="6"
                                max="20"
                                step="2"
                                value={settings.controlPoints || 12}
                                onChange={(e) => handleChange('controlPoints', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Organische Intensität: {settings.organicIntensity || 1.2}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="0.1"
                                value={settings.organicIntensity || 1.2}
                                onChange={(e) => handleChange('organicIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-3 gap-2 mt-4">
                        <button
                            onClick={() => {
                                handleChange('amplification', 2.0);
                                handleChange('controlPoints', 8);
                                handleChange('organicIntensity', 0.8);
                            }}
                            className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                        >
                            🎵 Musikalisch<br />Audio-fokussiert
                        </button>
                        <button
                            onClick={() => {
                                handleChange('amplification', 3.0);
                                handleChange('controlPoints', 12);
                                handleChange('organicIntensity', 1.2);
                            }}
                            className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                        >
                            ⚖️ Ausgewogen<br />Standard
                        </button>
                        <button
                            onClick={() => {
                                handleChange('amplification', 4.0);
                                handleChange('controlPoints', 16);
                                handleChange('organicIntensity', 2.0);
                            }}
                            className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                        >
                            🌿 Organisch<br />Handwerklich
                        </button>
                    </div>
                </div>

                {/* Organische Formen */}
                {/* <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3">Organische Formen</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Noise Intensität: {settings.noiseIntensity}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="3"
                                step="0.1"
                                value={settings.noiseIntensity}
                                onChange={(e) => handleChange('noiseIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Organische Komplexität: {settings.organicComplexity || 1}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={settings.organicComplexity || 1}
                                onChange={(e) => handleChange('organicComplexity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Vertikale Verzerrung: {settings.verticalDistortion || 0.5}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={settings.verticalDistortion || 0.5}
                                onChange={(e) => handleChange('verticalDistortion', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div> */}

                {/* Qualität */}
                <div>
                    <h3 className="text-white font-medium mb-3">Qualität</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Segmente: {settings.segments}
                            </label>
                            <input
                                type="range"
                                min="16"
                                max="128"
                                step="8"
                                value={settings.segments}
                                onChange={(e) => handleChange('segments', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Höhen-Segmente: {settings.heightSegments}
                            </label>
                            <input
                                type="range"
                                min="50"
                                max="200"
                                step="10"
                                value={settings.heightSegments}
                                onChange={(e) => handleChange('heightSegments', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default VaseSettings;