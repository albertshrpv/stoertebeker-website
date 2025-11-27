import React, { useState, useEffect, useRef } from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../../interfaces/page';

interface Props {
    data: {
        blocks: any[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    }
}

const MultiContentBanner: React.FC<Props> = ({ data }) => {
    const { blocks, id, __component } = data;
    const [currentInfoIndex, setCurrentInfoIndex] = useState(0);
    const [isFading, setIsFading] = useState(false);
    const isDev = import.meta.env.DEV;
    const intervalRef = useRef<NodeJS.Timeout>();

    useEffect(() => {
        if (blocks.length <= 1) return;

        intervalRef.current = setInterval(() => {
            setIsFading(true);
            setTimeout(() => {
                setCurrentInfoIndex((prevIndex) =>
                    prevIndex === blocks.length - 1 ? 0 : prevIndex + 1
                );
                setIsFading(false);
            }, 300);
        }, 10000);

        return () => {
            if (intervalRef.current) {
                clearInterval(intervalRef.current);
            }
        };
    }, [blocks.length]);

    const handleDotClick = (index: number) => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        setIsFading(true);
        setTimeout(() => {
            setCurrentInfoIndex(index);
            setIsFading(false);
        }, 300);
    };

    return (
        <section
            island-id={`multi-content-banner-${id}`}
            id={data.componentSettings?.anchorId}
            className="hidden">
            <div
                className='flex flex-col lg:flex-row h-full lg:h-auto lg:min-h-[65vh] lg:max-h-[75vh] 2xl:max-h-[65vh] p-6 md:p-16 lg:p-0'
            >
                <div className="h-[45vh] md:h-[55h] lg:h-auto w-full lg:w-1/2 rounded-t-2xl lg:rounded-t-none overflow-hidden">
                    <img
                        src={`https://backend.stoertebeker.de${blocks[currentInfoIndex].image.url}?format=webp&w=1920&embed`}
                        alt={blocks[currentInfoIndex].image.alternativeText || ''}
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="h-full lg:h-auto flex flex-col gap-8 xl:gap-12 justify-start w-full lg:w-1/2 bg-grey p-6 md:p-12 xl:p-20 rounded-b-2xl lg:rounded-b-none">
                    <div className='flex gap-4'>
                        {
                            blocks.map((block, index) => (
                                <div onClick={() => handleDotClick(index)} key={index} className={`h-11 w-11 rounded-full hover:cursor-pointer ${currentInfoIndex === index ? 'bg-primary-500 text-white' : 'border border-primary-500 text-neutral-900'}`}>
                                    <div className='flex h-full w-full items-center justify-center'>
                                        {index + 1}
                                    </div>
                                </div>
                            ))
                        }
                    </div>

                    <div className={`flex flex-col h-full justify-center gap-8 xl:gap-12 text-neutral-900 transition-opacity duration-300 ${isFading ? 'opacity-0' : 'opacity-100'}`}>
                        <h3 className="text-2xl lg:text-3xl xl:text-4xl">
                            {blocks[currentInfoIndex].title}
                        </h3>
                        <div className="markup">
                            <Markup markup={blocks[currentInfoIndex].text} />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default MultiContentBanner;