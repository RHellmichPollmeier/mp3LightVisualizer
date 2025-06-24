import React from 'react';
import { Lightbulb, Sun, Zap, Layers } from 'lucide-react';

const LightingControls = ({ lightingSettings, onLightingChange }) => {
    const handleChange = (key, value) => {
        onLightingChange(prev => ({ ...prev, [key]: value }));
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Lightbulb className="w-5 h-5" />
                Beleuchtung & Lichtbrechung
            </h2>

            <div className="space-y-4">
                {/* Hauptbeleuchtung */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Sun className="w-4 h-4" />
                        Hauptbeleuchtung
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Intensität: {lightingSettings.keyLightIntensity}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="3"
                                step="0.1"
                                value={lightingSettings.keyLightIntensity}
                                onChange={(e) => handleChange('keyLightIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Farbtemperatur: {lightingSettings.colorTemperature}K
                            </label>
                            <input
                                type="range"
                                min="2000"
                                max="8000"
                                step="100"
                                value={lightingSettings.colorTemperature}
                                onChange={(e) => handleChange('colorTemperature', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* NEUE MATERIALSTÄRKE SEKTION */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Layers className="w-4 h-4" />
                        Materialstärke
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Glasstärke: {lightingSettings.materialThickness}mm
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="8.0"
                                step="0.1"
                                value={lightingSettings.materialThickness}
                                onChange={(e) => handleChange('materialThickness', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Visueller Indikator für Materialstärke */}
                        <div className="grid grid-cols-4 gap-2 text-xs">
                            <div className={`p-2 rounded text-center transition-all ${lightingSettings.materialThickness <= 1.5
                                ? 'bg-blue-600/50 text-white border border-blue-400'
                                : 'bg-blue-600/20 text-blue-300'
                                }`}>
                                Dünn<br />≤1.5mm
                            </div>
                            <div className={`p-2 rounded text-center transition-all ${lightingSettings.materialThickness > 1.5 && lightingSettings.materialThickness <= 3.0
                                ? 'bg-green-600/50 text-white border border-green-400'
                                : 'bg-green-600/20 text-green-300'
                                }`}>
                                Normal<br />1.5-3mm
                            </div>
                            <div className={`p-2 rounded text-center transition-all ${lightingSettings.materialThickness > 3.0 && lightingSettings.materialThickness <= 5.0
                                ? 'bg-orange-600/50 text-white border border-orange-400'
                                : 'bg-orange-600/20 text-orange-300'
                                }`}>
                                Dick<br />3-5mm
                            </div>
                            <div className={`p-2 rounded text-center transition-all ${lightingSettings.materialThickness > 5.0
                                ? 'bg-red-600/50 text-white border border-red-400'
                                : 'bg-red-600/20 text-red-300'
                                }`}>
                                Sehr Dick<br />{`>`}5mm
                            </div>
                        </div>

                        <div className="text-xs text-blue-200 bg-blue-900/20 rounded p-2">
                            💡 <strong>Materialstärke-Effekte:</strong><br />
                            • <strong>Dünn (0.5-1.5mm):</strong> Klare Durchsicht, wenig Farbverschiebung<br />
                            • <strong>Normal (1.5-3mm):</strong> Ausgewogene Brechung und Transparenz<br />
                            • <strong>Dick (3-5mm):</strong> Starke Brechung, intensivere Farben<br />
                            • <strong>Sehr Dick ({`>`}5mm):</strong> Dramatische Lichteffekte, Prisma-ähnlich
                        </div>
                    </div>
                </div>

                {/* NEUE VOLUMETRISCHE EFFEKTE SEKTION - Nur im Lichtbrechungs-Modus */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Volumetrische Effekte
                        <span className="text-xs bg-purple-600/30 px-2 py-1 rounded">
                            Nur Lichtbrechungs-Modus
                        </span>
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Lichtstrahlen Intensität: {lightingSettings.volumetricIntensity || 0.4}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1.0"
                                step="0.1"
                                value={lightingSettings.volumetricIntensity || 0.4}
                                onChange={(e) => handleChange('volumetricIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Caustic Stärke: {lightingSettings.causticStrength || 0.3}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="0.8"
                                step="0.05"
                                value={lightingSettings.causticStrength || 0.3}
                                onChange={(e) => handleChange('causticStrength', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Lichtpartikel Dichte: {lightingSettings.particleDensity || 0.8}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="1.5"
                                step="0.1"
                                value={lightingSettings.particleDensity || 0.8}
                                onChange={(e) => handleChange('particleDensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        {/* Preset-Buttons für volumetrische Effekte */}
                        <div className="grid grid-cols-2 gap-2">
                            <button
                                onClick={() => {
                                    handleChange('volumetricIntensity', 0.6);
                                    handleChange('causticStrength', 0.5);
                                    handleChange('particleDensity', 1.0);
                                }}
                                className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-xs transition-colors"
                            >
                                🌟 Spektakulär
                            </button>
                            <button
                                onClick={() => {
                                    handleChange('volumetricIntensity', 0.3);
                                    handleChange('causticStrength', 0.2);
                                    handleChange('particleDensity', 0.5);
                                }}
                                className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                            >
                                🌙 Subtil
                            </button>
                        </div>

                        <div className="text-xs text-purple-200 bg-purple-900/20 rounded p-2">
                            ✨ <strong>Volumetrische Effekte:</strong><br />
                            • <strong>Lichtstrahlen:</strong> Sichtbare Lichtkegel durch die Vase<br />
                            • <strong>Caustics:</strong> Realistische Lichtbrechungsmuster am Boden<br />
                            • <strong>Lichtpartikel:</strong> Schwebende "Staub"-Teilchen im Licht<br />
                            <strong>💡 Tipp:</strong> Diese Effekte sind nur im Lichtbrechungs-Modus sichtbar
                        </div>
                    </div>
                </div>

                {/* Lichtbrechung */}
                <div className="border-b border-white/20 pb-4">
                    <h3 className="text-white font-medium mb-3 flex items-center gap-2">
                        <Zap className="w-4 h-4" />
                        Lichtbrechung
                    </h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Environment Stärke: {lightingSettings.envMapIntensity}
                            </label>
                            <input
                                type="range"
                                min="0.5"
                                max="4"
                                step="0.1"
                                value={lightingSettings.envMapIntensity}
                                onChange={(e) => handleChange('envMapIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Brechungsindex (IOR): {lightingSettings.ior}
                            </label>
                            <input
                                type="range"
                                min="1.0"
                                max="2.5"
                                step="0.05"
                                value={lightingSettings.ior}
                                onChange={(e) => handleChange('ior', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Transmission: {lightingSettings.transmission}
                            </label>
                            <input
                                type="range"
                                min="0.7"
                                max="1.0"
                                step="0.01"
                                value={lightingSettings.transmission}
                                onChange={(e) => handleChange('transmission', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>

                {/* Atmosphäre */}
                <div>
                    <h3 className="text-white font-medium mb-3">Atmosphäre</h3>

                    <div className="space-y-3">
                        <div>
                            <label className="block text-white text-sm mb-2">
                                Ambient Licht: {lightingSettings.ambientIntensity}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="0.5"
                                step="0.05"
                                value={lightingSettings.ambientIntensity}
                                onChange={(e) => handleChange('ambientIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Licht Animation: {lightingSettings.animationSpeed}
                            </label>
                            <input
                                type="range"
                                min="0"
                                max="2"
                                step="0.1"
                                value={lightingSettings.animationSpeed}
                                onChange={(e) => handleChange('animationSpeed', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>

                        <div>
                            <label className="block text-white text-sm mb-2">
                                Schatten Intensität: {lightingSettings.shadowIntensity}
                            </label>
                            <input
                                type="range"
                                min="0.1"
                                max="1"
                                step="0.1"
                                value={lightingSettings.shadowIntensity}
                                onChange={(e) => handleChange('shadowIntensity', Number(e.target.value))}
                                className="w-full"
                            />
                        </div>
                    </div>
                </div>
            </div>

            {/* Voreinstellungen - ERWEITERT mit Materialstärke und volumetrischen Effekten */}
            <div className="mt-6 pt-4 border-t border-white/20">
                <h3 className="text-white font-medium mb-3">Beleuchtungs-Presets</h3>
                <div className="grid grid-cols-2 gap-2">
                    <button
                        onClick={() => onLightingChange({
                            keyLightIntensity: 1.2,
                            colorTemperature: 3000,
                            envMapIntensity: 2.0,
                            ior: 1.45,
                            transmission: 0.95,
                            ambientIntensity: 0.15,
                            animationSpeed: 1.0,
                            shadowIntensity: 0.7,
                            materialThickness: 1.8,  // Warmes, mittleres Glas
                            volumetricIntensity: 0.4,
                            causticStrength: 0.3,
                            particleDensity: 0.8
                        })}
                        className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-sm transition-colors"
                    >
                        🔥 Warm
                    </button>
                    <button
                        onClick={() => onLightingChange({
                            keyLightIntensity: 1.5,
                            colorTemperature: 6500,
                            envMapIntensity: 2.5,
                            ior: 1.5,
                            transmission: 0.96,
                            ambientIntensity: 0.1,
                            animationSpeed: 0.5,
                            shadowIntensity: 0.9,
                            materialThickness: 1.2,  // Dünnes, klares Glas
                            volumetricIntensity: 0.5,
                            causticStrength: 0.4,
                            particleDensity: 0.6
                        })}
                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-sm transition-colors"
                    >
                        ❄️ Kühl
                    </button>
                    <button
                        onClick={() => onLightingChange({
                            keyLightIntensity: 2.0,
                            colorTemperature: 4000,
                            envMapIntensity: 3.0,
                            ior: 1.6,
                            transmission: 0.9,
                            ambientIntensity: 0.05,
                            animationSpeed: 1.5,
                            shadowIntensity: 1.0,
                            materialThickness: 4.5,  // Dickes, dramatisches Glas
                            volumetricIntensity: 0.7,
                            causticStrength: 0.6,
                            particleDensity: 1.2
                        })}
                        className="p-2 bg-purple-600/30 hover:bg-purple-600/50 rounded text-white text-sm transition-colors"
                    >
                        ⭐ Dramatisch
                    </button>
                    <button
                        onClick={() => onLightingChange({
                            keyLightIntensity: 0.8,
                            colorTemperature: 5000,
                            envMapIntensity: 1.5,
                            ior: 1.4,
                            transmission: 0.93,
                            ambientIntensity: 0.25,
                            animationSpeed: 0.3,
                            shadowIntensity: 0.5,
                            materialThickness: 2.2,  // Sanftes, ausgewogenes Glas
                            volumetricIntensity: 0.2,
                            causticStrength: 0.2,
                            particleDensity: 0.4
                        })}
                        className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-sm transition-colors"
                    >
                        🌿 Sanft
                    </button>
                </div>
            </div>

            {/* NEUE MATERIALSTÄRKE SCHNELLWAHL */}
            <div className="mt-4 pt-4 border-t border-white/20">
                <h3 className="text-white font-medium mb-3">Materialstärke Schnellwahl</h3>
                <div className="grid grid-cols-4 gap-2">
                    <button
                        onClick={() => handleChange('materialThickness', 0.8)}
                        className="p-2 bg-blue-600/30 hover:bg-blue-600/50 rounded text-white text-xs transition-colors"
                    >
                        🪟 Hauchzart<br />0.8mm
                    </button>
                    <button
                        onClick={() => handleChange('materialThickness', 1.8)}
                        className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-xs transition-colors"
                    >
                        🥃 Klassisch<br />1.8mm
                    </button>
                    <button
                        onClick={() => handleChange('materialThickness', 3.5)}
                        className="p-2 bg-orange-600/30 hover:bg-orange-600/50 rounded text-white text-xs transition-colors"
                    >
                        🧊 Robust<br />3.5mm
                    </button>
                    <button
                        onClick={() => handleChange('materialThickness', 6.0)}
                        className="p-2 bg-red-600/30 hover:bg-red-600/50 rounded text-white text-xs transition-colors"
                    >
                        💎 Kristall<br />6.0mm
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LightingControls;