import React from "react";
import { Markup } from "react-render-markup";
import { componentContentPadding } from "../../utils";

const GeneralContactForm: React.FC<{ data: any }> = ({ data }) => {
    const { title, subtitle } = data;

    return (
        <section id="kontaktformular" className="w-full bg-primary-500 text-white py-12">
            <div className={`w-full max-w-[2000px] mx-auto flex flex-col xl:flex-row gap-12 xl:gap-20 justify-center ${componentContentPadding}`}>

                <div className="w-full xl:w-1/3">
                    <div className="markup mb-8">
                        <Markup markup={"<h2>" + title + "</h2>"} />
                    </div>
                    <div className="markup">
                        <Markup markup={"<p>" + subtitle + "</p>"} />
                    </div>
                </div>

                <div className={`w-full xl:w-2/3 flex flex-col items-center xl:pl-28`}>
                    <form
                        id="generalContactForm"
                        action="#"
                        className="flex flex-col gap-6 md:gap-8 w-full"
                    >
                        <div className="w-full flex flex-col md:flex-row gap-6 md:gap-12">
                            <input
                                type="name"
                                id="firstname"
                                name="firstname"
                                className="appearance-none md:text-xl bg-primary-500 placeholder-white/80 border-b border-white focus:outline-none focus:ring-0 block w-full py-3"
                                placeholder="Vorname*"
                                required
                            />
                            <input
                                type="name"
                                id="lastname"
                                name="lastname"
                                className="appearance-none md:text-xl bg-primary-500 placeholder-white/80 border-b border-white focus:outline-none focus:ring-0 block w-full py-3"
                                placeholder="Nachname*"
                                required
                            />
                        </div>
                        <div className="w-full flex flex-col md:flex-row gap-6 md:gap-12">
                            <input
                                type="email"
                                id="email"
                                name="email"
                                className="appearance-none md:text-xl bg-primary-500 placeholder-white/80 border-b border-t-0 border-x-0 border-white focus:outline-none focus:ring-0 block w-full py-3 px-0"
                                placeholder="E-Mail"
                                required
                            />
                            <input
                                type="tel"
                                id="phoneNumber"
                                name="phoneNumber"
                                className="appearance-none md:text-xl bg-primary-500 placeholder-white/80 border-b border-t-0 border-x-0 border-white focus:outline-none focus:ring-0 block w-full py-3 px-0"
                                placeholder="Telefonnummer"
                            />
                        </div>
                        <div className="w-full">
                            <textarea
                                id="message"
                                name="message"
                                rows={4}
                                className="appearance-none md:text-xl bg-primary-500 placeholder-white/80 border-b border-t-0 border-x-0 border-white focus:outline-none focus:ring-0 block w-full py-3 px-0"
                                placeholder="Ihr Anliegen*"
                                required
                            >
                            </textarea>
                        </div>
                        <div className="w-full flex flex-col md:flex-row justify-between items-center gap-6 md:gap-12">
                            <div className="flex w-full md:w-1/2">
                                <input type="checkbox" required aria-label="dsgvo" className="mr-2" />
                                <p className="ml-2 text-xs">
                                    Ich habe die <a href="/datenschutz/" className="underline">Datenschutzbestimmungen</a> zur Kenntnis genommen.
                                </p>
                            </div>
                            <button
                                id="generalContactFormSubmitButton"
                                type="submit"
                                className="w-full md:w-auto group flex items-center justify-center relative text-white border-white border rounded-md text-base md:text-lg pl-12 pr-16 py-2 hover:cursor-pointer overflow-hidden min-h-10"
                            >
                                <span className="text-white inline-block transform transition-transform duration-500 ease-in-out group-hover:translate-x-[16px]">
                                    Anfrage absenden
                                </span>
                                {/* Right arrow - initially visible, slides out to right on hover */}
                                <svg
                                    className="absolute right-8 opacity-100 transform transition-all duration-500 ease-in-out group-hover:opacity-0 group-hover:translate-x-[24px]"
                                    width="8"
                                    height="14"
                                    viewBox="0 0 10 18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="white" strokeLinecap="round" />
                                </svg>
                                {/* Left arrow - initially hidden, slides in from left on hover */}
                                <svg
                                    className="absolute left-7 opacity-0 transform transition-all duration-500 ease-in-out translate-x-[-24px] group-hover:opacity-100 group-hover:translate-x-0"
                                    width="8"
                                    height="14"
                                    viewBox="0 0 10 18"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <path d="M1 1L8.79782 8.5286C9.06739 8.78895 9.06739 9.21105 8.79782 9.4714L1 17" stroke="white" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </form>
                    <div id="generalContactFormSuccess" className="max-w-max hidden" role="alert">
                        <div className="flex items-start">
                            <div className="flex-shrink-0 mb-4">
                                <svg className="h-4 w-4 text-white mt-1.5" xmlns="http://www.w3.org/2000/svg" width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
                                    <path
                                        d="M16 8A8 8 0 1 1 0 8a8 8 0 0 1 16 0zm-3.97-3.03a.75.75 0 0 0-1.08.022L7.477 9.417 5.384 7.323a.75.75 0 0 0-1.06 1.06L6.97 11.03a.75.75 0 0 0 1.079-.02l3.992-4.99a.75.75 0 0 0-.01-1.05z"
                                    ></path>
                                </svg>
                            </div>
                            <div className="flex text-start first-line:pt-8 px-4">
                                <div className="ml-3">
                                    <p className="text-lg sm:text-xl text-white">Danke für Ihre Anfrage, wir melden uns so schnell wie möglich bei Ihnen.</p>
                                </div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>
        </section >
    );
};

export default GeneralContactForm;
