import React from 'react';
import { Markup } from "react-render-markup";
import "./AccordionSectionEntry.css";
import AccordionDownloadEntry from './AccordionDownloadEntry';

interface Props {
    block: {
        id: string;
        title: string;
        text: string;
        // not an image but the download media
        image?: any;
    },
    index: number;
    activeIndex?: number;
    cid: string;
    __component: string;
}

const AccordionSectionEntry: React.FC<Props> = ({ block, index, cid, __component, activeIndex }) => {
    const { title, text, image } = block;
    const headingId = !activeIndex ? `accordion-collapse-heading-${index}` : `accordion-collapse-heading-${activeIndex}-${index}`;
    const contentId = !activeIndex ? `accordion-collapse-body-${index}` : `accordion-collapse-body-${activeIndex}-${index}`;

    return (
        <div
            id={headingId}
            className="relative group bg-transparent border-b border-neutral-900 text-neutral-900 py-4 lg:py-8 hover:cursor-pointer"
            role="region"
            data-accordion-target={!activeIndex ? `#accordion-collapse-body-${index}` : `#accordion-collapse-body-${activeIndex}-${index}`}
            aria-expanded="false"
            aria-controls={contentId}
        >
            <div
                className='flex gap-4 justify-between items-center'
                role="button"
                tabIndex={0}
            >
                <h2>
                    <div className="relative flex items-center justify-between w-full text-neutral-900 focus:ring-0 bg-transparent gap-3">
                        <span
                            className="text-base md:text-lg lg:text-xl xl:text-2xl text-start lg:mr-4"
                        >
                            {title}
                        </span>
                    </div>
                </h2>
                <button
                    className={`min-w-6 w-6 h-6 md:min-w-11 md:w-11 md:h-11 flex items-center justify-center hover:cursor-pointer`}
                    aria-label="Toggle section"
                >

                    <svg className='group-aria-expanded:rotate-45 transition-transform' width="22" height="22" viewBox="0 0 22 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M11.2051 21.41V11.2051M11.2051 11.2051V1M11.2051 11.2051H21.4102M11.2051 11.2051H1" stroke="black" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </button>
            </div>
            <div
                id={contentId}
                className="accordion-body overflow-hidden transition-all duration-300 ease-linear max-h-0 group-aria-expanded:mt-5 group-aria-expanded:lg:mt-10"
                role="region"
                aria-labelledby={headingId}
            >
                <div className="markup stop-propagation hover:cursor-text">
                    <div
                        className="text-sm/loose sm:text-base/loose md:text-lg/loose lg:text-xl/loose"
                    >
                        <Markup className="prose" markup={text} />
                    </div>
                </div>
                {
                    image &&
                    <AccordionDownloadEntry block={image} index={index} />
                }
            </div>
        </div>
    );
}

export default AccordionSectionEntry;