import React from 'react';
import { Lightbulb, Sun, Zap } from 'lucide-react';

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

            {/* Voreinstellungen */}
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
                            shadowIntensity: 0.7
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
                            shadowIntensity: 0.9
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
                            shadowIntensity: 1.0
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
                            shadowIntensity: 0.5
                        })}
                        className="p-2 bg-green-600/30 hover:bg-green-600/50 rounded text-white text-sm transition-colors"
                    >
                        🌿 Sanft
                    </button>
                </div>
            </div>
        </div>
    );
};

export default LightingControls;