import React, { useState, useEffect } from 'react';

interface Props {
    data: {
        image: any;
        componentSettings?: any;
        id: string;
        __component: string;
    };
}

const VisibleCarousel: React.FC<Props> = ({ data }) => {
    const { image } = data;
    const imagesData = image;

    // Add duplicated first and last images for infinite scrolling
    const infiniteImages = [
        imagesData[imagesData.length - 1], // Duplicate the last image
        ...imagesData,
        imagesData[0], // Duplicate the first image
        imagesData[1], // Duplicate the second image
    ];

    const [currentIndex, setCurrentIndex] = useState(1); // Start at the first real image
    const [isTransitioning, setIsTransitioning] = useState(false); // Track transition state

    // Add touch handling state
    const [touchStart, setTouchStart] = useState(0);
    const [touchEnd, setTouchEnd] = useState(0);

    // Add state for tracking cursor position
    const [isLeftSide, setIsLeftSide] = useState(false);

    // Handle next image click
    const handleNext = () => {
        if (!isTransitioning) {
            setIsTransitioning(true);
            setCurrentIndex((prevIndex) => prevIndex + 1);
        }
    };

    // Add this new function to handle previous image click
    const handlePrev = () => {
        if (!isTransitioning) {
            setIsTransitioning(true);
            setCurrentIndex((prevIndex) => prevIndex - 1);
        }
    };

    // Update click handler to determine direction based on click position
    const handleClick = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const clickX = e.clientX - rect.left;
        const elementWidth = rect.width;

        if (clickX < elementWidth / 2) {
            handlePrev();
        } else {
            handleNext();
        }
    };

    // Update the transition end handler to handle both directions
    const handleTransitionEnd = () => {
        setIsTransitioning(false);

        if (currentIndex === 0) {
            // If at the duplicate last image, jump to the real last image
            setCurrentIndex(infiniteImages.length - 3);
        } else if (currentIndex === infiniteImages.length - 2) {
            // If at the duplicate first image, jump to the real first image
            setCurrentIndex(1);
        }
    };

    // Add mouse move handler to update cursor
    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        setIsLeftSide(mouseX < rect.width / 2);
    };

    return (
        <>
            <div
                onClick={handleClick}
                onMouseMove={handleMouseMove}
                className={`relative hidden md:flex py-6 md:py-16 xl:py-20 items-center justify-center overflow-hidden`}
                style={{ cursor: `url(${isLeftSide ? '/images/Maus2.svg' : '/images/Maus.svg'}) 30 30, auto` }}
            >
                <div
                    className="hidden 2xl:flex transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(calc(-${currentIndex} * 45% + 25%))`,
                        transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {infiniteImages.map((image: any, index: number) => (
                        <div
                            key={index}
                            className="w-[45%] aspect-[5/3] flex-shrink-0 px-[2%]"
                        >
                            <img
                                src={`https://backend.stoertebeker.de${image.url}?format=webp&w=1000&q=50`}
                                className="w-full h-full object-cover rounded-lg"
                                alt={image.alternativeText}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
                <div
                    className="flex 2xl:hidden transition-transform duration-500 ease-in-out"
                    style={{
                        transform: `translateX(calc(-${currentIndex} * 60% + 19%))`,
                        transition: isTransitioning ? 'transform 0.5s ease-in-out' : 'none',
                    }}
                    onTransitionEnd={handleTransitionEnd}
                >
                    {infiniteImages.map((image: any, index: number) => (
                        <div
                            key={index}
                            className="w-[60%] aspect-[5/3] flex-shrink-0 px-[2%]"
                        >
                            <img
                                src={`https://backend.stoertebeker.de${image.url}?format=webp&w=1000&q=50`}
                                className="w-full h-full object-cover rounded-lg"
                                alt={image.alternativeText}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>
            <div className="relative flex md:hidden py-6 overflow-x-auto [&::-webkit-scrollbar]:hidden [-ms-overflow-style:none] [scrollbar-width:none]">
                <div className="flex pl-4 gap-4">
                    {imagesData.map((image: any, index: number) => (
                        <div
                            key={index}
                            className={`w-[85vw] flex-shrink-0 aspect-[5/3] ${index === imagesData.length - 1 ? 'pr-4' : ''}`}
                        >
                            <img
                                src={`https://backend.stoertebeker.de${image.url}?format=webp&w=1000&q=50`}
                                className="image-viewer w-full h-full object-cover rounded-lg"
                                alt={image.alternativeText}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>
            </div>
        </>
    );
};

export default VisibleCarousel;