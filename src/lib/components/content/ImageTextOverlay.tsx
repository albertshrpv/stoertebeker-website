import React from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';
import { placeholderUrl } from '../../utils';
import { STRAPI_URL } from '../../../environment';

interface Props {
    data: {
        image: any;
        text: string;
        title: string;
        ctaLabel: string;
        ctaLink: string;
        backgroundColor: string;
        textBoxPosition: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const ImageTextOverlay: React.FC<Props> = ({ data, padding }) => {
    const { image, text, textBoxPosition, title, ctaLabel, ctaLink, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const floatingBoxStyle: any = {}

    switch (textBoxPosition) {
        case 'left':
            floatingBoxStyle.left = '10%';
            break;
        case 'right':
            floatingBoxStyle.right = '10%';
            break;
        default:
            break;
    }

    const heightContraintStyle = {
        maxHeight: '500px',
    }

    const imgUrl = image?.url ?? placeholderUrl;
    const imgAlt = image?.alternativeText ?? "Placeholder";
    const caption = image?.caption ?? "";

    return (
        <section id={data.componentSettings?.anchorId} className="overflow-x-clip">
            <div className="w-full flex justify-center bg-white">
                <div className={`max-w-screen-2xl text-start w-full ${padding} lg:mb-48`}>
                    <div className="lg:flex lg:justify-center relative">
                        <div className='relative group w-full overflow-hidden'>
                            <img style={heightContraintStyle} className="w-full overflow-clip object-cover z-10" src={STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'} alt={imgAlt} />
                            {
                                caption &&
                                <div className={`absolute z-30 content-center h-0 transition-all ${textBoxPosition === "right" ? 'ps-10 text-left' : 'pe-12 text-right'} duration-300 group-hover:h-8 items-center bottom-0 text-neutral-50 text-xs w-full`}>
                                    {caption}
                                </div>
                            }
                            {caption &&
                                <div className={`absolute z-30 bottom-1 ${textBoxPosition === "right" ? 'left-6' : 'right-6'} items-center text-center text-neutral-50 text-md`}>
                                    ©
                                </div>
                            }
                        </div>
                        <div style={floatingBoxStyle} className={`max-w-[600px] -mb-[7rem] hidden lg:block absolute bottom-0 z-20`}>
                            <div className='lg:border-8 border-secondary bg-primary-500 p-10 xl:max-w-[550px] text-white'>
                                {title &&
                                    <div
                                        className='text-4xl font-title'
                                        contentEditable={isDev}
                                        suppressContentEditableWarning={true}
                                        data-component-id={id}
                                        data-component-type={__component}
                                        data-field-name="title"
                                    >
                                        {title}
                                    </div>
                                }
                                <div
                                    className="my-6 text-sm markup text-white"
                                >
                                    <div
                                        id={`ckeditor-${__component}-${id}-text-1`}
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
                                {ctaLabel && ctaLink &&
                                    <ActionButton text={ctaLabel} link={ctaLink} secondary={true} />
                                }
                            </div>
                        </div>
                        <div className={`block lg:hidden z-0 bg-primary-500`}>
                            <div className='bg-primary-500 p-6 md:p-12 w-full text-white'>
                                {title &&
                                    <div
                                        className='text-4xl font-title'
                                        contentEditable={isDev}
                                        suppressContentEditableWarning={true}
                                        data-component-id={id}
                                        data-component-type={__component}
                                        data-field-name="title"
                                    >
                                        {title}
                                    </div>
                                }
                                <div
                                    className="my-6 text-sm markup"
                                >
                                    <div
                                        id={`ckeditor-${__component}-${id}-text-2`}
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
                                {ctaLabel && ctaLink &&
                                    <ActionButton text={ctaLabel} link={ctaLink} secondary={true} />
                                }
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default ImageTextOverlay;

