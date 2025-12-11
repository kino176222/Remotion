import React from 'react';
import { AbsoluteFill } from 'remotion';

export const RGBSplit: React.FC<{
    children: React.ReactNode;
    offset?: number;
}> = ({ children, offset = 3 }) => {
    return (
        <div style={{ position: 'relative', display: 'inline-block' }}>
            {/* Red Channel */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: -offset,
                    width: '100%',
                    height: '100%',
                    color: 'red',
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    opacity: 0.8,
                }}
            >
                {children}
            </div>

            {/* Blue Channel */}
            <div
                style={{
                    position: 'absolute',
                    top: 0,
                    left: offset,
                    width: '100%',
                    height: '100%',
                    color: 'blue',
                    mixBlendMode: 'screen',
                    pointerEvents: 'none',
                    opacity: 0.8,
                }}
            >
                {children}
            </div>

            {/* Main Content (Green/Normal) */}
            <div style={{ position: 'relative', mixBlendMode: 'normal' }}>
                {children}
            </div>
        </div>
    );
};
