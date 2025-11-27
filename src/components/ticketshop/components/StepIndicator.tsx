import React, { useState } from 'react';
import { useBooking, type BookingStep } from '../contexts/BookingContext';
import { AccountModal } from './AccountModal';

interface StepInfo {
    key: BookingStep;
    number: number;
    title: string;
    description: string;
}

const steps: StepInfo[] = [
    {
        key: 'datum',
        number: 1,
        title: 'Datum',
        description: 'Vorstellung auswählen'
    },
    {
        key: 'sitzplatz',
        number: 2,
        title: 'Sitzplatz',
        description: 'Plätze und Kategorien wählen'
    },
    {
        key: 'warenkorb',
        number: 3,
        title: 'Warenkorb',
        description: 'Übersicht und Zusatzprodukte'
    },
    {
        key: 'checkout',
        number: 4,
        title: 'Kasse',
        description: 'Anmeldung und Bezahlung'
    },
    {
        key: 'zahlung',
        number: 5,
        title: 'Zahlung',
        description: 'Bestellung erfolgreich'
    }
];

const voucherSteps: StepInfo[] = [
    { key: 'gutscheine', number: 1, title: 'Gutscheine', description: 'Produkte auswählen' },
    { key: 'checkout', number: 2, title: 'Kasse', description: 'Anmeldung und Bezahlung' },
    { key: 'zahlung', number: 3, title: 'Zahlung', description: 'Bestellung erfolgreich' },
];

export function StepIndicator() {
    const { state, goToStep, releaseReservationsKeepSelections } = useBooking();
    const [isAccountModalOpen, setIsAccountModalOpen] = useState(false);

    // Determine locale from URL path
    const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';
    const isEnglish = currentPath.startsWith('/en/');
    const locale = isEnglish ? 'en' : 'de';

    const stepsToUse = state.flowMode === 'vouchers' ? voucherSteps : steps;
    const currentStepIndex = stepsToUse.findIndex(step => step.key === state.currentStep);

    const getStepStatus = (stepIndex: number) => {
        if (stepIndex < currentStepIndex) return 'completed';
        if (stepIndex === currentStepIndex) return 'current';
        return 'upcoming';
    };

    const isStepClickable = (stepIndex: number) => {
        // Allow clicking on completed steps and current step
        return stepIndex <= currentStepIndex;
    };

    const handleStepClick = async (targetStep: BookingStep) => {
        // If navigating from warenkorb or checkout to sitzplatz, release reservations but keep selections
        if ((state.currentStep === 'warenkorb' || state.currentStep === 'checkout') && targetStep === 'sitzplatz') {
            await releaseReservationsKeepSelections();
            // if navigating from warenkorb or checkout to datum, release reservations and seat selections and go to datum
        } else if ((state.currentStep === 'warenkorb' || state.currentStep === 'checkout') && targetStep === 'datum') {
            await releaseReservationsKeepSelections();
            goToStep('datum');
        } else {
            // For all other navigations, use regular navigation
            goToStep(targetStep);
        }
    };

    const currentStep = stepsToUse[currentStepIndex];
    const totalSteps = stepsToUse.length;

    // Back navigation helpers (exclude 'zahlung' from the navigable list)
    const navigableSteps = stepsToUse.filter(step => step.key !== 'zahlung');
    const navigableCurrentIndex = navigableSteps.findIndex(step => step.key === state.currentStep);

    // Determine if back button should be shown
    const isFirstStep = navigableCurrentIndex === 0;
    const isVoucherFirstStep = state.flowMode === 'vouchers' && state.currentStep === 'gutscheine';
    const showBackButton = state.currentStep !== 'zahlung' && (!isFirstStep || isVoucherFirstStep);

    const canGoBack = navigableCurrentIndex > 0 && currentStep?.key !== 'zahlung';
    const previousStepKey = canGoBack ? navigableSteps[navigableCurrentIndex - 1]?.key : undefined;

    const handleBackClick = () => {
        if (isVoucherFirstStep) {
            // Navigate to shop base page for voucher flow first step
            window.location.href = `/${locale}/shop`;
        } else if (previousStepKey) {
            handleStepClick(previousStepKey);
        }
    };

    const BackButton = () => (
        <button
            type="button"
            aria-label="Zurück"
            className="p-1 rounded hover:bg-white/10 transition disabled:opacity-40 disabled:cursor-not-allowed"
            onClick={handleBackClick}
            disabled={!showBackButton}
            style={{ visibility: showBackButton ? 'visible' : 'hidden' }}
        >
            <svg className='w-[20px] lg:w-[27px]' height="25" viewBox="0 0 27 25" fill="none" xmlns="http://www.w3.org/2000/svg">
                <path d="M9.49798 20.7942L0.907837 12.2715L9.49798 12.2715C6.36588 12.2715 4.7914 16.053 6.99799 18.2758L9.49798 20.7942Z" fill="white" />
                <path d="M0.907837 12.2715L6.6346 6.58967L9.49798 3.74876L7.00206 6.24308C4.77663 8.46709 6.35175 12.2715 9.49798 12.2715L0.907837 12.2715Z" fill="white" />
                <path d="M25.9078 12.2715L9.49798 12.2715M0.907837 12.2715L6.6346 6.58967L9.49798 3.74876M0.907837 12.2715L9.49798 20.7942M0.907837 12.2715L9.49798 12.2715M12.3614 0.907852L9.49798 3.74876M12.3614 23.6351L9.49798 20.7942M9.49798 3.74876L7.00206 6.24308C4.77663 8.46709 6.35175 12.2715 9.49798 12.2715M9.49798 20.7942L6.99799 18.2758C4.7914 16.053 6.36588 12.2715 9.49798 12.2715" stroke="white" stroke-width="1.81569" stroke-linecap="round" stroke-linejoin="round" />
            </svg>
        </button>
    );

    const AccountButton = ({ size = 'md' }: { size?: 'sm' | 'md' }) => {
        const isMobile = size === 'sm';
        return (
            <button
                onClick={() => setIsAccountModalOpen(true)}
                className={`flex ${isMobile ? 'w-7 h-7' : 'w-11 h-11'} rounded-full ${isMobile ? 'border' : 'border-2'} border-white bg-transparent hover:bg-white hover:cursor-pointer transition-all duration-300 ease-in-out items-center justify-center ${isMobile ? 'p-1.5' : 'p-2'} group`}
                aria-label="Account"
            >
                <svg className={`${isMobile ? 'w-3' : 'w-4'} stroke-white group-hover:stroke-darkBlue transition-colors duration-300`} viewBox="0 0 12 14" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <path d="M11.1716 12.8182C11.1716 11.033 8.8561 9.58586 5.99984 9.58586C3.14358 9.58586 0.828125 11.033 0.828125 12.8182M5.99984 7.64646C4.21468 7.64646 2.76752 6.1993 2.76752 4.41414C2.76752 2.62898 4.21468 1.18182 5.99984 1.18182C7.78501 1.18182 9.23217 2.62898 9.23217 4.41414C9.23217 6.1993 7.78501 7.64646 5.99984 7.64646Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                </svg>
            </button>
        );
    };

    return (
        <>
            <div className="w-full flex items-center bg-darkBlue py-2 lg:h-[86px] relative">
                <div className="max-w-[2000px] w-full mx-auto flex items-center justify-between px-6 md:px-16 xl:px-20 relative">
                    {/* Left: Back Button */}
                    <div className="flex-shrink-0 text-white xl:static">
                        <BackButton />
                    </div>

                    {/* Center: Step Content */}
                    <div className="flex-1 flex justify-center items-center" aria-label="Buchungsschritte">
                        {/* Mobile Layout (smaller than xl) - Show only current step, absolutely centered */}
                        <div className="xl:hidden absolute left-1/2 transform -translate-x-1/2 text-sm lg:text-lg text-white text-center">
                            <p>
                                {currentStep?.title} {currentStep?.number}/{totalSteps - 1}
                            </p>
                        </div>

                        {/* Desktop Layout (xl and larger) - Show all steps */}
                        <div className="hidden xl:flex gap-1 items-center justify-center w-full max-w-4xl">
                            {stepsToUse.filter(step => step.key !== 'zahlung').map((step, index) => {
                                const status = getStepStatus(index);
                                const isClickable = currentStep?.key === "zahlung" ? false : isStepClickable(index);

                                return (
                                    <button
                                        key={step.key}
                                        className="flex flex-col items-center flex-1 gap-2 max-w-52"
                                        onClick={() => isClickable && handleStepClick(step.key)}
                                        disabled={!isClickable}
                                    >
                                        {/* Step Info */}
                                        <div className="mt-2 text-center">
                                            <p className={`text-sm text-white font-medium`}>
                                                {step.number}. {step.title}
                                            </p>
                                        </div>

                                        {/* Step Bar */}
                                        <div className="w-full h-1 relative mb-2">
                                            {status === 'completed' && (
                                                <div className="absolute inset-0 bg-white rounded"></div>
                                            )}
                                            {status === 'current' && (
                                                <>
                                                    <div className="absolute inset-0 bg-white/30 rounded"></div>
                                                    <div className="absolute inset-0 bg-white rounded" style={{ width: '100%' }}></div>
                                                </>
                                            )}
                                            {status === 'upcoming' && (
                                                <div className="absolute inset-0 bg-white/30 rounded"></div>
                                            )}
                                        </div>
                                    </button>
                                );
                            })}
                        </div>
                    </div>

                    {/* Right: Account Button and Step Counter */}
                    <div className="flex-shrink-0 flex items-center gap-2 text-white">
                        {/* Mobile: Account Button + Step Counter */}
                        <div className="xl:hidden flex items-center gap-2">
                            <AccountButton size="sm" />
                            {/* <p className="text-sm">
                                {currentStep?.number}/{totalSteps - 1}
                            </p> */}
                        </div>
                        {/* Desktop: Account Button */}
                        <div className="hidden xl:block">
                            <AccountButton size="md" />
                        </div>
                    </div>
                </div>
            </div>
            <AccountModal
                isOpen={isAccountModalOpen}
                onClose={() => setIsAccountModalOpen(false)}
            />
        </>
    );
}