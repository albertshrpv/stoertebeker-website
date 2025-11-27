import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';

interface Props {
    data: {
        title: string;
        text: string;
        secondary?: boolean;
        blocks?: {
            text: string;
            link: string;
            external?: boolean;
        }[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const TitleTextBasic: React.FC<Props> = ({ data, padding }) => {
    const { title, text, secondary, blocks, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    

    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`flex ${secondary ? 'flex-col lg:flex-row' : 'flex-col gap-8 lg:gap-16'} max-w-[2000px] mx-auto w-full ${padding}`}>
                {title &&
                    <div
                        className={`${secondary ? 'w-full pb-8 lg:pb-0 lg:pr-24' : 'w-full'}`}
                    >
                        <div className='markup'>
                            <Markup markup={title} />
                        </div>
                    </div>
                }
                {text &&
                    <div
                        className="w-full"
                    >
                        <div>
                            <div className='markup'>
                                <Markup markup={text} />
                            </div>
                            {secondary && blocks && blocks.length > 0 &&
                                <div className='flex flex-col md:flex-row gap-4 mt-8'>
                                    {blocks.map((block, i) => (
                                        <ActionButton
                                            key={i}
                                            text={block.text}
                                            link={block.link}
                                            external={block.external}
                                        />
                                    ))}
                                </div>
                            }
                        </div>
                    </div>
                }
                {!secondary && blocks && blocks.length > 0 &&
                    <div className='flex flex-col md:flex-row gap-4 xl:-mt-12'>
                        {blocks.map((block, i) => (
                            <ActionButton
                                key={i}
                                text={block.text}
                                link={block.link}
                                external={block.external}
                            />
                        ))}
                    </div>
                }
            </div>
        </section>

    );
}

export default TitleTextBasic;

