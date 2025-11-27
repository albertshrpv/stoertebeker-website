import React, { useEffect } from 'react';
import { Markup } from "react-render-markup";
import type { Block } from '../../../interfaces/page';
import ActionButton from '../../buttons/ActionButton';
import { placeholderUrl } from '../../../utils';

interface Props {
    block: Block;
    fixHeight?: boolean;
    secondary?: boolean;
    idx: number;
    cid: string;
    __component: string;
}

const FeatureSectionEntry: React.FC<Props> = ({ block, idx, fixHeight, cid, __component, secondary }) => {
    const { title, ctaLabel, content, image, ctaLink } = block;
    const isDev = import.meta.env.DEV;


    const imgUrl = image?.url ?? placeholderUrl;
    const imgAlt = image?.alternativeText ?? "Placeholder";
    const caption = image?.caption ?? "";

    if (secondary) {
        return (
            <div className='flex flex-col items-center md:items-start md:flex-row gap-6 md:gap-8 lg:gap-10 border-2 border-primary-500 rounded-lg p-4 md:p-6 lg:p-8'>
                <img
                    className={`object-cover w-40 h-40 rounded-full`}
                    src={"https://backend.stoertebeker.de" + imgUrl + "?format=webp&w=800&embed"}
                    alt={imgAlt}
                />
                {
                    caption &&
                    <div className="absolute content-center h-0 transition-all ps-10 duration-300 group-hover:h-8 items-center bg-black/55 bottom-0 text-left text-neutral-50 text-xs w-full">
                        {caption}
                    </div>
                }
                {caption &&
                    <div className="absolute bottom-1 left-6 items-center text-center text-neutral-50 text-md">
                        ©
                    </div>
                }
                <div className='w-full'>
                    {
                        title &&
                        <h2
                            className={`text-xl lg:text-2xl font-semibold mb-6`}
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={cid}
                            data-component-type={__component}
                            data-block-id={block.id}
                            data-block-field="blocks"
                            data-field-name="title"
                        >
                            {title}
                        </h2>
                    }
                    <div className="mb-3 overflow-hidden">
                        <div
                            className="markup-smaller"
                        >
                            <div
                                id={`ckeditor-${__component}-${cid}-blocks-${block.id}`}
                                className="ckeditor-inline"
                                contentEditable={isDev}
                                suppressContentEditableWarning={true}
                                data-component-id={cid}
                                data-component-type={__component}
                                data-block-id={block.id}
                                data-block-field="blocks"
                                data-field-name="content"
                            >
                                <Markup markup={content} />
                            </div>
                        </div>
                    </div>
                    <div className="flex-grow"></div>
                    {
                        ctaLabel && ctaLink &&
                        <div className='mt-4'>
                            <ActionButton
                                text={ctaLabel}
                                link={ctaLink}
                            />
                        </div>
                    }
                </div>
            </div>
        )
    }

    return (
        <div>
            <div className={`overflow-hidden relative mb-6 group`}>
                <img
                    className={`object-cover w-full rounded-lg h-[400px] ${fixHeight && "feature-entry-fix-height"}`}
                    src={"https://backend.stoertebeker.de" + imgUrl + "?format=webp&w=800&embed"}
                    alt={imgAlt}
                />
                {
                    caption &&
                    <div className="absolute content-center h-0 transition-all ps-10 duration-300 group-hover:h-8 items-center bg-black/55 bottom-0 text-left text-neutral-50 text-xs w-full">
                        {caption}
                    </div>
                }
                {caption &&
                    <div className="absolute bottom-1 left-6 items-center text-center text-neutral-50 text-md">
                        ©
                    </div>
                }
            </div>
            {
                title &&
                <h2
                    className={`text-xl lg:text-2xl font-semibold mb-4`}
                    contentEditable={isDev}
                    suppressContentEditableWarning={true}
                    data-component-id={cid}
                    data-component-type={__component}
                    data-block-id={block.id}
                    data-block-field="blocks"
                    data-field-name="title"
                >
                    {title}
                </h2>
            }
            <div className="mb-3 overflow-hidden">
                <div
                    className="markup"
                >
                    <div
                        id={`ckeditor-${__component}-${cid}-blocks-${block.id}`}
                        className="ckeditor-inline"
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={cid}
                        data-component-type={__component}
                        data-block-id={block.id}
                        data-block-field="blocks"
                        data-field-name="content"
                    >
                        <Markup markup={content} />
                    </div>
                </div>
            </div>
            <div className="flex-grow"></div>
            {
                ctaLabel && ctaLink &&
                <div className='mt-4'>
                    <ActionButton
                        text={ctaLabel}
                        link={ctaLink}
                    />
                </div>
            }
        </div>
    );
};

export default FeatureSectionEntry;