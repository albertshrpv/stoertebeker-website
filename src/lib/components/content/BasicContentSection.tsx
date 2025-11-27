import React from 'react';
import { Markup } from "react-render-markup";
import ActionButton from '../buttons/ActionButton';
import { componentContentPadding, evaluateContentPadding, placeholderUrl } from '../../utils';
import type { ComponentSettings } from '../../interfaces/page';
import type { CTA } from '../../interfaces/cta';


interface Props {
    data: {
        title: string;
        content: string;
        image: any;
        cta?: CTA;
        imagePos: string;
        secondary?: boolean;
        blocks: any;
        componentSettings?: ComponentSettings;
        id: string;
        __component: string;
    };
    padding: string;
}


const BasicContentSection: React.FC<Props> = ({ data, padding }) => {
    const { title, content, image, cta, imagePos, blocks, id, __component, secondary } = data;
    const isDev = import.meta.env.DEV;

    const imgUrl = image?.url ?? placeholderUrl;
    const imgAlt = image?.alternativeText ?? "";
    const caption = image?.caption ?? "";

    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes} ${secondary ? "bg-primary-500/10" : ""}`}>
            <div className="w-full lg:hidden">
                <img
                    className="w-full h-full object-cover"
                    width="800"
                    height="533"
                    src={import.meta.env.STRAPI_URL + imgUrl + "?format=webp&w=1400&embed"}
                    srcSet={
                        import.meta.env.STRAPI_URL +
                        imgUrl +
                        "?format=webp&w=300&embed&quality=30 320w, " +
                        import.meta.env.STRAPI_URL +
                        imgUrl +
                        "?format=webp&w=800&embed&quality=50 600w, " +
                        import.meta.env.STRAPI_URL +
                        imgUrl +
                        "?format=webp&w=800&embed&quality=60 900w, " +
                        import.meta.env.STRAPI_URL +
                        imgUrl +
                        "?format=webp&w=1400&embed&quality=60 1200w"
                    }
                    sizes="(max-width: 600px) 40vw, (max-width: 900px) 60vw, (max-width: 1200px) 50vw, 40vw"
                    alt={imgAlt}
                    loading="lazy"
                />
            </div>
            <div className={`flex flex-col lg:flex-row items-stretch gap-12 xl:gap-24 max-w-[2000px] mx-auto px-6 ${padding} ${imagePos == "Right" ? "lg:flex-row" : "lg:flex-row-reverse"}`}>
                <div className="flex flex-col justify-center gap-8 lg:gap-12 w-full lg:w-3/5 2xl:w-1/2 my-2">
                    {title &&
                        <div
                            className="markup"
                        >
                            <Markup markup={title} />
                        </div>
                    }
                    {content &&
                        <div className="markup">
                            <Markup markup={content} />
                        </div>
                    }
                    {blocks && blocks.length > 0 &&
                        <ul className="space-y-4">
                            {blocks.map((block: any, idx: number) => (
                                <li className={`flex items-center gap-2.5`} key={idx}>
                                    <div
                                        className="inline-flex items-top p-1 justify-center w-6 h-6 lg:w-8 lg:h-8 mr-4 xl:mt-1 rounded-full bg-neutral-100 dark:bg-neutral-900 text-primary md:text-lg shrink-0">
                                        <svg aria-hidden="true" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 20 20"
                                            fill="currentColor">
                                            <path fillRule="evenodd"
                                                d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                                                clipRule="evenodd" />
                                        </svg>
                                    </div>
                                    <span
                                        className="text-base dark:text-white text-neutral-900 md:text-lg markup"
                                    >
                                        <div
                                            id={`ckeditor-${__component}-${id}-blocks-${block.id}`}
                                            className="ckeditor-inline"
                                            contentEditable={isDev}
                                            suppressContentEditableWarning={true}
                                            data-component-id={id}
                                            data-component-type={__component}
                                            data-block-id={block.id}
                                            data-block-field="blocks"
                                            data-field-name="content"
                                        >
                                            <Markup markup={block.content} />
                                        </div>
                                    </span>
                                </li>
                            ))}
                        </ul>
                    }
                    {cta &&
                        <div className="flex justify-start">
                            <ActionButton text={cta.text} link={cta.link} external={cta.external} />
                        </div>
                    }
                </div>
                <div className={`hidden lg:block w-full lg:w-2/5 2xl:w-1/2 relative group overflow-hidden`}>
                    <img
                        className="absolute inset-0 w-full h-full object-cover rounded-2xl"
                        width="800" height="533"
                        src={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'}
                        srcSet={import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=300&embed&quality=30 320w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=50 600w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=800&embed&quality=60 900w, ' + import.meta.env.STRAPI_URL + imgUrl + '?format=webp&w=1400&embed&quality=60 1200w'}
                        sizes="(max-width: 600px) 40vw, (max-width: 900px) 60vw, (max-width: 1200px) 50vw, 40vw"
                        alt={imgAlt}
                        loading="lazy"
                    />
                    {caption &&
                        <>
                            <div className="absolute content-center h-0 transition-all ps-10 duration-300 group-hover:h-8 items-center bg-black/55 bottom-0 text-left text-neutral-50 text-xs w-full">
                                {caption}
                            </div>
                            <div className="absolute bottom-1 left-6 items-center text-center text-neutral-50 text-md">
                                ©
                            </div>
                        </>
                    }
                </div>
            </div>
        </section>
    );
}


export default BasicContentSection;

