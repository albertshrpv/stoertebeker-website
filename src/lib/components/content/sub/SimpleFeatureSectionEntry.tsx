import React, { useEffect } from 'react';
import { Markup } from "react-render-markup";
import type { Block } from '../../../interfaces/page';

interface Props {
    block: Block;
    secondary: boolean;
    cid: string;
    __component: string;
}

const SimpleFeatureSectionEntry: React.FC<Props> = ({ block, cid, __component, secondary }) => {
    const { label, text, image, link } = block;
    const isDev = import.meta.env.DEV;


    if (secondary) {
        return (
            <div className='relative flex flex-col justify-between w-full bg-primary-200 rounded-2xl overflow-hidden'>
                <div className='flex flex-col gap-8 lg:gap-10 p-8 lg:p-12 text-neutral-900'>
                    <div className='text-lg md:text-xl xl:text-2xl'>
                        {label}
                    </div>
                    <div className='text-base'>
                        {text}
                    </div>
                </div>
                <a href={link} className={`group relative h-[340px] rounded-2xl ${link ? 'hover:cursor-pointer' : ''} overflow-hidden`}>
                    {image &&
                        <img
                            className={`absolute top-0 left-0 w-full h-full object-cover overflow-hidden rounded-t-2xl group-hover:scale-105 transition-all duration-300 ease-in-out`}
                            srcSet={import.meta.env.STRAPI_URL + image.url + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=1400&embed&quality=60 1200w'}
                            sizes="(max-width: 600px) 100vw, (max-width: 900px) 100vw, (max-width: 1200px) 50vw, 40vw"
                            alt={image.alternativeText}
                        />
                    }
                    <div className='absolute bottom-0 left-0 w-full flex py-4 xl:py-6 px-6 xl:px-6 2xl:px-8 items-center justify-end'>
                        <div className='bg-white w-9 h-9 rounded-full flex items-center justify-center'>
                            <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M6.68164 12.9367V7.27074M6.68164 7.27074V1.60474M6.68164 7.27074H12.3476M6.68164 7.27074H1.01564" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                            </svg>
                        </div>
                    </div>
                </a>
            </div>
        )
    }


    return (
        <a href={link} className={`group relative h-[340px] rounded-2xl ${link ? 'hover:cursor-pointer' : ''} overflow-hidden`}>
            {image &&
                <img
                    className={`absolute top-0 left-0 w-full h-full object-cover overflow-hidden rounded-2xl`}
                    srcSet={import.meta.env.STRAPI_URL + image.url + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + image.url + '?format=webp&w=1400&embed&quality=60 1200w'}
                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 100vw, (max-width: 1200px) 50vw, 40vw"
                    alt={image.alternativeText}
                />
            }
            <div className='absolute bottom-0 left-0 bg-primary-200 w-full flex py-4 xl:py-6 px-6 xl:px-6 2xl:px-8 items-center justify-between rounded-t-2xl group-hover:pb-10 transition-all duration-200'>
                <div
                    className="text-lg md:text-lg 2xl:text-xl"
                    contentEditable={isDev}
                    suppressContentEditableWarning={true}
                    data-component-id={cid}
                    data-component-type={__component}
                    data-block-id={block.id}
                    data-block-field="blocks"
                    data-field-name="label"
                >
                    {label}
                </div>
                <div className='bg-white w-9 h-9 rounded-full flex items-center justify-center'>
                    <svg width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M6.68164 12.9367V7.27074M6.68164 7.27074V1.60474M6.68164 7.27074H12.3476M6.68164 7.27074H1.01564" stroke="#171717" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </div>
            </div>
        </a>
    );
};

export default SimpleFeatureSectionEntry;