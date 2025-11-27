import React from 'react';
import { Markup } from "react-render-markup";
import { getFileIcon } from '../../../utils';

interface Props {
    block: any;
    index: number;
}

const AccordionDownloadEntry: React.FC<Props> = ({ block, index }) => {
    const url = block.url;
    const caption = block.caption;
    const fileName = url.split('/').pop();
    const fileType = fileName.split('.').pop();

    return (
        <div className="file-holder text-primary-500">
            <div className="flex items-center rounded-lg hover:cursor-pointer hover:bg-gray-100 mt-3">
                <div className="mr-3">
                    {getFileIcon(fileType)}
                </div>
                <div className="text-sm md:text-base lg:text-lg break-words break-all underline">{caption ?? fileName}</div>
                <div className="flex-grow"></div>
                <div
                    className="w-12 flex justify-center items-center h-12 rounded-lg"
                >
                    <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill="#376540"><path d="M480-320 280-520l56-58 104 104v-326h80v326l104-104 56 58-200 200ZM240-160q-33 0-56.5-23.5T160-240v-120h80v120h480v-120h80v120q0 33-23.5 56.5T720-160H240Z" /></svg>
                </div>
            </div>
            <input type="hidden" className="file-url" value={url} />
        </div>
    );
}

export default AccordionDownloadEntry;