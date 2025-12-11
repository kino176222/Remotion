import React from 'react';
import { AbsoluteFill, interpolate, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

// --- Background Component ---
const GradientBackground: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps } = useVideoConfig();
    const duration = 10 * fps; // 10秒で一周するくらいのゆっくりさ

    // 背景位置を動かして流れるようなグラデーションにする
    // 0% -> 100%
    const pos = (frame / duration) * 100;

    return (
        <AbsoluteFill
            style={{
                // 4色の指定: #3771C4, #80FFFC, #689CFF, #163CD7
                background: `linear-gradient(135deg, #3771C4, #80FFFC, #689CFF, #163CD7)`,
                backgroundSize: '400% 400%',
                backgroundPosition: `${pos}% 50%`,
                animation: 'none', // CSS animation is hard to control directly via frame without messy logic, better to use style interpolation if possible.
                // Actually, simple position interpolation works best.
            }}
        />
    );
};

// --- Decorational Lines (Wavy) ---
const WavyLine: React.FC<{
    color: string;
    thickness: number;
    amplitude: number;
    frequency: number;
    speed: number;
    top: number;
    opacity: number;
}> = ({ color, thickness, amplitude, frequency, speed, top, opacity }) => {
    const frame = useCurrentFrame();
    const { width } = useVideoConfig();

    // Generate path
    // Simple sine wave: y = sin(x)
    const points = [];
    for (let x = 0; x <= width; x += 10) {
        // x coordinate is just x
        // y coordinate is modulated by sin
        const t = frame * speed;
        const y = Math.sin((x * frequency) + t) * amplitude;
        points.push(`${x},${y}`);
    }

    const pathData = `M 0,0 ` + points.map(p => `L ${p}`).join(' ');

    return (
        <svg
            style={{
                position: 'absolute',
                top,
                left: 0,
                width: '100%',
                overflow: 'visible',
                opacity,
            }}
            height={amplitude * 2 + thickness}
            viewBox={`0 ${-amplitude} ${width} ${amplitude * 2}`}
        >
            <path
                d={pathData}
                stroke={color}
                strokeWidth={thickness}
                fill="none"
                strokeLinecap="round"
            />
        </svg>
    );
};

// --- Typography (Vertical & Jiwa-to appearance) ---
const VerticalText: React.FC<{
    text: string;
    style?: React.CSSProperties;
    delay?: number;
}> = ({ text, style, delay = 0 }) => {
    const frame = useCurrentFrame();
    const chars = text.split('');

    return (
        <div
            style={{
                ...style,
                display: 'flex',
                flexDirection: 'column', // Vertical writing layout structure
                writingMode: 'vertical-rl',
                fontFamily: '"Zen Old Mincho", "Shippori Mincho", serif',
                fontWeight: 500,
            }}
        >
            {chars.map((char, i) => {
                const charDelay = delay + i * 10; // Stagger per char
                const time = Math.max(0, frame - charDelay);

                // Animations
                const opacity = interpolate(time, [0, 20], [0, 1], { extrapolateRight: 'clamp' });
                // Blur: 10px -> 0px
                const blur = interpolate(time, [0, 20], [10, 0], { extrapolateRight: 'clamp' });
                // Scale: 1.2 -> 1.0
                const scale = interpolate(time, [0, 30], [1.2, 1], { extrapolateRight: 'clamp', easing: t => 1 - Math.pow(1 - t, 3) });
                // Rotate: -5deg -> 0deg (Subtle adjustment)
                const rotate = interpolate(time, [0, 30], [-5, 0], { extrapolateRight: 'clamp' });

                // Special emphasis for Kanji or specific chars?
                // Example: make Kanji slightly larger
                const isKanji = /[\u4e00-\u9faf]/.test(char);
                const sizeMult = isKanji ? 1.2 : 1.0;

                return (
                    <span
                        key={i}
                        style={{
                            display: 'inline-block',
                            opacity,
                            filter: `blur(${blur}px)`,
                            transform: `scale(${scale * sizeMult}) rotate(${rotate}deg)`,
                            marginBottom: '0.2em', // Spacing between vertical chars
                            color: '#fff',
                            textShadow: '0 0 10px rgba(255,255,255,0.5)',
                        }}
                    >
                        {char}
                    </span>
                );
            })}
        </div>
    );
};

export const holidayVideoSchema = z.object({});

export const HolidayVideo: React.FC = () => {
    return (
        <AbsoluteFill style={{ backgroundColor: '#fff' }}>
            <GradientBackground />

            {/* Load Fonts */}
            <link href="https://fonts.googleapis.com/css2?family=Zen+Old+Mincho:wght@400;500;700&display=swap" rel="stylesheet" />

            {/* Wavy Lines Decor */}
            <WavyLine
                color="#FFFFFF"
                thickness={2}
                amplitude={30}
                frequency={0.005} // Low freq = gentle long waves
                speed={0.05}
                top={200}
                opacity={0.3}
            />
            <WavyLine
                color="#FFFFFF"
                thickness={1}
                amplitude={20}
                frequency={0.01}
                speed={0.07}
                top={250}
                opacity={0.2}
            />
            <WavyLine
                color="#FFFFFF"
                thickness={3}
                amplitude={40}
                frequency={0.003}
                speed={0.03}
                top={1600}
                opacity={0.4}
            />

            {/* Typography Layout */}
            {/* Right side phrase */}
            <VerticalText
                text="のんびり"
                delay={10}
                style={{
                    position: 'absolute',
                    right: '25%',
                    top: '20%',
                    fontSize: 100,
                }}
            />

            {/* Slightly lower and left */}
            <VerticalText
                text="楽しむ"
                delay={50}
                style={{
                    position: 'absolute',
                    right: '45%',
                    top: '35%',
                    fontSize: 120,
                }}
            />

            {/* Bottom Left conclusion */}
            <VerticalText
                text="ひとり休日"
                delay={90}
                style={{
                    position: 'absolute',
                    right: '65%', // In vertical-rl, right position moves it "further starting from right"
                    // visual layout logic:
                    // 1st col: far right
                    // 2nd col: middle
                    // 3rd col: left
                    // Since vertical-rl flows right to left naturally? 
                    // No, `flex-direction: column` inside `VerticalText` makes it a single column.
                    // So we are placing standalone columns.
                    // `right: 65%` puts it towards the left side of screen.
                    top: '50%',
                    fontSize: 80,
                }}
            />

        </AbsoluteFill>
    );
};
