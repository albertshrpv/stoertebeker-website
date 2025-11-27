const componentContentPadding = "py-12 md:py-16 xl:py-20 px-6 md:px-16 xl:px-20";
const componentContentPaddingX = "px-6 md:px-16 xl:px-20";

const placeholderUrl = "uploads/pelargoniums_for_europe_a_H_Fl_P2q_Krxc_unsplash_70d161cfb5.jpg";


const evaluateContentPadding = (paddingTop: string, paddingBottom: string, addHorizontalPadding = true, addTopPadding = true, addBotPadding = true) => {
    let paddingTopClasses = '';
    let paddingBottomClasses = '';
    let paddingX = componentContentPaddingX;
    let padding = "";

    if (addTopPadding) {
        switch (paddingTop) {
            case 'weniger':
                paddingTopClasses = 'pt-12 md:pt-12 xl:pt-16';
                break;
            case 'normal':
                paddingTopClasses = 'pt-14 md:pt-16 xl:pt-28';
                break;
            case 'mehr':
                paddingTopClasses = 'pt-16 md:pt-20 xl:pt-44';
                break;
            default:
                break;
        }
    }
    if (addBotPadding) {
        switch (paddingBottom) {
            case 'weniger':
                paddingBottomClasses = 'pb-12 md:pb-12 xl:pb-16 ';
                break;
            case 'normal':
                paddingBottomClasses = 'pb-14 md:pb-16 xl:pb-28 ';
                break;
            case 'mehr':
                paddingBottomClasses = 'pb-16 md:pb-20 xl:pb-44 ';
                break;
            default:
                break;
        }
    }

    padding = `${paddingTopClasses} ${paddingBottomClasses}`;

    if (addHorizontalPadding) {
        padding += ` ${paddingX}`;
    }

    return padding;
}



const getFileIcon = (fileType: string, white: boolean = false) => {
    switch (fileType) {
        case 'pdf':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M360-460h40v-80h40q17 0 28.5-11.5T480-580v-40q0-17-11.5-28.5T440-660h-80v200Zm40-120v-40h40v40h-40Zm120 120h80q17 0 28.5-11.5T640-500v-120q0-17-11.5-28.5T600-660h-80v200Zm40-40v-120h40v120h-40Zm120 40h40v-80h40v-40h-40v-40h40v-40h-80v200ZM320-240q-33 0-56.5-23.5T240-320v-480q0-33 23.5-56.5T320-880h480q33 0 56.5 23.5T880-800v480q0 33-23.5 56.5T800-240H320Zm0-80h480v-480H320v480ZM160-80q-33 0-56.5-23.5T80-160v-560h80v560h560v80H160Zm160-720v480-480Z" /> </svg>
        case 'doc':
        case 'docx':
        case 'xls':
        case 'xlsx':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" /> </svg>;
        case 'jpg':
        case 'jpeg':
        case 'png':
        case 'gif':
        case 'webp':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M200-120q-33 0-56.5-23.5T120-200v-560q0-33 23.5-56.5T200-840h560q33 0 56.5 23.5T840-760v560q0 33-23.5 56.5T760-120H200Zm0-80h560v-560H200v560Zm40-80h480L570-480 450-320l-90-120-120 160Zm-40 80v-560 560Z" /> </svg>;
        case 'mp4':
        case 'mov':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="m160-800 80 160h120l-80-160h80l80 160h120l-80-160h80l80 160h120l-80-160h120q33 0 56.5 23.5T880-720v480q0 33-23.5 56.5T800-160H160q-33 0-56.5-23.5T80-240v-480q0-33 23.5-56.5T160-800Zm0 240v320h640v-320H160Zm0 0v320-320Z" /> </svg>;
        case 'mp3':
        case 'wav':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M400-120q-66 0-113-47t-47-113q0-66 47-113t113-47q23 0 42.5 5.5T480-418v-422h240v160H560v400q0 66-47 113t-113 47Z" /> </svg>;
        case 'html':
        case 'css':
        case 'js':
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M320-240 80-480l240-240 57 57-184 184 183 183-56 56Zm320 0-57-57 184-184-183-183 56-56 240 240-240 240Z" /> </svg>;
        default:
            return <svg xmlns="http://www.w3.org/2000/svg" height="24px" viewBox="0 -960 960 960" width="24px" fill={white ? "#fff" : "#171717"} > <path d="M320-240h320v-80H320v80Zm0-160h320v-80H320v80ZM240-80q-33 0-56.5-23.5T160-160v-640q0-33 23.5-56.5T240-880h320l240 240v480q0 33-23.5 56.5T720-80H240Zm280-520v-200H240v640h480v-440H520ZM240-800v200-200 640-640Z" /> </svg>;
    }
};

const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) {
        return text;
    }

    const truncated = text.slice(0, maxLength);
    const lastSpaceIndex = truncated.lastIndexOf(' ');

    if (lastSpaceIndex > 0) {
        return truncated.slice(0, lastSpaceIndex) + '...';
    } else {
        return truncated + '...'; // If no space is found, just add the dots at maxLength
    }
}

export { componentContentPadding, componentContentPaddingX, getFileIcon, truncateText, evaluateContentPadding, placeholderUrl };