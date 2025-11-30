import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import CornerBorderedContainer from '../../../components/ticketshop/components/CornerBorderedContainer';

interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;

}



const BigButtonSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks } = data;

    return (
        <section id={data.componentSettings?.anchorId} className="bg-darkBlue w-full py-12 lg:py-20">
            <div className={`max-w-screen-2xl text-start mx-auto ${padding}`}>
                <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                    {blocks.map((block, idx) => (
                        <a
                            key={idx}
                            id={`big-button-${idx}`}
                            href={block.link}
                            target="_blank"
                            rel="noopener noreferrer"
                            className='block w-full group'
                        >
                            <CornerBorderedContainer
                                className="aspect-square w-full"
                                innerClassName="h-full flex justify-center items-center text-white text-2xl md:text-3xl lg:text-4xl font-medium group-hover:bg-white group-hover:text-darkBlue transition-colors duration-300"
                                borderColor="border-white"
                                cornerBgColor="bg-darkBlue"
                                padding="p-0"
                                radius={2.5}
                            >
                                {block.label}
                            </CornerBorderedContainer>
                        </a>
                    ))}
                </div>
            </div>
        </section >
    );
}


export default BigButtonSection;

