import React from 'react';
import { formatPrice } from '../../ticketshop/utils/priceFormatting';
import { MAX_QUANTITY_PER_ORDER, type VoucherProduct } from '../../ticketshop/types/voucherProduct';
import { MainButton } from './MainButton';

interface VoucherProductCardProps {
    product: VoucherProduct;
    quantity: number;
    typeValue: 'digital' | 'physical';
    onChangeType: (type: 'digital' | 'physical') => void;
    onChangeQuantity: (quantity: number) => void;
    onAdd: () => void;
}

export function VoucherProductCard({ product, quantity, typeValue, onChangeType, onChangeQuantity, onAdd }: VoucherProductCardProps) {
    const totalPrice = Number(product.voucher_amount) * quantity;

    return (
        <div className='bg-white border border-gray-200 rounded-lg p-4 lg:p-6 shadow-sm w-full'>
            {/* Desktop row layout */}
            <div className='hidden lg:flex items-center gap-12 w-full'>
                <div className='flex-1 text-xl font-semibold'>
                    {product.name}
                    <div className='mt-2 text-xs text-gray-500 font-normal'>
                        Gültig {product.validity_months} Monate • max. {MAX_QUANTITY_PER_ORDER} pro Bestellung
                    </div>
                </div>
                <div className=''>
                    <div className="flex w-fit h-10 items-center gap-0 border-[1.5px] border-black rounded-md overflow-hidden">
                        <button
                            onClick={() => onChangeType('digital')}
                            className={`h-10 px-4 flex items-center justify-center transition-colors ${typeValue === 'digital' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                        >
                            Digital
                        </button>
                        <div className='w-px h-10 bg-black/50'></div>
                        <button
                            onClick={() => onChangeType('physical')}
                            className={`h-10 px-4 flex items-center justify-center transition-colors ${typeValue === 'physical' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                        >
                            Gedruckt
                        </button>
                    </div>
                </div>
                <div className=''>
                    <div className="flex w-fit h-10 items-center gap-2 border-[1.5px] border-black rounded-md overflow-hidden">
                        <button
                            onClick={() => onChangeQuantity(quantity - 1)}
                            disabled={quantity <= 1}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl verringern"
                            title="Anzahl verringern"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <button
                            onClick={() => onChangeQuantity(quantity + 1)}
                            disabled={quantity >= MAX_QUANTITY_PER_ORDER}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl erhöhen"
                            title="Anzahl erhöhen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                </div>
                <div className='ml-auto text-xl text-right font-semibold w-28'>
                    {formatPrice(totalPrice)}
                </div>
                <MainButton
                    handleClick={onAdd}
                    label="Hinzufügen"
                    size='small'
                    style='primary'
                />
            </div>

            {/* Mobile stacked layout */}
            <div className='lg:hidden'>
                <div className='flex items-start justify-between'>
                    <div className='text-lg font-medium'>
                        {product.name}
                        <div className='mt-2 text-xs text-gray-500 font-normal'>
                            Gültig {product.validity_months} Monate • max. {MAX_QUANTITY_PER_ORDER} pro Bestellung
                        </div>
                    </div>
                    <div className='font-semibold text-lg whitespace-nowrap'>{formatPrice(totalPrice)}</div>
                </div>
                <div className='mt-4'>
                    <div className="flex w-full h-10 items-center gap-0 border-[1.5px] border-black rounded-md overflow-hidden">
                        <button
                            onClick={() => onChangeType('digital')}
                            className={`h-10 flex-1 px-4 flex items-center justify-center transition-colors ${typeValue === 'digital' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                        >
                            Digital
                        </button>
                        <div className='w-px h-10 bg-black/50'></div>
                        <button
                            onClick={() => onChangeType('physical')}
                            className={`h-10 flex-1 px-4 flex items-center justify-center transition-colors ${typeValue === 'physical' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                        >
                            Physisch
                        </button>
                    </div>
                </div>
                <div className='mt-4 flex items-center justify-between gap-2'>
                    <div className="flex w-fit h-10 items-center gap-2 border border-black rounded-md overflow-hidden">
                        <button
                            onClick={() => onChangeQuantity(quantity - 1)}
                            disabled={quantity <= 1}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl verringern"
                            title="Anzahl verringern"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                            </svg>
                        </button>
                        <span className="w-8 text-center font-medium">{quantity}</span>
                        <button
                            onClick={() => onChangeQuantity(quantity + 1)}
                            disabled={quantity >= MAX_QUANTITY_PER_ORDER}
                            className="h-10 w-12 flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                            aria-label="Anzahl erhöhen"
                            title="Anzahl erhöhen"
                        >
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                            </svg>
                        </button>
                    </div>
                    <MainButton
                        handleClick={onAdd}
                        label="Hinzufügen"
                        size='small'
                        style='primary'
                    />
                </div>
            </div>
        </div>
    );
}


