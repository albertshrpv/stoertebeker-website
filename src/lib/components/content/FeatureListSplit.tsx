import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        title: string;
        text: string;
        blocks: Block[];
        numbered: boolean;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}



const FeatureListSplit: React.FC<Props> = ({ data, padding }) => {
    const { title, text, blocks, numbered, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    // Calculate the split point for the blocks
    const splitIndex = Math.ceil(blocks.length / 2);
    const leftBlocks = blocks.slice(0, splitIndex);
    const rightBlocks = blocks.slice(splitIndex);

    return (
        <section id={componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`w-full space-y-8 lg:space-y-16 max-w-[2000px] mx-auto ${padding}`}>
                {
                    title &&
                    <div
                        className="markup"
                    >
                        <div
                            id={`ckeditor-${__component}-${id}-title`}
                            className="ckeditor-inline"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="title"
                        >
                            <Markup markup={title} />
                        </div>
                    </div>
                }
                {
                    text &&
                    <div
                        className="markup"
                    >
                        <div
                            id={`ckeditor-${__component}-${id}-text`}
                            className="ckeditor-inline"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="text"
                        >
                            <Markup markup={text} />
                        </div>
                    </div>
                }
                <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-16">
                    <div className="space-y-8">
                        {leftBlocks.map((block, i) => (
                            <div key={block.id} className='flex gap-4 lg:gap-8'>
                                <div className='flex'>
                                    {numbered ?
                                        <div className='flex items-center font-title font-semibold text-lg justify-center w-8 h-8 rounded-full bg-primary-500 text-white'>
                                            {i + 1}
                                        </div> :
                                        <div className='min-w-4 w-4 h-4 mt-[6px] lg:mt-2 bg-primary-500'></div>

                                    }
                                </div>
                                <div className='space-y-4'>
                                    {block.title &&
                                        <h3 className="text-xl lg:text-2xl font-bold break-words break-all">{block.title}</h3>
                                    }
                                    <div className="markup w-full">
                                        <Markup markup={block.content} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                    <div className="space-y-8">
                        {rightBlocks.map((block, i) => (
                            <div key={block.id} className='flex gap-4 lg:gap-8'>
                                <div className='flex'>
                                    {numbered ?
                                        <div className='flex items-center font-title font-semibold text-lg justify-center w-8 h-8 rounded-full bg-primary-500 text-white'>
                                            {i + splitIndex + 1}
                                        </div> :
                                        <div className='min-w-4 w-4 h-4 mt-[6px] lg:mt-2 bg-primary-500'></div>
                                    }
                                </div>
                                <div className='space-y-4'>
                                    {block.title &&
                                        <h3 className="text-xl lg:text-2xl font-bold break-words break-all">{block.title}</h3>
                                    }
                                    <div className="markup w-full">
                                        <Markup markup={block.content} />
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>
    );
}


export default FeatureListSplit;

