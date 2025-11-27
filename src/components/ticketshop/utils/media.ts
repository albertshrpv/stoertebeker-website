import { MEDIA_SERVER_URL } from "../../../environment";

interface MediaUrlProps {
    imageName: string;
    width?: number;
    quality?: number;
    format?: string;
}

const mediaServerUrl = MEDIA_SERVER_URL;

const mapRowToSeatGroup = (rowNumber: number) => {
    if (rowNumber >= 1 && rowNumber <= 10)  return 1;
    if (rowNumber >= 11 && rowNumber <= 25) return 2;
    if (rowNumber >= 26 && rowNumber <= 40) return 3;
    if (rowNumber >= 41 && rowNumber <= 55) return 4;
    if (rowNumber >= 56 && rowNumber <= 68) return 5;
    if (rowNumber >= 69 && rowNumber <= 83) return 6;
    return 1;
}

export const getSeatPreviewImage = (rowNumberString: string | number) => {
    const rowNumber = parseInt(rowNumberString.toString()) || 1;

    const seatGroup = mapRowToSeatGroup(rowNumber);
    const imageName = `Platzgruppen-${seatGroup}.jpg`;

    return `${mediaServerUrl}/images/${imageName}/800/70/webp`;
}



export const getMediaUrl = ({ imageName, width = 800, quality = 70, format = 'webp' }: MediaUrlProps) => {
    return `${mediaServerUrl}/images/${imageName}/${width}/${quality}/${format}`;
}