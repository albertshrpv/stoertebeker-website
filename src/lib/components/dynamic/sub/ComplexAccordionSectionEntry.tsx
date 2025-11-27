import React, { useState } from 'react';
import { Markup } from "react-render-markup";
import "../../content/sub/AccordionSectionEntry.css";
import AccordionDownloadEntry from '../../content/sub/AccordionDownloadEntry';

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

const ComplexAccordionSectionEntry: React.FC<Props> = ({ block, index, activeIndex, cid, __component }) => {
    const { title, text, image } = block;
    const isDev = import.meta.env.DEV;
    const [isExpanded, setIsExpanded] = useState(false);

    const toggleAccordion = () => {
        setIsExpanded(!isExpanded);
    };

    const handleKeyDown = (event: React.KeyboardEvent) => {
        if (event.key === 'Enter' || event.key === ' ') {
            event.preventDefault();
            toggleAccordion();
        }
    };

    return (
        <div
            className="relative group bg-primary-500/10 dark:bg-primary-500/10 text-neutral-900 rounded-2xl px-8 py-4 lg:px-12 lg:py-8 hover:cursor-pointer"
            role="region"
            aria-expanded={isExpanded}
        >
            <div
                className='flex gap-4 justify-between items-center'
                onClick={toggleAccordion}
                onKeyDown={handleKeyDown}
                role="button"
                tabIndex={0}
                aria-controls={`accordion-content-${block.id}`}
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
                    className={`min-w-6 w-6 h-6 md:min-w-11 md:w-11 md:h-11 flex items-center justify-center bg-primary-500 rounded-full hover:cursor-pointer`}
                    aria-label={isExpanded ? "Collapse section" : "Expand section"}
                    aria-expanded={isExpanded}
                >
                    <svg
                        className="w-3 h-3 md:w-5 md:h-5 group-aria-expanded:rotate-45 transition-transform"
                        viewBox="0 0 18 17"
                        fill="none"
                        xmlns="http://www.w3.org/2000/svg"
                        aria-hidden="true"
                    >
                        <path d="M9.06738 15.9691V8.55807M9.06738 8.55807V1.14697M9.06738 8.55807H16.4785M9.06738 8.55807H1.65629" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                </button>
            </div>
            <div
                id={`accordion-content-${block.id}`}
                className="accordion-body overflow-hidden transition-all duration-300 ease-linear max-h-0 group-aria-expanded:mt-5 group-aria-expanded:lg:mt-10"
                role="region"
                aria-labelledby={`accordion-heading-${block.id}`}
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

export default ComplexAccordionSectionEntry; 