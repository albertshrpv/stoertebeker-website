import React, { useEffect, useRef, useState } from 'react';
import { Markup } from "react-render-markup";


interface Props {
    url: string;
}


const PDFViewer: React.FC<Props> = ({ url }) => {
    const pdfUrl = "https://backend.stoertebeker.de" + url;

    return (
        <iframe
            id="pdfEmbed"
            src={`${pdfUrl}`}
            style={{ width: '100%', height: '100%' }}
        />
    );
};

export default PDFViewer;

