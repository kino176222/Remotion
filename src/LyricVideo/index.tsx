import { AbsoluteFill, Audio, continueRender, delayRender, Easing, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig, Video } from 'remotion';
import { getCurrentLine, parseLrc } from '../utils/lrc-parser';
import { useEffect, useMemo, useState } from 'react';
import { z } from 'zod';

export const lyricVideoSchema = z.object({
    audioSrc: z.string(),
    lrcContent: z.string().optional(),
    lrcSrc: z.string().optional(),
    videoSrc: z.string().optional().describe('Background video source'),
    backgroundColor: z.string().describe('Base background color'),
    textColor: z.string().describe('Main text color (Primary)'),
    baseFontSize: z.number().describe('Base font size (px)'),
    transparent: z.boolean().optional().describe('Make background transparent'),
});

import { GlitchWrapper } from '../components/GlitchWrapper';
import { RGBSplit } from '../components/RGBSplit';
import { Scanlines } from '../components/Scanlines';

export const LyricVideo: React.FC<z.infer<typeof lyricVideoSchema>> = ({
    audioSrc,
    lrcContent: initialContent,
    lrcSrc,
    videoSrc,
    backgroundColor = '#0a0a0a',
    textColor = '#00f3ff',
    baseFontSize = 80,
    transparent = false,
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
    const fontFamily = "'DotGothic16', sans-serif";

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
                backgroundColor: transparent ? 'transparent' : backgroundColor,
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

            {/* Background Video */}
            <AbsoluteFill>
                <Video src={videoSrc} muted />
                {/* Dark Overlay removed as per user request */}
            </AbsoluteFill>

            {audioSrc && <Audio src={audioSrc} />}

            {!transparent && !videoSrc && (
                <AbsoluteFill style={{
                    background: 'radial-gradient(circle at center, #1a1a2e 0%, #000000 100%)',
                    zIndex: 0
                }} />
            )}

            {/* Render active line and maybe the previous one for fade out effect */}
            {/* Logic moved to main return below to support "all lines" approach for smoother transitions */}

            <div style={{ position: 'absolute', width: '100%', height: '100%', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 1 }}>
                {lines.map((line, index) => {
                    // Check if this line is relevant to show
                    if (index < activeIndex - 1 || index > activeIndex) return null;

                    const text = line.text;
                    if (!text) return null;

                    const customStyle = line.style || {};
                    const isVertical = String(customStyle.vertical) === 'true';
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
                    } else {
                        // Previous line (index === activeIndex - 1)
                        // Fade out
                        const isInstantCut = text === 'すべて' || ['警告音', '接近', '破壊足音', 'ズンズン'].includes(text);

                        if (isInstantCut) {
                            // User Request: "Pan to kesu" (Instant cut)
                            // Fix: Range [0, 0] causes error. Use minimal epsilon [0, 0.001].
                            animOpacity = interpolate(timeSinceEnd, [0, 0.001], [1, 0], { extrapolateRight: "clamp" });
                        } else {
                            animOpacity = interpolate(timeSinceEnd, [0, 0.5], [1, 0], { extrapolateRight: "clamp" });
                        }

                        // Scale explodes or shrinks? Let's explode + blur
                        animScale = interpolate(timeSinceEnd, [0, 0.5], [emphasisScale * 1.1, emphasisScale * 1.5], { extrapolateRight: "clamp" });
                        animBlur = interpolate(timeSinceEnd, [0, 0.5], [0, 20], { extrapolateRight: "clamp" });
                    }

                    if (isCurrent && text === 'ゼロイチ') {
                        // Special Intro 0-1 (No Zabuton preferred for this HUGE text? Or apply it individually?)
                        // User request: "文字の下に黒い座布団" (Black Zabuton under text).
                        // For this specific effect (fullscreen numbers), Zabuton might look weird.
                        // I'll keep this specific effect as is (No Zabuton), assuming it's a special "Scene".
                        // Logic remains same as original.

                        const opacity0 = interpolate(timeSinceStart, [0, 0.3], [0, 1], { extrapolateRight: "clamp" });
                        const opacity1 = interpolate(timeSinceStart, [0.3, 0.6], [0, 1], { extrapolateRight: "clamp" });

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
                                    left: 50, // Moved Right (was -50)
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
                                    bottom: -50, // Moved Up (was -100)
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

                    if (animOpacity <= 0) return null;

                    // New Tags: vertical, exit:scatter, escalate
                    // moved to top scope of map or reused
                    const isScatter = customStyle.exit === 'scatter';
                    const isDiagonal = customStyle.escalate === 'diag'; // Diagonal Escalation

                    // Typewriter Logic
                    // Speed: 0.05s per char, but min 1s duration, max 3s?
                    // Let's settle on a fast tech typing speed.
                    const typeDuration = text.length * 0.05;
                    const typeProgress = interpolate(timeSinceStart, [0, typeDuration], [0, text.length], { extrapolateRight: "clamp" });
                    const visibleLength = Math.floor(typeProgress);

                    // Display text (substring)
                    // If it's a pipe split line, checking visibleLength is cleaner on the raw text, 
                    // but we have splits.
                    // For simplicity, let's treat the typewriter effect as the "Enter" animation.

                    // Staggered Lines Logic (Machine | Beat | Breathe) - These have '|'
                    // We can retain the "parts" logic for positioning, but apply typewriter to them?
                    // Or simplifies to standard typewriter for everything unless specific tag?
                    // The user liked "Typewriter". Let's try to apply it generally.

                    // However, `parts` splitting was doing positional shifts.
                    // If we just typewriter `Machine | Beat | Breathe`, it will type out nicely.
                    // But the previous "Stagger" logic split them spatially.
                    // Let's keep spatial stagger for '|' lines, but type them in?
                    // Or just treat them as standard typewriter lines now? 
                    // "Machine|Beat|Breathe" might look good just typed out on one line or new lines?
                    // Let's stick to the existing "parts" logic for '|' but add transparency based on typeProgress?
                    // Actually, "Machine | Beat" usually implies time gaps.
                    // Typewriter handles time gaps naturally if we just type the full string including spaces.

                    // DECISION: For this "Console" vibe, standard linear typewriter is best.
                    // I will override the '|' splitting logic to just be a standard typewriter line 
                    // UNLESS it's the `escalate:diag` one which clearly needs spatial arrangement.

                    const showCursor = isCurrent && visibleLength < text.length && ((frame % 15) < 8); // Blink cursor

                    // Common Text Style
                    // User Request: Uniform size (ignore LRC tags) & Fixed Position at bottom
                    const textStyle: React.CSSProperties = {
                        fontSize: baseFontSize, // Enforce uniform size
                        fontWeight: '900',
                        fontFamily: activeFont, // Unified font
                        color: '#FFFFFF', // White Core for Neon
                        // Neon Glow Style (Cyan)
                        textShadow: `0 0 10px ${activeColor}, 
                                     0 0 20px ${activeColor}, 
                                     0 0 40px ${activeColor},
                                     0 0 80px ${secondaryColor}`, // Multi-layered glow
                        whiteSpace: 'pre', // Preserve spaces
                        textAlign: 'center',
                        lineHeight: 1.2,
                        opacity: animOpacity,
                        transform: `translate(${animX}px, ${animY}px) scale(${animScale})`,
                        filter: `blur(${animBlur}px)`,
                    };

                    // Render Content
                    let contentNode: React.ReactNode;

                    if (isDiagonal) {
                        // User Request: "ERROR" (English) Stamp Effect.
                        // 1. Small (Fixed)
                        // 2. Medium (Fixed + Overlay)
                        // 3. Huge (Fixed + Overlay + Flicker)
                        // Ignore original text "エラー|エラー|エラー" and use "ERROR".
                        const parts = ['ERROR', 'ERROR', 'ERROR'];

                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    zIndex: 20,
                                }}
                            >
                                <div style={{
                                    position: 'relative',
                                    display: 'flex', // Stack them on top of each other? Or vertical list?
                                    // Request said "Overlay" (implied stacking or filling screen).
                                    // "Small size at center, then medium size over it, then huge size"
                                    // Let's use absolute positioning center to stack them.
                                    width: '100%',
                                    height: '100%',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                }}>
                                    {parts.map((part, i) => {
                                        const startDelay = i * 0.4;
                                        // Appear quickly
                                        const pOpacity = interpolate(timeSinceStart, [startDelay, startDelay + 0.05], [0, 1], { extrapolateRight: "clamp" });

                                        // Disappear logic (User: "Don't leave them remaining")
                                        // If it's not the last one, it should disappear when the next one comes.
                                        // Next one comes at (i + 1) * 0.4.
                                        const endOpacity = i < 2
                                            ? interpolate(timeSinceStart, [(i + 1) * 0.4, (i + 1) * 0.4 + 0.05], [1, 0], { extrapolateRight: "clamp" })
                                            : 1;

                                        // Sizes: Small, Medium, Huge (User: "3rd one a bit smaller")
                                        const size = i === 0 ? 50 : (i === 1 ? 150 : 450); // Reduced from 600 to 450

                                        // Specific Style for each
                                        const isHuge = i === 2;
                                        // Flicker for the huge one
                                        const flicker = isHuge ? (Math.random() > 0.8 ? 0.7 : 1) : 1;

                                        return (
                                            <div
                                                key={i}
                                                style={{
                                                    position: 'absolute', // Stack on center
                                                    opacity: pOpacity * endOpacity * flicker,
                                                    fontSize: size,
                                                    color: '#FFFFFF',
                                                    // Zen Dots for "System Warning" feel
                                                    fontFamily: "'Zen Dots', sans-serif",
                                                    fontWeight: 400, // Zen Dots is bold by default
                                                    textShadow: `0 0 ${10 + i * 10}px ${activeColor}`, // Increasing glow
                                                    whiteSpace: 'nowrap',
                                                    transform: 'translate(-50%, -50%)', // Centering trick with top/left 50%
                                                    top: '50%',
                                                    left: '50%',
                                                    textAlign: 'center',
                                                    zIndex: i, // Ensure layering
                                                }}
                                            >
                                                {part}
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    } else if (text.includes('|')) {
                        // User Request: Screen Full, Tight Spacing, NO Glitch Exit
                        // "Machine | Beat | Breathe" -> "Machine" @ 19.08, "Beat" @ 20.05 (+0.97s)
                        const parts = text.split('|');

                        // Standard Exit (Just Fade)
                        const isExiting = !isCurrent;
                        const exitProgress = isExiting ? interpolate(timeSinceEnd, [0, 0.5], [0, 1], { extrapolateRight: "clamp" }) : 0;

                        // No Glitch / No Move
                        const opacityExit = isExiting ? interpolate(exitProgress, [0, 1], [1, 0]) : 1;

                        const isMemory = text.includes('メモリー');

                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    top: 0,
                                    left: 0,
                                    width: '100%',
                                    height: '100%',
                                    opacity: animOpacity * opacityExit,
                                    filter: isExiting ? `blur(${exitProgress * 10}px)` : `blur(${animBlur}px)`,
                                    zIndex: 10,
                                }}
                            >
                                <div style={{
                                    display: 'flex',
                                    flexDirection: 'column',
                                    width: '100vw',
                                    height: '100vh',
                                    justifyContent: 'center',
                                    alignItems: isMemory ? 'flex-end' : 'flex-start', // Right align for Memory
                                    paddingLeft: isMemory ? undefined : '0px', // Flush left (User: "To the very limit")
                                    paddingRight: isMemory ? '0px' : undefined, // Flush right
                                    // No transform glitch
                                }}>
                                    {parts.map((part, i) => {
                                        // Manual Timing:
                                        // "Machine" (0) -> 0s
                                        // "Beat" (1) -> 0.97s (User request 20.05 with start 19.08)
                                        // "Breathe" (2) -> 1.5s? Adjusted relative to Beat.
                                        let delay = i * 0.4;
                                        if (text.includes('機械')) {
                                            if (i === 1) delay = 0.97;
                                            if (i === 2) delay = 1.6; // "Breathe" delayed further
                                        }
                                        if (text.includes('メモリー')) {
                                            // [01:03.671] Memory (0s)
                                            // [01:04.636] Noise (+0.96s)
                                            // [01:05.374] Kishimu Oto (+1.70s)
                                            if (i === 1) delay = 0.96;
                                            if (i === 2) delay = 1.70;
                                        }

                                        let partOpacity = interpolate(timeSinceStart, [delay, delay + 0.1], [0, 1], { extrapolateRight: "clamp" });

                                        // Typewriter effect (Machine OR Memory)
                                        let displayPart = part;
                                        if (text.includes('機械') || text.includes('メモリー')) {
                                            const typeSpeed = 0.1; // Seconds per char
                                            const localTime = timeSinceStart - delay;
                                            // If before start, show nothing
                                            if (localTime < 0) {
                                                displayPart = '';
                                            } else {
                                                const charCount = interpolate(localTime, [0, part.length * typeSpeed], [0, part.length], { extrapolateRight: "clamp" });
                                                displayPart = part.slice(0, Math.floor(charCount));
                                            }
                                            partOpacity = 1;
                                        }

                                        return (
                                            <span
                                                key={i}
                                                style={{
                                                    opacity: partOpacity,
                                                    fontSize: '28vh', // Massive vertical height to fill screen
                                                    lineHeight: 1.1, // Looser spacing to prevent overlap
                                                    color: '#FFFFFF',
                                                    // Standard Glow (No RGB Split)
                                                    textShadow: `0 0 10px ${activeColor}, 0 0 20px ${activeColor}, 5px 0 0 rgba(255,0,0,0.5), -5px 0 0 rgba(0,255,255,0.5)`,
                                                    fontWeight: 900,
                                                    fontFamily: activeFont,
                                                    marginLeft: isMemory ? undefined : i * 20 + 'px', // Stagger Left
                                                    marginRight: isMemory ? (i * 20 - 80) + 'px' : undefined, // Stagger Right (Aggressive flush)
                                                    display: 'block', // Ensure block context
                                                    textAlign: isMemory ? 'right' : 'left',
                                                }}
                                            >
                                                {displayPart}
                                            </span>
                                        );
                                    })}
                                </div>
                            </div>
                        );
                    } else if (text.includes('離せない')) { // Special handling for "離せない" (Hanasenai)
                        // User Request: "Slowly move left and right and disappear", "Standard size"
                        // Interpretation: Letter spacing expands slowly (drifting apart) + Fade out.

                        // Drift animation (Slow expansion)
                        const driftSpacing = interpolate(timeSinceStart, [0, 10], [0, 150], { extrapolateRight: "clamp" });

                        // Emo Line Logic (Restored)
                        // "Jiwatto" -> Slow ease in to 120% (Pierce through)
                        const lineProgress = interpolate(timeSinceStart, [0, 2], [0, 120], { extrapolateRight: "clamp", easing: Easing.inOut(Easing.ease) });

                        const isExiting = !isCurrent;
                        const exitOpacity = isExiting ? interpolate(timeSinceEnd, [0, 2], [1, 0]) : 1;

                        return (
                            <div
                                key={index}
                                style={{
                                    ...textStyle,
                                    fontSize: baseFontSize * 0.85, // Smaller as requested
                                    width: '100%',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    opacity: animOpacity * exitOpacity,
                                }}
                            >
                                {/* Wrapper to track text width for the line */}
                                <div style={{ position: 'relative', display: 'inline-block' }}>
                                    <span style={{
                                        letterSpacing: `${driftSpacing}px`, // Drifting apart (Increases width)
                                        transition: 'letter-spacing 0.1s linear',
                                        position: 'relative',
                                        zIndex: 2,
                                    }}>
                                        {text}
                                    </span>

                                    {/* Emo Line: Restored & Thicker */}
                                    <div style={{
                                        position: 'absolute',
                                        top: '55%',
                                        left: '50%',
                                        transform: 'translate(-50%, -50%)',
                                        width: `${lineProgress}%`,
                                        height: '4px',  // Thicker
                                        borderRadius: '2px',
                                        backgroundColor: '#FFFFFF',
                                        // Intense Glow to stand out
                                        boxShadow: `0 0 10px ${activeColor}, 0 0 20px ${activeColor}, 0 0 40px #FFFFFF`,
                                        zIndex: 1,
                                    }} />
                                </div>
                            </div>
                        );
                    } else if (['警告音', '接近', '破壊足音', 'ズンズン'].includes(text)) {
                        // MOVIE SUBTITLE STYLE (Warning sequence)
                        // User Request: "More down" (Lower), "RoG2 font" (from image)
                        return (
                            <div
                                key={index}
                                style={{
                                    position: 'absolute',
                                    bottom: '2%', // Natural fit in bottom bar
                                    width: '100%',
                                    textAlign: 'center',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'flex-end',
                                    opacity: animOpacity,
                                }}
                            >
                                <span style={{
                                    fontSize: 50, // Smaller as requested
                                    color: '#FFFFFF',
                                    // Font: Suiryu Atlas (Sharp, tech feeling)
                                    fontFamily: "'A P-OTF 翠流アトラス StdN M', 'Zen Dots', 'Dela Gothic One', sans-serif",
                                    textShadow: '2px 2px 0 #000, -1px -1px 0 #000, 0 0 20px rgba(255,0,0,0.5)',
                                    letterSpacing: '0.1em',
                                }}>
                                    {text}
                                </span>
                            </div>
                        );
                    } else if (text === 'イマ' && customStyle.size === 800) {
                        // FINAL "Ima" Only: Center, Circle spreads out and vanishes.
                        // User Request: "Text disappears at 02:40.130 (approx 0.92s absolute time), Ring stays"
                        // Start: 02:39.210. 
                        // Target Text End: 02:40.130. Diff = 0.92s.

                        const circleSize = 300;
                        // Expansion Animation
                        const expandProgress = interpolate(timeSinceStart, [0, 2], [1, 2.5], { extrapolateRight: "clamp", easing: Easing.out(Easing.ease) });

                        // Ring Fade
                        const fadeProgress = interpolate(timeSinceStart, [0, 1.5], [1, 0], { extrapolateRight: "clamp" });

                        // Text Visibility: Instant cut at 0.92s
                        const textOpacity = interpolate(timeSinceStart, [0.92, 0.921], [1, 0], { extrapolateRight: "clamp" });

                        return (
                            <div
                                key={index}
                                style={{
                                    ...textStyle,
                                    transform: 'none',
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    opacity: animOpacity, // Global fade (handles 2:41.16 cutoff)
                                }}
                            >
                                <span style={{ position: 'relative', zIndex: 1, opacity: textOpacity }}>{text}</span>

                                {/* Circle */}
                                <div style={{
                                    position: 'absolute',
                                    width: circleSize,
                                    height: circleSize,
                                    borderRadius: '50%',
                                    border: '4px solid #FFFFFF',
                                    boxShadow: `0 0 15px ${activeColor}, inset 0 0 15px ${activeColor}`,
                                    transform: `scale(${expandProgress})`, // Expands outward
                                    opacity: fadeProgress * animOpacity, // Fades out as it expands
                                    zIndex: 0,
                                }} />
                            </div>
                        );
                    } else if (isScatter || customStyle.exit === 'drift') {
                        // Scatter / Drift Logic
                        // If current, use typewriter.
                        // If exiting (customStyle.exit), use scatter.

                        // We need to render individual characters for scatter anyway.
                        // Can we combine?
                        // "Typewriter" means chars appear one by one.
                        // "Scatter" means chars fly away.

                        const chars = text.split('');

                        return (
                            <div
                                key={index}
                                style={{
                                    ...textStyle,
                                    display: 'flex',
                                    justifyContent: 'center',
                                    alignItems: 'center',
                                    width: '100%',
                                    height: '100%',
                                }}
                            >
                                {chars.map((char, i) => {
                                    // Typewriter Visibility
                                    if (i >= visibleLength && isCurrent) return null; // Not typed yet

                                    // Scatter Transform
                                    let x = 0;
                                    let y = 0;
                                    let r = 0;

                                    if (customStyle.exit === 'drift') {
                                        // Drift Logic
                                        const driftAmt = interpolate(timeSinceStart, [0, 3], [0, 400]);
                                        const center = chars.length / 2;
                                        const dir = i < center ? -1 : 1;
                                        x = dir * driftAmt * (Math.abs(i - center + 0.5) + 1);
                                    } else if (isScatter && !isCurrent) {
                                        // Scatter Exit
                                        const exitProgress = interpolate(timeSinceEnd, [0, 0.5], [0, 1], { extrapolateRight: "clamp" });
                                        x = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 1000]);
                                        y = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 1000]);
                                        r = interpolate(exitProgress, [0, 1], [0, (Math.random() - 0.5) * 360]);
                                    }

                                    return (
                                        <span key={i} style={{ display: 'inline-block', transform: `translate(${x}px, ${y}px) rotate(${r}deg)`, margin: '0 0.05em' }}>
                                            {char}
                                        </span>
                                    );
                                })}
                                {showCursor && <span style={{ opacity: 1 }}>_</span>}
                            </div>
                        );
                    }

                    // Standard Typewriter (Plain text or '|' text converted to spaces)
                    const displayString = text.replaceAll('|', '   ').slice(0, visibleLength);

                    return (
                        <div
                            key={index}
                            style={{
                                ...textStyle,
                                position: 'absolute',
                                width: '100%',
                                display: 'flex',
                                justifyContent: 'center',
                                alignItems: 'center',
                                height: 'auto', // Auto height for bottom positioning
                                top: '93%', // Adjusted up slightly (95% -> 93%)
                                left: '50%',
                                transform: `translate(-50%, -50%)`, // Centered on point
                            }}
                        >
                            <span style={{ position: 'relative' }}>
                                {displayString}
                                {showCursor && <span style={{ color: activeColor, textShadow: 'none' }}>_</span>}
                            </span>
                        </div>
                    );

                })}
            </div>

            <div style={{ zIndex: 10, width: '100%', height: '100%', pointerEvents: 'none', position: 'absolute', top: 0, left: 0 }}>
                {(() => {
                    // Android HUD Overlay (54.17s - 60.04s)
                    const hudStart = 54.17;
                    const hudEnd = 60.04; // User Request: 1:00:04
                    const startFrame = hudStart * fps;
                    const endFrame = hudEnd * fps;

                    if (frame >= startFrame && frame < endFrame) {
                        // Fade in/out
                        const fadeIn = interpolate(frame, [startFrame, startFrame + 10], [0, 1], { extrapolateRight: "clamp" });
                        const fadeOut = interpolate(frame, [endFrame - 10, endFrame], [1, 0], { extrapolateRight: "clamp" });
                        const hudOpacity = fadeIn * fadeOut;

                        const bracketColor = 'rgba(0, 255, 255, 0.9)'; // Cyan

                        // Blinking REC
                        const isBlink = Math.floor(frame / 15) % 2 === 0;

                        return (
                            <div style={{
                                position: 'absolute',
                                top: 0,
                                left: 0,
                                width: '100%',
                                height: '100%',
                                opacity: hudOpacity,
                            }}>
                                {/* Corner Brackets */}
                                {/* Top Left */}
                                <div style={{ position: 'absolute', top: '5%', left: '5%', width: '15vw', height: '15vh', borderTop: `6px solid ${bracketColor}`, borderLeft: `6px solid ${bracketColor}`, boxShadow: `0 0 10px ${bracketColor}` }} />
                                {/* Top Right */}
                                <div style={{ position: 'absolute', top: '5%', right: '5%', width: '15vw', height: '15vh', borderTop: `6px solid ${bracketColor}`, borderRight: `6px solid ${bracketColor}`, boxShadow: `0 0 10px ${bracketColor}` }} />
                                {/* Bottom Left */}
                                <div style={{ position: 'absolute', bottom: '5%', left: '5%', width: '15vw', height: '15vh', borderBottom: `6px solid ${bracketColor}`, borderLeft: `6px solid ${bracketColor}`, boxShadow: `0 0 10px ${bracketColor}` }} />
                                {/* Bottom Right */}
                                <div style={{ position: 'absolute', bottom: '5%', right: '5%', width: '15vw', height: '15vh', borderBottom: `6px solid ${bracketColor}`, borderRight: `6px solid ${bracketColor}`, boxShadow: `0 0 10px ${bracketColor}` }} />

                                {/* REC Indicator */}
                                <div style={{
                                    position: 'absolute', top: '8%', right: '8%',
                                    color: '#FF0000', fontFamily: 'monospace', fontSize: '30px', fontWeight: 'bold',
                                    opacity: isBlink ? 1 : 0.2, // Blink effect
                                    textShadow: '0 0 5px #FF0000'
                                }}>
                                    ● REC
                                </div>

                                {/* Center Focus Ring (Reticle) */}
                                <div style={{
                                    position: 'absolute',
                                    top: '50%',
                                    left: '50%',
                                    transform: 'translate(-50%, -50%)',
                                    width: '40vw',
                                    height: '40vh', // Rectangle-ish? Or Square? Let's assume Screen aspect.
                                    // Let's do a crosshair
                                    display: 'flex', justifyContent: 'center', alignItems: 'center',
                                    opacity: 0.6
                                }}>
                                    {/* Crosshair lines */}
                                    <div style={{ position: 'absolute', width: '20px', height: '2px', backgroundColor: bracketColor, boxShadow: `0 0 5px ${bracketColor}` }} />
                                    <div style={{ position: 'absolute', width: '2px', height: '20px', backgroundColor: bracketColor, boxShadow: `0 0 5px ${bracketColor}` }} />
                                    {/* Circle */}
                                    <div style={{ position: 'absolute', width: '100px', height: '100px', border: `1px dashed ${bracketColor}`, borderRadius: '50%', boxShadow: `0 0 5px ${bracketColor}` }} />
                                </div>

                                {/* Status Text */}
                                <div style={{ position: 'absolute', bottom: '8%', left: '8%', color: bracketColor, fontFamily: 'monospace', fontSize: '20px', textShadow: `0 0 5px ${bracketColor}` }}>
                                    TARGET: UNKNOWN<br />
                                    SCANNING... [||||||||--]
                                </div>
                            </div>
                        );
                    }
                    return null;
                })()}
            </div>


        </AbsoluteFill>
    );

    function hasExclamation(t: string) {
        return t.includes('!') || t.includes('！');
    }
};

