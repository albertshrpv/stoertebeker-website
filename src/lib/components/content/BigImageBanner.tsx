import React from 'react';
import { Markup } from "react-render-markup";
import ActionButton from '../buttons/ActionButton';
import type { ComponentSettings } from '../../interfaces/page';
import { STRAPI_URL } from '../../../environment';

interface Props {
    data: {
        title: string;
        subtitle: string;
        text: string;
        image: any;
        ctaLink: string;
        height: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const BigImageBanner: React.FC<Props> = ({ data }) => {
    const { title, subtitle, image, ctaLink, height, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const url = image?.url ? image?.url : image;

    const backgroundStyle = {
        backgroundImage: `url(${STRAPI_URL + url + '?format=webp&embed'})`,
    };

    let heightClass = '';
    switch (height) {
        case 'auto':
            heightClass = 'h-auto py-24';
            break;
        case 'wide':
            heightClass = 'h-auto py-48';
            break;
        default:
            heightClass = 'min-h-[88vh] py-24';
            break;
    }

    return (
        <section id={data.componentSettings?.anchorId} className={`relative ${heightClass} w-full overflow-hidden flex justify-start items-center ${data.componentSettings?.classes}`}>
            <div style={backgroundStyle} className={`backgroundImage`}></div>
            {
                ctaLink ?
                    <a href={ctaLink} className={`flex flex-col gap-6 items-start justify-center max-w-screen-2xl mx-auto w-full h-full px-6 md:px-16 xl:px-20 markup text-white transition-transform duration-300 hover:cursor-pointer`}>
                        <div className='flex justify-between items-start bigimage-headline group w-full'>
                            {title && <div
                                id={`ckeditor-${__component}-${id}-title`}
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="title"
                                className="ckeditor-inline transition-colors"
                            >
                                <Markup
                                    markup={title} />
                            </div>
                            }
                            <div className="flex-grow"></div>
                            <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="120px" viewBox="0 -960 960 960" width="120px"><path d="m245-277-19-19 409-410H255v-28h428v428h-28v-380L245-277Z" /></svg>
                        </div>
                        {subtitle &&
                            <div
                                id={`ckeditor-${__component}-${id}-text`}
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="text"
                                className="ckeditor-inline text-base/loose lg:text-lg/loose xl:text-xl/loose  "
                            >
                                <Markup
                                    markup={subtitle} />
                            </div>
                        }
                    </a>
                    :
                    <div className={`flex flex-col gap-6 items-start justify-center max-w-screen-2xl mx-auto w-full h-full px-6 md:px-16 xl:px-20 markup text-white transition-transform duration-300`}>
                        <div className='flex justify-between items-start bigimage-headline group w-full'>
                            {title && <div
                                id={`ckeditor-${__component}-${id}-title`}
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="title"
                                className="ckeditor-inline transition-colors"
                            >
                                <Markup
                                    markup={title} />
                            </div>
                            }
                            <div className="flex-grow"></div>
                        </div>
                        {subtitle &&
                            <div
                                id={`ckeditor-${__component}-${id}-text`}
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={id}
                                data-component-type={__component}
                                data-field-name="text"
                                className="ckeditor-inline text-base/loose lg:text-lg/loose xl:text-xl/loose  "
                            >
                                <Markup
                                    markup={subtitle} />
                            </div>
                        }
                    </div>
            }
        </section>
    );
}



export default BigImageBanner;

