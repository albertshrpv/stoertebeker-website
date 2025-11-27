import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';

interface Props {
    data: {
        image: any;
        blocks: {
            title: string;
            stat: string;
        }[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
}

const StatSection: React.FC<Props> = ({ data }) => {
    const { image, blocks, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const imgUrl = image?.url ?? "";
    const imgAlt = image?.alternativeText ?? "";

    const textPadding = "p-8 sm:p-16 xl:p-28 2xl:p-40";


    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`flex flex-col lg:flex-row w-full`}>
                <div className='w-full lg:w-1/2 order-2 lg:order-1'>
                    <img
                        className="w-full h-full object-cover"
                        width="800" height="533"
                        src={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'}
                        srcSet={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed&quality=60 1200w'}
                        sizes="(max-width: 600px) 40vw, (max-width: 900px) 60vw, (max-width: 1200px) 50vw, 40vw"
                        alt={imgAlt}
                        loading="lazy"
                    />
                </div>
                <div className={`w-full lg:w-1/2 bg-primary-200 ${textPadding} order-1 lg:order-2`}>
                    <div className='w-full h-full grid grid-cols-2 justify-between gap-12 md:gap-16 lg:gap-12 my-8 lg:my-0'>
                        {blocks && blocks.map((block, index) => (
                            <div key={index} className='flex flex-col gap-2 items-center justify-center lg:aspect-[3/2]'>
                                <div className='anim-text text-4xl xl:text-5xl 2xl:text-6xl'>{block.stat}</div>
                                <div className='text-sm sm:text-base lg:text-lg xl:text-xl'>{block.title}</div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </section>

    );
}

export default StatSection;

