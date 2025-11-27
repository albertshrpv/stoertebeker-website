// disable astro toolbar options

if (import.meta.env.DEV) {
    function hideHomeButton() {
        // Check every 200ms
        const interval = setInterval(() => {
            // Get the Astro dev toolbar element
            const toolbar = document.querySelector('astro-dev-toolbar');

            if (toolbar && toolbar.shadowRoot) {
                // Query the shadow root for the buttons
                const homeButton = toolbar.shadowRoot.querySelector('[data-app-id="astro:home"]') as HTMLElement;
                const inspectButton = toolbar.shadowRoot.querySelector('[data-app-id="astro:xray"]') as HTMLElement;
                const auditButton = toolbar.shadowRoot.querySelector('[data-app-id="astro:audit"]') as HTMLElement;
                const settingsButton = toolbar.shadowRoot.querySelector('[data-app-id="astro:settings"]') as HTMLElement;

                // If all buttons are found, hide them and clear the interval
                if (homeButton && inspectButton && auditButton && settingsButton) {
                    homeButton.style.display = 'none';
                    inspectButton.style.display = 'none';
                    auditButton.style.display = 'none';
                    settingsButton.style.display = 'none';

                    clearInterval(interval); // Stop checking once elements are hidden
                }
            }
        }, 200); // Check every 200ms
    }

    // Call the function after the document has loaded
    document.addEventListener('DOMContentLoaded', hideHomeButton);
}


document.addEventListener('DOMContentLoaded', function () {
    // Language switch
    const currentPath = window.location.pathname;
    const isEnglish = currentPath.startsWith('/en');
    const isGerman = currentPath.startsWith('/de');


    // Update mobile language switch styling
    const updateMobileLangSwitchStyle = () => {
        // Remove font-semibold from all buttons first
        document.querySelectorAll('.language-switch-en, .language-switch-de').forEach(btn => {
            btn.classList.remove('font-semibold');
            btn.classList.add('font-light');
        });

        // Add font-semibold to the active language
        if (isEnglish) {
            document.querySelectorAll('.language-switch-en').forEach(btn => {
                btn.classList.add('font-semibold');
                btn.classList.remove('font-light');
            });

        } else {
            document.querySelectorAll('.language-switch-de').forEach(btn => {
                btn.classList.add('font-semibold');
                btn.classList.remove('font-light');
            });
        }
    };

    // Call the function initially
    updateMobileLangSwitchStyle();

    const switchLanguage = (language: string) => {
        const currentLocale = (document.getElementById('locale') as HTMLInputElement)?.value;

        if (currentLocale === language) {
            return;
        }

        const langSwitchSlug = (document.getElementById(`langSwitch${language.toUpperCase()}`) as HTMLInputElement)?.value;

        let newUrl: string;
        if (!langSwitchSlug || langSwitchSlug.trim() === '') {
            newUrl = `/${language}/`;
        } else {
            newUrl = `/${language}/${langSwitchSlug}`;
        }

        window.location.href = newUrl;
    };

    // Add click handlers for language buttons
    document.querySelectorAll('.language-switch-en').forEach((button: any) => {
        button.addEventListener('click', () => switchLanguage('en'));
    });

    document.querySelectorAll('.language-switch-de').forEach((button: any) => {
        button.addEventListener('click', () => switchLanguage('de'));
    });


    // search
    const inputField = document.getElementById("searchField") as HTMLInputElement;

    if (inputField) {
        inputField.addEventListener("keydown", (event) => {
            if (event.key === "Enter") {
                const inputValue = inputField.value;
                if (inputValue) {
                    window.location.href = `/suche?q=${encodeURIComponent(inputValue)}`;
                }
            }
        });
    }


    const fileHolders = document.querySelectorAll('.file-holder');

    fileHolders.forEach(holder => {
        holder.addEventListener('click', function () {
            const fileUrl = (holder.querySelector('.file-url') as HTMLInputElement).value;
            const fileName = fileUrl.split('/').pop();
            if (!fileName) return;

            const downloadUrl = `https://backend.stoertebeker.de${fileUrl}`;

            window.open(downloadUrl, '_blank');
        });
    });

    // Function to stop propagation
    function stopPropagation(event: any) {
        event.stopPropagation();
    }

    const elements = document.querySelectorAll('.stop-propagation');
    elements.forEach(element => {
        element.addEventListener('click', stopPropagation);
    });


    // Better handling scrolling to anchor links

    // Function to adjust the scroll position
    function scrollWithOffset(element: HTMLElement) {
        const offset = 80; // Offset of 80px before the anchor element
        const elementPosition = element.getBoundingClientRect().top + window.pageYOffset;
        const offsetPosition = elementPosition - offset;

        window.scrollTo({
            top: offsetPosition,
            behavior: "smooth"
        });
    }

    // Scroll to the element if there's an anchor in the URL on page load
    function scrollOnPageLoad() {
        const hash = window.location.hash;
        if (hash) {
            const targetId = hash.substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                scrollWithOffset(targetElement);
            }
        }
    }

    // Add event listener for all anchor clicks
    document.querySelectorAll<HTMLAnchorElement>('a[href^="#"]').forEach(anchor => {
        anchor.addEventListener('click', function (e: MouseEvent) {
            e.preventDefault();

            const targetId = (anchor.getAttribute('href') || '').substring(1);
            const targetElement = document.getElementById(targetId);

            if (targetElement) {
                scrollWithOffset(targetElement);

                // Update the URL hash without reloading the page
                window.history.pushState(null, '', `#${targetId}`);
            }
        });
    });

    // Handle page load with an anchor
    window.addEventListener('load', scrollOnPageLoad);
});


function isPartiallyInViewport(element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const elementHeight = rect.height;
    const viewportHeight = (window.innerHeight || document.documentElement.clientHeight);
    const thresholdTop = viewportHeight / 4;
    const thresholdBot = viewportHeight / 2;

    return (
        rect.top < viewportHeight - thresholdTop &&
        rect.bottom > thresholdBot &&
        rect.left < (window.innerWidth || document.documentElement.clientWidth) &&
        rect.right > 0
    );
}

// Function to handle scroll event
function handleScroll() {
    const animateThemeElements = document.querySelectorAll('.animate-theme');
    const htmlElement = document.documentElement;

    animateThemeElements.forEach(element => {
        if (isPartiallyInViewport(element as HTMLElement)) {
            htmlElement.classList.add('dark');
        } else {
            htmlElement.classList.remove('dark');
        }
    });
}

// Add event listener for scroll event
window.addEventListener('scroll', handleScroll);

// Animated text functionality
document.addEventListener('DOMContentLoaded', function () {
    const animatedElements = new Set<HTMLElement>();
    
    // Function to animate text by splitting into letters
    function animateText(element: HTMLElement) {
        if (animatedElements.has(element)) return; // Already animated
        animatedElements.add(element);
        
        const text = element.textContent || '';
        const letters = text.split('');
        
        // Clear the original text and create letter spans
        element.innerHTML = '';
        element.style.overflow = 'hidden';
        
        letters.forEach((letter, index) => {
            const span = document.createElement('span');
            span.textContent = letter === ' ' ? '\u00A0' : letter;
            span.className = 'anim-letter inline-block';
            span.style.transform = 'translateY(100%)';
            span.style.opacity = '0';
            span.style.transition = 'transform 450ms ease-out, opacity 450ms ease-out';
            
            element.appendChild(span);
            
            // Animate each letter with staggered delay
            setTimeout(() => {
                span.style.transform = 'translateY(0)';
                span.style.opacity = '1';
            }, 50 + index * 30);
        });
    }
    
    // Intersection Observer for scroll detection
    const observer = new IntersectionObserver((entries) => {
        entries.forEach(entry => {
            if (entry.isIntersecting) {
                const element = entry.target as HTMLElement;
                animateText(element);
                observer.unobserve(element); // Stop observing after animation
            }
        });
    }, {
        threshold: 0.1, // Trigger when 10% of element is visible
        rootMargin: '0px 0px -50px 0px' // Trigger slightly before element is fully in view
    });
    
    // Observe all elements with anim-text class
    const animTextElements = document.querySelectorAll('.anim-text');
    animTextElements.forEach(element => {
        observer.observe(element);
    });
});