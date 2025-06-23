import React from 'react';
import { Palette } from 'lucide-react';

const LampshadeStyleSelector = ({ selectedStyle, onStyleChange }) => {
    const styles = [
        {
            id: 'warm',
            name: 'Warmes Glas',
            color: '#fff8e1',
            description: 'Cremeweiß mit warmem Leuchten'
        },
        {
            id: 'cool',
            name: 'Kühles Glas',
            color: '#e3f2fd',
            description: 'Bläulich-weiß, modern'
        },
        {
            id: 'amber',
            name: 'Bernstein',
            color: '#ffc107',
            description: 'Goldgelb, gemütlich'
        },
        {
            id: 'smoked',
            name: 'Rauchglas',
            color: '#795548',
            description: 'Dunkel, elegant'
        }
    ];

    return (
        <div className="bg-white/10 backdrop-blur-sm rounded-xl p-6 border border-white/20">
            <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Palette className="w-5 h-5" />
                Lampenschirm Stil
            </h2>

            <div className="grid grid-cols-2 gap-3">
                {styles.map((style) => (
                    <button
                        key={style.id}
                        onClick={() => onStyleChange(style.id)}
                        className={`p-3 rounded-lg border-2 transition-all ${selectedStyle === style.id
                                ? 'border-blue-400 bg-blue-500/20'
                                : 'border-white/30 bg-white/10 hover:bg-white/20'
                            }`}
                    >
                        <div className="flex items-center gap-2 mb-2">
                            <div
                                className="w-4 h-4 rounded-full border border-white/50"
                                style={{ backgroundColor: style.color }}
                            />
                            <span className="text-white font-medium text-sm">{style.name}</span>
                        </div>
                        <p className="text-blue-200 text-xs text-left">{style.description}</p>
                    </button>
                ))}
            </div>
        </div>
    );
};

export default LampshadeStyleSelector;