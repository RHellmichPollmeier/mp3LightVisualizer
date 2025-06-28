import React from 'react';

const Layout = ({ children }) => {
    return (
        <div className="min-h-screen p-6" style={{ backgroundColor: '#4a756b' }}>
            <div className="max-w-7xl mx-auto">
                <h1 className="text-4xl font-bold text-white mb-8 text-center">
                    Audio-Leuchten-Generator für 3D-Druck
                </h1>
                {children}
            </div>
        </div>
    );
};

export default Layout;