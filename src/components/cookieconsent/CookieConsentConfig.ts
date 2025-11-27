import type { CookieConsentConfig } from 'vanilla-cookieconsent';

export const config: CookieConsentConfig = {
    guiOptions: {
        consentModal: {
            layout: 'box wide',
            position: 'bottom center',
        },
        preferencesModal: {
            layout: 'box',
            position: 'right',
            equalWeightButtons: true,
            flipButtons: false,
        },
    },
    categories: {
        necessary: {
            readOnly: true,
        },
        analytics: {
            services: {
                matomo: {
                    label:
                        'Matomo Analyse zustimmen',
                    cookies: [
                        {
                            name: /^_matomo/,
                        },
                    ],
                }
            },
        },
    },
    language: {
        default: 'de',
        autoDetect: 'browser',
        translations: {
            de: {
                consentModal: {
                    title: "Wir nutzen Cookies!",
                    description:
                        'Wir verwenden Cookies und ähnliche Technologien, damit unsere Webseite technisch funktioniert. Außerdem binden wir Tools von Drittanbietern für Statistiken sowie zur Leistungsmessung ein. Durch Klicken auf "Alle akzeptieren" stimmst Du dem Einsatz von Cookies und ähnlichen Technologien zu vorgenannten Zwecken zu (Einwilligung). Durch Klicken auf "Cookie-Einstellungen öffnen" kannst Du eine individuelle Auswahl treffen und erteilte Einwilligungen jederzeit für die Zukunft widerrufen. Nähere Informationen, insbesondere zu Einstellungs- und Widerspruchsmöglichkeiten, erhältst Du in unserer <a href="/datenschutz">Datenschutzerklärung</a>.',
                    acceptAllBtn: 'Alle akzeptieren',
                    acceptNecessaryBtn: 'Ablehnen',
                    showPreferencesBtn: 'Einstellungen öffnen',
                    // footer:
                    //     '<a href="#link">Privacy Policy</a>\n<a href="#link">Terms and conditions</a>',
                },
                preferencesModal: {
                    title: 'Cookie-Einstellungen',
                    acceptAllBtn: 'Alle akzeptieren',
                    acceptNecessaryBtn: 'Ablehnen',
                    savePreferencesBtn: 'Einstellungen speichern',
                    closeIconLabel: 'Schließen',
                    serviceCounterLabel: 'Service|Services',
                    sections: [
                        {
                            title: 'Cookienutzung 📢',
                            description:
                                'Wir verwenden Cookies und ähnliche Technologien, damit unsere Webseite technisch funktioniert. Außerdem binden wir Tools von Drittanbietern für Statistiken sowie zur Leistungsmessung ein. Durch Klicken auf "Alle akzeptieren" stimmst Du dem Einsatz von Cookies und ähnlichen Technologien zu vorgenannten Zwecken zu (Einwilligung). Durch Klicken auf "Cookie-Einstellungen öffnen" kannst Du eine individuelle Auswahl treffen und erteilte Einwilligungen jederzeit für die Zukunft widerrufen. Nähere Informationen, insbesondere zu Einstellungs- und Widerspruchsmöglichkeiten, erhältst Du in unserer <a href="/de/datenschutz">Datenschutzerklärung</a>.',
                        },
                        {
                            title:
                                'Technisch notwendige Cookies <span class="pm__badge">Always Enabled</span>',
                            description:
                                'Diese Cookies sind für das ordnungsgemäße Funktionieren der Website unerlässlich.',
                            linkedCategory: 'necessary',
                        },
                        {
                            title: 'Cookies und Tools zur Leistungsmessung ',
                            description: 'Wir nutzen Matomo. Cookies zur Leistungsmessung werden genutzt, um die Leistung von Werbemaßnahmen zu ermitteln und unsere Werbemaßnahmen zu optimieren. Rechtsgrundlage für die Erhebung und Verarbeitung ist Ihre Einwilligung (Art. 6 Abs. 1 Satz 1 lit. a DS-GVO). Weitere Informationen dazu finden Sie in unserer <a href="/de/datenschutz/">Datenschutzerklärung</a>.',
                            linkedCategory: 'analytics'
                        }
                    ],
                },
            },
            en: {
                consentModal: {
                    title: "We use cookies!",
                    description: "We use cookies and similar technologies to ensure our website functions technically. We also integrate third-party tools for statistics and performance measurement. By clicking 'Accept All', you consent to the use of cookies and similar technologies for the aforementioned purposes. By clicking 'Open Cookie Settings', you can make an individual selection and revoke any consent given at any time for the future. For more information, particularly about settings and objection options, please see our <a href='/datenschutz'>Privacy Policy</a>.",
                    acceptAllBtn: 'Accept All',
                    acceptNecessaryBtn: 'Reject',
                    showPreferencesBtn: 'Open Settings',
                },
                preferencesModal: {
                    title: 'Cookie Settings',
                    acceptAllBtn: 'Accept All',
                    acceptNecessaryBtn: 'Reject',
                    savePreferencesBtn: 'Save Settings',
                    closeIconLabel: 'Close',
                    serviceCounterLabel: 'Service|Services',
                    sections: [
                        {
                            title: 'Cookie Usage 📢',
                            description: "We use cookies and similar technologies to ensure our website functions technically. We also integrate third-party tools for statistics and performance measurement. By clicking 'Accept All', you consent to the use of cookies and similar technologies for the aforementioned purposes. By clicking 'Open Cookie Settings', you can make an individual selection and revoke any consent given at any time for the future. For more information, particularly about settings and objection options, please see our <a href='/datenschutz'>Privacy Policy</a>.",
                        },
                        {
                            title: 'Technically Necessary Cookies <span class="pm__badge">Always Enabled</span>',
                            description: 'These cookies are essential for the proper functioning of the website.',
                            linkedCategory: 'necessary',
                        },
                        {
                            title: 'Performance Measurement Cookies and Tools',
                            description: 'We use Matomo. Performance measurement cookies are used to determine the performance of advertising measures and optimize our advertising campaigns. The legal basis for collection and processing is your consent (Art. 6 (1) sentence 1 lit. a GDPR). For more information, please see our <a href="/datenschutz/">Privacy Policy</a>.',
                            linkedCategory: 'analytics'
                        }
                    ],
                },
            }
        },
    },
};
