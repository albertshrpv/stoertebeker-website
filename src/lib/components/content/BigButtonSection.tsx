import React from 'react';
import { Markup } from "react-render-markup";
import type { Block, ComponentSettings } from '../../interfaces/page';
import ActionButton from '../buttons/ActionButton';

interface Props {
    data: {
        title: string;
        text: string;
        blocks: Block[];
        blocks2: Block;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;

}



const BigButtonSection: React.FC<Props> = ({ data, padding }) => {
    const { title, text, blocks, blocks2, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section id={data.componentSettings?.anchorId} className={`max-w-screen-2xl text-start mx-auto ${padding}`}>
            <div className="markup flex flex-col gap-6 lg:gap-10">
                {title && <div
                    id={`ckeditor-${__component}-${id}-title`}
                    contentEditable={isDev}
                    suppressContentEditableWarning={true}
                    data-component-id={id}
                    data-component-type={__component}
                    data-field-name="title"
                    className="ckeditor-inline"
                >
                    <Markup
                        markup={title} />
                </div>
                }
                {text &&
                    <div
                        id={`ckeditor-${__component}-${id}-text`}
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={id}
                        data-component-type={__component}
                        data-field-name="text"
                        className="ckeditor-inline"
                    >
                        <Markup
                            markup={text} />
                    </div>
                }
            </div>
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 mt-6 lg:mt-10">
                {blocks.map((block, idx) => (
                    <a
                        key={idx}
                        href={block.link}
                        className='flex flex-col gap-1 justify-center items-center text-center h-32 border-2 border-primary-500 hover:bg-primary-200 rounded-lg p-8 font-title no-underline text-2xl'
                        contentEditable={isDev}
                        suppressContentEditableWarning={true}
                        data-component-id={id}
                        data-component-type={__component}
                        data-block-id={block.id}
                        data-block-field="blocks"
                        data-field-name="label"
                    >
                        <div>
                            {block.label}
                        </div>
                        <div className='text-sm text-primary-500'>
                            Mehr erfahren <span className='ml-2'>&gt;&gt;&gt;</span>
                        </div>
                    </a>
                ))}
            </div>
            {
                blocks2 &&
                <div className='flex justify-center items-center mt-6'>
                    <ActionButton text={blocks2.text} link={blocks2.link} />
                </div>
            }
        </section>
    );
}


export default BigButtonSection;

