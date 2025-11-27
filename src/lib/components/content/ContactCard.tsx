import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";

interface Props {
    data: {
        title: any;
        blocks: any;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const ContactCard: React.FC<Props> = ({ data, padding }) => {
    const { title, blocks: partner, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const textPadding = "lg:pl-16 xl:pl-24 lg:py-2";

    const image = partner.image;



    return (
        <section id={componentSettings?.anchorId} className={`overflow-x-clip ${componentSettings?.classes}`}>
            <div className={`max-w-screen-2xl mx-auto w-full flex flex-col lg:flex-row items-stretch ${padding}`}>
                <div
                    className={`flex items-end aspect-[1.2/1] bg-primary-200 w-full lg:w-1/3 flex-shrink-0 rounded-2xl overflow-hidden`}
                >
                    <div className="w-full h-[90%] relative">
                        <img
                            src={`https://backend.stoertebeker.de${image.url}?format=webp&w=1000&q=50`}
                            className="w-full h-full object-cover object-top"
                            alt={image.alternativeText}
                            loading="lazy"
                        />
                    </div>
                </div>
                <div className={`w-full lg:w-2/3 flex flex-col gap-8 xl:gap-12 justify-center items-start max-w-screen-2xl mx-auto ${textPadding}`}>
                    <div className='markup mt-6 lg:mt-0'>
                        <Markup markup={title} />
                    </div>
                    <div>
                        <div className='text-2xl xl:text-3xl 2xl:text-4xl lg:mb-2'>{partner.name}</div>
                        <div className='text-xl text-neutral-600 whitespace-pre-line'>{partner.titles}</div>
                    </div>
                    <div className="flex w-full flex-col lg:flex-row justify-between gap-4">
                        <a href={`tel:${partner.phone}`} className="bg-primary-500 w-full text-white text-lg px-8 py-3 rounded-lg text-center">
                            T: {partner.phone}
                        </a>
                        <a href={`mailto:${partner.email}`} className="bg-primary-500 w-full text-white text-lg px-8 py-3 rounded-lg text-center">
                            {partner.email}
                        </a>
                    </div>
                </div>
            </div>
        </section>
    );

}

export default ContactCard;

