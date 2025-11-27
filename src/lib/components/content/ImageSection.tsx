import React from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';
import { placeholderUrl } from '../../utils';
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


const ImageSection: React.FC<Props> = ({ data, padding }) => {
    const { image } = data;

    const imgCount = image.length;
    const images: any[] = image;

    const paddingBottom = data.componentSettings?.paddingBottom ?? 'normal';
    let imageGapClasses = "";

    switch (paddingBottom) {
        case 'weniger':
            imageGapClasses = 'gap-2 md:gap-8 xl:gap-12';
            break;
        case 'mehr':
            imageGapClasses = 'gap-8 md:gap-20 xl:gap-26 ';
            break;
        default:
            imageGapClasses = 'gap-6 md:gap-16 xl:gap-20 ';
            break;
    }

    imageGapClasses = 'gap-6 md:gap-4 lg:gap-8';

    return (
        <section id={data.componentSettings?.anchorId} className={`overflow-x-clip ${data.componentSettings?.classes}`}>
            <div className={`max-w-[2000px] mx-auto md:hidden flex flex-col ${imageGapClasses} ${padding}`}>
                {
                    images.map((image: any, idx) => {
                        const imgUrl = image?.url ?? placeholderUrl;
                        const imgAlt = image?.alternativeText ?? "Placeholder";
                        return (
                            <img key={idx} className="image-viewer w-full h-full overflow-clip object-cover rounded-2xl" src={STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'} alt={imgAlt} />
                        )
                    }
                    )
                }
            </div>
            <div className={`hidden max-w-[2000px] mx-auto md:flex ${imageGapClasses} ${padding}`}>
                {
                    images.map((image: any, idx) => {
                        const imgUrl = image?.url ?? placeholderUrl;
                        const imgAlt = image?.alternativeText ?? "Placeholder";
                        return (
                            <div key={idx} className={`w-full ${imgCount === 1 ? 'aspect-[2/1]' : 'aspect-[1/1]'} relative group`}>
                                <img className="image-viewer w-full h-full overflow-clip object-cover rounded-2xl" src={STRAPI_URL + imgUrl + '?format=webp&w=1400&embed'} alt={imgAlt} />
                            </div>
                        )
                    }
                    )
                }
            </div>
        </section>
    );
};

export default ImageSection;

