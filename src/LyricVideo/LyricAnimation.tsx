import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig, Easing } from 'remotion';
import { z } from 'zod';

export const lyricAnimationSchema = z.object({
    text: z.string(),
    startFrame: z.number(),
    durationInFrames: z.number(),
});

export const LyricAnimation: React.FC<z.infer<typeof lyricAnimationSchema>> = ({
    text,
    startFrame,
    durationInFrames,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();

    // Calculate relative frame (assuming component is always present but animation triggers at startFrame)
    // If this component is put in a <Sequence>, frame starts at 0. 
    // But user asked for startFrame prop, so likely AbsoluteFill usage.
    const relativeFrame = frame - startFrame;

    // 1. Enter Animation (0 -> 1 sec approx)
    // Slide Up (50px -> 0px) + Fade In
    const enterDuration = 30;
    const enterProgress = interpolate(relativeFrame, [0, enterDuration], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.cubic),
    });

    const enterOpacity = interpolate(enterProgress, [0, 1], [0, 1]);
    const enterTranslateY = interpolate(enterProgress, [0, 1], [50, 0]);

    // 2. Idle Animation (Continuous Sine Wave)
    // Bobbing up and down slightly
    // Phase shift based on startFrame to look natural if multiple texts exist
    const bobbingFrequency = 0.05;
    const bobbingAmplitude = 10;
    // Only apply bobbing after enter? Or always? Always is smoother transition.
    // But during enter, we want clear slide up. 
    // Let's add it on top.
    const bobbingY = Math.sin(frame * bobbingFrequency) * bobbingAmplitude;

    // 3. Exit Animation (Last 1 sec)
    // Blur + Float Up + Fade Out
    const exitDuration = 45;
    const exitStartFrame = durationInFrames - exitDuration;
    const exitProgress = interpolate(relativeFrame, [exitStartFrame, durationInFrames], [0, 1], {
        extrapolateLeft: 'clamp',
        extrapolateRight: 'clamp',
        easing: Easing.out(Easing.quad), // Accelerate up
    });

    const exitOpacity = interpolate(exitProgress, [0, 1], [1, 0]);
    const exitTranslateY = interpolate(exitProgress, [0, 1], [0, -100]); // Move up further
    const exitBlur = interpolate(exitProgress, [0, 1], [0, 20]); // Blur out

    // Combine values
    // Opacity: Min of Enter and Exit (so it fades out properly even if overlapping logic)
    const opacity = Math.min(enterOpacity, exitOpacity);

    // Y Position: Enter + Exit + Bobbing
    // Note: transform is additive in logic, but standard CSS transform replaces.
    // We sum the Y values.
    const translateY = enterTranslateY + exitTranslateY + bobbingY;

    // Blur: Only from exit (enter is clean)
    const filter = `blur(${exitBlur}px)`;

    // If before start or after end, hide (optimization)
    // Actually, opacity 0 handles it, but return null is safer
    if (relativeFrame < 0 || relativeFrame > durationInFrames) {
        // Option: return null to visually remove, or keep invisible
        return null;
    }

    return (
        <div
            style={{
                position: 'absolute',
                width: '100%',
                top: '45%', // Center vertical roughly
                textAlign: 'center',
                fontSize: 80,
                fontFamily: "'A P-OTF しまなみ StdN', 'Zen Dots', sans-serif",
                fontWeight: 'bold',
                color: 'white',
                // Cyberpunk glow for consistency
                textShadow: '0 0 15px rgba(0, 243, 255, 0.5)',
                opacity,
                transform: `translateY(${translateY}px)`,
                filter,
                willChange: 'transform, opacity, filter',
            }}
        >
            {text}
        </div>
    );
};
