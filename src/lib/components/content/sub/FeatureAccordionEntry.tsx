import React from 'react';
import { Markup } from "react-render-markup";
import "./AccordionSectionEntry.css";
import AccordionDownloadEntry from './AccordionDownloadEntry';
import type { Block } from '../../../interfaces/page';

interface Props {
    block: {
        id: string;
        title: string;
        blocks: Block[];
    },
    index: number;
    cid: string;
    __component: string;
}

const FeatureAccordionEntry: React.FC<Props> = ({ block, index, cid, __component }) => {
    const { title, blocks } = block;
    const isDev = import.meta.env.DEV;

    // Calculate the split point for the blocks
    const splitIndex = Math.ceil(blocks.length / 2);
    const leftBlocks = blocks.slice(0, splitIndex);
    const rightBlocks = blocks.slice(splitIndex);


    return (
        <div
            id={`accordion-collapse-heading-${index}`}
            className="relative group bg-primary-500/10 dark:bg-primary-500/10 text-neutral-900 rounded-2xl px-8 py-4 lg:px-12 lg:py-8 hover:cursor-pointer"
            role="region"
            data-accordion-target={`#accordion-collapse-body-${index}`}
            aria-expanded="true"
            aria-controls={`accordion-collapse-body-${index}`}>
            <div
                role="button"
                tabIndex={0}
                className='flex gap-4 justify-between items-center'>
                <h2>
                    <div className="relative flex items-center justify-between w-full text-neutral-900 focus:ring-0 bg-transparent gap-3">
                        <span
                            className="text-base md:text-lg lg:text-xl xl:text-2xl text-start lg:mr-4"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={cid}
                            data-component-type={__component}
                            data-block-id={block.id}
                            data-block-field="blocks"
                            data-field-name="title"
                        >
                            {title}
                        </span>
                    </div>
                </h2>
                <button
                    className={`min-w-6 w-6 h-6 md:min-w-11 md:w-11 md:h-11 flex items-center justify-center bg-primary-500 rounded-full hover:cursor-pointer`}
                    aria-label="Toggle section"
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
            {/* <div id={`accordion-collapse-body-${index}`} className="accordion-body overflow-hidden transition-all duration-300 ease-in max-h-0 group-aria-expanded:max-h-[200px] group-aria-expanded:mt-5 group-aria-expanded:lg:mt-10" aria-labelledby={`accordion-collapse-heading-${index}`}> */}
            <div
                id={`accordion-collapse-body-${index}`}
                className="accordion-body overflow-hidden transition-all duration-300 ease-linear max-h-0 group-aria-expanded:mt-5 group-aria-expanded:lg:mt-10"
                role="region"
                aria-labelledby={`accordion-collapse-heading-${index}`}
            >
                <div className="stop-propagation hover:cursor-text">
                    <div className="w-full grid grid-cols-1 lg:grid-cols-2 gap-8 lg:gap-10 xl:gap-16">
                        <div className="space-y-8">
                            {leftBlocks.map((block, i) => (
                                <div key={block.id} className='flex gap-4 lg:gap-8'>
                                    <div className='flex'>
                                        <svg className='mt-[8px]' width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="7" cy="7" r="7" fill="#00664F" />
                                        </svg>
                                    </div>
                                    <div className='space-y-4'>
                                        {block.title &&
                                            <h3 className="text-xl lg:text-2xl font-bold break-words break-all">{block.title}</h3>
                                        }
                                        <div className="markup w-full">
                                            <Markup markup={block.content} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="space-y-8">
                            {rightBlocks.map((block, i) => (
                                <div key={block.id} className='flex gap-4 lg:gap-8'>
                                    <div className='flex'>
                                        <svg className='mt-[8px]' width="14" height="14" viewBox="0 0 14 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <circle cx="7" cy="7" r="7" fill="#00664F" />
                                        </svg>
                                    </div>
                                    <div className='space-y-4'>
                                        {block.title &&
                                            <h3 className="text-xl lg:text-2xl font-bold break-words break-all">{block.title}</h3>
                                        }
                                        <div className="markup w-full">
                                            <Markup markup={block.content} />
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}

export default FeatureAccordionEntry;