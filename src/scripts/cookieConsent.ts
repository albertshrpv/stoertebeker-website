import { run } from "vanilla-cookieconsent";
import { config } from "../components/cookieconsent/CookieConsentConfig";
// toggle custom theme
document.body.classList.add('cc--pd-styles');

run(config);


import { acceptedService, acceptService } from "vanilla-cookieconsent";


const giveConsentYoutubeButtons = document.querySelectorAll(".give-consent-youtube-btn");
giveConsentYoutubeButtons?.forEach((button) => {
    button.addEventListener("click", () => {
        const acceptedServices = [];
        if(acceptedService("vimeo", "thirdparty")){
            acceptedServices.push("vimeo");
        }
        if(acceptedService("instagram", "thirdparty")){
            acceptedServices.push("instagram");
        }
        const servicesToAccept = ["youtube", ...acceptedServices];
        acceptService(servicesToAccept, "thirdparty");
    });
});

const giveConsentVimeoButtons = document.querySelectorAll(".give-consent-vimeo-btn");
giveConsentVimeoButtons?.forEach((button) => {
    button.addEventListener("click", () => {
        const acceptedServices = [];
        if (acceptedService("youtube", "thirdparty")) {
            acceptedServices.push("youtube");
        }
        if (acceptedService("instagram", "thirdparty")) {
            acceptedServices.push("instagram");
        }
        const servicesToAccept = ["vimeo", ...acceptedServices];
        acceptService(servicesToAccept, "thirdparty");
    });
});

const giveConsentInstagramButtons = document.querySelectorAll(".give-consent-instagram-btn");
giveConsentInstagramButtons?.forEach((button) => {
    button.addEventListener("click", () => {
        const acceptedServices = [];
        if (acceptedService("youtube", "thirdparty")) {
            acceptedServices.push("youtube");
        }
        if (acceptedService("vimeo", "thirdparty")) {
            acceptedServices.push("vimeo");
        }
        const servicesToAccept = ["instagram", ...acceptedServices];
        acceptService(servicesToAccept, "thirdparty");
    });
});
