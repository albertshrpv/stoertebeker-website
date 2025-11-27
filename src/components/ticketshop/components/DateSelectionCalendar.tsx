import { useState, useMemo, useCallback } from 'react';
import { Alert } from 'flowbite-react';

interface DateSelectionCalendarProps {
    onSelectDate: (date: string) => void;
    availableDates: string[]; // Array of ISO date strings
    error?: string;
    selectedDate?: string;
}

const parseDateFromApi = (dateString: string): Date => {
    const [year, month, day] = dateString.split('-').map(Number);
    return new Date(year, month - 1, day);
};

export function DateSelectionCalendar({
    onSelectDate,
    availableDates,
    error,
    selectedDate
}: DateSelectionCalendarProps) {
    const [currentMonth, setCurrentMonth] = useState(() => {
        if (availableDates.length > 0) {
            const firstDate = new Date(availableDates[0]);
            return new Date(firstDate.getFullYear(), firstDate.getMonth(), 1);
        }
        return new Date(new Date().getFullYear(), new Date().getMonth(), 1);
    });



    // Convert available dates to Date objects for easier comparison
    const availableDateObjects = useMemo(() => {
        return availableDates.map(date => new Date(date));
    }, [availableDates]);

    // Generate calendar days for current month and next month
    const calendarData = useMemo(() => {
        const generateMonthDays = (monthDate: Date) => {
            const firstDay = new Date(monthDate.getFullYear(), monthDate.getMonth(), 1);
            const startDate = new Date(firstDay);

            // Start from the first day of the week
            const startWeekDay = firstDay.getDay();
            const mondayOffset = startWeekDay === 0 ? 6 : startWeekDay - 1; // Monday = 0
            startDate.setDate(firstDay.getDate() - mondayOffset);

            const days = [];
            const current = new Date(startDate);

            // Generate 6 weeks of days
            for (let week = 0; week < 6; week++) {
                for (let day = 0; day < 7; day++) {
                    days.push(new Date(current));
                    current.setDate(current.getDate() + 1);
                }
            }

            return days;
        };

        const nextMonth = new Date(currentMonth.getFullYear(), currentMonth.getMonth() + 1, 1);

        return {
            currentMonth: {
                date: currentMonth,
                days: generateMonthDays(currentMonth)
            },
            nextMonth: {
                date: nextMonth,
                days: generateMonthDays(nextMonth)
            }
        };
    }, [currentMonth]);

    const isDateInCurrentMonths = useCallback((date: Date) => {
        const currentMonthMatch = date.getMonth() === calendarData.currentMonth.date.getMonth() &&
            date.getFullYear() === calendarData.currentMonth.date.getFullYear();
        const nextMonthMatch = date.getMonth() === calendarData.nextMonth.date.getMonth() &&
            date.getFullYear() === calendarData.nextMonth.date.getFullYear();
        return currentMonthMatch || nextMonthMatch;
    }, [calendarData]);

    const isDateSelectable = useCallback((date: Date) => {
        if (!isDateInCurrentMonths(date)) return false;

        // Check if the date is in the available dates
        return availableDateObjects.some(availableDate =>
            availableDate.toDateString() === date.toDateString()
        );
    }, [isDateInCurrentMonths, availableDateObjects]);

    const isDateSelected = useCallback((date: Date) => {
        if (!selectedDate) return false;
        const selectedDateObj = new Date(selectedDate);
        return selectedDateObj.toDateString() === date.toDateString();
    }, [selectedDate]);

    const handleDateClick = useCallback((date: Date) => {
        if (!isDateSelectable(date)) return;

        onSelectDate(date.toISOString());
    }, [isDateSelectable, onSelectDate]);

    const handlePreviousMonth = useCallback(() => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() - 1, 1));
    }, []);

    const handleNextMonth = useCallback(() => {
        setCurrentMonth(prev => new Date(prev.getFullYear(), prev.getMonth() + 1, 1));
    }, []);



    return (
        <div className="space-y-4 w-full">
            {/* Error Message */}
            {error && (
                <Alert color="failure">
                    {error}
                </Alert>
            )}

            {/* Available Shows Info */}
            {/* {availableDates.length > 0 && (
                <div className="text-sm text-gray-600 dark:text-gray-400">
                    {availableDates.length} Vorstellung{availableDates.length > 1 ? 'en' : ''} verfügbar
                </div>
            )} */}

            {/* Calendar Header */}
            <div className='bg-white rounded-2xl px-4 md:px-12 xl:px-20 py-6 md:py-12 xl:py-20 2xl:px-28 shadow-[0_0_50px_rgba(0,0,0,0.15)]'>
                {/* Month Navigation with Year Selector */}
                {/* Mobile: Single month navigation */}
                <div className="flex items-center justify-between mb-6 md:hidden">
                    <div
                        onClick={handlePreviousMonth}
                        className='cursor-pointer p-2 hover:bg-gray-100 rounded-full'
                    >
                        <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M8.55933 18.5L1 11L8.55933 11C5.80308 11 4.41754 14.3277 6.35934 16.2838L8.55933 18.5Z" fill="black" />
                            <path d="M1 11L6.03955 6L8.55933 3.5L6.36292 5.69501C4.40454 7.65213 5.79064 11 8.55933 11L1 11Z" fill="black" />
                            <path d="M23 11L8.55933 11M1 11L6.03955 6L8.55933 3.5M1 11L8.55933 18.5M1 11L8.55933 11M11.0791 1L8.55933 3.5M11.0791 21L8.55933 18.5M8.55933 3.5L6.36292 5.69501C4.40454 7.65213 5.79064 11 8.55933 11M8.55933 18.5L6.35934 16.2838C4.41754 14.3277 5.80308 11 8.55933 11" stroke="black" stroke-width="1.59781" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>

                    </div>
                    <div className="text-lg md:text-2xl font-medium text-black dark:text-white text-center">
                        {calendarData.currentMonth.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()}
                    </div>
                    <div
                        className='cursor-pointer p-2 hover:bg-gray-100 rounded-full'
                        onClick={handleNextMonth}
                    >
                        <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M15.4407 18.5L23 11L15.4407 11C18.1969 11 19.5825 14.3277 17.6407 16.2838L15.4407 18.5Z" fill="black" />
                            <path d="M23 11L17.9605 6L15.4407 3.5L17.6371 5.69501C19.5955 7.65213 18.2094 11 15.4407 11L23 11Z" fill="black" />
                            <path d="M1 11L15.4407 11M23 11L17.9605 6L15.4407 3.5M23 11L15.4407 18.5M23 11L15.4407 11M12.9209 1L15.4407 3.5M12.9209 21L15.4407 18.5M15.4407 3.5L17.6371 5.69501C19.5955 7.65213 18.2094 11 15.4407 11M15.4407 18.5L17.6407 16.2838C19.5825 14.3277 18.1969 11 15.4407 11" stroke="black" stroke-width="1.59781" stroke-linecap="round" stroke-linejoin="round" />
                        </svg>

                    </div>
                </div>

                {/* Desktop: Two month navigation (handled inline with labels below) */}

                {/* Mobile: Single Month Calendar Grid */}
                <div className="md:hidden">
                    <div className="grid grid-cols-7 gap-3 w-full justify-center items-center">
                        {/* Weekday Headers */}
                        {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map(day => (
                            <div key={day} className="p-1 text-center font-medium">
                                {day}
                            </div>
                        ))}

                        {/* Calendar Days */}
                        {calendarData.currentMonth.days.map((date: Date, index: number) => {
                            const isCurrentMonth = date.getMonth() === calendarData.currentMonth.date.getMonth();
                            const isNextMonth = date.getMonth() === calendarData.nextMonth.date.getMonth();
                            if (isNextMonth) return null;

                            const isSelectable = isDateSelectable(date);
                            const isSelected = isDateSelected(date);

                            return (
                                <div key={index} className='flex w-full h-full items-center justify-center'>
                                    {
                                        isCurrentMonth ? (
                                            <button
                                                aria-label={`Wähle Datum ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                                                key={index}
                                                type="button"
                                                className={`
                                            flex items-center justify-center min-w-11 min-h-11 w-11 h-11 p-1 text-lg font-medium rounded-full transition-colors
                                            ${!isCurrentMonth
                                                        ? ''
                                                        : isSelectable
                                                            ? isSelected
                                                                ? 'rounded-full bg-darkBlue text-white hover:bg-darkBlue/80'
                                                                : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                            : 'text-gray-300 cursor-not-allowed'
                                                    }
                                        `}
                                                onClick={() => handleDateClick(date)}
                                                disabled={!isSelectable}
                                            >
                                                {isCurrentMonth ? date.getDate() : ''}
                                            </button>
                                        ) : null
                                    }
                                </div>
                            );
                        })}
                    </div>
                </div>

                {/* Desktop: Two-Month Calendar Grid */}
                <div className="hidden md:flex gap-12 justify-evenly">
                    {/* Current Month */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="relative">
                            <div className="text-2xl font-medium text-black dark:text-white text-center">
                                {calendarData.currentMonth.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </div>
                            <div
                                onClick={handlePreviousMonth}
                                className='cursor-pointer p-2 hover:bg-gray-100 rounded-full absolute left-0 top-1/2 -translate-y-1/2'
                            >
                                <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M8.55933 18.5L1 11L8.55933 11C5.80308 11 4.41754 14.3277 6.35934 16.2838L8.55933 18.5Z" fill="black" />
                                    <path d="M1 11L6.03955 6L8.55933 3.5L6.36292 5.69501C4.40454 7.65213 5.79064 11 8.55933 11L1 11Z" fill="black" />
                                    <path d="M23 11L8.55933 11M1 11L6.03955 6L8.55933 3.5M1 11L8.55933 18.5M1 11L8.55933 11M11.0791 1L8.55933 3.5M11.0791 21L8.55933 18.5M8.55933 3.5L6.36292 5.69501C4.40454 7.65213 5.79064 11 8.55933 11M8.55933 18.5L6.35934 16.2838C4.41754 14.3277 5.80308 11 8.55933 11" stroke="black" stroke-width="1.59781" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-3 w-full justify-center items-center">
                            {/* Weekday Headers */}
                            {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map(day => (
                                <div key={day} className="p-2 text-center font-medium">
                                    {day}
                                </div>
                            ))}

                            {/* Calendar Days */}
                            {calendarData.currentMonth.days.map((date: Date, index: number) => {
                                const isCurrentMonth = date.getMonth() === calendarData.currentMonth.date.getMonth();
                                const isNextMonth = date.getMonth() === calendarData.nextMonth.date.getMonth();
                                if (isNextMonth) return null;

                                const isSelectable = isDateSelectable(date);
                                const isSelected = isDateSelected(date);

                                return (
                                    <div key={index} className='flex w-full h-full items-center justify-center'>
                                        {
                                            isCurrentMonth ? (
                                                <button
                                                    aria-label={`Wähle Datum ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                                                    key={index}
                                                    type="button"
                                                    className={`
                                                flex items-center justify-center min-w-11 min-h-11 w-11 h-11 p-2 text-xl font-medium rounded-full transition-colors
                                                ${!isCurrentMonth
                                                            ? ''
                                                            : isSelectable
                                                                ? isSelected
                                                                    ? 'rounded-full bg-darkBlue text-white hover:bg-darkBlue/80'
                                                                    : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                : 'text-gray-300 cursor-not-allowed'
                                                        }
                                            `}
                                                    onClick={() => handleDateClick(date)}
                                                    disabled={!isSelectable}
                                                >
                                                    {isCurrentMonth ? date.getDate() : ''}
                                                </button>
                                            ) : null
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>

                    {/* Divider */}
                    <div className='w-1 rounded-full h-auto bg-gray-100'></div>

                    {/* Next Month */}
                    <div className="w-full flex flex-col gap-6">
                        <div className="relative">
                            <div className="text-2xl font-medium text-black dark:text-white text-center">
                                {calendarData.nextMonth.date.toLocaleDateString('de-DE', { month: 'long', year: 'numeric' }).toUpperCase()}
                            </div>
                            <div
                                className='cursor-pointer p-2 hover:bg-gray-100 rounded-full absolute right-0 top-1/2 -translate-y-1/2'
                                onClick={handleNextMonth}
                            >
                                <svg width="24" height="22" viewBox="0 0 24 22" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path d="M15.4407 18.5L23 11L15.4407 11C18.1969 11 19.5825 14.3277 17.6407 16.2838L15.4407 18.5Z" fill="black" />
                                    <path d="M23 11L17.9605 6L15.4407 3.5L17.6371 5.69501C19.5955 7.65213 18.2094 11 15.4407 11L23 11Z" fill="black" />
                                    <path d="M1 11L15.4407 11M23 11L17.9605 6L15.4407 3.5M23 11L15.4407 18.5M23 11L15.4407 11M12.9209 1L15.4407 3.5M12.9209 21L15.4407 18.5M15.4407 3.5L17.6371 5.69501C19.5955 7.65213 18.2094 11 15.4407 11M15.4407 18.5L17.6407 16.2838C19.5825 14.3277 18.1969 11 15.4407 11" stroke="black" stroke-width="1.59781" stroke-linecap="round" stroke-linejoin="round" />
                                </svg>
                            </div>
                        </div>
                        <div className="grid grid-cols-7 gap-3 w-full justify-center items-center">
                            {/* Weekday Headers */}
                            {['MO', 'DI', 'MI', 'DO', 'FR', 'SA', 'SO'].map(day => (
                                <div key={day} className="p-2 text-center font-medium">
                                    {day}
                                </div>
                            ))}

                            {/* Calendar Days */}
                            {calendarData.nextMonth.days.map((date: Date, index: number) => {
                                const isCurrentMonth = date.getMonth() === calendarData.nextMonth.date.getMonth();
                                const isSelectable = isDateSelectable(date);
                                const isSelected = isDateSelected(date);

                                return (
                                    <div key={index} className='flex w-full h-full items-center justify-center'>
                                        {
                                            isCurrentMonth ? (
                                                <button
                                                    aria-label={`Wähle Datum ${date.toLocaleDateString('de-DE', { day: '2-digit', month: '2-digit', year: 'numeric' })}`}
                                                    key={index}
                                                    type="button"
                                                    className={`
                                                flex items-center justify-center min-w-11 min-h-11 w-11 h-11 p-2 text-xl font-medium rounded-full transition-colors
                                                ${!isCurrentMonth
                                                            ? ''
                                                            : isSelectable
                                                                ? isSelected
                                                                    ? 'rounded-full bg-darkBlue text-white hover:bg-darkBlue/80'
                                                                    : 'dark:text-white hover:bg-gray-100 dark:hover:bg-gray-700'
                                                                : 'text-gray-300 cursor-not-allowed'
                                                        }
                                            `}
                                                    onClick={() => handleDateClick(date)}
                                                    disabled={!isSelectable}
                                                >
                                                    {isCurrentMonth ? date.getDate() : ''}
                                                </button>
                                            ) : null
                                        }
                                    </div>
                                );
                            })}
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
} 