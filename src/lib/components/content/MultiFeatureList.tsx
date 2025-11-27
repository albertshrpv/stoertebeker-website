import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        title: string;
        text: string;
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}



const MultiFeatureList: React.FC<Props> = ({ data, padding }) => {
    const { title, text, blocks, componentSettings, id, __component } = data;

    return (
        <section id={componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`w-full flex flex-col gap-8 xl:gap-16 max-w-[2000px] mx-auto ${padding}`}>
                {title &&
                    <div
                        className="markup"
                    >
                        <Markup markup={title} />
                    </div>
                }
                {text &&
                    <div
                        className="markup"
                    >
                        <Markup markup={text} />
                    </div>
                }
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-12 xl:gap-24 2xl:gap-32">
                    {
                        blocks.map((block, i) => (
                            <div key={block.id} className='space-y-8 lg:space-y-12 2xl:space-y-16'>
                                <h3 className="text-2xl lg:text-3xl xl:text-4xl">{block.title}</h3>
                                <div className='space-y-4'>
                                    {
                                        block.blocks.map((b: any, i: number) => (
                                            <div key={b.id}>
                                                <div className="flex flex-row gap-4 lg:gap-8 items-start">
                                                    <div className='min-w-4 w-4 h-4 mt-[6px] lg:mt-2 bg-primary-500'></div>
                                                    <div
                                                        className="markup w-full"
                                                    >
                                                        <Markup markup={b.content} />
                                                    </div>
                                                </div>
                                            </div>
                                        ))
                                    }
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>
        </section>
    );
}


export default MultiFeatureList;

