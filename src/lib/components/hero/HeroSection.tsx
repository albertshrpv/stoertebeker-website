import React, { useState, useEffect } from 'react';
import type { ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import { componentContentPadding } from '../../utils';

interface Props {
    data: {
        title: string;
        image: any;
        ctaLabel1: string;
        ctaLink1: string;
        ctaLabel2: string;
        ctaLink2: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    };
    locale: string;
}

const HeroSection: React.FC<Props> = ({ data, locale }) => {
    const { title, image, ctaLabel1, ctaLink1, ctaLabel2, ctaLink2 } = data;

    // State to track which image is being hovered (0 = left dominant, 1 = right dominant)
    const [hoveredImage, setHoveredImage] = useState<number>(0);
    // State to track which image is currently visible on mobile
    const [currentMobileImage, setCurrentMobileImage] = useState<number>(0);

    const titleBoxPadding = "pl-16 xl:pl-20 pb-16 xl:pb-12 pt-20 xl:pt-24 2xl:pt-32 pr-24 xl:pr-32 2xl:pr-44";
    const infoBoxPadding = "p-10 lg:p-12 xl:p-14 2xl:p-20";

    const img1 = "https://backend.stoertebeker.de" + image[0].url + "?format=webp&w=1920&embed";
    const img2 = "https://backend.stoertebeker.de" + image[1].url + "?format=webp&w=1920&embed";

    const img3 = "https://backend.stoertebeker.de" + image[2].url + "?format=webp&w=1920&embed";
    const img4 = "https://backend.stoertebeker.de" + image[3].url + "?format=webp&w=1920&embed";
    

    // Auto-transition effect for mobile screens
    useEffect(() => {
        const interval = setInterval(() => {
            setCurrentMobileImage(prev => prev === 0 ? 1 : 0);
        }, 5000);

        return () => clearInterval(interval);
    }, []);

    return (
        <div
            className='hidden'
            island-id={`hero-section-${data.id}`}
        >
            <section
                className='w-full flex lg:hidden flex-col'
                style={{ height: 'calc(100vh - 100px)' }}
            >
                <div className="relative w-full h-full md:max-h-[55%] overflow-hidden">
                    <img
                        src={img3}
                        alt={image[2]?.alternativeText || ''}
                        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
                            currentMobileImage === 0 ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                    <img
                        src={img4}
                        alt={image[3]?.alternativeText || ''}
                        className={`absolute top-0 left-0 w-full h-full object-cover transition-opacity duration-1000 ${
                            currentMobileImage === 1 ? 'opacity-100' : 'opacity-0'
                        }`}
                    />
                </div>
                <div className='w-full px-6 md:px-16 py-10 md:py-16 bg-primary-200'>
                    <div className='markup'>
                        <Markup markup={title} />
                    </div>
                </div>
                <a
                    href={ctaLink1}
                    className={`flex w-full items-center justify-between px-6 md:px-16 py-8 md:py-16 group bg-primary-500 text-white relative overflow-hidden transition-colors duration-200 before:absolute before:inset-0 before:bg-white before:transform before:translate-y-full before:transition-transform before:duration-500 hover:before:translate-y-0 hover:text-neutral-900`}
                >
                    <div className="w-full flex items-center justify-start text-2xl md:text-3xl z-10">{ctaLabel1}</div>
                    <svg
                        className="group-hover:-rotate-45 transition-transform duration-300 relative z-10 w-7 lg:w-8 xl:w-10 2xl:w-11"
                        viewBox="0 0 45 39" fill="none" xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            className="stroke-white group-hover:stroke-neutral-900 transition-colors duration-500"
                            d="M1 19.5L44 19.5M44 19.5L25.5714 1M44 19.5L25.5714 38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                    </svg>
                </a>
                <div className="w-full h-[2px] bg-primary-200"></div>
                <a
                    href={ctaLink2}
                    className={`flex w-full items-center justify-between px-6 md:px-16 py-8 md:py-16 group bg-primary-500 text-white relative overflow-hidden transition-colors duration-200 before:absolute before:inset-0 before:bg-white before:transform before:translate-y-full before:transition-transform before:duration-500 hover:before:translate-y-0 hover:text-neutral-900`}
                >
                        <div className="w-full flex items-center justify-start text-2xl md:text-3xl z-10">{ctaLabel2}</div>
                    <svg
                        className="group-hover:-rotate-45 transition-transform duration-300 relative z-10 w-7 lg:w-8 xl:w-10 2xl:w-11"
                        viewBox="0 0 45 39" fill="none" xmlns="http://www.w3.org/2000/svg"
                    >
                        <path
                            className="stroke-white group-hover:stroke-neutral-900 transition-colors duration-500"
                            d="M1 19.5L44 19.5M44 19.5L25.5714 1M44 19.5L25.5714 38"
                            stroke-width="2"
                            stroke-linecap="round"
                            stroke-linejoin="round"
                        />
                    </svg>
                </a>
            </section>
            <section
                className='hidden w-full lg:flex flex-col relative bg-primary-200'
                style={{ height: 'calc(100vh - 100px)' }}
            >
                <div className='w-full h-2/3 relative overflow-hidden'>
                    {/* Left image - 2/3 width, positioned on left */}
                    <img
                        src={img1}
                        alt={image.alternativeText || ''}
                        className="absolute top-0 left-0 h-full object-cover transition-all duration-500 ease-in-out custom-cursor3"
                        style={{
                            width: '66.67%', // 2/3 width
                            clipPath: `inset(0 ${hoveredImage === 0 ? '0%' : '50%'} 0 0)`
                        }}
                        onMouseEnter={() => setHoveredImage(0)}
                    />

                    {/* Right image - 2/3 width, positioned on right */}
                    <img
                        src={img2}
                        alt={image.alternativeText || ''}
                        className="absolute top-0 right-0 h-full object-cover transition-all duration-500 ease-in-out custom-cursor3"
                        style={{
                            width: '66.67%', // 2/3 width
                            clipPath: `inset(0 0 0 ${hoveredImage === 1 ? '0%' : '50%'})`
                        }}
                        onMouseEnter={() => setHoveredImage(1)}
                    />
                </div>
                <div className='w-full h-1/3 flex max-w-[2000px] mx-auto'>
                    <div className={`markup w-2/3 ${componentContentPadding} flex flex-col justify-center`}>
                        <Markup markup={title} />
                    </div>
                </div>
                <div className='absolute bottom-0 right-0 w-1/3 h-1/3 flex flex-col z-10'>
                    <a
                        href={ctaLink1}
                        className={`flex w-full gap-2 h-full items-center justify-between py-6 px-12 group bg-primary-500 text-white relative overflow-hidden transition-colors duration-200 before:absolute before:inset-0 before:bg-white before:transform before:translate-y-full before:transition-transform before:duration-500 hover:before:translate-y-0 hover:text-neutral-900`}
                    >
                        <div className="w-full flex items-center justify-start text-xl lg:text-xl xl:text-3xl 2xl:text-4xl relative z-10">{ctaLabel1}</div>
                        <svg
                            className="group-hover:-rotate-45 transition-transform duration-300 relative z-10 w-7 lg:w-8 xl:w-10 2xl:w-11"
                            viewBox="0 0 45 39" fill="none" xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                className="stroke-white group-hover:stroke-neutral-900 transition-colors duration-500"
                                d="M1 19.5L44 19.5M44 19.5L25.5714 1M44 19.5L25.5714 38" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>
                    </a>
                    <div className="w-full h-[4px] bg-primary-200"></div>
                    <a
                        href={ctaLink2}
                        className={`flex w-full gap-2 h-full items-center justify-between py-6 px-12 group bg-primary-500 text-white relative overflow-hidden transition-colors duration-200 before:absolute before:inset-0 before:bg-white before:transform before:translate-y-full before:transition-transform before:duration-500 hover:before:translate-y-0 hover:text-neutral-900`}
                    >
                        <div className="w-full flex items-center justify-start text-xl lg:text-xl xl:text-3xl 2xl:text-4xl relative z-10">{ctaLabel2}</div>
                        <svg
                            className="group-hover:-rotate-45 transition-transform duration-300 relative z-10 w-7 lg:w-8 xl:w-10 2xl:w-11"
                            viewBox="0 0 45 39" fill="none" xmlns="http://www.w3.org/2000/svg"
                        >
                            <path
                                className="stroke-white group-hover:stroke-neutral-900 transition-colors duration-500"
                                d="M1 19.5L44 19.5M44 19.5L25.5714 1M44 19.5L25.5714 38"
                                stroke-width="2"
                                stroke-linecap="round"
                                stroke-linejoin="round"
                            />
                        </svg>
                    </a>
                </div>
            </section>
        </div>
    );
};

export default HeroSection;