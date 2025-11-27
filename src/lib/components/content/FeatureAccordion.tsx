import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import AccordionSectionEntry from './sub/AccordionSectionEntry';
import { Markup } from "react-render-markup";
import ActionButton from '../buttons/ActionButton';
import FeatureAccordionEntry from './sub/FeatureAccordionEntry';

interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const FeatureAccordion: React.FC<Props> = ({ data, padding }) => {
    const { blocks, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section id={data.componentSettings?.anchorId} className={`max-w-[2000px] text-start mx-auto ${padding} ${data.componentSettings?.classes}`}>
            <div className="space-y-6" id="accordion-collapse" data-accordion="collapse">
                {blocks.map((b: any, idx) => <FeatureAccordionEntry block={b} index={idx} key={idx} cid={id} __component={__component} />)}
            </div>
        </section>
    );
};

export default FeatureAccordion;



