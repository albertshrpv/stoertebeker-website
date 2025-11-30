import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import CornerBorderedContainer from '../../../components/ticketshop/components/CornerBorderedContainer';

interface Props {
    data: {
        sideText: string;
        image: any;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;

}



const PartnerSection: React.FC<Props> = ({ data, padding }) => {
    const { sideText, image } = data;

    return (
        <section id={data.componentSettings?.anchorId} className="bg-white w-full my-12 lg:my-20 overflow-hidden">
            <div className={`max-w-screen-2xl text-start mx-auto flex justify-between relative font-medium text-base lg:text-lg`}>
                <div className="text-darkBlue uppercase rotate-90 absolute top-1/2 left-0 -translate-y-1/2 hidden lg:block">
                    {sideText}
                </div>
                <div className="w-full flex flex-row gap-12 lg:gap-16 items-center justify-evenly px-6 lg:px-20 xl:px-36">
                    {image.map((image: any, idx: number) => (
                        <img
                            key={idx}
                            src={`https://backend.stoertebeker.de${image.url}?format=webp`}
                            alt={image.alternativeText}
                            className="flex-1 min-w-0 w-full max-w-[300px] h-auto max-h-[70px] md:max-h-[100px] lg:max-h-[140px] object-contain grayscale"
                        />
                    ))}
                </div>
                <div className="text-darkBlue uppercase -rotate-90 absolute top-1/2 right-0 -translate-y-1/2 hidden lg:block">
                    {sideText}
                </div>
            </div>
        </section >
    );
}


export default PartnerSection;

