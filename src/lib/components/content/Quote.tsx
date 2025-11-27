import React from 'react';
import { Markup } from "react-render-markup";
import type { ComponentSettings } from '../../interfaces/page';

interface Props {
    data: {
        text: string;
        name?: string;
        position?: string;
        highlight?: boolean;
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}


const Quote: React.FC<Props> = ({ data, padding }) => {
    const { text, name, position, highlight, id, __component } = data;
    const isDev = import.meta.env.DEV;

    return (
        <section id={data.componentSettings?.anchorId} className="overflow-x-clip">
            <div className={`y-minus w-full flex justify-center ${highlight ? "bg-primary-500" : "bg-white"}`}>
                <div className={`flex flex-col max-w-screen-xl w-full ${padding}`}>
                    <svg className={`h-12 mx-auto mb-3 ${highlight ? "text-neutral-900" : "text-primary-500"}`} viewBox="0 0 24 27" fill="none" xmlns="http://www.w3.org/2000/svg">
                        <path d="M14.017 18L14.017 10.609C14.017 4.905 17.748 1.039 23 0L23.995 2.151C21.563 3.068 20 5.789 20 8H24V18H14.017ZM0 18V10.609C0 4.905 3.748 1.038 9 0L9.996 2.151C7.563 3.068 6 5.789 6 8H9.983L9.983 18L0 18Z" fill="currentColor" />
                    </svg>
                    <blockquote>
                        <p
                            className="text-2xl font-medium text-neutral-900 text-center"
                            contentEditable={isDev}
                            suppressContentEditableWarning={true}
                            data-component-id={id}
                            data-component-type={__component}
                            data-field-name="text"
                        >{text}</p>
                    </blockquote>
                    {name &&
                        <figcaption className="flex items-center justify-center mt-6 space-x-3">
                            <div className="flex items-center divide-x-2 divide-neutral-500">
                                <div
                                    className="pr-3 font-medium text-neutral-900"
                                    contentEditable={isDev}
                                    suppressContentEditableWarning={true}
                                    data-component-id={id}
                                    data-component-type={__component}
                                    data-field-name="name"
                                >{name}</div>
                                {
                                    position &&
                                    <div
                                        className="pl-3 text-sm font-light text-neutral-500"
                                        contentEditable={isDev}
                                        suppressContentEditableWarning={true}
                                        data-component-id={id}
                                        data-component-type={__component}
                                            data-field-name="position"
                                    >{position}</div>
                                }
                            </div>
                        </figcaption>
                    }
                </div>
            </div>
        </section>
    );
}


export default Quote;

