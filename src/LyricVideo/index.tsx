
import { AbsoluteFill, Audio, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';
import { getCurrentLine, parseLrc } from '../utils/lrc-parser';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

export const lyricVideoSchema = z.object({
    audioSrc: z.string(),
    lrcContent: z.string().optional(),
    lrcSrc: z.string().optional(),
    backgroundColor: z.string().describe('Base background color'),
    textColor: z.string().describe('Main text color (Primary)'),
    baseFontSize: z.number().describe('Base font size (px)'),
});

import { GlitchWrapper } from '../components/GlitchWrapper';
import { RGBSplit } from '../components/RGBSplit';
import { Scanlines } from '../components/Scanlines';

export const LyricVideo: React.FC<z.infer<typeof lyricVideoSchema>> = ({
    audioSrc,
    lrcContent: initialContent,
    lrcSrc,
    backgroundColor = '#0a0a0a',
    textColor = '#00f3ff',
    baseFontSize = 80,
}) => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const currentTime = frame / fps;

    const [handle] = useState(() => delayRender());
    const [fetchedContent, setFetchedContent] = useState<string | null>(null);

    useEffect(() => {
        if (initialContent) {
            continueRender(handle);
            return;
        }

        if (lrcSrc) {
            fetch(lrcSrc)
                .then((res) => res.text())
                .then((text) => {
                    setFetchedContent(text);
                    continueRender(handle);
                })
                .catch((err) => {
                    console.error('Failed to load LRC:', err);
                    continueRender(handle);
                });
        } else {
            continueRender(handle);
        }
    }, [handle, initialContent, lrcSrc]);

    const lines = useMemo(() => {
        const content = initialContent ?? fetchedContent ?? '';
        return parseLrc(content);
    }, [initialContent, fetchedContent]);

    const activeIndex = useMemo(() => {
        // Find the index of the active line
        let index = -1;
        for (let i = 0; i < lines.length; i++) {
            if (currentTime >= lines[i].lineTime) {
                index = i;
            } else {
                break;
            }
        }
        return index;
    }, [lines, currentTime]);

    // Spring animation for scrolling
    // We want the active line to be in the center.
    // Let's say active line index is target.
    // We scroll so that lines[target] is at Y=0 (relative to center).
    // line height needs to be fixed or calculated. Let's assume a precise height.
    const LINE_HEIGHT = 100;
    const scroll = spring({
        frame,
        fps,
        from: 0,
        to: activeIndex * LINE_HEIGHT,
        config: {
            damping: 200,
        },
    });

    // Load font
    // Prefer Morisawa font if available, fallback to Google Fonts
    const fontFamily = "'A P-OTF しまなみ StdN', 'Zen Dots', 'Dela Gothic One', sans-serif";

    // Theme Colors
    const primaryColor = textColor;
    const secondaryColor = '#ff00ff'; // Magenta (Keep fixed or add prop if needed)
    const dimColor = '#444';

    // Helper to determine if a line needs emphasis
    const getEmphasis = (text: string) => {
        const isShort = text.length > 0 && text.length <= 4;
        const hasExclamation = text.includes('！') || text.includes('!');
        // Scale Multiplier
        if (hasExclamation) return 2.5; // Huge for shouts
        if (isShort) return 1.8; // Big for short impact words
        return 1.2; // Default scale
    };

    return (
        <AbsoluteFill
            style={{
                backgroundColor: backgroundColor,
                justifyContent: 'center',
                alignItems: 'center',
                fontFamily,
                overflow: 'hidden',
            }}
        >
            {/* Note: User needs to have the font activated locally for it to work */}
            <link
                href="https://fonts.googleapis.com/css2?family=Zen+Dots&family=Dela+Gothic+One&display=swap"
                rel="stylesheet"
            />
            {audioSrc && <Audio src={audioSrc} />}

            <AbsoluteFill style={{
                background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)',
                zIndex: 0
            }} />

            {/* Render active line and maybe the previous one for fade out effect */}
            {lines.map((line, index) => {
                // Determine visibility window
                // Show current line, and keep previous line visible for a bit to fade out
                const isCurrent = index === activeIndex;
                const isPrevious = index === activeIndex - 1;

                if (!isCurrent && !isPrevious) return null;

                const text = line.text;
                // If text is empty (instrumental break), don't render anything heavily
                if (!text) return null;

                const emphasisScale = getEmphasis(text);

                // Animation values
                // Current line: Pop in
                // Previous line: Dissolve out

                let opacity = 0;
                let scale = 1;
                let blur = 0;

                if (isCurrent) {
                    // Enter animation
                    // We can use the progress of time within this line if we knew the next line time...
                    // But simpler: just spring from 0 when it becomes active?
                    // Problem: useCurrentFrame/spring is continuous.

                    // Simple approach: Always full opacity when active, maybe pulse?
                    opacity = 1;

                    // Add a slight entry pop
                    // We need a key that changes when activeIndex changes to re-trigger spring
                    // But spring state preserves...
                    // Let's use interpolate relative to frame if possible, or just fixed state.

                    scale = emphasisScale;
                    blur = 0;
                } else if (isPrevious) {
                    // Exit animation
                    opacity = 0; // We want it to fade out quickly.
                    // To do a real fade out, we'd need time-based interpolation.
                    // Since we don't have per-line start/end times easily accessible in this map without lookahead...
                    // Let's try to infer from currentTime vs line.lineTime

                    // Actually, let's keep it simple:
                    // The previous line is just GONE immediately in this logic `opacity = 0`.
                    // To make it dissolve, we need to know "how long ago did it end?"

                    // Improved Logic:
                    // Render ALL lines, but hide those far away.
                }

                return null; // Logic moved to main return below to support "all lines" approach for smoother transitions
            })}

            {/*
               Better Approach for Dissolve:
               Render the current line.
               Render the previous line with a fade out based on (currentTime - nextLineTime).
            */}

            <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
                {lines.map((line, index) => {
                    // Check if this line is relevant to show
                    if (index < activeIndex - 1 || index > activeIndex) return null;

                    const text = line.text;
                    if (!text) return null;

                    const customStyle = line.style || {};
                    const customSize = typeof customStyle.size === 'number' ? customStyle.size : baseFontSize;
                    // Primary color override
                    const activeColor = typeof customStyle.color === 'string' ? customStyle.color : primaryColor;

                    // Font override
                    let activeFont = fontFamily;
                    if (typeof customStyle.font === 'string') {
                        const f = customStyle.font.toLowerCase();
                        if (f.includes('gothic') || f === 'ゴシック') activeFont = "'Dela Gothic One', sans-serif";
                        else if (f.includes('zen')) activeFont = "'Zen Dots', cursive";
                        else activeFont = customStyle.font;
                    }

                    const emphasisScale = getEmphasis(text);

                    // Determine state
                    const isCurrent = index === activeIndex;

                    // Calculate relative time
                    // Start time of this line
                    const startTime = line.lineTime;
                    // End time (Start time of next line), default to +3s if last
                    const nextLine = lines[index + 1];
                    const endTime = nextLine ? nextLine.lineTime : startTime + 3;

                    // Time since line started
                    const timeSinceStart = currentTime - startTime;
                    // Time since line ended (if previous)
                    const timeSinceEnd = currentTime - endTime;

                    let animOpacity = 0;
                    let animScale = 1;
                    let animBlur = 0;
                    let animX = 0;
                    let animY = 0;

                    if (isCurrent) {
                        // Fade in quickly
                        animOpacity = interpolate(timeSinceStart, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
                        // Scale up slightly (pop) or continuous zoom?
                        // Let's do a continuous slow zoom in + emphasis
                        animScale = interpolate(timeSinceStart, [0, 5], [emphasisScale * 0.9, emphasisScale * 1.1], { extrapolateRight: "clamp" });

                        // Special Arc Animation for Silver Cradle
                        // REMOVED as per user request (Step 662)
                    } else {
                        // Previous line (index === activeIndex - 1)
                        // Fade out
                        animOpacity = interpolate(timeSinceEnd, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });
                        // Scale explodes or shrinks? Let's explode + blur
                        animScale = interpolate(timeSinceEnd, [0, 0.5], [emphasisScale * 1.1, emphasisScale * 1.5], { extrapolateRight: "clamp" });
                        animBlur = interpolate(timeSinceEnd, [0, 0.5], [0, 20], { extrapolateRight: "clamp" });

                        // Silver Cradle Exit Animation REMOVED
                    }

                    if (isCurrent && text === 'ゼロイチ') {
                        // Special Intro 0-1
                        // 0 at Top Left, 1 at Bottom Right
                        const opacity0 = interpolate(timeSinceStart, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
                        const opacity1 = interpolate(timeSinceStart, [0.3, 0.6], [0, 1], { extrapolateRight: "clamp" });

                        // Exit together
                        // "nextLine" logic handles the end time, but let's ensure they fade out
                        // If index is active, animOpacity is 1 (fade in) or 0 (fade out logic in main block?)
                        // Main block uses `animOpacity` for the WHOLE container. 
                        // But here we want custom element logic inside.
                        // Actually, the main container `animOpacity` handles the global fade in/out for the line.
                        // So we just need to render the 0/1 within that container (which is centered).
                        // BUT user wants Top-Left / Bottom-Right of SCREEN.
                        // The container is `width: 100%`, `justifyContent: center`. 
                        // To hit screen corners, we need absolute positioning relative to AbsoluteFill.
                        // The `div` returned by map is `position: absolute`, `width: 100%`.
                        // We can use fixed positioning or adjust style.

                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: animOpacity, // Follow global fade out
                                    pointerEvents: 'none',
                                }}
                            >
                                {/* 0: Top Left */}
                                <div style={{
                                    position: 'absolute',
                                    top: -100,
                                    left: -50,
                                    fontSize: 800, // HUGE
                                    fontWeight: '900',
                                    fontFamily: activeFont,
                                    color: activeColor,
                                    textShadow: `0 0 40px ${activeColor}, 0 0 80px ${secondaryColor}`, // Added Glow
                                    opacity: opacity0,
                                    lineHeight: 1,
                                }}>
                                    0
                                </div>
                                {/* 1: Bottom Right */}
                                <div style={{
                                    position: 'absolute',
                                    bottom: -100,
                                    right: -50,
                                    fontSize: 800, // HUGE
                                    fontWeight: '900',
                                    fontFamily: activeFont,
                                    color: activeColor,
                                    textShadow: `0 0 40px ${activeColor}, 0 0 80px ${secondaryColor}`, // Added Glow
                                    opacity: opacity1,
                                    lineHeight: 1,
                                }}>
                                    1
                                </div>
                            </div>
                        );
                    }

                    // Staggered Lines Logic (Machine | Beat | Breathe)


                    if (animOpacity <= 0) return null;

                    // New Tags: vertical, exit:scatter, escalate
                    const isVertical = String(customStyle.vertical) === 'true';
                    const isScatter = customStyle.exit === 'scatter';
                    const isDiagonal = customStyle.escalate === 'diag'; // Diagonal Escalation

                    let contentStyle: React.CSSProperties = {
                        color: isCurrent ? activeColor : dimColor,
                        textShadow: isCurrent ? `0 0 20px ${activeColor}, 0 0 40px ${secondaryColor}` : 'none',
                        textAlign: 'center',
                        width: isVertical ? 'auto' : '80%',
                        whiteSpace: 'nowrap',
                        writingMode: isVertical ? 'vertical-rl' : 'horizontal-tb',
                        textOrientation: isVertical ? 'upright' : 'mixed',
                    };

                    let contentNode: React.ReactNode = text;

                    // Staggered Lines Logic (Machine | Beat | Breathe OR Error | Error | Error)
                    if (isCurrent && text.includes('|')) {
                        const parts = text.split('|');

                        // Diagonal Layout Logic
                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    display: 'flex',
                                    flexDirection: isDiagonal ? 'column' : 'column', // Both column, but pos differs
                                    justifyContent: 'center',
                                    alignItems: isDiagonal ? 'flex-start' : 'flex-start', // Base alignment
                                    paddingLeft: isDiagonal ? 0 : 100, // Reset padding for diagonal
                                    width: '100%',
                                    height: '100%',
                                    opacity: animOpacity, // Global fade out (Simultaneous exit)
                                    transform: `translate(${animX}px, ${animY}px) scale(${animScale})`,
                                    filter: `blur(${animBlur}px)`,
                                    willChange: 'transform, opacity, filter',
                                }}
                            >
                                {parts.map((part, i) => {
                                    // Stagger appearance: 0.5s delay
                                    const partStart = i * 0.5;
                                    const partOpacity = interpolate(timeSinceStart, [partStart, partStart + 0.3], [0, 1], { extrapolateRight: "clamp" });

                                    // Flash for this part?
                                    // If diag, flash corresponds to level 1, 2, 3
                                    let partFlash = null;
                                    if (isDiagonal) {
                                        const flashT = timeSinceStart - partStart; // Local time
                                        const fOpacity = interpolate(flashT, [0, 0.1, 0.3], [0, 1, 0], { extrapolateRight: "clamp" });

                                        // Level 1: Thin (i=0)
                                        // Level 2: RGB Line (i=1)
                                        // Level 3: Full Screen (i=2)
                                        if (i === 1) { // Error 2
                                            partFlash = (
                                                <div style={{ position: 'absolute', width: '300%', height: 20, background: 'white', opacity: fOpacity, pointerEvents: 'none', left: '-100%', top: '50%' }}>
                                                    <div style={{ position: 'absolute', top: -4, left: 0, width: '100%', height: '100%', background: 'cyan', opacity: 0.8, mixBlendMode: 'screen' }} />
                                                    <div style={{ position: 'absolute', top: 4, left: 0, width: '100%', height: '100%', background: 'magenta', opacity: 0.8, mixBlendMode: 'screen' }} />
                                                </div>
                                            );
                                        } else if (i === 2) { // Error 3
                                            // Full screen flash? Hard to do from inside a small div.
                                            // We can render a fixed overlay.
                                            partFlash = (
                                                <div style={{ position: 'fixed', top: 0, left: 0, width: '100vw', height: '100vh', background: 'white', opacity: fOpacity, zIndex: 100 }} />
                                            );
                                        } else { // Error 1
                                            partFlash = <div style={{ position: 'absolute', width: '150%', height: 4, background: 'white', opacity: fOpacity, left: '-25%' }} />;
                                        }
                                    }

                                    // Calc Position & Size for Diagonal
                                    const diagStyle: React.CSSProperties = isDiagonal ? {
                                        position: 'absolute',
                                        top: `${20 + i * 20}%`, // 20%, 40%, 60% (Tighter vertical)
                                        left: `${15 + i * 15}%`, // 15%, 30%, 45% (Tighter horizontal)
                                        fontSize: 150 + (i * 150), // 150, 300, 450 (Less extreme but still growing)
                                    } : {
                                        fontSize: 300,
                                        lineHeight: 0.85,
                                        marginBottom: 0,
                                        // Normal stagger styles
                                    };

                                    // Manual override for sizes
                                    if (isDiagonal) {
                                        if (i === 0) diagStyle.fontSize = 150;
                                        if (i === 1) diagStyle.fontSize = 250;
                                        if (i === 2) diagStyle.fontSize = 500;
                                    }

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                ...diagStyle,
                                                fontWeight: '900',
                                                fontFamily: activeFont,
                                                opacity: partOpacity,
                                                color: activeColor,
                                                textShadow: `0 0 50px ${activeColor}, 0 0 100px ${secondaryColor}`,
                                                whiteSpace: 'nowrap',
                                                transform: isDiagonal ? 'rotate(-30deg)' : 'none', // Increased Tilt
                                                transformOrigin: 'center center',
                                            }}
                                        >
                                            {partFlash}
                                            {part}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Scatter / Drift Logic (Unified for Active & Exit)
                    // Checks if this line requires character-split animation
                    const isDrift = customStyle.exit === 'drift';

                    if ((isScatter || isDrift)) {
                        // Decide if we should show this line:
                        // Show if Active OR (Previous AND Exit animation is requested)
                        // Actually, the main loop already filters `isCurrent` and `isPrevious`.
                        // `animOpacity` handles the visibility.

                        // We use `timeSinceStart` for continuous drift.
                        // For exit phase (isPrevious), `animOpacity` will fade it out.

                        const chars = text.split('');
                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                    height: '100%',
                                    opacity: animOpacity, // Use global opacity (Fade In / Fade Out)
                                    filter: `blur(${animBlur}px)`,
                                    transform: `translate(${animX}px, ${animY}px) scale(${animScale})`,
                                }}
                            >
                                {chars.map((char, i) => {
                                    let x = 0;
                                    let y = 0;
                                    let r = 0;

                                    if (isDrift) {
                                        // Drift Left/Right continuously from Start
                                        // "Start drifting from the moment it appears"
                                        // t=0 -> 0. t=2 -> 200.
                                        const center = chars.length / 2;
                                        const dir = i < center ? -1 : 1;
                                        const distFactor = (Math.abs(i - center + 0.5) + 1);

                                        // Drift increases with time
                                        const driftAmt = interpolate(timeSinceStart, [0, 3], [0, 400]);

                                        x = dir * driftAmt * distFactor;
                                        y = interpolate(timeSinceStart, [0, 2], [0, -20]); // Slight float fit
                                    } else if (isScatter && !isCurrent) {
                                        // Scatter only on Exit? Or Accumulate?
                                        // User asked for "Exit: Scatter". 
                                        // So active is normal, exit is explosion.
                                        // We use `timeSinceEnd` for explosion progress.
                                        const exitProgress = interpolate(timeSinceEnd, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });

                                        x = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 1000]);
                                        y = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 1000]);
                                        r = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 360]);
                                    }

                                    return (
                                        <div
                                            key={i}
                                            style={{
                                                position: 'relative',
                                                fontSize: customSize,
                                                fontWeight: '900',
                                                fontFamily: activeFont,
                                                color: activeColor,
                                                textShadow: `0 0 20px ${activeColor}`,
                                                transform: `translate(${x}px, ${y}px) rotate(${r}deg)`,
                                                marginLeft: '0.1em',
                                                marginRight: '0.1em',
                                            }}
                                        >
                                            {char}
                                        </div>
                                    );
                                })}
                            </div>
                        );
                    }

                    // Render Content (Standard)
                    const content = (
                        <div style={contentStyle}>
                            {text}
                        </div>
                    );

                    // Flash Animation Logic
                    const flashLevel = customStyle.flash ? Number(customStyle.flash) : 0;
                    let flashOverlay = null;
                    let glitchIntensity = hasExclamation(text) ? 10 : 2;

                    if (isCurrent && flashLevel > 0) {
                        glitchIntensity = 20 * flashLevel;

                        const flashOpacity = interpolate(timeSinceStart, [0, 0.1, 0.3], [0, 1, 0], { extrapolateRight: "clamp" });

                        if (flashLevel === 2) {
                            // Level 2: Straight RGB Glitch Line (Replaces Wavy)
                            flashOverlay = (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: '120%',
                                        height: 20, // Straight line
                                        backgroundColor: 'white',
                                        boxShadow: '0 0 20px white',
                                        opacity: flashOpacity,
                                        zIndex: 10,
                                        pointerEvents: 'none',
                                    }}
                                >
                                    {/* RGB Offsets */}
                                    <div style={{ position: 'absolute', top: -4, left: -4, width: '100%', height: '100%', background: 'cyan', opacity: 0.8, mixBlendMode: 'screen' }} />
                                    <div style={{ position: 'absolute', top: 4, left: 4, width: '100%', height: '100%', background: 'magenta', opacity: 0.8, mixBlendMode: 'screen' }} />
                                </div>
                            );
                        } else {
                            // Level 1 and 3...
                            const height = flashLevel === 1 ? 4 : 1080;
                            const width = flashLevel === 3 ? '100%' : '120%';

                            flashOverlay = (
                                <div
                                    style={{
                                        position: 'absolute',
                                        top: '50%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: width,
                                        height: height,
                                        backgroundColor: 'white',
                                        boxShadow: `0 0 ${flashLevel * 30}px white`,
                                        opacity: flashOpacity,
                                        zIndex: 10, // On top of text
                                        pointerEvents: 'none',
                                    }}
                                />
                            );
                        }
                    }

                    return (
                        <div
                            key={index}
                            style={{
                                position: 'absolute',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                width: '100%',
                                fontSize: customSize, // Base font size
                                fontWeight: '900',
                                fontFamily: activeFont,
                                opacity: animOpacity,
                                transform: `translate(${animX}px, ${animY}px) scale(${animScale})`,
                                filter: `blur(${animBlur}px)`,
                                willChange: 'transform, opacity, filter',
                            }}
                        >
                            {flashOverlay}
                            {isCurrent ? (
                                <GlitchWrapper intensity={glitchIntensity}>
                                    <RGBSplit offset={flashLevel > 0 ? flashLevel * 5 : (hasExclamation(text) ? 10 : 3)}>
                                        {content}
                                    </RGBSplit>
                                </GlitchWrapper>
                            ) : (
                                content
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}>
                <Scanlines />
            </div>

            <div
                style={{
                    color: primaryColor,
                    fontSize: 20,
                    position: 'absolute',
                    bottom: 20,
                    right: 20,
                    fontFamily: 'monospace',
                    textShadow: `0 0 5px ${primaryColor}`,
                    zIndex: 20
                }}
            >
                TIME: {currentTime.toFixed(2)}s
            </div>
        </AbsoluteFill>
    );

    function hasExclamation(t: string) {
        return t.includes('!') || t.includes('！');
    }
};

