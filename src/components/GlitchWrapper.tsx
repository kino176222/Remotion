import React from 'react';
import { random, useCurrentFrame, useVideoConfig } from 'remotion';

export const GlitchWrapper: React.FC<{
    children: React.ReactNode;
    intensity?: number;
}> = ({ children, intensity = 15 }) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Create a deterministic random value based on the current frame
    // We only glitch occasionally or constantly depending on desire.
    // Let's make it constantly jitter slightly, with occasional big glitches.

    // Changing seed every frame causes jitter
    const xShift = (random(frame) - 0.5) * intensity;
    const yShift = (random(frame + 1000) - 0.5) * intensity;

    // Occasional skew
    const skewX = random(frame + 2000) > 0.9 ? (random(frame + 3000) - 0.5) * 20 : 0;

    // Opacity flicker
    const opacity = random(frame + 4000) > 0.95 ? 0.5 : 1;

    return (
        <div
            style={{
                transform: `translate(${xShift}px, ${yShift}px) skewX(${skewX}deg)`,
                opacity,
            }}
        >
            {children}
        </div>
    );
};
