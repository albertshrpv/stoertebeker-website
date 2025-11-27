import React, { useState, useEffect } from 'react';

// Utility function to get a cookie by name
function getCookie(name: string) {
    const value = `; ${document.cookie}`;
    const parts = value.split(`; ${name}=`);
    if (parts.length === 2) return parts?.pop()?.split(';').shift();
    return null;
}


const VideoEmbed: React.FC<{ embedUrl: string }> = ({ embedUrl }) => {
    const [thirdPartyServices, setThirdPartyServices] = useState<string[]>([]);


    useEffect(() => {
        const checkCookie = () => {
            const cookieValue = getCookie("cc_cookie");
            if (cookieValue) {
                try {
                    // Decode the URL-encoded cookie value
                    const decodedCookieValue = decodeURIComponent(cookieValue);
                    // Parse the JSON string
                    const parsedCookie = JSON.parse(decodedCookieValue);
                    // Extract the thirdparty services
                    const services = parsedCookie?.services?.thirdparty || [];
                    // Update state only if services have changed
                    setThirdPartyServices((prevServices) => {
                        if (JSON.stringify(prevServices) !== JSON.stringify(services)) {
                            return services;
                        }
                        return prevServices;
                    });
                } catch (error) {
                    console.error('Failed to parse cookie:', error);
                }
            } else {
                setThirdPartyServices([]);
            }
        };

        // Check the cookie initially
        checkCookie();

        // Set up an interval to check the cookie periodically
        const interval = setInterval(checkCookie, 1000); // Check every second

        // Clean up the interval when the component unmounts
        return () => clearInterval(interval);
    }, []);


    useEffect(() => {
        if (embedUrl.includes('instagram') && thirdPartyServices.includes('instagram')) {
            // Dynamically load the Instagram script if it's not already present
            if (!document.querySelector('script[src="https://www.instagram.com/embed.js"]')) {
                const script = document.createElement('script');
                script.src = "https://www.instagram.com/embed.js";
                script.async = true;
                document.body.appendChild(script);
            }
        }
    }, [thirdPartyServices]);


    const renderEmbed = () => {
        if (embedUrl.includes('youtube')) {
            if (thirdPartyServices.includes('youtube')) {
                return (
                    <iframe
                        width="100%"
                        className='h-[500px] lg:h-[700px]'
                        src={embedUrl}
                        title="YouTube video player"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                    ></iframe>
                );
            } else {
                return (
                    // <button className="give-consent-youtube-btn inline-flex transition-all duration-300 ease-in-out items-center justify-center pl-8 py-4 pr-6 mr-3 text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-center text-white bg-primary-500 hover:bg-primary-500">
                    //     Erlaubnis erteilen
                    // </button>
                    <button className="give-consent-youtube-btn text-white font-semibold text-lg px-6 py-2 rounded-lg bg-primary-500 hover:bg-secondary hover:cursor-pointer transition-colors duration-300 ease-in-out">
                        Cookie akzeptieren, um YouTube-Inhalte zu sehen
                    </button>
                );
            }
        } else if (embedUrl.includes('vimeo')) {
            if (thirdPartyServices.includes('vimeo')) {
                return (
                    <div className="relative w-full" style={{ paddingBottom: '62.5%' }}>
                        <iframe
                            src={embedUrl}
                            width="100%"
                            className='absolute top-0 left-0 w-full h-full'
                            allow="autoplay; fullscreen; picture-in-picture"
                            allowFullScreen
                            title="Vimeo video player"
                        ></iframe>
                    </div>
                );
            } else {
                return (
                    // <button className="give-consent-vimeo-btn inline-flex transition-all duration-300 ease-in-out items-center justify-center pl-8 py-4 pr-6 mr-3 text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-center text-white bg-primary-500 hover:bg-primary-500">
                    //     Erlaubnis erteilen
                    // </button>
                    <button className="give-consent-vimeo-btn text-white font-semibold text-lg px-6 py-2 rounded-lg bg-primary-500 hover:bg-secondary hover:cursor-pointer transition-colors duration-300 ease-in-out">
                        Cookie akzeptieren, um Vimeo-Inhalte zu sehen
                    </button>
                );
            }
        } else if (embedUrl.includes('instagram')) {
            if (thirdPartyServices.includes('instagram')) {
                return (
                    <div className="overflow-hidden flex justify-center">
                        <blockquote
                            className="instagram-media"
                            data-instgrm-permalink={embedUrl}
                            data-instgrm-version="14"
                            style={{ width: '100%', maxWidth: '540px' }}
                        ></blockquote>
                    </div>
                );
            }
            else {
                return (
                    // <button className="give-consent-instagram-btn inline-flex transition-all duration-300 ease-in-out items-center justify-center pl-8 py-4 pr-6 mr-3 text-base md:text-lg lg:text-xl xl:text-2xl font-bold text-center text-white bg-primary-500 hover:bg-primary-500">
                    //     Erlaubnis erteilen
                    // </button>
                    <button className="give-consent-instagram-btn text-white font-semibold text-lg px-6 py-2 rounded-lg bg-primary-500 hover:bg-secondary hover:cursor-pointer transition-colors duration-300 ease-in-out">
                        Cookie akzeptieren, um Instagram-Inhalte zu sehen
                    </button>
                );
            }
        }
    };


    return (
        <div>
            {renderEmbed()}
        </div>
    );
};

export default VideoEmbed;