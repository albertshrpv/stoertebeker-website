import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';
import type { CTA } from '../../interfaces/cta';

interface Props {
    data: {
        text: any;
        cta: CTA;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
}

const CTABanner: React.FC<Props> = ({ data }) => {
    const { text, cta, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const textPadding = "p-12 sm:p-16 xl:p-24";

    
    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes} bg-primary-500 w-full`}>
            <div className={`flex flex-col gap-8 lg:gap-16 lg:flex-row w-full justify-between items-center max-w-screen-2xl mx-auto ${textPadding}`}>
                {/* <div className='text-white text-center lg:text-left text-xl lg:text-2xl xl:text-3xl/10 whitespace-pre-wrap'> */}
                <div className='text-white text-center lg:text-left text-xl lg:text-2xl xl:text-3xl/[2.75rem] whitespace-pre-wrap'>
                    {text}
                </div>
                <div className='lg:flex'>
                    <ActionButton text={cta.text} link={cta.link} secondary={true} />
                </div>
            </div>
        </section>

    );
}

export default CTABanner;

