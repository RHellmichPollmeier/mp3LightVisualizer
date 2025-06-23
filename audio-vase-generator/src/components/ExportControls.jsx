import React from 'react';
import { Download, RotateCcw } from 'lucide-react';
import { exportSTL } from '../utils/stlExport.js';

const ExportControls = ({ audioData, geometry, onGenerate }) => {
    const handleExport = () => {
        if (geometry) {
            exportSTL(geometry);
        }
    };

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <div className="space-y-3">
                <button
                    onClick={onGenerate}
                    disabled={!audioData}
                    className="w-full bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <RotateCcw className="w-4 h-4" />
                    Vase Generieren
                </button>

                <button
                    onClick={handleExport}
                    disabled={!geometry}
                    className="w-full bg-green-600 hover:bg-green-700 disabled:bg-gray-600 text-white py-3 px-4 rounded-lg font-medium transition-colors flex items-center justify-center gap-2"
                >
                    <Download className="w-4 h-4" />
                    STL Exportieren
                </button>
            </div>

            <div className="mt-4 text-sm text-blue-200">
                <p className="mb-2 font-medium">Verwendung:</p>
                <p>1. MP3-Datei hochladen</p>
                <p>2. Einstellungen anpassen</p>
                <p>3. Vase generieren</p>
                <p>4. STL für 3D-Druck exportieren</p>
            </div>
        </div>
    );
};

export default ExportControls;
