import React, { useEffect, useRef, useState } from 'react';
import type { ComponentSettings } from '../../../interfaces/page';

interface Props {
    data: {
        text: string;
        ctaLink?: string;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

// We create a reusable SVG component to keep things clean
const ArrowSvg = ({ color = "#19263D" }: { color?: string }) => (
    <svg width="61" height="28" viewBox="0 0 61 28" fill="none" xmlns="http://www.w3.org/2000/svg">
        <path d="M49.8897 23.5488L59.8008 13.7988L49.7102 13.8246C53.3685 13.8151 55.206 18.2388 52.6177 20.824L49.8897 23.5488Z" fill={color} />
        <path d="M59.8008 13.7988L53.1934 7.29883L49.8897 4.04883L52.6124 6.74674C55.2341 9.34459 53.4011 13.8151 49.7102 13.8246L59.8008 13.7988Z" fill={color} />
        <path d="M0.800781 13.8246L49.7102 13.8246M59.8008 13.7988L53.1934 7.29883L49.8897 4.04883M59.8008 13.7988L49.8897 23.5488M59.8008 13.7988L49.7102 13.8246M46.586 0.798828L49.8897 4.04883M46.586 26.7988L49.8897 23.5488M49.8897 4.04883L52.6124 6.74674C55.2341 9.34459 53.4011 13.8151 49.7102 13.8246M49.8897 23.5488L52.6177 20.824C55.206 18.2388 53.3685 13.8151 49.7102 13.8246" stroke={color} strokeWidth="1.59781" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
);

const BannerItem: React.FC<{ text: string; ctaLink?: string; innerRef?: React.RefObject<HTMLDivElement> }> = ({ text, ctaLink, innerRef }) => {
    return (
        <div ref={innerRef} className="flex items-center gap-12 flex-shrink-0 pr-12 h-full">
            <div className="whitespace-nowrap text-3xl font-medium text-darkBlue">
                {text}
            </div>
            <div className="text-[#19263D]">
                 <ArrowSvg color="currentColor" />
            </div>
        </div>
    );
};

const ScrollingBanner: React.FC<Props> = ({ data }) => {
    const { text, id, ctaLink } = data;
    const containerRef = useRef<HTMLDivElement>(null);
    const containerRef2 = useRef<HTMLDivElement>(null);
    const itemRef = useRef<HTMLDivElement>(null);
    const sectionRef = useRef<HTMLElement>(null);
    
    const [itemWidth, setItemWidth] = useState(0);
    const [numCopies, setNumCopies] = useState(4);
    const [isFolded, setIsFolded] = useState(false);

    // Animation state refs (no re-renders)
    const position = useRef(0);
    const velocity = useRef(0.5); // Start with a small base velocity for auto-scroll
    const lastScrollY = useRef(0);
    const requestRef = useRef<number>();

    useEffect(() => {
        const updateDimensions = () => {
            if (itemRef.current) {
                const width = itemRef.current.offsetWidth;
                if (width > 0) {
                    setItemWidth(width);
                    const needed = Math.ceil(window.innerWidth / width) + 2;
                    setNumCopies(Math.max(4, Number.isFinite(needed) ? needed : 4));
                }
            }
        };

        updateDimensions();
        
        const observer = new ResizeObserver(() => updateDimensions());
        if (containerRef.current) observer.observe(containerRef.current);

        window.addEventListener('resize', updateDimensions);
        lastScrollY.current = window.scrollY;

        return () => {
            window.removeEventListener('resize', updateDimensions);
            observer.disconnect();
        };
    }, [text]);

    useEffect(() => {
        const handleScroll = () => {
            const currentScrollY = window.scrollY;
            const delta = currentScrollY - lastScrollY.current;
            lastScrollY.current = currentScrollY;
            velocity.current += delta * 0.05;

            if (sectionRef.current) {
                const rect = sectionRef.current.getBoundingClientRect();
                const shouldFold = rect.top < (window.innerHeight * 0.5);
                setIsFolded(shouldFold);
            }
        };

        window.addEventListener('scroll', handleScroll);
        handleScroll(); // Check initial state
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    useEffect(() => {
        const animate = () => {
            // Apply friction but keep a minimum base velocity
            // If velocity is high, decay it. If it's near base, keep it at base.
            
            const baseVelocity = 2; // Pixels per frame roughly
            
            // Smoothly decay velocity towards baseVelocity
            velocity.current = velocity.current * 0.95 + baseVelocity * 0.05;

            position.current += velocity.current;
            
            if (itemWidth > 0) {
                 // Standard wrap for front face (moves right with positive velocity)
                 let x = position.current % itemWidth;
                 const baseOffset = -itemWidth; 
                 const transformFront = `translate3d(${baseOffset + x}px, 0, 0)`;
                 
                 // Reverse wrap for top face (moves left with positive velocity logic inverted, or just moves opposite)
                 // To move opposite: position is negated.
                 // -position.current moving left.
                 // Wrap logic: (-position % itemWidth)
                 
                 let xReverse = (-position.current) % itemWidth;
                 const transformTop = `translate3d(${baseOffset + xReverse}px, 0, 0)`;

                 if (containerRef.current) containerRef.current.style.transform = transformFront;
                 if (containerRef2.current) containerRef2.current.style.transform = transformTop;
            }
            
            requestRef.current = requestAnimationFrame(animate);
        };

        requestRef.current = requestAnimationFrame(animate);
        return () => {
            if (requestRef.current) cancelAnimationFrame(requestRef.current);
        };
    }, [itemWidth]);

    // CSS classes that might be missing in global styles are injected here
    const containerClasses = `relative w-full h-28 group ${data.componentSettings?.classes || ''}`;
    
    const Wrapper = ctaLink ? 'a' : 'div';
    const wrapperProps = ctaLink ? { 
        href: `/de${ctaLink}`,
        className: `${containerClasses} cursor-pointer block`
    } : {
        className: containerClasses
    };

    return (
        <section 
            ref={sectionRef}
            id={data.componentSettings?.anchorId} 
            island-id={`scrolling-banner-${id}`}
            className={`block w-full h-28 overflow-visible`} 
            style={{ perspective: '1000px' }} 
        >
            <style>{`
                .cube-wrapper {
                    position: relative;
                    width: 100%;
                    height: 100%;
                    transform-style: preserve-3d;
                    transition: transform 0.35s ease-in-out;
                }
                .cube-face {
                    position: absolute;
                    width: 100%;
                    height: 100%;
                    backface-visibility: hidden;
                    display: flex;
                    align-items: center;
                    overflow: hidden;
                }
                /* Rotate the cube wrapper on group hover - Default */
                .group:hover .cube-wrapper {
                    transform: rotateX(-90deg);
                }

                /* Folded state: Default is folded */
                .cube-wrapper.is-folded {
                    transform: rotateX(-90deg);
                }
                /* Folded state: Hover unfolds */
                .group:hover .cube-wrapper.is-folded {
                    transform: rotateX(0deg);
                }
            `}</style>

            <Wrapper {...wrapperProps as any}>
                 <div className={`cube-wrapper ${isFolded ? 'is-folded' : ''}`}>
                    {/* Front Face */}
                    <div className="cube-face bg-white" style={{ transform: 'translateZ(3.5rem)' }}>
                        <div ref={containerRef} className="flex items-center will-change-transform text-[#19263D]">
                            {Array.from({ length: numCopies }).map((_, i) => (
                                <BannerItem key={i} text={text} ctaLink={ctaLink} innerRef={i === 0 ? itemRef : undefined} />
                            ))}
                        </div>
                    </div>

                    {/* Top Face */}
                    <div className="cube-face bg-[#19263D] border-y-2 border-white" style={{ transform: 'rotateX(90deg) translateZ(3.5rem)' }}>
                         <div ref={containerRef2} className="flex items-center will-change-transform text-white fill-current">
                            {Array.from({ length: numCopies }).map((_, i) => (
                                <div key={i} className="flex items-center gap-12 flex-shrink-0 pr-12 h-full text-white">
                                    <div className='whitespace-nowrap text-3xl font-medium'>
                                        {text}
                                    </div>
                                    <div className="text-white">
                                        <ArrowSvg color="white" />
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                 </div>
            </Wrapper>
        </section>
    );
}

export default ScrollingBanner;
