import React from 'react';
import { placeholderUrl } from '../../utils';
import { STRAPI_URL } from '../../../environment';

interface Props {
    data: {
        image: any;
        fullScreen: boolean;
    }
}



const BigImageHeader: React.FC<Props> = ({ data }) => {

    const { image, fullScreen } = data;
    const url = image?.url ?? placeholderUrl;


    const backgroundStyle = {
        backgroundImage: `url(${STRAPI_URL + url + '?format=webp&embed'})`,
    };

    return (
        <section className={`${fullScreen ? "bigHeaderBackgroundContainerFullScreen" : "bigHeaderBackgroundContainer"}`}>
            <div style={backgroundStyle} className={`backgroundImage`}></div>
        </section>
    );
}



export default BigImageHeader;

