import React, { useEffect, useState, useRef } from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";

interface Props {
    data: {
        title: string;
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const TestimonialSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, id, __component, componentSettings, title } = data;
    const [currentIndex, setCurrentIndex] = useState(0);
    const [maxHeight, setMaxHeight] = useState<number>(0);
    const containerRef = useRef<HTMLDivElement>(null);

    useEffect(() => {
        const measureHeights = () => {
            if (!containerRef.current) return;
            
            const items = containerRef.current.querySelectorAll<HTMLElement>('[data-testimonial-item]');
            let max = 0;
            
            items.forEach(item => {
                // Temporarily show the item to measure its height
                const originalDisplay = item.style.display;
                const originalVisibility = item.style.visibility;
                const originalPosition = item.style.position;
                
                item.style.display = 'block';
                item.style.visibility = 'hidden';
                item.style.position = 'absolute';
                
                const height = item.getBoundingClientRect().height;
                
                // Restore original styles
                item.style.display = originalDisplay;
                item.style.visibility = originalVisibility;
                item.style.position = originalPosition;
                
                max = Math.max(max, height);
            });
            
            setMaxHeight(max);
        };

        // Initial measurement after component mounts
        const timer = setTimeout(measureHeights, 100);

        // Re-measure on window resize
        window.addEventListener('resize', measureHeights);
        
        return () => {
            clearTimeout(timer);
            window.removeEventListener('resize', measureHeights);
        };
    }, [blocks]);

    useEffect(() => {
        // Show current item and hide others
        if (!containerRef.current) return;
        
        const items = containerRef.current.querySelectorAll<HTMLElement>('[data-testimonial-item]');
        items.forEach((item, index) => {
            if (index === currentIndex) {
                item.style.display = 'block';
                item.classList.remove('hidden');
            } else {
                item.style.display = 'none';
                item.classList.add('hidden');
            }
        });
    }, [currentIndex]);

    const goToPrevious = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === 0 ? blocks.length - 1 : prevIndex - 1
        );
    };

    const goToNext = () => {
        setCurrentIndex((prevIndex) => 
            prevIndex === blocks.length - 1 ? 0 : prevIndex + 1
        );
    };

    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`items-center justify-center text-center mx-auto max-w-screen-2xl ${padding}`}>
                <div className="flex flex-col items-center justify-center gap-8 lg:gap-16 max-w-screen-lg mx-auto mb-16 xl:mb-24">
                    {title &&
                        <div
                            className="markup"
                        >
                            <Markup markup={title} />
                        </div>
                    }
                </div>
                <div className="relative">
                    <div 
                        ref={containerRef}
                        className="overflow-hidden relative mx-auto max-w-screen-lg"
                        style={{ height: maxHeight ? `${maxHeight}px` : 'auto', minHeight: '200px' }}
                    >
                        {
                            blocks.map((block, idx) => (
                                <TestimonialEntry 
                                    key={block.id} 
                                    block={block} 
                                    cid={id} 
                                    __component={__component} 
                                    index={idx}
                                    isActive={idx === currentIndex}
                                />
                            ))
                        }
                    </div>
                    <div className="flex justify-center items-center mt-6 lg:mt-12">
                        <button 
                            type="button" 
                            onClick={goToPrevious}
                            className="flex justify-center items-center mr-4 h-full cursor-pointer group focus:outline-none"
                        >
                            <span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                <svg className='stroke-[#254F7B] dark:stroke-white' width="27" height="16" viewBox="0 0 27 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M26 8L1 8M1 8L7.66667 1M1 8L7.66667 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="hidden">Previous</span>
                            </span>
                        </button>
                        <div className="flex space-x-2">
                            {blocks.map((_, idx) => (
                                <button
                                    key={idx}
                                    onClick={() => setCurrentIndex(idx)}
                                    className={`w-3 h-3 rounded-full transition-colors ${
                                        idx === currentIndex 
                                            ? 'bg-[#254F7B] dark:bg-white' 
                                            : 'bg-gray-300 dark:bg-gray-600 hover:bg-gray-400 dark:hover:bg-gray-500'
                                    }`}
                                    aria-label={`Go to testimonial ${idx + 1}`}
                                />
                            ))}
                        </div>
                        <button 
                            type="button" 
                            onClick={goToNext}
                            className="flex justify-center items-center ml-4 h-full cursor-pointer group focus:outline-none"
                        >
                            <span className="text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-200">
                                <svg className='stroke-[#254F7B] dark:stroke-white' width="27" height="16" viewBox="0 0 27 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M1 8L26 8M26 8L19.3333 1M26 8L19.3333 15" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                </svg>
                                <span className="hidden">Next</span>
                            </span>
                        </button>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default TestimonialSection;

const TestimonialEntry: React.FC<{
    block: any;
    cid: string;
    __component: string;
    index: number;
    isActive: boolean;
}> = ({ block, cid, __component, index, isActive }) => {
    const { text, name, position } = block;

    return (
        <figure 
            className={`mx-auto w-full max-w-screen-lg transition-opacity duration-500 bg-white dark:bg-dark ${
                isActive ? 'block' : 'hidden'
            }`}
            data-testimonial-item
        >
            <blockquote>
                <p className="text-lg font-medium text-gray-900 sm:text-2xl dark:text-white">
                    {text}
                </p>
            </blockquote>
            <figcaption className="flex justify-center items-center mt-6 space-x-3">
                <div className="flex items-center divide-x-2 divide-gray-500 dark:divide-gray-700">
                    <div className="pr-3 font-medium text-gray-900 dark:text-white">
                        {name}
                    </div>
                    <div className="pl-3 text-sm font-light text-gray-500 dark:text-gray-400">
                        {position}
                    </div>
                </div>
            </figcaption>
        </figure>
    );
};
