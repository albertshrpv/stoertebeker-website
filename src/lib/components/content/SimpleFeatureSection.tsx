import React from 'react';
import { buildComponent } from '../../components_builder';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import SimpleFeatureSectionEntry from './sub/SimpleFeatureSectionEntry';

interface Props {
    data: {
        title: string;
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const SimpleFeatureSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, title, id, __component } = data;
    const isDev = import.meta.env.DEV;

    let secondary = blocks.some(b => b.text);
    


    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`max-w-[2000px] text-start mx-auto ${padding}`}>
                {title &&
                    <div className="markup mb-6 lg:mb-10">
                        <div
                            id={`ckeditor-${__component}-${id}-title `}
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
                <div className={`grid gap-8 grid-cols-1 md:grid-cols-2 ${blocks.length === 2 ? 'xl:grid-cols-2' : blocks.length === 3 ? 'xl:grid-cols-3' : 'xl:grid-cols-4'}`}>
                    {blocks.map((block, idx) => (
                        <SimpleFeatureSectionEntry key={block.id} block={block} cid={id} __component={__component} secondary={secondary} />
                    ))}
                </div>
            </div>
        </section>
    );
};

export default SimpleFeatureSection;

