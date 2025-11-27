import React, { useEffect, useRef, useState } from 'react';

interface Props {
    data: {
        image: any;
        componentSettings?: any;
        id: string;
        __component: string;
    }
}

const FullScreenCarousel: React.FC<Props> = ({ data }) => {
    const { image, id } = data;
    const [currentImage, setCurrentImage] = useState(0);
    const [progress, setProgress] = useState(0);
    const intervalRef = useRef<NodeJS.Timeout | null>(null);
    let paddingX = 'px-6 md:px-16 xl:px-20';

    const resetInterval = () => {
        if (intervalRef.current) {
            clearInterval(intervalRef.current);
        }
        intervalRef.current = setInterval(() => {
            setCurrentImage((prev) => (prev === image.length - 1 ? 0 : prev + 1));
        }, 5000);
    };

    useEffect(() => {
        resetInterval();
        return () => {
            if (intervalRef.current) clearInterval(intervalRef.current);
        };
    }, [image.length]);

    useEffect(() => {
        setProgress(0);
        const progressInterval = setInterval(() => {
            setProgress((prev) => (prev >= 100 ? 0 : prev + 2));
        }, 100);

        return () => clearInterval(progressInterval);
    }, [currentImage]);


    const evaluateClass = (index: number) => {
        let classes = '';
        if (Math.abs(index - currentImage) > 1 && !(index === 0 && currentImage === image.length - 1) && !(index === image.length - 1 && currentImage === 0)) {
            classes = "hidden";
            return classes;
        }

        if (currentImage === image.length - 1 && index === 0) {
            classes = "translate-x-full";
            return classes;
        } else if (currentImage === 0 && index === image.length - 1) {
            classes = "-translate-x-full";
            return classes;
        }

        if (index > currentImage) {
            classes = "translate-x-full";
        } else if (index < currentImage) {
            classes = "-translate-x-full";
        }
        return classes;
    };

    const handleImageClick = () => {
        if (isLeftSide) {
            setCurrentImage((prev) => (prev === 0 ? image.length - 1 : prev - 1));
        } else {
            setCurrentImage((prev) => (prev === image.length - 1 ? 0 : prev + 1));
        }
        resetInterval();
    };

    // Add state for tracking cursor position
    const [isLeftSide, setIsLeftSide] = useState(false);

    // Add mouse move handler to update cursor
    const handleMouseMove = (e: React.MouseEvent) => {
        const rect = e.currentTarget.getBoundingClientRect();
        const mouseX = e.clientX - rect.left;
        setIsLeftSide(mouseX < rect.width / 2);
    };


    return (
        <section
            onClick={handleImageClick}
            onMouseMove={handleMouseMove}
            className="hidden relative w-full h-[75vh] bg-primary-500"
            style={{ cursor: `url(${isLeftSide ? '/images/Maus2.svg' : '/images/Maus.svg'}) 30 30, auto` }}
            island-id={`full-screen-carousel-${id}`}
        >
            <div id="carousel-example" className="relative w-full h-full overflow-hidden">
                <div className="relative w-full h-full">
                    {image.map((image: any, index: number) => (
                        <div key={image.id} id={`carousel-item-${index + 1}`} className={`absolute ${evaluateClass(index)} ${index === currentImage && 'z-10'} bg-white duration-700 ease-in-out w-full h-full`}>
                            <img
                                src={`https://backend.stoertebeker.de${image.url}?format=webp`}
                                className="absolute block w-full h-full object-cover"
                                alt={image.alternativeText}
                                loading="lazy"
                            />
                        </div>
                    ))}
                </div>

                {/* Progress Indicator */}
                <div className='absolute left-0 bottom-12 z-10 w-full'>
                    <div className={`max-w-screen-2xl w-full mx-auto ${paddingX}`}>
                        <div className='flex justify-between text-white w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 mb-4'>
                            <div>{currentImage + 1 < 10 ? `0${currentImage + 1}` : currentImage + 1}</div>
                            <div>{image.length < 10 ? `0${image.length}` : image.length}</div>
                        </div>
                        <div className="w-1/2 md:w-1/3 lg:w-1/4 xl:w-1/5 h-1 bg-white/30">
                            <div
                                className="h-full bg-white"
                                style={{ width: `${progress}%`, transition: "width 0.1s linear" }}
                            ></div>
                        </div>
                    </div>
                </div>
            </div>
        </section>
    );
};

export default FullScreenCarousel;
