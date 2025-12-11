import React, { useMemo } from 'react';
import { AbsoluteFill, random, useCurrentFrame, useVideoConfig } from 'remotion';
import { z } from 'zod';

// --- Types ---
export const glitchVideoSchema = z.object({});

// --- Components ---

const GridBackground: React.FC = () => {
    return (
        <AbsoluteFill
            style={{
                backgroundColor: '#001233', // Deep Blue
                backgroundImage: `
                    linear-gradient(rgba(255, 255, 255, 0.1) 1px, transparent 1px),
                    linear-gradient(90deg, rgba(255, 255, 255, 0.1) 1px, transparent 1px)
                `,
                backgroundSize: '50px 50px',
            }}
        />
    );
};

const ContentLayer: React.FC<{ style?: React.CSSProperties }> = ({ style }) => {
    // Cyberpunk/Typographic layout
    return (
        <AbsoluteFill style={{ ...style, justifyContent: 'center', alignItems: 'center' }}>
            {/* Title Box */}
            <div
                style={{
                    backgroundColor: '#2DD87E', // Bright Green
                    padding: '20px 60px',
                    transform: 'rotate(-2deg)',
                    boxShadow: '10px 10px 0px #0479FF', // Blue Shadow
                }}
            >
                <h1
                    style={{
                        margin: 0,
                        fontFamily: '"Zen Old Mincho", serif',
                        fontSize: '120px',
                        color: '#001233', // Deep Blue Text
                        fontWeight: 900,
                        lineHeight: 1,
                    }}
                >
                    アートト音楽ト
                </h1>
            </div>

            {/* Subtitle */}
            <div
                style={{
                    marginTop: '40px',
                    backgroundColor: '#FF5884', // Pink
                    padding: '10px 30px',
                    transform: 'rotate(1deg) translateX(100px)',
                }}
            >
                <h2
                    style={{
                        margin: 0,
                        fontFamily: '"Zen Old Mincho", serif',
                        fontSize: '60px',
                        color: '#fff',
                        fontWeight: 700,
                    }}
                >
                    モーショングラフィックス展
                </h2>
            </div>

            {/* Date */}
            <div
                style={{
                    position: 'absolute',
                    bottom: '100px',
                    right: '100px',
                    border: '4px solid #fff',
                    padding: '10px 20px',
                }}
            >
                <h3
                    style={{
                        margin: 0,
                        fontFamily: 'Courier New, monospace',
                        fontSize: '40px',
                        color: '#fff',
                    }}
                >
                    2025.12.11 - 12.25
                </h3>
            </div>
        </AbsoluteFill>
    );
};

// --- Glitch Logic ---

export const GlitchVideo: React.FC = () => {
    const frame = useCurrentFrame();
    const { fps, width, height } = useVideoConfig();

    // どのくらいの頻度でグリッチするか決める
    // 0 ~ 1 の乱数を生成し、閾値を超えたらグリッチ
    // 時々「大爆発」する
    const noiseSeed = Math.floor(frame / 2); // 2フレームごとにノイズパターンを変える
    const intensity = random(noiseSeed); // 0.0 - 1.0

    // グリッチ強度: 確率で激しくなる
    // 通常: 0, 時々: 小, 稀に: 大
    let glitchScale = 0;
    if (intensity > 0.95) {
        glitchScale = 300; // 激しい崩壊
    } else if (intensity > 0.8) {
        glitchScale = 50; // 小さいブレ
    }

    // ノイズの粗さ (BaseFrequency)
    // 値が大きいほど細かいノイズ、小さいほど大きなブロック
    const baseFreqX = intensity > 0.9 ? 0.01 : 0.05; // 激しいときは大きく歪む
    const baseFreqY = 0.05;

    // 量子化のステップ数 (離散的な値の数)
    // 少ないほどカクカクしたモザイクになる
    const numOctaves = 2;

    const filterId = `glitch-filter-${random(null)}`; // Unique ID? No, static is fine but risky if multiple comps.

    return (
        <AbsoluteFill style={{ backgroundColor: '#001233' }}>
            {/* SVG Filter Definition */}
            <svg style={{ position: 'absolute', width: 0, height: 0 }}>
                <defs>
                    <filter id="glitch-filter" x="-20%" y="-20%" width="140%" height="140%">
                        {/* 1. Generate Noise */}
                        <feTurbulence
                            type="fractalNoise"
                            baseFrequency={`${baseFreqX} ${baseFreqY}`}
                            numOctaves={numOctaves}
                            result="noise"
                            seed={frame}
                        />

                        {/* 2. Quantize Noise (Create Mosaic/Blocky look) */}
                        {/* 使用するfeComponentTransferのdiscrete機能で値を階段状にする */}
                        <feComponentTransfer in="noise" result="blockNoise">
                            <feFuncR type="discrete" tableValues="0 0.5 1" />
                            <feFuncG type="discrete" tableValues="0 0.5 1" />
                        </feComponentTransfer>

                        {/* 3. Displacement Map */}
                        {/* blockNoiseのRとGチャンネルを使って、SourceGraphic(元の絵)をずらす */}
                        <feDisplacementMap
                            in="SourceGraphic"
                            in2="blockNoise"
                            scale={glitchScale}
                            xChannelSelector="R"
                            yChannelSelector="G"
                        />
                    </filter>
                </defs>
            </svg>

            {/* Base Layer (Grid) - Not Glitched or Lightly Glitched? Let's glitch everything */}

            {/* Content with Filter Applied */}
            <AbsoluteFill
                style={{
                    filter: `url(#glitch-filter)`,
                }}
            >
                <GridBackground />
                <ContentLayer />
            </AbsoluteFill>

            {/* RGB Split Layer (Overlay) - Only visible during high intensity */}
            {intensity > 0.9 && (
                <AbsoluteFill
                    style={{
                        mixBlendMode: 'screen',
                        transform: `translate(${random(frame) * 20 - 10}px, 0)`,
                        opacity: 0.7,
                        filter: 'hue-rotate(90deg)', // 色をずらす
                    }}
                >
                    <GridBackground />
                    <ContentLayer style={{ color: 'red' }} />
                </AbsoluteFill>
            )}
            {/* Additional Flash Layer (Whiteout) */}
            {intensity > 0.98 && (
                <AbsoluteFill style={{ backgroundColor: 'white', opacity: 0.8, mixBlendMode: 'overlay' }} />
            )}
        </AbsoluteFill>
    );
};
