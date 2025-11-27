import React from 'react';
import type { Block } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import DownloadSectionEntry from './sub/DownloadSectionEntry';
import type { ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        title: string;
        text: string;
        image: any[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const DownloadSection: React.FC<Props> = ({ data, padding }) => {
    const { image, title, text, id, __component } = data;

    return (
        <section id={data.componentSettings?.anchorId} className={`max-w-[2000px] text-start mx-auto ${padding}`}>
            <div className="markup flex flex-col gap-6 lg:gap-10 lg:mb-10">
                {title &&
                    <div>
                        <Markup markup={title} />
                    </div>
                }
                {text &&
                    <div>
                        <Markup markup={text} />
                    </div>
                }
                <div className="">
                    {image?.map((b: any, idx: any) => <DownloadSectionEntry block={b} index={idx} key={idx} />)}
                    <div></div>
                </div>
            </div>
        </section>
    );
};

export default DownloadSection;



