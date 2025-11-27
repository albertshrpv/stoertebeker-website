import React, { useState } from 'react';
import type { Block, ComponentSettings } from '../../../interfaces/page';
import ComplexAccordionSectionEntry from './ComplexAccordionSectionEntry';
import { Markup } from "react-render-markup";
import ActionButton from '../../buttons/ActionButton';

interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const ComplexAccordion: React.FC<Props> = ({ data, padding }) => {
    const { blocks, id, __component } = data;

    const [activeIndex, setActiveIndex] = useState(0);
    const [activeBlock, setActiveBlock] = useState(blocks[0]);

    const handleClick = (index: number) => {
        setActiveIndex(index);
        setActiveBlock(blocks[index]);
    }


    return (
        <section
            id={data.componentSettings?.anchorId}
            className={`hidden max-w-[2000px] text-start mx-auto ${padding} ${data.componentSettings?.classes}`}
            island-id={`complex-accordion-${id}`}
        >
            <div className='flex flex-col lg:flex-row gap-4 bg-primary-500 p-1 rounded-lg mb-12 lg:mb-20'>
                {blocks.map((b: any, idx: number) =>
                    <div
                        key={idx}
                        className={`w-full flex justify-center items-center gap-4 px-12 py-3 rounded-lg hover:cursor-pointer ${activeIndex == idx ? 'bg-white text-neutral-900' : 'bg-transparent text-white'} transition-all duration-300`}
                        onClick={() => handleClick(idx)}
                    >
                        <h3 className='xl:text-lg text-center'>{b.label}</h3>
                    </div>
                )}
            </div>

            <div className="space-y-6">
                {activeBlock.blocks.map((b: any, idx: number) => 
                    <ComplexAccordionSectionEntry 
                        block={b} 
                        activeIndex={activeIndex} 
                        index={idx} 
                        key={idx} 
                        cid={id} 
                        __component={__component} 
                    />
                )}
            </div>
        </section>
    );
};

export default ComplexAccordion;



