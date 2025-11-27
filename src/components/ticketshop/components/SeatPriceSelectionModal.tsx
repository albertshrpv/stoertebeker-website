import React from 'react';
import type { CompleteSeatGroup, CompletePrice } from '../types/pricing';
import type { SeatInfo } from './SeatPlanViewer';
import { formatPrice } from '../utils/priceFormatting';
import { getSeatPreviewImage } from '../utils/media';
import { getSeatInfoDisplayNameWithSeatGroupName } from '../utils/seatInfo';
import { MainButton } from './MainButton';

interface SeatPriceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    seat: SeatInfo;
    seatGroup: CompleteSeatGroup;
    onSelectPriceCategory: (seatId: string, seatGroup: CompleteSeatGroup, priceCategory: CompletePrice) => void;
}

export default function SeatPriceSelectionModal({
    isOpen,
    onClose,
    seat,
    seatGroup,
    onSelectPriceCategory
}: SeatPriceSelectionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center z-50" onClick={onClose}>
            <div className="flex flex-col lg:flex-row bg-white shadow-xl max-w-screen-lg w-full mx-4 rounded-lg overflow-hidden lg:min-h-[380px]" onClick={(e) => e.stopPropagation()}>
                <div className="flex items-center gap-2 lg:hidden p-6">
                    <div>
                        <p className="text-base font-medium">
                            {getSeatInfoDisplayNameWithSeatGroupName(seat, seatGroup.name, 'de')}
                        </p>
                    </div>
                    <div className="flex-grow"></div>
                    <button
                        onClick={onClose}
                        className="text-gray-400 hover:text-gray-600 transition-colors"
                    >
                        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                            <path d="M14.3914 1L0.999869 14.3915" stroke="black" stroke-linecap="round" />
                            <path d="M14.6406 14.6394L1.24914 1.24792" stroke="black" stroke-linecap="round" />
                        </svg>

                    </button>
                </div>
                <div className="w-full lg:w-3/5">
                    <img
                        src={getSeatPreviewImage(seat.seat_row)}
                        alt="Seat view"
                        className="w-full h-full object-cover"
                    />
                </div>
                <div className="w-full lg:w-2/5 py-6 px-6 lg:py-8 lg:px-12">
                    {/* Header */}
                    <div className="hidden lg:flex items-center gap-4 pb-8 border-b border-gray-300">
                        <div>
                            <p className="text-xl font-medium text-black">
                                {seatGroup.name} <br /> {seat.displayName}
                            </p>
                        </div>
                        <div className="flex-grow"></div>
                        <button
                            onClick={onClose}
                            className="text-gray-400 hover:text-gray-600 transition-colors"
                        >
                            <svg width="16" height="16" viewBox="0 0 16 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                <path d="M14.3914 1L0.999869 14.3915" stroke="black" stroke-linecap="round" />
                                <path d="M14.6406 14.6394L1.24914 1.24792" stroke="black" stroke-linecap="round" />
                            </svg>
                        </button>
                    </div>

                    {/* <div className="h-1 bg-gray-100 w-full"></div> */}

                    {/* Content */}
                    <div className="space-y-6 lg:py-8">
                        {seatGroup.prices.map((priceCategory) => (
                            <div
                                key={priceCategory.id}
                                className="flex items-center justify-between"
                            >
                                <div className="text-[15px] md:text-base lg:text-[17px]">
                                    <div className="">
                                        {priceCategory.category_name}
                                    </div>
                                    <div className="font-medium">
                                        {formatPrice(priceCategory.price)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MainButton
                                        handleClick={() => {
                                            onSelectPriceCategory(seat.id, seatGroup, priceCategory);
                                            onClose();
                                        }}
                                        label="Auswählen"
                                        size="small"
                                        style="secondary"
                                        className='w-[120px]'
                                    />
                                </div>
                            </div>
                        ))}
                    </div>
                </div>
            </div>
        </div>
    );
} 