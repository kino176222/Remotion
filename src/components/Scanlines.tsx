import React from 'react';
import { AbsoluteFill } from 'remotion';

export const Scanlines: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                background:
                    'linear-gradient(to bottom, rgba(255,255,255,0), rgba(255,255,255,0) 50%, rgba(0,0,0,0.2) 50%, rgba(0,0,0,0.2))',
                backgroundSize: '100% 4px',
                pointerEvents: 'none',
                mixBlendMode: 'overlay', // or multiply
            }}
        />
    );
};
