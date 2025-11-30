import React, { useRef, useState, useEffect, useCallback } from 'react';
import type { ComponentSettings } from '../../../interfaces/page';

interface StatBlock {
    stat: string;
    label: string;
    subtitle: string;
    id: string;
}

interface Props {
    data: {
        blocks: StatBlock[];
        image: any[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    };
    padding?: string;
}

interface TrailImage {
    id: number;
    x: number;
    y: number;
    url: string;
    rotation: number;
    scale: number;
}

const AnimatedStatSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, image, componentSettings } = data;
    const containerRef = useRef<HTMLDivElement>(null);

    const [trail, setTrail] = useState<TrailImage[]>([]);
    const lastSpawnPos = useRef<{ x: number, y: number } | null>(null);
    const imageIndex = useRef(0);
    const nextId = useRef(0);

    const handleMouseMove = useCallback((e: React.MouseEvent<HTMLElement>) => {
        if (!containerRef.current || !image || image.length === 0) return;

        const rect = containerRef.current.getBoundingClientRect();
        const x = e.clientX - rect.left;
        const y = e.clientY - rect.top;

        // Constrain x and y to be within the container bounds minus half image size to prevent overflow
        // Image size is w-56 (224px) h-40 (160px)
        // Half size: 112px, 80px
        const halfW = 112;
        const halfH = 80;
        
        // Check if cursor is near edges
        if (x < halfW || x > rect.width - halfW || y < halfH || y > rect.height - halfH) {
             return;
        }

        if (!lastSpawnPos.current) {
            lastSpawnPos.current = { x, y };
            return;
        }

        const dx = x - lastSpawnPos.current.x;
        const dy = y - lastSpawnPos.current.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        // Spawn new image every 80px (increased from 50)
        if (dist > 120) {
            const currentImg = image[imageIndex.current % image.length];
            imageIndex.current += 1;

            const newImage: TrailImage = {
                id: nextId.current++,
                x,
                y,
                url: `https://backend.stoertebeker.de${currentImg.url}?format=webp`,
                rotation: Math.random() * 20 - 10, // Random rotation -10 to 10 deg
                scale: 0.8 + Math.random() * 0.4 // Random scale 0.8 to 1.2
            };

            setTrail(prev => [...prev, newImage]);
            lastSpawnPos.current = { x, y };

            // Remove image after 1s (reduced from 2s)
            setTimeout(() => {
                setTrail(prev => prev.filter(img => img.id !== newImage.id));
            }, 1000);
        }
    }, [image]);

    return (
        <section
            id={componentSettings?.anchorId}
            ref={containerRef}
            onMouseMove={handleMouseMove}
            className={`relative w-full bg-darkBlue lg:h-[75vh] text-white overflow-hidden py-24 lg:py-32 custom-cursor3 ${componentSettings?.classes || ''}`}
        >
            {/* Grid Container */}
            <div className={`relative max-w-screen-2xl mx-auto px-6 h-full ${padding}`}>
                <div className="flex flex-col lg:flex-row gap-12 lg:gap-8 text-center h-full justify-between items-center">
                    {blocks.map((block) => (
                        <div key={block.id} className="flex flex-col items-center gap-2">
                            <div className="font-title text-2xl lg:text-3xl xl:text-4xl">
                                {block.stat}
                            </div>
                            <div className="font-title text-2xl lg:text-3xl xl:text-4xl">
                                {block.label}
                            </div>
                            <div className="text-base md:text-lg font-normal mt-6">
                                {block.subtitle}
                            </div>
                        </div>
                    ))}
                </div>
            </div>

            {/* Trail Images Layer */}
            {/* We use a portal or just absolute positioning. Since it's "overflow-hidden" on section, absolute is fine. */}
            {/* Z-index 0 to be behind text (z-10) */}
            <div className="absolute inset-0 pointer-events-none z-0">
                {trail.map((img) => (
                    <img
                        key={img.id}
                        src={img.url}
                        alt=""
                        className="absolute w-56 h-40 object-cover shadow-lg animate-trail-fade"
                        style={{
                            left: img.x,
                            top: img.y,
                            transform: `translate(-50%, -50%) rotate(${img.rotation}deg) scale(${img.scale})`,
                        }}
                    />
                ))}
            </div>

            {/* Inject styles for the animation since we can't easily modify global css */}
            <style>{`
                @keyframes trailFade {
                    0% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                    20% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    60% {
                        opacity: 1;
                        transform: translate(-50%, -50%) scale(1);
                    }
                    100% {
                        opacity: 0;
                        transform: translate(-50%, -50%) scale(0.5);
                    }
                }
                .animate-trail-fade {
                    animation: trailFade 1s ease-in-out forwards;
                }
            `}</style>
        </section>
    );
};

export default AnimatedStatSection;
