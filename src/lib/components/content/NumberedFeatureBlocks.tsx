import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import SimpleFeatureSectionEntry from './sub/SimpleFeatureSectionEntry';

interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const NumberedFeatureBlocks: React.FC<Props> = ({ data, padding }) => {
    const { blocks, id, __component } = data;
    const hasAnyBlockContent = blocks.some(block => block.text);


    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`max-w-[2000px] text-start mx-auto ${padding}`}>
                <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 ${blocks.length === 2 ? 'xl:grid-cols-2' : !hasAnyBlockContent ? 'xl:grid-cols-2 2xl:grid-cols-3' : 'xl:grid-cols-2'}`}>
                    {blocks.map((block, idx) => (
                        <div key={block.id} className='flex flex-col gap-6 lg:gap-10 bg-grey rounded-2xl p-12 lg:p-16 justify-start items-center text-center'>
                            <div className='bg-primary-500 text-white rounded-full w-12 h-12 flex items-center justify-center text-2xl'>{idx + 1}</div>
                            {block.title && (
                                <div className='text-xl font-[500] font-title'>
                                    {block.title}
                                </div>
                            )}
                            {block.text && (
                                <div className='text-lg font-[300]'>
                                    <Markup markup={block.text} />
                                </div>
                            )}
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default NumberedFeatureBlocks;

