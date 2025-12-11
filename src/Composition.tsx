import { z } from 'zod';
import { interpolate, spring, useCurrentFrame, useVideoConfig, Sequence, AbsoluteFill } from 'remotion';
import React from 'react';

// 強調アニメーション（オーバーシュート＆スタッガー）コンポーネント
const StaggeredEmphasisText: React.FC<{
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
  delayOffset: number;
}> = ({ text, fontSize, color, fontFamily, delayOffset }) => {
  const frame = useCurrentFrame();
  const chars = text.split('');

  return (
    <div style={{ fontSize, color, fontFamily, display: 'inline-block', whiteSpace: 'nowrap' }}>
      {chars.map((char, i) => {
        // スタッガー（一文字ずつ遅らせる）
        const charDelay = delayOffset + i * 2; // 2フレームずつ遅延
        const time = Math.max(0, frame - charDelay);

        // スケールアニメーション (110% -> 95% -> 100%)
        // 0-5f: 0 -> 1.1
        // 5-8f: 1.1 (Wait)
        // 8-12f: 1.1 -> 0.95
        // 12-15f: 0.95 -> 1.0
        const scale = interpolate(
          time,
          [0, 5, 8, 12, 15],
          [0, 1.1, 1.1, 0.95, 1],
          { extrapolateRight: 'clamp' }
        );

        // スライドイン (右から左へ)
        // 0-5f: 100px -> 0px
        const translateX = interpolate(
          time,
          [0, 8],
          [100, 0],
          { extrapolateRight: 'clamp', easing: (t) => t * (2 - t) } // Ease out
        );

        // 透明度
        const opacity = interpolate(time, [0, 5], [0, 1], { extrapolateRight: 'clamp' });

        return (
          <span
            key={i}
            style={{
              display: 'inline-block',
              transform: `scale(${scale}) translateX(${translateX}px)`,
              opacity,
              marginRight: char === ' ' ? '0.2em' : '0', // スペースの幅調整
              transformOrigin: '50% 80%', // 下部中心を基準にすると「跳ねる」感じが出やすい
            }}
          >
            {char}
          </span>
        );
      })}
    </div>
  );
};

// アニメーション付きの1行テキストコンポーネント
const AnimatedTextLine: React.FC<{
  text: string;
  fontSize: number;
  delayOffset: number;
  color: string;
  fontFamily?: string;
}> = ({ text, fontSize, delayOffset, color, fontFamily }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const chars = text.split('');

  return (
    <div style={{ fontSize, color, fontFamily, display: 'inline-block', whiteSpace: 'nowrap' }}>
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

// スライス・シャッターエフェクト（上下分割＆ズレ）
const SlicedText: React.FC<{
  text: string;
  fontSize: number;
  fontFamily?: string;
}> = ({ text, fontSize, fontFamily }) => {
  const frame = useCurrentFrame();

  // 激しいスライスアニメーション
  // sin波で左右に行ったり来たりさせる
  const shift = Math.sin(frame / 2) * 10; // 揺れ幅

  // 色収差（RGB Split）用のオフセット
  const rgbOffset = Math.sin(frame / 3) * 3;

  const baseStyle: React.CSSProperties = {
    fontSize,
    fontFamily,
    fontWeight: '900',
    whiteSpace: 'nowrap',
    position: 'absolute',
    left: '50%',
    top: '50%',
    transform: 'translate(-50%, -50%)',
  };

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      {/* 上半分 */}
      <div
        style={{
          ...baseStyle,
          clipPath: 'polygon(0 0, 100% 0, 100% 50%, 0 50%)',
          transform: `translate(calc(-50% + ${shift}px), -50%)`, // 右へズレる
          color: 'cyan', // 上はシアン寄り
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </div>

      {/* 下半分 */}
      <div
        style={{
          ...baseStyle,
          clipPath: 'polygon(0 50%, 100% 50%, 100% 100%, 0 100%)',
          transform: `translate(calc(-50% - ${shift}px), -50%)`, // 左へズレる
          color: 'magenta', // 下はマゼンタ寄り
          mixBlendMode: 'screen',
        }}
      >
        {text}
      </div>

      {/* 真ん中の白芯（可読性確保＆チラつき） */}
      <div
        style={{
          ...baseStyle,
          color: 'white',
          opacity: 0.8,
          transform: `translate(calc(-50% + ${rgbOffset}px), calc(-50% - ${rgbOffset}px))`,
          mixBlendMode: 'overlay'
        }}
      >
        {text}
      </div>
    </div>
  );
};

// タイプライター風テキストコンポーネント
const TypewriterText: React.FC<{
  text: string;
  fontSize: number;
  color: string;
  fontFamily?: string;
}> = ({ text, fontSize, color, fontFamily }) => {
  const frame = useCurrentFrame();
  const textToShow = text.slice(0, Math.floor(frame / 5)); // 5フレームごとに1文字追加
  const cursorVisible = Math.floor(frame / 15) % 2 === 0; // カーソル点滅
  const isFinished = textToShow.length === text.length;

  return (
    <div
      style={{
        fontSize,
        color,
        fontFamily: fontFamily ?? 'Courier New, monospace',
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
    secondSceneSize: z.number().describe('2シーン目のサイズ'),
    thirdSceneText: z.string().describe('3シーン目のテキスト'),
    thirdSceneSize: z.number().describe('3シーン目のサイズ'),
    thirdSceneColor: z.string().describe('3シーン目の色'),
    fontFamily: z.string().describe('フォント名 (例: RoG2SanserifStd-Bd)'),
  }).describe('テキスト設定'),
  colorSettings: z.object({
    backgroundColor: z.string().describe('背景色'),
    textColor: z.string().describe('全体文字色'),
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

  const secondSceneText = textSettings?.secondSceneText ?? 'これはテストです これはテストです';
  const secondSceneSize = textSettings?.secondSceneSize ?? 80;

  const thirdSceneText = textSettings?.thirdSceneText ?? '3行目テストです';
  const thirdSceneSize = textSettings?.thirdSceneSize ?? 80;

  const backgroundColor = colorSettings?.backgroundColor ?? '#0a0a0a';
  // 全体のデフォルト色
  const globalTextColor = colorSettings?.textColor ?? '#ffffff';
  // 3シーン目は個別指定があればそれを使い、なければ全体色を使う
  const thirdSceneColor = textSettings?.thirdSceneColor ?? globalTextColor;

  // フォント設定
  const fontFamily = textSettings?.fontFamily ?? 'sans-serif';

  return (
    <AbsoluteFill style={{ backgroundColor }}>
      {/* Scene 1: 0 - 120 (4s) */}
      <Sequence durationInFrames={120}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 20 }}>
          {/* タイトル: ガイド指定の強調アニメーション (Slide -> Overshoot) */}
          <StaggeredEmphasisText
            text={title}
            fontSize={titleSize}
            color={globalTextColor}
            fontFamily={fontFamily}
            delayOffset={10} // 少し待ってから開始
          />

          <AnimatedTextLine
            text={subtitle}
            fontSize={subtitleSize}
            color={globalTextColor}
            fontFamily={fontFamily}
            delayOffset={45} // タイトルが終わったころに開始
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 2: 120 - 270 (5s) */}
      <Sequence from={120} durationInFrames={150}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <SlicedText
            text={secondSceneText}
            fontSize={secondSceneSize}
            fontFamily={fontFamily}
          />
        </AbsoluteFill>
      </Sequence>

      {/* Scene 3: 270 - End */}
      <Sequence from={270}>
        <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
          <TypewriterText
            text={thirdSceneText}
            fontSize={thirdSceneSize}
            color={thirdSceneColor}
            fontFamily={fontFamily}
          />
        </AbsoluteFill>
      </Sequence>
    </AbsoluteFill>
  );
};
