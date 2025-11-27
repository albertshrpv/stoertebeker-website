import React from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        title: string;
        textLeft: string;
        textRight: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}



const TitleTextSplit: React.FC<Props> = ({ data, padding }) => {
    const { title, textLeft, textRight, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section id={data.componentSettings?.anchorId} className="overflow-x-clip">
            <div className="w-full flex justify-center bg-white">
                <div className={`flex flex-col max-w-screen-2xl text-neutral-900 gap-6 lg:gap-10 w-full ${padding}`}>
                    {title &&
                        <div
                            className="markup lg:w-1/2"
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
                    <div className="markup flex flex-col text-justify lg:flex-row lg:gap-10 w-full">
                        <div className='w-1/2'>
                            <div
                                id={`ckeditor-${__component}-${id}-textLeft`}
                                className="ckeditor-inline"
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="textLeft"
                            >
                                <Markup markup={textLeft} />
                            </div>
                        </div>
                        <div className='w-1/2'>
                            <div
                                id={`ckeditor-${__component}-${id}-textRight`}
                                className="ckeditor-inline"
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="textRight"
                            >
                                <Markup markup={textRight} />
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
}


export default TitleTextSplit;

