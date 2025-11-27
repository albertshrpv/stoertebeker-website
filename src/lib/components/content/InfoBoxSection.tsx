import React from 'react';
import type { Block, ComponentSettings } from '../../interfaces/page';
import { Markup } from "react-render-markup";
import ActionButton from '../buttons/ActionButton';

interface Props {
    data: {
        title: string;
        blocks: Block[];
        componentSettings: ComponentSettings;
        id: string;
        __component: string;
    },
    padding: string;
}

const InfoBoxSection: React.FC<Props> = ({ data, padding }) => {
    const { blocks, title, id, __component } = data;
    const isDev = import.meta.env.DEV;


    return (
        <section id={data.componentSettings?.anchorId} className={`bg-primary-500/10 overflow-x-clip ${data.componentSettings?.classes} py-12`}>
            <div id="info" className={`${blocks.length > 2 ? 'max-w-[2000px]' : 'max-w-screen-2xl'} text-start mx-auto ${padding}`}>
                {title &&
                    <div className="flex w-full md:justify-center md:text-center markup mb-12 lg:mb-20">
                        <div
                            className="text-3xl/tight md:text-5xl/tight"
                        >
                            <Markup
                                markup={title} />
                        </div>
                    </div>
                }
                {
                    blocks.length > 1 ?
                        <div className={`grid gap-4 lg:gap-8 grid-cols-1 lg:grid-cols-2 ${blocks.length > 2 ? 'xl:grid-cols-3' : ''}`}>
                            {blocks.map((block, idx) => (
                                <div className='w-full h-full flex flex-col bg-primary-500/10 rounded-2xl text-neutral-900 border-2 border-primary-500/20'>

                                    <div className='flex items-center gap-6 text-lg md:text-xl xl:text-2xl px-8 py-4'>
                                        <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10.35 17.25H12.65V10.35H10.35V17.25ZM11.5 8.05C11.8258 8.05 12.099 7.93979 12.3194 7.71937C12.5398 7.49896 12.65 7.22583 12.65 6.9C12.65 6.57417 12.5398 6.30104 12.3194 6.08062C12.099 5.86021 11.8258 5.75 11.5 5.75C11.1742 5.75 10.901 5.86021 10.6806 6.08062C10.4602 6.30104 10.35 6.57417 10.35 6.9C10.35 7.22583 10.4602 7.49896 10.6806 7.71937C10.901 7.93979 11.1742 8.05 11.5 8.05ZM11.5 23C9.90917 23 8.41417 22.6981 7.015 22.0944C5.61583 21.4906 4.39875 20.6712 3.36375 19.6362C2.32875 18.6012 1.50937 17.3842 0.905625 15.985C0.301875 14.5858 0 13.0908 0 11.5C0 9.90917 0.301875 8.41417 0.905625 7.015C1.50937 5.61583 2.32875 4.39875 3.36375 3.36375C4.39875 2.32875 5.61583 1.50937 7.015 0.905625C8.41417 0.301875 9.90917 0 11.5 0C13.0908 0 14.5858 0.301875 15.985 0.905625C17.3842 1.50937 18.6012 2.32875 19.6362 3.36375C20.6712 4.39875 21.4906 5.61583 22.0944 7.015C22.6981 8.41417 23 9.90917 23 11.5C23 13.0908 22.6981 14.5858 22.0944 15.985C21.4906 17.3842 20.6712 18.6012 19.6362 19.6362C18.6012 20.6712 17.3842 21.4906 15.985 22.0944C14.5858 22.6981 13.0908 23 11.5 23Z" fill="#00664F" />
                                        </svg>
                                        <div>
                                            {block.infoTitle}
                                        </div>
                                    </div>

                                    <div className='h-[3px] bg-primary-500/20 w-full'></div>

                                    <div className='h-full flex flex-col justify-between gap-8 p-6 lg:p-8 xl:p-10'>
                                        <div className='flex flex-col gap-4'>
                                            <div className={`flex items-center text-lg md:text-xl xl:text-2xl h-full`}>
                                                {block.title}
                                            </div>
                                            <div className={`flex items-center text-base md:text-lg xl:text-xl h-full`}>
                                                {block.text}
                                            </div>
                                        </div>

                                        {
                                            block.cta &&
                                            <div className='flex'>
                                                <ActionButton secondary={true} text={block.cta.text} link={block.cta.link} external={block.cta.external} />
                                            </div>
                                        }
                                    </div>
                                </div>
                            ))}
                        </div>
                        :
                        <div className='w-full h-full flex flex-col bg-primary-500/10 rounded-2xl text-neutral-900 border-2 border-primary-500/20 max-w-screen-md mx-auto'>
                            <div className='flex items-center gap-6 text-xl xl:text-2xl px-8 py-4'>
                                <svg width="23" height="23" viewBox="0 0 23 23" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M10.35 17.25H12.65V10.35H10.35V17.25ZM11.5 8.05C11.8258 8.05 12.099 7.93979 12.3194 7.71937C12.5398 7.49896 12.65 7.22583 12.65 6.9C12.65 6.57417 12.5398 6.30104 12.3194 6.08062C12.099 5.86021 11.8258 5.75 11.5 5.75C11.1742 5.75 10.901 5.86021 10.6806 6.08062C10.4602 6.30104 10.35 6.57417 10.35 6.9C10.35 7.22583 10.4602 7.49896 10.6806 7.71937C10.901 7.93979 11.1742 8.05 11.5 8.05ZM11.5 23C9.90917 23 8.41417 22.6981 7.015 22.0944C5.61583 21.4906 4.39875 20.6712 3.36375 19.6362C2.32875 18.6012 1.50937 17.3842 0.905625 15.985C0.301875 14.5858 0 13.0908 0 11.5C0 9.90917 0.301875 8.41417 0.905625 7.015C1.50937 5.61583 2.32875 4.39875 3.36375 3.36375C4.39875 2.32875 5.61583 1.50937 7.015 0.905625C8.41417 0.301875 9.90917 0 11.5 0C13.0908 0 14.5858 0.301875 15.985 0.905625C17.3842 1.50937 18.6012 2.32875 19.6362 3.36375C20.6712 4.39875 21.4906 5.61583 22.0944 7.015C22.6981 8.41417 23 9.90917 23 11.5C23 13.0908 22.6981 14.5858 22.0944 15.985C21.4906 17.3842 20.6712 18.6012 19.6362 19.6362C18.6012 20.6712 17.3842 21.4906 15.985 22.0944C14.5858 22.6981 13.0908 23 11.5 23Z" fill="#00664F" />
                                </svg>
                                <div>
                                    {blocks[0].infoTitle}
                                </div>
                            </div>

                            <div className='h-[3px] bg-primary-500/20 w-full'></div>

                            <div className='h-full flex flex-col justify-between gap-8 p-6 lg:p-8 xl:p-10'>
                                <div className='flex flex-col gap-4'>
                                    <div className={`flex items-center text-xl xl:text-2xl h-full`}>
                                        {blocks[0].title}
                                    </div>
                                    <div className={`flex items-center text-lg h-full`}>
                                        {blocks[0].text}
                                    </div>
                                </div>

                                {
                                    blocks[0].cta &&
                                    <div className='flex'>
                                        <ActionButton secondary={true} text={blocks[0].cta.text} link={blocks[0].cta.link} external={blocks[0].cta.external} />
                                    </div>
                                }
                            </div>
                        </div>
                }
            </div>
        </section>
    );
};

export default InfoBoxSection;

