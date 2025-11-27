import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import { placeholderUrl } from '../../utils';

interface Props {
    data: {
        image: any;
        blocks: Block[];
        imagePos: 'left' | 'right';
        componentSettings?: ComponentSettings;
    },
    padding: string;
}

const FeatureListImage: React.FC<Props> = ({ data, padding }) => {
    const { image, blocks, imagePos, componentSettings } = data;

    const imgUrl = image?.url ?? placeholderUrl;
    const imgAlt = image?.alternativeText ?? "";

    const contentPadding = imagePos == "left" ? "lg:pl-10 xl:pl-20 2xl:pl-28" : "lg:pr-10 xl:pr-20 2xl:pr-28";

    return (
        <section id={componentSettings?.anchorId} className={`relative overflow-x-clip flex flex-col lg:flex-row mx-auto w-full justify-center ${componentSettings?.classes}`}>
            <div className={`flex flex-col lg:flex-row items-stretch max-w-[2000px] w-full ${padding}`}>
                {/* Image Section - desktop */}
                <div className={`hidden lg:flex w-full lg:w-1/2 relative ${imagePos == "right" ? "order-2" : "order-1"}`}>
                    <img
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        width="800" height="533"
                        src={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'}
                        srcSet={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed&quality=60 1200w'}
                        sizes="(max-width: 600px) 100vw, (max-width: 900px) 100vw, (max-width: 1200px) 50vw, 40vw"
                        alt={imgAlt}
                        loading="lazy"
                    />
                </div>

                {/* Content Section */}
                <div className={`flex flex-col gap-6 w-full lg:w-1/2 ${contentPadding} my-2 ${imagePos == "right" ? "order-1" : "order-2"}`}>
                    {
                        blocks.map((block, index) => (
                            <div key={index} className="flex items-start gap-4">
                                <div className='min-w-4 w-4 h-4 mt-[6px] lg:mt-2 bg-primary-500'></div>
                                <div className='flex flex-col gap-2 lg:pl-8'>
                                    {block.title &&
                                        <h3 className="text-xl lg:text-2xl font-medium text-neutral-900 dark:text-white">
                                            {block.title}
                                        </h3>
                                    }
                                    <div className="markup dark:text-white">
                                        <Markup markup={block.text} />
                                    </div>
                                </div>
                            </div>
                        ))
                    }
                </div>
            </div>

            {/* Image Section - mobile - slide from left */}
            <div className='block lg:hidden w-full lg:w-1/2'>
                <img
                    className="w-full"
                    width="800" height="533"
                    src={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'}
                    srcSet={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed&quality=60 1200w'}
                    sizes="(max-width: 600px) 100vw, (max-width: 900px) 100vw, (max-width: 1200px) 50vw, 40vw"
                    alt={imgAlt}
                    loading="lazy"
                />
            </div>
        </section>
    );
}

export default FeatureListImage;

