import React from 'react';
import type { VoucherProduct } from '../../ticketshop/types/voucherProduct';
import { MAX_QUANTITY_PER_ORDER } from '../../ticketshop/types/voucherProduct';
import { formatPrice } from '../../ticketshop/utils/priceFormatting';
import { MainButton } from './MainButton';

interface VoucherProductsModalProps {
    isOpen: boolean;
    onClose: () => void;
    products: VoucherProduct[];
    getSelection: (product: VoucherProduct) => { type: 'digital' | 'physical'; quantity: number };
    setType: (product: VoucherProduct, type: 'digital' | 'physical') => void;
    setQuantity: (product: VoucherProduct, quantity: number) => void;
    onAdd: (product: VoucherProduct) => void;
}

export function VoucherProductsModal({ isOpen, onClose, products, getSelection, setType, setQuantity, onAdd }: VoucherProductsModalProps) {
    // Lock/unlock background scroll based on isOpen
    const restoreBodyStylesRef = React.useRef<null | (() => void)>(null);
    React.useEffect(() => {
        const body = document.body;
        const html = document.documentElement;
        if (isOpen) {
            const previousBodyOverflow = body.style.overflow;
            const previousHtmlOverflow = html.style.overflow;
            const previousPaddingRight = body.style.paddingRight;
            const scrollbarWidth = window.innerWidth - document.documentElement.clientWidth;
            if (scrollbarWidth > 0) {
                body.style.paddingRight = `${scrollbarWidth}px`;
            }
            body.style.overflow = 'hidden';
            html.style.overflow = 'hidden';
            restoreBodyStylesRef.current = () => {
                body.style.overflow = previousBodyOverflow;
                html.style.overflow = previousHtmlOverflow;
                body.style.paddingRight = previousPaddingRight;
            };
        } else {
            // When closing, restore immediately
            if (restoreBodyStylesRef.current) {
                restoreBodyStylesRef.current();
                restoreBodyStylesRef.current = null;
            }
        }
        // On unmount, ensure restoration
        return () => {
            if (restoreBodyStylesRef.current) {
                restoreBodyStylesRef.current();
                restoreBodyStylesRef.current = null;
            }
        };
    }, [isOpen]);

    // Local unified selection state mirroring VoucherShopPage
    const [selectedType, setSelectedType] = React.useState<'digital' | 'physical'>('digital');
    const [selectedIndex, setSelectedIndex] = React.useState<number>(0);
    const [quantity, setQuantityLocal] = React.useState<number>(1);

    const sortedProducts = React.useMemo(() => (products || []).slice().sort((a, b) => Number(a.voucher_amount) - Number(b.voucher_amount)), [products]);
    const amounts = React.useMemo(() => sortedProducts.map(p => Number(p.voucher_amount)), [sortedProducts]);
    const selectedProduct: VoucherProduct | undefined = sortedProducts[selectedIndex];
    const sliderMax = React.useMemo(() => Math.max(0, amounts.length - 1), [amounts.length]);

    // Custom slider state
    const sliderRef = React.useRef<HTMLDivElement>(null);
    const [isDragging, setIsDragging] = React.useState(false);
    const [dragPosition, setDragPosition] = React.useState<number | null>(null);
    const [isAnimating, setIsAnimating] = React.useState(false);
    const rafRef = React.useRef<number | null>(null);
    const animationTimeoutRef = React.useRef<NodeJS.Timeout | null>(null);

    const getTickLeftPercent = React.useCallback((index: number) => {
        if (sliderMax === 0) return 0;
        // Spread evenly from 0% to 100%
        return (index / sliderMax) * 100;
    }, [sliderMax]);

    // Calculate current thumb position (either from drag or selected index)
    const thumbPosition = React.useMemo(() => {
        if (isDragging && dragPosition !== null) {
            return dragPosition;
        }
        return getTickLeftPercent(selectedIndex);
    }, [isDragging, dragPosition, selectedIndex, getTickLeftPercent]);

    // Calculate current effective index (for determining which indicators to fill)
    const currentEffectiveIndex = React.useMemo(() => {
        if (isDragging && dragPosition !== null && sliderMax > 0) {
            // During dragging, only fill indicators that have been fully passed
            const stepPercent = 100 / sliderMax;
            const passedIndex = Math.floor(dragPosition / stepPercent);
            return Math.max(0, Math.min(sliderMax, passedIndex));
        }
        return selectedIndex;
    }, [isDragging, dragPosition, selectedIndex, sliderMax]);

    // Handle mouse/touch events for dragging with requestAnimationFrame for smoothness
    const updatePosition = React.useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        const rect = sliderRef.current.getBoundingClientRect();
        const percent = Math.max(0, Math.min(100, ((clientX - rect.left) / rect.width) * 100));
        setDragPosition(percent);
    }, []);

    const handleStart = React.useCallback((clientX: number) => {
        if (!sliderRef.current) return;
        // Clear any animation timeout if dragging starts
        if (animationTimeoutRef.current) {
            clearTimeout(animationTimeoutRef.current);
            animationTimeoutRef.current = null;
        }
        setIsAnimating(false);
        setIsDragging(true);
        updatePosition(clientX);
    }, [updatePosition]);

    const handleMove = React.useCallback((clientX: number) => {
        if (!isDragging) return;
        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
        }
        // Use requestAnimationFrame for smooth updates
        rafRef.current = requestAnimationFrame(() => {
            updatePosition(clientX);
        });
    }, [isDragging, updatePosition]);

    const handleEnd = React.useCallback(() => {
        // Cancel any pending animation frame
        if (rafRef.current !== null) {
            cancelAnimationFrame(rafRef.current);
            rafRef.current = null;
        }

        if (!isDragging || dragPosition === null || sliderMax === 0) {
            setIsDragging(false);
            setDragPosition(null);
            return;
        }
        
        // Snap to nearest position using exact tick position
        const stepPercent = 100 / sliderMax;
        const snappedIndex = Math.round(dragPosition / stepPercent);
        const clampedIndex = Math.max(0, Math.min(sliderMax, snappedIndex));
        
        setSelectedIndex(clampedIndex);
        setIsDragging(false);
        setDragPosition(null);
    }, [isDragging, dragPosition, sliderMax]);

    // Mouse events
    React.useEffect(() => {
        if (!isDragging) return;

        const handleMouseMove = (e: MouseEvent) => {
            handleMove(e.clientX);
        };

        const handleMouseUp = () => {
            handleEnd();
        };

        window.addEventListener('mousemove', handleMouseMove);
        window.addEventListener('mouseup', handleMouseUp);

        return () => {
            window.removeEventListener('mousemove', handleMouseMove);
            window.removeEventListener('mouseup', handleMouseUp);
            // Clean up any pending animation frame
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDragging, handleMove, handleEnd]);

    // Touch events
    React.useEffect(() => {
        if (!isDragging) return;

        const handleTouchMove = (e: TouchEvent) => {
            e.preventDefault();
            if (e.touches[0]) {
                handleMove(e.touches[0].clientX);
            }
        };

        const handleTouchEnd = () => {
            handleEnd();
        };

        window.addEventListener('touchmove', handleTouchMove, { passive: false });
        window.addEventListener('touchend', handleTouchEnd);

        return () => {
            window.removeEventListener('touchmove', handleTouchMove);
            window.removeEventListener('touchend', handleTouchEnd);
            // Clean up any pending animation frame
            if (rafRef.current !== null) {
                cancelAnimationFrame(rafRef.current);
            }
        };
    }, [isDragging, handleMove, handleEnd]);

    // Cleanup animation timeout on unmount
    React.useEffect(() => {
        return () => {
            if (animationTimeoutRef.current) {
                clearTimeout(animationTimeoutRef.current);
            }
        };
    }, []);

    // Keep parent selection state in sync for the currently selected product
    React.useEffect(() => {
        if (!selectedProduct) return;
        setType(selectedProduct, selectedType);
        setQuantity(selectedProduct, quantity);
    }, [selectedProduct, selectedType, quantity, setType, setQuantity]);

    // Ensure quantity stays within bounds when products/selection change
    React.useEffect(() => {
        if (sortedProducts.length === 0) return;
        if (selectedIndex > sortedProducts.length - 1) {
            setSelectedIndex(0);
        }
        setQuantityLocal(q => Math.min(Math.max(1, q), MAX_QUANTITY_PER_ORDER));
    }, [sortedProducts.length, selectedIndex]);

    const addSelectedVoucherToBasket = () => {
        if (!selectedProduct) return;
        // Parent onAdd uses its own selection map via getSelection(product)
        // Our useEffect keeps that selection in sync (type, quantity)
        onAdd(selectedProduct);
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 bg-black bg-opacity-50 backdrop-blur-sm flex items-center justify-center lg:p-6">
            <div className="absolute inset-0 bg-black/40" onClick={onClose}></div>
            <div className="relative bg-white rounded-lg shadow-xl w-full max-w-screen-xl mx-6">
                <div className="">
                    {sortedProducts.length === 0 ? (
                        <div className="text-center text-gray-500 py-8">Alle verfügbaren Gutscheine sind bereits im Warenkorb.</div>
                    ) : (
                        <section className='w-full flex flex-col lg:flex-row '>
                            <div className='h-auto w-full lg:w-1/2 hidden lg:block'>
                                <img src={"/images/thumbnail-vouchers.jpg"} alt="Gutscheine" className='h-full w-full aspect-square object-cover' />
                            </div>
                            <div className='w-full lg:w-1/2 p-6 lg:p-12'>
                                {/* Subtitle */}
                                <div className='flex w-full justify-between items-center text-sm md:text-base lg:text-lg mb-2 md:mb-4 lg:mb-8'>
                                    {/* Show validity and max per order based on first product selection map if available */}
                                    {(() => {
                                        const sample = sortedProducts[0];
                                        if (!sample) return null;
                                        return (
                                            <span>
                                                Gültig {sample.validity_months} Monate • max. {MAX_QUANTITY_PER_ORDER} pro Bestellung
                                            </span>
                                        );
                                    })()}
                                    <button
                                        onClick={onClose}
                                        className="w-8 h-8 flex items-center justify-center text-gray-400 hover:text-gray-600 rounded"
                                        aria-label="Schließen"
                                    >
                                        <svg width='15' height='15' viewBox='0 0 15 15' fill='none' xmlns='http://www.w3.org/2000/svg'>
                                            <path d='M14.2114 1L1.00015 14.2113' stroke='black' strokeLinecap='round' />
                                            <path d='M14.4575 14.4559L1.24624 1.24459' stroke='black' strokeLinecap='round' />
                                        </svg>
                                    </button>
                                </div>
                                <div className='markup'>
                                    <div className='text-xl md:text-2xl lg:text-3xl font-medium'><span className='font-semibold'>Störtebeker Festspiele 2026</span> <br /><span className='font-normal'>Gutscheine</span></div>
                                </div>

                                {/* Selector */}
                                <div className='mt-6 md:mt-12 w-full h-full'>
                                    {/* Type toggle */}
                                    <div className='flex w-full min-h-10 lg:h-12 items-center gap-0 text-[13px] md:text-sm lg:text-base border-[1.5px] border-black rounded-md overflow-hidden'>
                                        <button
                                            onClick={() => setSelectedType('digital')}
                                            className={`h-10 lg:h-12 flex-1 px-2 py-1 flex items-center justify-center font-normal transition-colors ${selectedType === 'digital' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                                        >
                                            Digitaler Gutschein
                                        </button>
                                        <button
                                            onClick={() => setSelectedType('physical')}
                                            className={`h-10 lg:h-12 flex-1 px-2 py-1 flex items-center justify-center transition-colors ${selectedType === 'physical' ? 'bg-darkBlue text-white' : 'hover:bg-gray-100'}`}
                                        >
                                            Gutscheinkarte
                                        </button>
                                    </div>

								{/* Custom Amount slider (desktop) */}
								{amounts.length > 0 && (
									<div className='hidden lg:block mt-6 md:mt-12 lg:mt-16'>
										<div 
											ref={sliderRef}
											className='relative w-full h-4 cursor-pointer select-none mx-3 pb-12'
											onMouseDown={(e) => handleStart(e.clientX)}
											onTouchStart={(e) => {
												e.preventDefault();
												if (e.touches[0]) {
													handleStart(e.touches[0].clientX);
												}
											}}
										>
											{/* Track background */}
											<div className='absolute top-1/2 left-0 w-full h-0.5 bg-gray-200 -translate-y-1/2' />
											
											{/* Tick marks (circles) */}
											{amounts.map((amt, i) => {
												const isSelected = i === selectedIndex && !isDragging;
												const tickPercent = getTickLeftPercent(i);
												// Only fill the currently selected circle
												const shouldFill = i === selectedIndex;
												
												return (
													<React.Fragment key={i}>
														{/* Circle indicator */}
														<div
															className='absolute top-1/2 left-0 flex items-center justify-center -translate-y-1/2'
															style={{ 
																left: `${tickPercent}%`,
																transform: 'translate(-50%, -50%)'
															}}
														>
															<div 
																onClick={(e) => {
																	e.stopPropagation();
																	// Clear any existing timeout
																	if (animationTimeoutRef.current) {
																		clearTimeout(animationTimeoutRef.current);
																	}
																	// Start animation
																	setIsAnimating(true);
																	setSelectedIndex(i);
																	// Show thumb after animation completes
																	animationTimeoutRef.current = setTimeout(() => {
																		setIsAnimating(false);
																	}, 300);
																}}
																onMouseDown={(e) => {
																	e.stopPropagation();
																	// Clear any existing timeout
																	if (animationTimeoutRef.current) {
																		clearTimeout(animationTimeoutRef.current);
																	}
																	// Start animation
																	setIsAnimating(true);
																	setSelectedIndex(i);
																	// Show thumb after animation completes
																	animationTimeoutRef.current = setTimeout(() => {
																		setIsAnimating(false);
																	}, 300);
																}}
																onTouchStart={(e) => {
																	e.stopPropagation();
																	// Clear any existing timeout
																	if (animationTimeoutRef.current) {
																		clearTimeout(animationTimeoutRef.current);
																	}
																	// Start animation
																	setIsAnimating(true);
																	setSelectedIndex(i);
																	// Show thumb after animation completes
																	animationTimeoutRef.current = setTimeout(() => {
																		setIsAnimating(false);
																	}, 300);
																}}
																className={`w-6 h-6 rounded-full cursor-pointer ${!isDragging ? 'transition-all duration-300' : ''} ${
																	shouldFill 
																		? 'bg-darkBlue border-2 border-darkBlue' 
																		: 'bg-white border-2 border-darkBlue hover:bg-gray-50'
																}`}
															/>
														</div>
														{/* Price label below circle */}
														<div
															className='absolute top-1/2 left-0 flex items-center justify-center pointer-events-none mt-5'
															style={{ 
																left: `${tickPercent}%`,
																transform: 'translate(-50%, 0)'
															}}
														>
															<div className='text-base font-medium whitespace-nowrap'>
																{formatPrice(amt)}
															</div>
														</div>
													</React.Fragment>
												);
											})}
											
											{/* Draggable thumb - positioned exactly like circles for perfect alignment */}
											{!isAnimating && (
												<div
													className={`absolute top-1/2 left-0 w-6 h-6 rounded-full bg-darkBlue border-2 border-darkBlue cursor-grab active:cursor-grabbing ${!isDragging ? 'transition-all duration-300 ease-out hover:scale-110' : ''}`}
													style={{ 
														left: `${thumbPosition}%`,
														transform: 'translate(-50%, -50%)'
													}}
												/>
											)}
										</div>
									</div>
								)}

								{/* Amount selection for mobile */}
								<div className='mt-6 lg:hidden'>
									<div className='flex items-center gap-2 overflow-x-auto no-scrollbar touch-pan-x py-1'>
										{amounts.map((amt, i) => {
											const isSelected = i === selectedIndex;
											return (
												<button
													key={i}
													onClick={() => setSelectedIndex(i)}
													className={`flex-shrink-0 rounded-full px-4 py-2 text-sm border transition-colors ${isSelected ? 'bg-darkBlue text-white border-darkBlue' : 'border-darkBlue text-black'}`}
												>
													{formatPrice(amt)}
												</button>
											);
										})}
									</div>
								</div>

                                    {/* Quantity and Add */}
                                    <div className='mt-6 md:mt-10 flex items-center justify-between gap-2 lg:gap-6'>
                                        <div className="flex w-fit min-w-36 lg:min-w-48 h-10 lg:h-14 items-center gap-2 border-[1.5px] border-black rounded-md overflow-hidden">
                                            <button
                                                onClick={() => setQuantityLocal(Math.max(1, quantity - 1))}
                                                disabled={quantity <= 1}
                                                className="h-10 lg:h-14 w-12 lg:w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                aria-label="Anzahl verringern"
                                                title="Anzahl verringern"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 12H4" />
                                                </svg>
                                            </button>
                                            <span className="w-8 lg:w-16 text-center font-medium">{quantity}</span>
                                            <button
                                                onClick={() => setQuantityLocal(Math.min(MAX_QUANTITY_PER_ORDER, quantity + 1))}
                                                disabled={quantity >= MAX_QUANTITY_PER_ORDER}
                                                className="h-10 lg:h-14 w-12 lg:w-full flex items-center justify-center hover:bg-gray-100 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                                                aria-label="Anzahl erhöhen"
                                                title="Anzahl erhöhen"
                                            >
                                                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                                                </svg>
                                            </button>
                                        </div>
                                        <MainButton
                                            handleClick={addSelectedVoucherToBasket}
                                            label="Auswählen"
                                            size='small'
                                            style='primary'
                                            className='w-full block lg:hidden'
                                        />
                                        <MainButton
                                            handleClick={addSelectedVoucherToBasket}
                                            label="Auswählen"
                                            size='large'
                                            style='primary'
                                            className='w-full hidden lg:block'
                                        />
                                    </div>
                                </div>
                            </div>
                        </section>
                    )}
                </div>
            </div>
        </div>
    );
}


