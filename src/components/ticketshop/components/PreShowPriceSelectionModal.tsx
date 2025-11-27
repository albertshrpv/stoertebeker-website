import React from 'react';
import type { CrossSellingProductData } from '../types/crossSellingProduct';
import { formatPrice } from '../utils/priceFormatting';
import { MainButton } from './MainButton';

interface PreShowPriceSelectionModalProps {
    isOpen: boolean;
    onClose: () => void;
    preShowProducts: CrossSellingProductData[];
    onSelectPriceCategory: (preShowProduct: CrossSellingProductData) => void;
}

export default function PreShowPriceSelectionModal({
    isOpen,
    onClose,
    preShowProducts,
    onSelectPriceCategory
}: PreShowPriceSelectionModalProps) {
    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="flex flex-col lg:flex-row bg-white shadow-xl max-w-md w-full mx-4">
                <div className="w-full py-6 px-6 lg:py-8 lg:px-12">
                    {/* Header */}
                    <div className="flex items-center gap-4 pb-4 lg:pb-8">
                        <div>
                            <p className="lg:text-xl font-semibold text-black">
                                {preShowProducts[0].name}
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

                    <div className="h-1 bg-gray-100 w-full"></div>

                    {/* Content */}
                    <div className="space-y-6 py-8">
                        {preShowProducts.sort((b, a) => a.price - b.price).map((preShowProduct) => (
                            <div
                                key={preShowProduct.id}
                                className="flex items-center justify-between"
                            >
                                <div className="text-base lg:text-lg">
                                    <div className="">
                                        {preShowProduct.price_label || preShowProduct.name}
                                    </div>
                                    <div className="font-medium">
                                        {formatPrice(preShowProduct.price)}
                                    </div>
                                </div>
                                <div className="flex items-center gap-3">
                                    <MainButton
                                        handleClick={() => {
                                            onSelectPriceCategory(preShowProduct);
                                            onClose();
                                        }}
                                        label="Auswählen"
                                        size="small"
                                        style="secondary"
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