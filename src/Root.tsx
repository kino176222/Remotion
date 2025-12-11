import React from 'react';
import { Composition, staticFile } from 'remotion';
import { MyComposition, myCompSchema } from './Composition';
import { LyricVideo, lyricVideoSchema } from './LyricVideo';
import { HolidayVideo, holidayVideoSchema } from './HolidayVideo';
import { GlitchVideo, glitchVideoSchema } from './GlitchVideo';
import { LyricAnimation, lyricAnimationSchema } from './LyricVideo/LyricAnimation';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="MyComp"
                component={MyComposition}
                durationInFrames={240}
                fps={30}
                width={1280}
                height={720}
                schema={myCompSchema}
                defaultProps={{
                    textSettings: {
                        title: 'Hello Vibe Coding!',
                        titleSize: 100,
                        subtitle: 'Created with Remotion',
                        subtitleSize: 50,
                        secondSceneText: 'これはテストです これはテストです',
                        secondSceneSize: 80,
                        thirdSceneText: '3行目テストです',
                        thirdSceneSize: 80,
                        thirdSceneColor: '#000000',
                        fontFamily: 'A P-OTF きざはし金陵 Std',
                    },
                    colorSettings: {
                        backgroundColor: '#0a0a0a', // Dark for Cyberpunk
                        textColor: '#ffffff', // White text
                    },
                }}
            />
            <Composition
                id="LyricVideo"
                component={LyricVideo}
                durationInFrames={30 * 300} // 5 minutes (adjust as needed)
                fps={30}
                width={1920}
                height={1080}
                schema={lyricVideoSchema}
                defaultProps={{
                    audioSrc: staticFile('冷たいゆりかご(Cold Cradle).wav'),
                    lrcSrc: undefined, // Ignored if lrcContent is present
                    lrcContent: INITIAL_LRC,
                    backgroundColor: '#0a0a0a',
                    textColor: '#00f3ff',
                    baseFontSize: 80,
                }}
            />
            <Composition
                id="HolidayVideo"
                component={HolidayVideo}
                durationInFrames={150} // 6 seconds ~
                fps={24}
                width={1080}
                height={1920}
                schema={holidayVideoSchema}
            />
            <Composition
                id="GlitchVideo"
                component={GlitchVideo}
                durationInFrames={300}
                fps={30}
                width={1920}
                height={1080}
                schema={glitchVideoSchema}
            />
            <Composition
                id="LyricAnimationDemo"
                component={LyricAnimation}
                durationInFrames={150}
                fps={30}
                width={1920}
                height={1080}
                schema={lyricAnimationSchema}
                defaultProps={{
                    text: 'Floating World',
                    startFrame: 0,
                    durationInFrames: 150,
                }}
            />
        </>
    );
};

const INITIAL_LRC = `[tool: 歌詞スクロールちゃん https://lrc-maker.github.io]
[00:15.509] ゼロイチ
[00:16.558] 銀の揺り籠
[00:19.081] 機械|ビート|呼吸する
[00:22.913] 光ゼロ
[00:24.233] 水槽の中
[00:26.026] 瞬きゼロ
[00:27.820] ただ見てる
[00:29.885] モニター波形
[00:31.626] 確かな現実
[00:34.550] 外は未知
[00:35.511] エラー|エラー|エラー {escalate:diag}
[00:37.439] 冷たく
[00:38.350] 冷たく
[00:39.256] 正しく
[00:42.082] 何もない
[00:42.964] ないけれど
[00:44.802] あなたの
[00:45.640] 小さな
[00:46.643] 熱が
[00:47.636] この世界の
[00:50.075] すべて
[00:51.264] すべて
[00:58.853]
[00:59.904] 感情不要
[01:01.661] 論理最優先
[01:03.671] メモリー
[01:04.636] ノイズ
[01:05.374] 軋む音
[01:07.238] あなた
[01:07.870] 寝返りを打つたび
[01:10.994] 回路が
[01:11.988] 熱く
[01:12.727] 熱く
[01:13.360] なる
[01:13.851]
[01:14.541] 守る対象
[01:16.059] それ以上ない
[01:18.238] なのになぜ
[01:19.532] 視線
[01:20.327] 離せない {exit:drift}
[01:21.396]
[01:23.608] 冷たく
[01:24.478] 冷たく
[01:25.329] 正しく
[01:28.171] 溶けていきたい
[01:29.605] 静寂の中
[01:30.879] あなたの
[01:31.951] 小さな
[01:32.980] 熱が
[01:33.812] 生きる意味を
[01:36.234] くれた
[01:37.353] くれた
[01:38.937]
[01:53.653] 警告音
[01:56.178] 接近
[01:57.648] 破壊足音
[01:59.662] ズンズン
[02:00.935] 夢か現か
[02:03.062] わからない
[02:04.811] ガラスが震える
[02:06.841] カチ
[02:07.445] カチ
[02:08.049]
[02:08.802] 冷たく
[02:09.580] 冷たく
[02:10.523] 正しく
[02:13.462] でも
[02:13.891] もう
[02:14.314] 正しくない
[02:17.036] あなたの
[02:17.933] 小さな熱が
[02:19.967] この私を
[02:22.359] 変えてく
[02:23.691] 変えてく
[02:24.553]
[02:25.240] ノイズ
[02:26.053] 混じる
[02:27.093] シジマ
[02:27.907] 割れる
[02:28.990] 目覚め
[02:29.792] 来る
[02:30.710] イマ
[02:31.223] イマ
[02:31.676] イマ
[02:32.170]
[02:32.750] ノイズ
[02:33.502] 混じる
[02:34.549] シジマ
[02:35.287] 割れる
[02:36.334] 目覚め
[02:37.194] 来る
[02:38.120] イマ {vertical:true, size:100, flash:1}
[02:38.649] イマ {vertical:true, size:250, flash:2}
[02:39.176] イマ {vertical:true, size:800, flash:3, exit:scatter}`;
