import React, { useState, useRef, useEffect } from 'react';
import type { NavigationNode } from '../../lib/interfaces/navigation';
import { placeholderUrl } from '../../lib/utils';

interface Props {
    navigationHierarchy: NavigationNode[];
    locale: 'de' | 'en';
    pathname: string;
    translations: {
        [key in 'de' | 'en']: {
            imprint: string;
            privacy: string;
            imprintPath: string;
            privacyPath: string;
        }
    };
}

interface AnimatedImage {
    id: number;
    index: number;
    isAnimating: boolean;
}

const SlideMenu: React.FC<Props> = ({ navigationHierarchy, locale, translations, pathname }) => {
    const [activeFeature, setActiveFeature] = useState<number>(0);
    const [previousFeature, setPreviousFeature] = useState(0);
    const [animatedImages, setAnimatedImages] = useState<AnimatedImage[]>([]);
    const [nextId, setNextId] = useState(0);

    const textPadding = "px-6 md:px-16 xl:px-20 2xl:px-32 py-12 md:py-16 xl:py-20 2xl:py-24";

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

    useEffect(() => {
        updateMobileLangSwitchStyle();
    }, []);

    const updateMobileLangSwitchStyle = () => {
        const currentPath = window.location.pathname;
        const isEnglish = currentPath.startsWith('/en');

        const updateMobileLangSwitchStyle = () => {
            // Remove font-semibold from all buttons first
            document.querySelectorAll('.language-switch-en, .language-switch-de').forEach(btn => {
                btn.classList.remove('font-semibold');
                btn.classList.add('font-light');
            });

            // Add font-semibold to the active language
            if (isEnglish) {
                document.querySelectorAll('.language-switch-en').forEach(btn => {
                    btn.classList.add('font-semibold');
                    btn.classList.remove('font-light');
                });

            } else {
                document.querySelectorAll('.language-switch-de').forEach(btn => {
                    btn.classList.add('font-semibold');
                    btn.classList.remove('font-light');
                });
            }
        };

    };


    const switchLanguage = (language: string) => {
        const currentLocale = (document.getElementById('locale') as HTMLInputElement)?.value;

        if (currentLocale === language) {
            return;
        }

        const langSwitchSlug = (document.getElementById(`langSwitch${language.toUpperCase()}`) as HTMLInputElement)?.value;

        let newUrl: string;
        if (!langSwitchSlug || langSwitchSlug.trim() === '') {
            newUrl = `/${language}/`;
        } else {
            newUrl = `/${language}/${langSwitchSlug}`;
        }

        window.location.href = newUrl;
    };

    return (
        <div className="h-full flex flex-col lg:flex-row items-start">
            {/* Images on the left */}
            <div className="hidden lg:block w-1/2 relative">
                <div className="w-full relative overflow-hidden h-[calc(100vh-100px)]">
                    {/* Base image (previous active) */}
                    <img
                        src={(navigationHierarchy[previousFeature].imageUrl ?? placeholderUrl) + "?format=webp&w=800&embed"}
                        alt={navigationHierarchy[previousFeature].imageUrl ?? "Placeholder"}
                        className="absolute inset-0 object-cover w-full h-full z-10"
                    />
                    {/* Animated images */}
                    {animatedImages.map(({ id, index, isAnimating }, arrayIndex) => {
                        const block = navigationHierarchy[index];
                        const imgUrl = block.imageUrl ?? placeholderUrl;
                        const imgAlt = block.imageUrl ?? "Placeholder";
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
                                    src={imgUrl + "?format=webp&w=800&embed"}
                                    alt={imgAlt}
                                    className="absolute inset-0 object-cover w-full h-full animate-reveal-up"
                                />
                            </div>
                        );
                    })}
                </div>
            </div>
            {/* Text on the right */}
            <div className={`relative w-full text-white lg:w-1/2 flex flex-col justify-between items-center lg:items-start gap-4 xl:gap-6 text-3xl lg:text-[42px] xl:text-[48px] 2xl:text-[52px] 3xl:text-[54px] ${textPadding} h-[calc(100vh-100px)]`}>
                <div className="flex lg:hidden space-x-2 text-base font-light">
                    <div>
                        <button className={`language-switch-de focus:outline-none pt-2 pb-1`} data-lang="de" onClick={() => switchLanguage('de')}> DE </button>
                        {/* <div className={`underline-en w-full h-[1px] bg-white hidden`}></div> */}
                    </div>
                    <div>
                        <button className={`language-switch-en focus:outline-none pt-2 pb-1`} data-lang="en" onClick={() => switchLanguage('en')}> EN </button>
                        {/* <div className={`underline-de w-full h-[1px] bg-white hidden`}></div> */}
                    </div>
                </div>

                <div className="hidden xl:block absolute bottom-0 right-0 z-20">
                    <svg width="454" height="450" viewBox="0 0 454 450" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <g clipPath="url(#clip0_9764_1450)">
                            <path
                                d="M464.805 451.892L585.669 698.258L279.394 848.513L247.96 784.439L333.206 743.054L331.115 738.791C298.142 731.795 263.166 715.04 226.253 688.548C189.319 662.013 160.449 627.541 139.622 585.088C114.052 532.968 103.469 478.783 107.872 422.536C112.276 366.288 131.572 314.129 165.716 266.081C199.839 218.099 246.685 179.469 306.232 150.255C365.78 121.042 425.001 107.637 483.831 110.018C542.661 112.399 595.72 129.061 642.963 160.026C690.185 190.947 726.559 232.478 752.108 284.555C781.558 344.586 791.175 407.151 780.869 472.292C770.563 537.433 741.637 593.226 694.135 639.757L658.712 567.552C688.35 531.911 705.711 491.28 710.752 445.569C715.793 399.859 708.298 356.645 688.313 315.907C668.327 275.168 640.803 244.888 604.126 221.771C567.449 198.653 525.948 186.517 479.667 185.341C433.386 184.164 386.678 195.138 339.629 218.22C292.581 241.301 255.272 271.545 227.877 308.866C200.483 346.187 184.681 386.435 180.516 429.589C176.351 472.744 184.036 514.119 203.483 553.759C220.429 588.301 245.095 616.766 277.571 639.109C310.002 661.474 344.895 674.944 382.272 679.453C419.649 683.962 453.643 678.68 484.275 663.652L492.813 659.464L405.302 481.084L464.849 451.87L464.805 451.892Z"
                                fill="white"></path>
                        </g>
                        <defs>
                            <clipPath id="clip0_9764_1450">
                                <rect width="615.013" height="682.245" fill="white" transform="translate(612.508) rotate(63.8679)"></rect>
                            </clipPath>
                        </defs>
                    </svg>
                </div>

                <div className="flex flex-col items-center lg:items-start">
                    {navigationHierarchy.map((block, index) => (
                        <div
                            key={block.id}
                            className="overflow-hidden"
                        >
                            <div className={`flex items-center gap-4 py-3 xl:py-4 transition-transform duration-300 ease-in-out ${pathname.includes(block.path ?? '') ? '-translate-x-4 lg:translate-x-0 font-semibold lg:font-normal' : 'hover:translate-x-0 -translate-x-4 lg:-translate-x-8'}`}>
                                <svg className="mt-1" width="15" height="28" viewBox="0 0 15 28" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M1 1L13.6715 13.234C14.1095 13.657 14.1095 14.343 13.6715 14.766L1 27"
                                        stroke="white"
                                        strokeWidth="2"
                                        strokeLinecap="round"
                                    />
                                </svg>
                                <a
                                    href={`/${locale}/${block.path}/`}
                                    className={`flex items-center gap-4 xl:gap-6 cursor-pointer transition-all duration-300 ease-in-out ${(pathname.includes(block.path ?? '')) ? "text-primary opacity-100" : "opacity-100 hover:opacity-100"}`}
                                    onMouseEnter={() => handleMouseEnter(index)}
                                    onClick={() => handleMouseEnter(index)}
                                >
                                    {block.title}
                                </a>
                            </div>
                        </div>
                    ))}
                </div>
                <div className="flex flex-col items-center lg:items-start lg:ml-0">
                    <a href={`/${locale}/${translations[locale].imprintPath}/`} className="stop-propagation text-[18px] font-light hover:underline">
                        {translations[locale].imprint}
                    </a>
                    <a href={`/${locale}/${translations[locale].privacyPath}/`} className="stop-propagation text-[18px] font-light hover:underline">
                        {translations[locale].privacy}
                    </a>
                </div>
            </div>
        </div>
    );
};

export default SlideMenu;






