import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';
import type { CTA } from '../../interfaces/cta';
import { componentContentPadding } from '../../utils';

interface Props {
    data: {
        title: string;
        text: string;
        image: any;
        cta?: CTA;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const ContentBanner: React.FC<Props> = ({ data, padding }) => {
    const { title, text, image, cta, componentSettings, id, __component } = data;

    const textPadding = "lg:pl-16 xl:pl-24 lg:py-2";


    return (
        <section id={componentSettings?.anchorId} className={`overflow-x-clip ${componentSettings?.classes} bg-primary-500 w-full`}>
            <div className="w-full lg:hidden">
                <img
                    className="w-full h-full object-cover"
                    width="800"
                    height="533"
                    src={import.meta.env.STRAPI_URL + image.url + "?format=webp&w=1400&embed"}
                    srcSet={
                        import.meta.env.STRAPI_URL +
                        image.url +
                        "?format=webp&w=300&embed&quality=30 320w, " +
                        import.meta.env.STRAPI_URL +
                        image.url +
                        "?format=webp&w=800&embed&quality=50 600w, " +
                        import.meta.env.STRAPI_URL +
                        image.url +
                        "?format=webp&w=800&embed&quality=60 900w, " +
                        import.meta.env.STRAPI_URL +
                        image.url +
                        "?format=webp&w=1400&embed&quality=60 1200w"
                    }
                    sizes="(max-width: 600px) 40vw, (max-width: 900px) 60vw, (max-width: 1200px) 50vw, 40vw"
                    alt={image.alternativeText}
                    loading="lazy"
                />
            </div>
            <div className={`max-w-screen-2xl mx-auto w-full flex flex-col lg:flex-row items-stretch ${componentContentPadding}`}>
                <div className="w-full lg:w-1/2 relative">
                    <img
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        width="800"
                        height="533"
                        src={import.meta.env.STRAPI_URL + image.url + "?format=webp&w=1400&embed"}
                        srcSet={
                            import.meta.env.STRAPI_URL +
                            image.url +
                            "?format=webp&w=300&embed&quality=30 320w, " +
                            import.meta.env.STRAPI_URL +
                            image.url +
                            "?format=webp&w=800&embed&quality=50 600w, " +
                            import.meta.env.STRAPI_URL +
                            image.url +
                            "?format=webp&w=800&embed&quality=60 900w, " +
                            import.meta.env.STRAPI_URL +
                            image.url +
                            "?format=webp&w=1400&embed&quality=60 1200w"
                        }
                        sizes="(max-width: 600px) 40vw, (max-width: 900px) 60vw, (max-width: 1200px) 50vw, 40vw"
                        alt={image.alternativeText}
                        loading="lazy"
                    />
                </div>
                <div className={`w-full lg:w-1/2 flex flex-col gap-8 xl:gap-12 justify-start items-start max-w-screen-2xl mx-auto ${textPadding}`}>
                    <div className='text-white text-left text-xl lg:text-2xl xl:text-3xl 2xl:text-4xl'>
                        <Markup markup={title} />
                    </div>
                    <div className='markup text-white'>
                        <Markup markup={text} />
                    </div>
                    {cta && (
                        <div className='lg:flex'>
                            <ActionButton text={cta.text} link={cta.link} secondary={true} />
                        </div>
                    )}
                </div>
            </div>
        </section>
    );
}

export default ContentBanner;

