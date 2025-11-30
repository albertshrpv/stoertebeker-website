import React from 'react';
import type { ComponentSettings } from '../../interfaces/page';
import { STRAPI_URL } from '../../../environment';

interface Props {
    data: {
        image: any;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const BigImageVideo: React.FC<Props> = ({ data }) => {
    const { image, id, __component } = data;
    const isDev = import.meta.env.DEV;

    const url = image?.url ? image?.url : image;
    const fullUrl = url?.startsWith('http') ? url : `${STRAPI_URL}${url}`;
    const isVideo = image?.mime?.startsWith('video') || url?.match(/\.(mp4|webm|ogg|mov)$/i);

    return (
        <section id={data.componentSettings?.anchorId} className={`relative w-full h-[65vh] overflow-hidden flex justify-center items-center ${data.componentSettings?.classes}`}>
            {isVideo ? (
                <video 
                    src={fullUrl} 
                    className="absolute inset-0 w-full h-full object-cover" 
                    autoPlay 
                    muted 
                    loop 
                    playsInline 
                />
            ) : (
                <img 
                    src={fullUrl} 
                    alt="Big Image" 
                    className="absolute inset-0 w-full h-full object-cover" 
                />
            )}
        </section>
    );
}



export default BigImageVideo;

