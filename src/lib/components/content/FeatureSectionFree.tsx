import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import FeatureSectionEntry from './sub/FeatureSectionEntry';
import { componentContentPadding, evaluateContentPadding } from '../../utils';

interface Props {
    data: {
        title: string;
        blocks: Block[];
        secondary?: boolean;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const FeatureSectionFree: React.FC<Props> = ({ data, padding }) => {
    const { blocks, title, id, __component, secondary } = data;
    const isDev = import.meta.env.DEV;

    if (secondary) {
        return (
            <section id={data.componentSettings?.anchorId} className="overflow-x-clip">
                <div className="w-full flex justify-center">
                    <div className={`max-w-screen-2xl space-y-12 text-start mx-auto ${padding}`}>
                        {title &&
                            <div
                                className="markup"
                            >
                                <div
                                    id={`ckeditor-${__component}-${id}-title`}
                                    className="ckeditor-inline"
                                    contentEditable={isDev}
                                    suppressContentEditableWarning={true}
                                    data-component-id={id}
                                    data-component-type={__component}
                                    data-field-name="title"
                                >
                                    <Markup markup={title} />
                                </div>
                            </div>

                        }
                        <div className="flex flex-col gap-12">
                            {blocks.map((block, idx) => (
                                <FeatureSectionEntry key={block.documentId} block={block} idx={idx} cid={id} __component={__component} secondary={true} />
                            ))}
                        </div>
                    </div>
                </div>
            </section>
        );
    }

    return (
        <section id={data.componentSettings?.anchorId} className="overflow-x-clip">
            <div className="w-full flex justify-center">
                <div className={`max-w-screen-2xl text-start mx-auto ${padding}`}>
                    {title &&
                        <div
                            className="markup mb-6 lg:mb-10"
                        >
                            <div
                                id={`ckeditor-${__component}-${id}-title`}
                                className="ckeditor-inline"
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="title"
                            >
                                <Markup markup={title} />
                            </div>
                        </div>

                    }
                    {
                        blocks.length > 2 ? (
                            <div className="grid gap-6 md:gap-8 md:grid-cols-2 xl:grid-cols-3">
                                {blocks.map((block, idx) => (
                                    <FeatureSectionEntry key={block.documentId} block={block} idx={idx} cid={id} __component={__component} />
                                ))}
                            </div>
                        ) : (
                            <div className="grid gap-6 md:gap-8 md:grid-cols-2">
                                {blocks.map((block, idx) => (
                                    <FeatureSectionEntry key={block.documentId} block={block} idx={idx} fixHeight={true} cid={id} __component={__component} />
                                ))}
                            </div>
                        )
                    }
                </div>
            </div>
        </section>
    );
};

export default FeatureSectionFree;

