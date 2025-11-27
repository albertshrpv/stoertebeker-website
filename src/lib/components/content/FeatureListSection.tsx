import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        title: string;
        text: string;
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}



const FeatureListSection: React.FC<Props> = ({ data, padding }) => {
    const { title, text, blocks, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section id={componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`w-full flex flex-col lg:flex-row gap-8 lg:gap-10 xl:gap-16 justify-center items-center max-w-screen-2xl mx-auto ${padding}`}>
                <div className={`flex flex-col gap-6 lg:gap-10 w-full`}>
                    {
                        title &&
                        <div
                            className="markup"
                        >
                            <Markup markup={title} />
                        </div>
                    }
                    {text &&
                        <div
                            className="markup w-full"
                        >
                            <Markup markup={text} />
                        </div>
                    }
                    <div className="flex flex-col gap-4">
                        {
                            blocks.map((block, i) => (
                                <div key={block.id}>
                                    <div className="flex flex-row gap-4 lg:gap-8 items-start">
                                        <svg className='mt-[8px]' width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="7" cy="7" r="7" fill="#00664F" />
                                        </svg>
                                        <div
                                            className="markup w-full"
                                        >
                                            <div
                                                id={`ckeditor-${__component}-${id}-content`}
                                                className="ckeditor-inline"
                                                contentEditable={isDev}
                                                suppressContentEditableWarning={true}
                                                data-component-id={id}
                                                data-component-type={__component}
                                                data-field-name="content"
                                            >
                                                <Markup markup={block.content} />
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))
                        }
                    </div>
                </div>
            </div>
        </section>
    );
}


export default FeatureListSection;

