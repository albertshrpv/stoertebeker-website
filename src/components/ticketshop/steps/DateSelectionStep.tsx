import React, { useEffect, useMemo, useRef } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { useInitData } from '../hooks/useInitData';
import { DateSelectionCalendar } from '../components/DateSelectionCalendar';

import { MainButton } from '../components/MainButton';
import LoadingSpinner from '../components/LoadingSpinner';
import TitleText from '../components/TitleText';
import BuyBox from '../components/BuyBox';


const titleBase = 'Störtebeker Festspiele 2026 »Likedeeler«';
const title = `<h1>${titleBase.split("-")[0].split("»")[0]} <span class="!font-normal">${titleBase.split("-")[0].split("2026 ")[1]}</span></h1>`;
const text = '<p>Ahoi, liebe Störtebeker-Fans! <br />Wählen Sie den Tag, an dem Klaus Störtebeker 2026 in See sticht, und sichern Sie sich Ihr Ticket für ein unvergessliches Abenteuer.</p>';
const subtitle = 'VII. Spielzyklus | Teil II. | Ralswiek, Rügen';


const bb_title = '<h2>Gutschein kaufen <br><span class="!font-normal">ohne Ticketbuchung</span></h2>';
const bb_text = '<p>Du möchtest einen Gutschein verschenken, aber noch kein Ticket buchen? Kein Problem – hier kannst du Gutscheine ganz unkompliziert und unabhängig von einer Vorstellung kaufen.</p>';

export function DateSelectionStep() {
    const { state, dispatch, goToNextStep, canGoToNextStep } = useBooking();
    const selectButtonRef = useRef<HTMLButtonElement>(null);

    // Ensure flow mode is set to tickets when entering date selection step
    // This will trigger basket clearing if switching from voucher flow
    useEffect(() => {
        if (state.flowMode !== 'tickets') {
            dispatch({ type: 'SET_FLOW_MODE', payload: 'tickets' });
        }
    }, [state.flowMode, dispatch]);

    // Use React Query to fetch and cache init data (series, shows, etc.)
    const { data: initData, isLoading, error } = useInitData(state.seasonId);
    const availableShows = initData?.allShows ?? [];

    // Update the booking context when init data is loaded
    useEffect(() => {
        if (initData) {
            dispatch({ type: 'SET_INIT_DATA', payload: initData });
        }
    }, [initData, dispatch]);

    // Set loading state in booking context
    useEffect(() => {
        dispatch({ type: 'SET_LOADING', payload: isLoading });
    }, [isLoading, dispatch]);

    // Set error state in booking context
    useEffect(() => {
        if (error) {
            dispatch({ type: 'SET_ERROR', payload: 'Fehler beim Laden der Vorstellungen' });
        } else {
            dispatch({ type: 'SET_ERROR', payload: null });
        }
    }, [error, dispatch]);

    // Extract available dates from shows
    const availableDates = useMemo(() => {
        return availableShows.map(show => new Date(show.date).toISOString());
    }, [availableShows]);

    // Finds the first show for a selected date (only the first one, because we only have one show per date)
    const getShowForDate = useMemo(() => {
        return (date: string) => {
            const selectedDate = new Date(date);
            return availableShows.find(show => {
                const showDate = new Date(show.date);
                return showDate.toDateString() === selectedDate.toDateString();
            });
        };
    }, [availableShows]);

    const handleDateSelection = (date: string) => {
        const show = getShowForDate(date);

        if (show) {
            // First set the basic show data immediately for UI responsiveness
            dispatch({ type: 'SET_SELECTED_MINIMAL_SHOW', payload: show });

            // Then fetch the complete show data with pricing structure
            // This will be handled by the SeatSelectionStep when it mounts

            // Scroll the "Auswählen" button into view with minimal offset
            setTimeout(() => {
                if (selectButtonRef.current) {
                    const buttonRect = selectButtonRef.current.getBoundingClientRect();
                    const viewportHeight = window.innerHeight;

                    // Only scroll if button is not visible or barely visible
                    if (buttonRect.bottom > viewportHeight - 50) {
                        const scrollTop = window.pageYOffset || document.documentElement.scrollTop;
                        const targetScrollTop = scrollTop + buttonRect.bottom - viewportHeight + 30; // 10px margin

                        window.scrollTo({
                            top: targetScrollTop,
                            behavior: 'smooth'
                        });
                    }
                }
            }, 100);
        }
    };

    if (isLoading) {
        return (
            <LoadingSpinner />
        );
    }

    if (error) {
        return (
            <div className="text-center py-12">
                <div className="text-red-600 mb-4">Fehler beim Laden der Vorstellungen</div>
                <button
                    onClick={() => window.location.reload()}
                    className="text-darkBlue hover:text-darkBlue/90"
                >
                    Erneut versuchen
                </button>
            </div>
        );
    }

    return (
        <div className='pb-24'>
            {/* <div className='w-full border-b-4 border-darkBlue py-4'>
                <div className={`max-w-screen-2xl mx-auto flex w-full justify-between items-center ${componentContentPaddingX}`}>
                    <div className='text-lg font-medium'>
                        Gutscheine ohne Ticket bestellen
                    </div>
                    <div>
                        <MainButton
                            handleClick={() => {
                                dispatch({ type: 'SET_FLOW_MODE', payload: 'vouchers' });
                                dispatch({ type: 'SET_STEP', payload: 'gutscheine' });
                            }}
                            label="Gutscheine bestellen"
                        />
                    </div>
                </div>
            </div> */}

            <TitleText title={title} text={text} subtitle={subtitle} />
            <section className={`max-w-screen-2xl mx-auto w-full md:px-16 xl:px-20`}>
                {availableShows.length === 0 ? (
                    <div className="text-center py-12">
                        <p className="text-gray-500">Keine Vorstellungen verfügbar.</p>
                    </div>
                ) : (
                    <div className="space-y-6">
                        {/* Calendar Section */}
                        <div className='flex '>
                            <DateSelectionCalendar
                                onSelectDate={handleDateSelection}
                                availableDates={availableDates}
                                error={state.error || undefined}
                                selectedDate={state.selectedMinimalShow ? new Date(state.selectedMinimalShow.date).toISOString() : undefined}
                            />
                        </div>

                    </div>
                )}
            </section>
            <section className={`max-w-screen-2xl mx-auto w-full px-6 md:px-16 xl:px-20`}>
                {/* Navigation */}
                <div className="flex justify-end mt-8">
                    <MainButton
                        ref={selectButtonRef}
                        handleClick={goToNextStep}
                        disabled={!canGoToNextStep()}
                        label="Auswählen"
                        className='w-full lg:w-auto lg:min-w-[300px]'
                        size='large'
                    />
                </div>
            </section>
            <BuyBox title={bb_title} text={bb_text} subtitle="" cta={{
                label: "Gutscheine kaufen", onClick: () => {
                    dispatch({ type: 'SET_FLOW_MODE', payload: 'vouchers' });
                    dispatch({ type: 'SET_STEP', payload: 'gutscheine' });
                }
            }} />
        </div >
    );
}