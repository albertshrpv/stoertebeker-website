import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        text: string;
        image: any[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}



const TextImageSplit: React.FC<Props> = ({ data, padding }) => {
    const { text, image, componentSettings, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const images = image;


    return (
        <section id={componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`flex flex-col lg:flex-row w-full gap-6 lg:gap-16 max-w-screen-2xl mx-auto ${padding} ${images.length < 4 ? "items-center" : ""}`}>
                <div
                    className="markup w-full lg:w-2/5"
                >
                    <div
                        id={`ckeditor-${__component}-${id}-text`}
                        className="ckeditor-inline"
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={id}
                        data-component-type={__component}
                        data-field-name="text"
                    >
                        <Markup markup={text} />
                    </div>
                </div>
                <div className="w-full grid grid-cols-3 lg:grid-cols-3 gap-8 lg:gap-10 xl:gap-12">
                    {/* <div className="w-full ld:w-3/5 flex flex-wrap lg:gap-10 xl:gap-12"> */}
                    {images.map((image, i) => (
                        <div className='bg-white border-2 border-primary-500 p-4 lg:p-8 rounded-lg aspect-square'>
                            <img
                                key={i}
                                className={`w-full h-full object-contain`}
                                // src={"https://backend.stoertebeker.de" + image.url + "?format=webp&w=800&embed"}
                                src={"https://backend.stoertebeker.de" + image.url}
                                alt={image.alternativeText}
                            />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}


export default TextImageSplit;

