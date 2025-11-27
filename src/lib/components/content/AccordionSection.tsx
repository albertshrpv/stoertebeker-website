import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import AccordionSectionEntry from './sub/AccordionSectionEntry';
import { Markup } from "react-render-markup";
import ActionButton from '../buttons/ActionButton';

interface Props {
    data: {
        title: string;
        text: string;
        secondary: boolean;
        blocks: Block[];
        blocks2: Block;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const AccordionSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, title, text, blocks2, secondary, id, __component } = data;
    const isDev = import.meta.env.DEV;

    if (secondary) {
        return (
            <section id={data.componentSettings?.anchorId} className={`flex flex-col xl:flex-row xl:gap-12 max-w-[2000px] text-start mx-auto ${padding} ${data.componentSettings?.classes}`}>
                <div className='flex flex-col gap-8 dark:text-white xl:w-2/5 xl:pt-6'>
                    {title &&
                        <div className="markup">
                            <div
                                id={`ckeditor-${__component}-${id}-title`}
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="title"
                                className="ckeditor-inline text-3xl/tight md:text-5xl/tight"
                            >
                                <Markup markup={title} />
                            </div>
                        </div>
                    }
                    {text &&
                        <div
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="text"
                            className="text-lg markup"
                        >
                            <Markup markup={text} />
                        </div>
                    }
                    {
                        blocks2 &&
                        <div className='flex'>
                            <ActionButton link={blocks2.link} text={blocks2.text} />
                        </div>
                    }
                </div>
                <div className="space-y-0 xl:w-3/5 mt-8 xl:mt-0" id="accordion-collapse" data-accordion="collapse">
                    {blocks.map((b: any, idx) => <AccordionSectionEntry block={b} index={idx} key={idx} cid={id} __component={__component} />)}
                </div>
            </section>
        );
    }

    return (
        <section id={data.componentSettings?.anchorId} className={`max-w-[2000px] flex flex-col gap-8 lg:gap-16 text-start mx-auto ${padding} ${data.componentSettings?.classes}`}>
            {title &&
                <div className="markup dark:text-white">
                    <div
                        id={`ckeditor-${__component}-${id}-title`}
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={id}
                        data-component-type={__component}
                        data-field-name="title"
                        className="ckeditor-inline text-3xl/tight md:text-5xl/tight"
                    >
                        <Markup
                            markup={title} />
                    </div>
                </div>
            }
            <div className="space-y-6" id="accordion-collapse" data-accordion="collapse">
                {blocks.map((b: any, idx) => <AccordionSectionEntry block={b} index={idx} key={idx} cid={id} __component={__component} />)}
            </div>
            {
                blocks2 &&
                <div className='flex'>
                    <ActionButton link={blocks2.link} text={blocks2.text} />
                </div>
            }
        </section>
    );
};

export default AccordionSection;



