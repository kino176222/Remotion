import { Composition } from 'remotion';
import { MyComposition, myCompSchema } from './Composition';

export const RemotionRoot: React.FC = () => {
    return (
        <>
            <Composition
                id="HelloVibe4"
                component={MyComposition}
                durationInFrames={420}
                fps={30}
                width={1920}
                height={1080}
                schema={myCompSchema}
                defaultProps={{
                    textSettings: {
                        title: 'Hello Vibe Coding!',
                        titleSize: 100,
                        subtitle: 'Created with Remotion',
                        subtitleSize: 50,
                        secondSceneText: 'これはテストです これはテストです',
                        thirdSceneText: '3行目テストです',
                    },
                    colorSettings: {
                        backgroundColor: '#ffffff',
                        textColor: '#000000',
                    },
                }}
            />
        </>
    );
};
