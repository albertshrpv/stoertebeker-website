import React, { useState, useRef, useEffect } from 'react';
import type { Block } from '../../../interfaces/page';
import { componentContentPadding, placeholderUrl } from '../../../utils';
import ActionButton from '../../buttons/ActionButton';

interface Props {
    blocks: Block[];
    id: string;
    locale: string;
}

interface AnimatedImage {
    id: number;
    index: number;
    isAnimating: boolean;
}

const AnimatedFeatureSectionCarousel: React.FC<Props> = ({ blocks, id, locale }) => {
    const [activeFeature, setActiveFeature] = useState(0);
    const [previousFeature, setPreviousFeature] = useState(0);
    const [animatedImages, setAnimatedImages] = useState<AnimatedImage[]>([]);
    const [nextId, setNextId] = useState(0);
    const containerRef = useRef<HTMLDivElement>(null);
    const textContainerRef = useRef<HTMLDivElement>(null);
    const islandRef = useRef<HTMLDivElement>(null);

    const textPadding = "px-6 md:px-16 xl:px-20 2xl:px-32 py-12 md:py-16 xl:py-20 2xl:py-32";



    useEffect(() => {
        const updateHeight = () => {
            if (containerRef.current && textContainerRef.current) {
                containerRef.current.style.height = `${textContainerRef.current.offsetHeight}px`;
            }
        };

        // Create a MutationObserver to watch for class changes
        const observer = new MutationObserver((mutations) => {
            mutations.forEach((mutation) => {
                if (mutation.type === 'attributes' && mutation.attributeName === 'class') {
                    const element = mutation.target as HTMLElement;
                    if (!element.classList.contains('hidden')) {
                        // Component is now visible, update height
                        updateHeight();
                        // Also update on resize
                        window.addEventListener('resize', updateHeight);
                    }
                }
            });
        });

        // Start observing the island element
        if (islandRef.current) {
            observer.observe(islandRef.current, {
                attributes: true,
                attributeFilter: ['class']
            });
        }

        // Cleanup
        return () => {
            observer.disconnect();
            window.removeEventListener('resize', updateHeight);
        };
    }, []);

    const handleMouseEnter = (index: number) => {
        if (index !== activeFeature) {
            setPreviousFeature(activeFeature);
            setActiveFeature(index);
            setAnimatedImages(prev => [...prev, { id: nextId, index, isAnimating: true }]);
            setNextId(prev => prev + 1);
        }
    };

    const handleAnimationEnd = (id: number) => {
        setAnimatedImages(prev => {
            // Only remove the oldest animation if we have more than 2 images
            if (prev.length > 2) {
                // Find the lowest ID in the array
                const lowestId = Math.min(...prev.map(img => img.id));
                // Remove the div with the lowest ID (oldest animation)
                return prev.filter(img => img.id !== lowestId);
            }
            return prev;
        });
    };

    return (
        <div
            ref={islandRef}
            island-id={`animated-feature-section-${id}`}
            className='hidden'
        >
            <div className="flex flex-col lg:flex-row items-start">
                {/* Images on the left */}
                <div className="hidden lg:block w-1/2 relative">
                    <div ref={containerRef} className="w-full relative overflow-hidden">
                        {/* Base image (previous active) */}
                        <img
                            src={"https://backend.stoertebeker.de" + (blocks[previousFeature].image?.url ?? placeholderUrl) + "?format=webp&w=800&embed"}
                            alt={blocks[previousFeature].image?.alternativeText ?? "Placeholder"}
                            className="absolute inset-0 object-cover w-full h-full z-10"
                        />
                        {/* Animated images */}
                        {animatedImages.map(({ id, index, isAnimating }, arrayIndex) => {
                            const block = blocks[index];
                            const imgUrl = block.image?.url ?? placeholderUrl;
                            const imgAlt = block.image?.alternativeText ?? "Placeholder";
                            // Higher z-index for newer animations
                            const zIndex = 20 + arrayIndex;

                            return (
                                <div
                                    key={id}
                                    className="absolute inset-0"
                                    style={{ zIndex }}
                                    onAnimationEnd={() => handleAnimationEnd(id)}
                                >
                                    <img
                                        src={"https://backend.stoertebeker.de" + imgUrl + "?format=webp&w=800&embed"}
                                        alt={imgAlt}
                                        className="absolute inset-0 object-cover w-full h-full animate-reveal-up"
                                    />
                                </div>
                            );
                        })}
                    </div>
                </div>
                {/* Text on the right */}
                <div ref={textContainerRef} className={`w-full text-white lg:w-1/2 flex flex-col justify-center gap-8 lg:gap-12 text-center lg:text-left text-4xl xl:text-5xl 2xl:text-[68px] ${textPadding}`}>
                    {blocks.map((block, index) => (
                        <a
                            href={block.link ?? (locale === "de" ? `/de/kompetenzen/${block.blocks.slug}` : `/en/competencies/${block.blocks.slug}`)}
                            key={block.id}
                            className={`cursor-pointer transition-all duration-300 ease-in-out ${index === activeFeature ? "text-primary blur-none" : "lg:blur-[3px] lg:opacity-60"
                                }`}
                            onMouseEnter={() => handleMouseEnter(index)}
                            onClick={() => handleMouseEnter(index)}
                        >
                            {block.text}
                        </a>
                    ))}
                    <div className='lg:flex mt-6'>
                        <ActionButton
                            text="Alle Fachgebiete"
                            link="/fachgebiete"
                            secondary={true}
                        />
                    </div>
                </div>
            </div>
        </div>
    );
};

export default AnimatedFeatureSectionCarousel;

