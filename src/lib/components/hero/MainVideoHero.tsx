import React, { useState, useEffect } from 'react';
import type { ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import { componentContentPadding } from '../../utils';

const MainVideoHero: React.FC = () => {
    const videoPath = "/videos/homevideo.mp4";


    return (
        <section
            className='w-screen h-screen relative overflow-hidden'
        >
            <video
                src={videoPath}
                autoPlay
                muted
                loop
                playsInline
                className='w-full h-full object-cover'
            />
        </section>
    );
};

export default MainVideoHero;