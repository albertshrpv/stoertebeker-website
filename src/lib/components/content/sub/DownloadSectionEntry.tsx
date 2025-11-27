import React from 'react';
import { Markup } from "react-render-markup";
import { getFileIcon } from '../../../utils';
import PDFViewer from '../../../../components/PDFViewer';

interface Props {
    block: any;
    index: number;
}

const DownloadSectionEntry: React.FC<Props> = ({ block, index }) => {
    const url = block.url;
    const caption = block.caption;
    const fileName = url.split('/').pop();
    const fileType = fileName.split('.').pop();


    return (
        <>
            {
                fileType === 'pdf' &&
                <div
                    id={`pdf-modal-${block.id}`}
                    aria-hidden="true"
                    className="pdf-modal hidden overflow-y-auto overflow-x-hidden fixed top-0 right-0 left-0 z-[100] justify-center items-center w-full md:inset-0 h-full"
                >
                    <button
                        type="button"
                        className="absolute z-[1000] right-4 top-4 bg-white text-neutral-900 hover:bg-gray-200 rounded-lg text-sm p-1.5 inline-flex"
                        data-modal-toggle={`pdf-modal-${block.id}`}
                    >
                        <svg aria-hidden="true" className="w-5 h-5" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg"
                        ><path
                            fillRule="evenodd"
                            d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"
                            clipRule="evenodd">
                            </path>
                        </svg>
                        <span className="sr-only">Schließen</span>
                    </button>
                    <div className="relative p-4 w-full max-w-screen-2xl h-full mt-20 lg:mt-0 lg:mx-16">
                        <div className="p-0 bg-white rounded-custom h-full overflow-hidden">
                            <div className="rounded-custom h-full overflow-hidden">
                                <PDFViewer url={url} />
                            </div>
                        </div>
                    </div>
                </div>
            }
            <div className="flex gap-2 py-2">
                <div className="file-holder flex flex-grow items-center rounded-lg hover:cursor-pointer stop-propagation">
                    <div className='flex h-full w-full px-6 mr-3 items-center bg-primary-200 rounded-sm'>
                        <div className="mr-6">
                            {getFileIcon(fileType)}
                        </div>
                        <div className="text-sm md:text-base break-words break-all">{caption ?? fileName}</div>
                        <div className="flex-grow"></div>
                    </div>
                    {
                        fileType === 'pdf' &&
                        <button
                            id={`pdf-modal-btn-${block.id}`}
                            data-modal-target={`pdf-modal-${block.id}`}
                            data-modal-toggle={`pdf-modal-${block.id}`}
                            className="hidden lg:flex items-center gap-2 rounded-md hover:cursor-pointer stop-propagation mr-2">
                            <div className="w-fit h-12 flex items-center gap-2 text-white text-base px-4 py-2 rounded-md bg-primary-500 hover:bg-primary-500/80 hover:cursor-pointer transition-colors duration-300 ease-in-out">
                                {/* <svg className="fill-neutral-900" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg> */}
                                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#fff"><path d="M480.09-336.92q67.99 0 115.49-47.59t47.5-115.58q0-67.99-47.59-115.49t-115.58-47.5q-67.99 0-115.49 47.59t-47.5 115.58q0 67.99 47.59 115.49t115.58 47.5ZM480-392q-45 0-76.5-31.5T372-500q0-45 31.5-76.5T480-608q45 0 76.5 31.5T588-500q0 45-31.5 76.5T480-392Zm.05 172q-137.97 0-251.43-76.12Q115.16-372.23 61.54-500q53.62-127.77 167.02-203.88Q341.97-780 479.95-780q137.97 0 251.43 76.12Q844.84-627.77 898.46-500q-53.62 127.77-167.02 203.88Q618.03-220 480.05-220ZM480-500Zm0 220q113 0 207.5-59.5T832-500q-50-101-144.5-160.5T480-720q-113 0-207.5 59.5T128-500q50 101 144.5 160.5T480-280Z" /></svg>
                                {/* <span className='hidden xl:flex whitespace-nowrap'>
                                    PDF ansehen
                                </span> */}
                            </div>
                        </button>
                    }
                    <div className="w-fit h-12 flex items-center gap-2 text-white text-base py-2 px-4 rounded-md bg-primary-500 hover:bg-primary-500/80 hover:cursor-pointer transition-colors duration-300 ease-in-out">
                        <svg className="fill-white" xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg>
                    </div>
                    <input type="hidden" className="file-url" value={url} />
                </div>
            </div>
        </>
    );
}

export default DownloadSectionEntry;