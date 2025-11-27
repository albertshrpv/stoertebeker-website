export const isIOSSafari = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).platform || '';
    const maxTouchPoints = (navigator as any).maxTouchPoints || 0;

    // Detect iOS (including iPadOS where userAgent may include Mac)
    const isIOSDevice = /iPad|iPhone|iPod/.test(ua) ||
        // iPadOS 13+ reports as Mac; detect via touch support
        (platform === 'MacIntel' && maxTouchPoints > 1);

    // Detect Safari (mobile Safari UA contains "Safari" and not "CriOS"/"FxiOS")
    const isSafariEngine = /Safari\//.test(ua) && !/Chrome\//.test(ua) && !/CriOS/.test(ua) && !/FxiOS/.test(ua);

    return isIOSDevice && isSafariEngine;
};

export const isIOSDevice = (): boolean => {
    if (typeof window === 'undefined' || typeof navigator === 'undefined') return false;
    const ua = navigator.userAgent || '';
    const platform = (navigator as any).platform || '';
    const maxTouchPoints = (navigator as any).maxTouchPoints || 0;

    return /iPad|iPhone|iPod/.test(ua) || (platform === 'MacIntel' && maxTouchPoints > 1);
};


