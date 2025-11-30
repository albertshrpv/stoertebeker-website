import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import TicketButton from '../../../components/base/TicketButton';

interface Props {
    data: {
        title: string;
        text: string;
        subtitle?: string;
        blocks?: {
            text: string;
            link: string;
            external?: boolean;
        }[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const TitleText: React.FC<Props> = ({ data, padding }) => {
    const { title, text, subtitle, blocks, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;



    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes} bg-darkBlue`}>
            <div className={`flex flex-col gap-8 lg:gap-16 max-w-screen-2xl mx-auto w-full ${padding} text-white`}>
                {
                    subtitle &&
                    <div className='text-base lg:text-xl mb-2'>
                        {subtitle}
                    </div>
                }
                {title &&
                    <div
                        className={`w-full`}
                    >
                        <div className='markup font-title'>
                            <Markup markup={title} />
                        </div>
                    </div>
                }
                {text &&
                    <div
                        className={`w-full`}
                    >
                        <div>
                            <div className='markup'>
                                <Markup markup={text} />
                            </div>
                        </div>
                    </div>
                }
                {blocks && blocks.length > 0 &&
                    <div className='flex flex-col md:flex-row gap-4'>
                        {blocks.map((block, i) => (
                            <TicketButton
                                key={i}
                                text={block.text}
                                href={block.link}
                                style="secondary"
                            />
                        ))}
                    </div>
                }
            </div>
        </section>

    );
}

export default TitleText;

