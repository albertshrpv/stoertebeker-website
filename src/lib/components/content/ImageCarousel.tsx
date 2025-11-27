import React, { Component, useEffect, useState } from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';
import { evaluateContentPadding } from '../../utils';

interface Props {
    data: {
        title: string;
        text: string;
        image: any;
        componentSettings?: ComponentSettings;
        id: string;
        __component: string;
    }
}


const ImageCarousel: React.FC<Props> = ({ data }) => {
    const { title, text, image, id, __component } = data;

    const imagesData = image;
    const [currentImage, setCurrentImage] = useState(0);
    const [modalOpen, setModalOpen] = useState(false);

    let paddingX = "px-6 md:px-16 xl:px-20";

    const openModal = () => {
        setModalOpen(true);
        document.getElementById("image-view-modal")?.classList.remove("hidden");
    };

    const closeModal = () => {
        setModalOpen(false);
        document.getElementById("image-view-modal")?.classList.add("hidden");
    };

    const goToPrevImage = () => {
        setCurrentImage((prev) => (prev === 0 ? imagesData.length - 1 : prev - 1));
    };

    const goToNextImage = () => {
        setCurrentImage((prev) => (prev === imagesData.length - 1 ? 0 : prev + 1));
    };

    useEffect(() => {
        if (modalOpen) {
            document.body.style.overflowY = 'hidden';
        } else {
            document.body.style.overflowY = 'scroll';
        }
    }, [modalOpen]);

    const evaluateClass = (index: number) => {
        let classes = '';
        if (Math.abs(index - currentImage) > 1 && !(index === 0 && currentImage === imagesData.length - 1) && !(index === imagesData.length - 1 && currentImage === 0)) {
            classes = "hidden";
            return classes;
        }

        if (currentImage === imagesData.length - 1 && index === 0) {
            classes = "translate-x-full";
            return classes;
        } else if (currentImage === 0 && index === imagesData.length - 1) {
            classes = "-translate-x-full";
            return classes;
        }

        if (index > currentImage) {
            classes = "translate-x-full";
        } else if (index < currentImage) {
            classes = "-translate-x-full";
        }
        return classes;
    }


    return (
        <>
            <div id="image-view-modal" className="image-view-modal max-h-[100vh] z-50 hidden fixed inset-0 flex items-center justify-center">
                <div className="bg-white max-w-screen-2xl m-4 p-1 rounded-custom">
                    <div className="relative text-center w-full rounded-custom overflow-hidden">
                        <img
                            // format=webp zeigt Bild nicht an
                            // src={"https://backend.stoertebeker.de" + imagesData[currentImage].url + "?format=webp"}
                            src={"https://backend.stoertebeker.de" + imagesData[currentImage].url}
                            className="block h-auto max-h-[90vh] w-full rounded-custom"
                            alt={imagesData[currentImage].alternativeText}
                        />
                        {
                            imagesData[currentImage].caption &&
                            <div className="absolute content-center transition-all ps-10 duration-300 h-8 items-center bg-black/55 bottom-0 text-left text-neutral-50 text-xs w-full">
                                {imagesData[currentImage].caption}
                            </div>
                        }
                        {imagesData[currentImage].caption &&
                            <div className="absolute bottom-1 left-6 items-center text-center text-neutral-50 text-md">
                                ©
                            </div>
                        }
                        <button onClick={closeModal} type="button" className="flex absolute justify-center items-center top-3 right-3 text-neutral-900 bg-white hover:bg-gray-200 rounded-2xl text-sm w-8 h-8">
                            <svg className="w-3 h-3" aria-hidden="true" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 14 14">
                                <path stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="m1 1 6 6m0 0 6 6M7 7l6-6M7 7l-6 6" />
                            </svg>
                            <span className="sr-only">Close modal</span>
                        </button>
                    </div>
                </div>
            </div>
            <div className={`bg-primary-500 w-full`}>
                <div id="carousel-example" className={`relative w-full max-w-screen-2xl mx-auto ${paddingX} pt-20 md:pt-28 xl:pt-32`}>
                    <div className="relative">
                        <div onClick={openModal} className="relative lg:mx-32 image-view-body overflow-hidden">
                            {imagesData.map((image: any, index: any) => (
                                <div key={image.documentId} id={`carousel-item-${index + 1}`} className={`absolute ${evaluateClass(index)} ${index === currentImage && 'z-10'} bg-white duration-700 ease-in-out w-full h-full`}>
                                    <img
                                        // q=60 zeigt Bild nicht an
                                        // src={"https://backend.stoertebeker.de" + image.url + "?format=webp&w=1200&q=60"}
                                        src={"https://backend.stoertebeker.de" + image.url + "?format=webp&w=1200"}
                                        className="absolute block w-full h-full object-cover hover:cursor-pointer border-8 border-secondary"
                                        alt={image.alternativeText}
                                        loading="lazy"
                                    />
                                </div>
                            ))}
                        </div>
                        <button
                            id="data-carousel-prev"
                            type="button"
                            onClick={goToPrevImage}
                            className="absolute top-0 start-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
                        >
                            <span>
                                <svg className='rotate-180 stroke-secondary' width="35" height="70" viewBox="0 0 35 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 2L34 35L2 68" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round" />
                                </svg>
                                <span className="sr-only">Previous</span>
                            </span>
                        </button>
                        <button
                            id="data-carousel-next"
                            type="button"
                            onClick={goToNextImage}
                            className="absolute top-0 end-0 z-30 flex items-center justify-center h-full px-4 cursor-pointer group focus:outline-none"
                        >
                            <span>
                                <svg className='stroke-secondary' width="35" height="70" viewBox="0 0 35 70" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M2 2L34 35L2 68" strokeWidth="2" strokeLinecap="square" strokeLinejoin="round" />
                                </svg>
                                <span className="sr-only">Next</span>
                            </span>
                        </button>
                    </div>
                    <div className="py-7 flow text-center">
                        {imagesData.map((image: any, index: any) => (
                            <button
                                key={image.documentId + "-indicator"}
                                id={`carousel-indicator-${index + 1}`}
                                onClick={() => setCurrentImage(index)}
                                type="button"
                                className={`h-14 px-0.5 rounded-2xl mt-1 mr-1 ${index === currentImage ? 'brightness-100 activeGalleryItem' : 'brightness-50 hover:brightness-100'}`}
                                aria-current={index === 0}
                                aria-label={`Slide ${index + 1}`}
                            >
                                <img
                                    src={"https://backend.stoertebeker.de" + image.url + "?format=webp&w=200&embed"}
                                    className="h-full object-cover rounded-sm"
                                    alt={image.alternativeText}
                                    loading="lazy"
                                />
                            </button>
                        ))}
                    </div>
                </div>
            </div>
        </>
    );
};

export default ImageCarousel;