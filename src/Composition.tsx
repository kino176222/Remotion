import { z } from 'zod';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, AbsoluteFill } from 'remotion';
import React from 'react';

// アニメーション付きの1行テキストコンポーネント
const AnimatedTextLine: React.FC<{
  text: string;
  fontSize: number;
  delayOffset: number;
  color: string;
}> = ({ text, fontSize, delayOffset, color }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split('');

  return (
    <div style={{ fontSize, color, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {chars.map((char, i) => {
        const delay = delayOffset + i * 3; // 文字ごとの遅延

        const progress = spring({
          frame: frame - delay,
          fps,
          config: { damping: 12, stiffness: 100 },
        });

        const rotate = interpolate(progress, [0, 1], [180, 0]);
        const opacity = interpolate(progress, [0, 1], [0, 1]);
        const scale = interpolate(progress, [0, 1], [0, 1]);

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${scale}) rotate(${rotate}deg)`,
              opacity,
              margin: '0 2px',
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

// 虹色に波打つテキストコンポーネント
const RainbowWavyText: React.FC<{
  text: string;
  fontSize: number;
}> = ({ text, fontSize }) => {
  const frame = useCurrentFrame();
  const chars = text.split('');

  return (
    <div style={{ fontSize, display: 'inline-block', whiteSpace: 'nowrap', fontWeight: 'bold' }}>
      {chars.map((char, i) => {
        // 波の動き: sin波 (フレーム数と文字のインデックスでずらす)
        const y = Math.sin(frame / 10 + i * 0.5) * 20;

        // 虹色: HSL (フレーム数とインデックスで色相を回転)
        const hue = (frame * 5 + i * 10) % 360;
        const color = `hsl(${hue}, 100%, 50%)`;

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `translateY(${y}px)`,
              color,
              margin: '0 2px',
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

// タイプライター風テキストコンポーネント
const TypewriterText: React.FC<{
  text: string;
  fontSize: number;
  color: string;
}> = ({ text, fontSize, color }) => {
  const frame = useCurrentFrame();
  const textToShow = text.slice(0, Math.floor(frame / 5)); // 5フレームごとに1文字追加
  const cursorVisible = Math.floor(frame / 15) % 2 === 0; // カーソル点滅
  const isFinished = textToShow.length === text.length;

  return (
    <div
      style={{
        fontSize,
        color,
        fontFamily: 'Courier New, monospace',
        display: 'flex',
        alignItems: 'center',
        fontWeight: 'bold',
      }}
    >
      {textToShow.split('').map((char, i) => {
        const isLast = i === textToShow.length - 1;
        // 最後の文字だけ少し大きくポップさせる
        const scale = isLast && !isFinished ? 1.5 : 1;

        return (
          <span key={i} style={{ transform: `scale(${scale})`, display: 'inline-block', transition: 'transform 0.1s' }}>
            {char}
          </span>
        );
      })}
      <span style={{ opacity: cursorVisible ? 1 : 0, marginLeft: 5 }}>|</span>
    </div>
  );
};

export const myCompSchema = z.object({
  textSettings: z.object({
    title: z.string().describe('メインタイトル'),
    titleSize: z.number().describe('タイトルのサイズ'),
    subtitle: z.string().describe('サブタイトル'),
    subtitleSize: z.number().describe('サブタイトルのサイズ'),
    secondSceneText: z.string().describe('2シーン目のテキスト'),
    thirdSceneText: z.string().describe('3シーン目のテキスト'), // 新しい項目の追加
  }).describe('テキスト設定'),
  colorSettings: z.object({
    backgroundColor: z.string().describe('背景色'),
    textColor: z.string().describe('文字色'),
  }).describe('カラー設定'),
});

export const MyComposition: React.FC<z.infer<typeof myCompSchema>> = ({
  textSettings,
  colorSettings,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const title = textSettings?.title ?? 'Hello Vibe Coding!';
  const titleSize = textSettings?.titleSize ?? 100;
  const subtitle = textSettings?.subtitle ?? 'with Remotion';
  const subtitleSize = textSettings?.subtitleSize ?? 50;
  // デフォルト値を設定
  const secondSceneText = textSettings?.secondSceneText ?? 'これはテストです これはテストです';
  const thirdSceneText = textSettings?.thirdSceneText ?? '3行目テストです';

  const backgroundColor = colorSettings?.backgroundColor ?? '#ffffff';
  const textColor = colorSettings?.textColor ?? '#000000';

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Scene 1: 0 - 120 (4s) */}
      <Sequence durationInFrames={120}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          {/* タイトル: 左上からスライドイン */}
          {(() => {
            const slideProgress = spring({
              frame,
              fps,
              config: { damping: 15 },
            });
            // 左上(-1000, -600) から 中央(0, 0) へ移動
            const x = interpolate(slideProgress, [0, 1], [-1000, 0]);
            const y = interpolate(slideProgress, [0, 1], [-600, 0]);

            return (
              <div style={{ transform: `translate(${x}px, ${y}px)` }}>
                <AnimatedTextLine
                  text={title}
                  fontSize={titleSize}
                  color={textColor}
                  delayOffset={0}
                />
              </div>
            );
          })()}

          <AnimatedTextLine
            text={subtitle}
            fontSize={subtitleSize}
            color={textColor}
            delayOffset={15}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: 120 - 270 (5s) */}
      <Sequence from={120} durationInFrames={150}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <RainbowWavyText
            text={secondSceneText}
            fontSize={80}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: 270 - End */}
      <Sequence from={270}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <TypewriterText
            text={thirdSceneText}
            fontSize={80}
            color={textColor}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
