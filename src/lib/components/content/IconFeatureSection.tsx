import React from 'react';
import { buildComponent } from '../../components_builder';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import SimpleFeatureSectionEntry from './sub/SimpleFeatureSectionEntry';
import { STRAPI_URL } from '../../../environment';
    
interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const IconFeatureSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, id, __component } = data;

    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`max-w-[2000px] text-start mx-auto ${padding}`}>
                <div className={`grid gap-12 md:gap-8 grid-cols-1 md:grid-cols-2 ${blocks.length === 2 ? 'xl:grid-cols-2' : 'xl:grid-cols-3'}`}>
                    {blocks.map((block, idx) => (
                        <div className='flex flex-col gap-6 lg:gap-8 w-full lg:mb-12 xl:mb-16'>
                            <div className='bg-primary-500 w-12 h-12 rounded-md p-3 flex items-center justify-center mb-4'>
                                <img
                                    className={`w-full h-full object-contain`}
                                    src={STRAPI_URL + block.image.url}
                                    alt={block.image.alternativeText}
                                />
                            </div>
                            {block.title &&
                                <div className='text-lg font-title md:text-xl xl:text-2xl font-semibold'>
                                    {block.title}
                                </div>
                            }
                            <div className='markup'>
                                <Markup markup={block.text} />
                            </div>
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
};

export default IconFeatureSection;

