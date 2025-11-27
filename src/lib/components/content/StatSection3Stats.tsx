import React from 'react';
import type { Block } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
}



const StatSection3Stats: React.FC<Props> = ({ data }) => {
    const { blocks, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section
            id={data.componentSettings?.anchorId}
            data-taos-offset="100"
            className={`section-fade max-w-[2000px] mx-auto`}
        >
            <div className="text-center">
                <div className="grid grid-cols-1 mx-auto text-neutral-900 lg:grid-cols-3">
                    {blocks.map((b: any, idx) => (
                        <StatEntry block={b} idx={idx} key={idx} cid={id} __component={__component} />
                    ))}
                </div>
            </div>
        </section >
    );
};


const StatEntry: React.FC<{ block: Block, idx: number, cid: string, __component: string }> = ({ block, idx, cid, __component }) => {
    const isDev = import.meta.env.DEV;

    const lightColors = ["376540", "e7ff8e", "376540"];

    let color = block.colorCode ? `${block.colorCode}` : lightColors[idx % lightColors.length];

    return (
        <>
            <style>
                {`
                    .stat-box-bg-${idx} {
                        background-color: #${color};
                    }
                `}
            </style>
            <div className={`stat-box-bg-${idx} flex flex-col items-center py-16 px-4 lg:py-24 min-h-[250px] lg:min-h-[450px]`}>
                <div
                    className="mb-4 lg:mb-12 font-[500] text-2xl lg:text-3xl text-white"
                    contentEditable={isDev}
                    suppressContentEditableWarning={true}
                    data-component-id={cid}
                    data-component-type={__component}
                    data-block-id={block.id}
                    data-block-field="blocks"
                    data-field-name="title"
                >{block.title}</div>
                <div
                    className="markup-text-smaller overflow-hidden text-white"
                >
                    <div
                        id={`ckeditor-${__component}-${cid}-blocks-${block.id}`}
                        className="ckeditor-inline"
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={cid}
                        data-component-type={__component}
                        data-block-id={block.id}
                        data-block-field="blocks"
                        data-field-name="content"
                    >
                        <Markup markup={block.content} />
                    </div>
                </div>
            </div>
        </>
    );
}

export default StatSection3Stats;



