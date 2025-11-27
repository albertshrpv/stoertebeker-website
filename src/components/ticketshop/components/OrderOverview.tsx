import { Tooltip } from "flowbite-react";
import type { CouponLineItem, CrossSellingLineItem, TicketAddOnLineItem, TicketLineItem, VoucherLineItem } from "../types/lineItem";
import type { OrderData } from "../types/order";
import { getMediaUrl } from "../utils/media";
import { formatPrice } from "../utils/priceFormatting";
import { getSeatDisplayNameWithSeatGroupName, getTicketRowAndSeat } from "../utils/seatInfo";
import React, { useState, useEffect, Fragment } from 'react';

export default function OrderOverview({ order }: { order: OrderData }) {

    return (
        <div className="">
            <>
                <div className="w-full flex flex-col gap-8 lg:gap-16 overflow-hidden mt-12 bg-white p-6 lg:p-8 rounded-t-2xl">
                    {/* Desktop header */}
                    {
                        order.show_id &&
                        <div className="w-full hidden lg:flex gap-16 overflow-hidden">
                            {order.show_snapshot?.image && (
                                <div className="w-auto h-56 overflow-hidden rounded-md">
                                    <img src={getMediaUrl({ imageName: order.show_snapshot?.image })} alt={order.show_snapshot?.name} className="w-auto h-full object-cover" />
                                </div>
                            )}
                            <div className="w-full flex flex-col justify-between gap-2 py-6 overflow-hidden">
                                <div>
                                    <div className='text-xl text-black dark:text-white mb-2'>
                                        {order.series_snapshot?.subtitle}
                                    </div>
                                    <div className='text-2xl font-semibold dark:text-white'>
                                        {/* <h1>{order.show_snapshot?.name.split("-")[0].split("»")[0]} <span className="!font-normal">{order.show_snapshot?.name.split("2026 ")[1]}</span></h1> */}
                                        <h1>{order.show_snapshot?.name}</h1>
                                    </div>
                                </div>
                                <div className='flex gap-6 text-xl dark:text-white'>
                                    <div className='flex items-center gap-4'>
                                        <svg className='stroke-black dark:stroke-white' width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.75 3H4.00018C2.95008 3 2.42464 3 2.02356 3.21799C1.67076 3.40973 1.38413 3.71547 1.20436 4.0918C1 4.51962 1 5.08009 1 6.2002V7M4.75 3H12.25M4.75 3V1M12.25 3H13.0002C14.0503 3 14.5746 3 14.9757 3.21799C15.3285 3.40973 15.6161 3.71547 15.7958 4.0918C16 4.5192 16 5.07899 16 6.19691V7M12.25 3V1M1 7V15.8002C1 16.9203 1 17.4801 1.20436 17.9079C1.38413 18.2842 1.67076 18.5905 2.02356 18.7822C2.42425 19 2.94906 19 3.9971 19H13.0029C14.0509 19 14.575 19 14.9757 18.7822C15.3285 18.5905 15.6161 18.2842 15.7958 17.9079C16 17.4805 16 16.9215 16 15.8036V7M1 7H16M12.25 15H12.2519L12.2518 15.002L12.25 15.002V15ZM8.5 15H8.50187L8.50183 15.002L8.5 15.002V15ZM4.75 15H4.75187L4.75183 15.002L4.75 15.002V15ZM12.2518 11V11.002L12.25 11.002V11H12.2518ZM8.5 11H8.50187L8.50183 11.002L8.5 11.002V11ZM4.75 11H4.75187L4.75183 11.002L4.75 11.002V11Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {new Date(order.show_snapshot?.date || '').toLocaleDateString('de-DE', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg className='stroke-black dark:stroke-white' width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M10 5V10H15M10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {order.show_snapshot?.show_time.split(':')[0]}:{order.show_snapshot?.show_time.split(':')[1]} Uhr
                                        </span>
                                    </div>
                                    <div className='flex items-center gap-4'>
                                        <svg className='stroke-black dark:stroke-white' width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 7.92285C1 12.7747 5.24448 16.7869 7.12319 18.3252C7.39206 18.5454 7.52811 18.6568 7.72871 18.7132C7.88491 18.7572 8.1148 18.7572 8.271 18.7132C8.47197 18.6567 8.60707 18.5463 8.87695 18.3254C10.7557 16.7871 14.9999 12.7751 14.9999 7.9233C14.9999 6.08718 14.2625 4.32605 12.9497 3.02772C11.637 1.72939 9.8566 1 8.00008 1C6.14357 1 4.36301 1.7295 3.05025 3.02783C1.7375 4.32616 1 6.08674 1 7.92285Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 7C6 8.10457 6.89543 9 8 9C9.10457 9 10 8.10457 10 7C10 5.89543 9.10457 5 8 5C6.89543 5 6 5.89543 6 7Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            Ralswiek/Rügen
                                        </span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    }

                    {/* Mobile header */}
                    {
                        order.show_id &&
                        <div className="w-full flex flex-col lg:hidden gap-6 overflow-hidden">
                            <div className="w-full flex flex-col justify-between gap-8 overflow-hidden">
                                <div>
                                    <div className='text-base mb-2'>
                                        {order.series_snapshot?.subtitle}
                                    </div>
                                    {/* <h1 className='text-xl lg:text-2xl font-semibold dark:text-white'>{order.show_snapshot?.name.split("-")[0].split("»")[0]} <span className="!font-normal">{order.show_snapshot?.name.split("2026 ")[1]}</span></h1> */}
                                    <h1>{order.show_snapshot?.name}</h1>
                                </div>
                                <div className='flex flex-col gap-4 text-sm dark:text-white'>
                                    <div className='flex items-center gap-4'>
                                        <svg className='stroke-black dark:stroke-white' width="17" height="20" viewBox="0 0 17 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M4.75 3H4.00018C2.95008 3 2.42464 3 2.02356 3.21799C1.67076 3.40973 1.38413 3.71547 1.20436 4.0918C1 4.51962 1 5.08009 1 6.2002V7M4.75 3H12.25M4.75 3V1M12.25 3H13.0002C14.0503 3 14.5746 3 14.9757 3.21799C15.3285 3.40973 15.6161 3.71547 15.7958 4.0918C16 4.5192 16 5.07899 16 6.19691V7M12.25 3V1M1 7V15.8002C1 16.9203 1 17.4801 1.20436 17.9079C1.38413 18.2842 1.67076 18.5905 2.02356 18.7822C2.42425 19 2.94906 19 3.9971 19H13.0029C14.0509 19 14.575 19 14.9757 18.7822C15.3285 18.5905 15.6161 18.2842 15.7958 17.9079C16 17.4805 16 16.9215 16 15.8036V7M1 7H16M12.25 15H12.2519L12.2518 15.002L12.25 15.002V15ZM8.5 15H8.50187L8.50183 15.002L8.5 15.002V15ZM4.75 15H4.75187L4.75183 15.002L4.75 15.002V15ZM12.2518 11V11.002L12.25 11.002V11H12.2518ZM8.5 11H8.50187L8.50183 11.002L8.5 11.002V11ZM4.75 11H4.75187L4.75183 11.002L4.75 11.002V11Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            {new Date(order.show_snapshot?.date || '').toLocaleDateString('de-DE', {
                                                weekday: 'long',
                                                year: 'numeric',
                                                month: 'long',
                                                day: 'numeric'
                                            })}, {order.show_snapshot?.show_time.split(':')[0]}:{order.show_snapshot?.show_time.split(':')[1]} Uhr
                                        </span>
                                    </div>
                                    {/* <div className='flex items-center gap-4'>
                                                <svg className='stroke-black dark:stroke-white' width="20" height="20" viewBox="0 0 20 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                                    <path d="M10 5V10H15M10 19C5.02944 19 1 14.9706 1 10C1 5.02944 5.02944 1 10 1C14.9706 1 19 5.02944 19 10C19 14.9706 14.9706 19 10 19Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                                </svg>
                                                <span>
                                                    {order.show_snapshot?.show_time.split(':')[0]}:{order.show_snapshot?.show_time.split(':')[1]} Uhr
                                                </span>
                                            </div> */}
                                    <div className='flex items-center gap-4'>
                                        <svg className='stroke-black dark:stroke-white' width="16" height="20" viewBox="0 0 16 20" fill="none" xmlns="http://www.w3.org/2000/svg">
                                            <path d="M1 7.92285C1 12.7747 5.24448 16.7869 7.12319 18.3252C7.39206 18.5454 7.52811 18.6568 7.72871 18.7132C7.88491 18.7572 8.1148 18.7572 8.271 18.7132C8.47197 18.6567 8.60707 18.5463 8.87695 18.3254C10.7557 16.7871 14.9999 12.7751 14.9999 7.9233C14.9999 6.08718 14.2625 4.32605 12.9497 3.02772C11.637 1.72939 9.8566 1 8.00008 1C6.14357 1 4.36301 1.7295 3.05025 3.02783C1.7375 4.32616 1 6.08674 1 7.92285Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                            <path d="M6 7C6 8.10457 6.89543 9 8 9C9.10457 9 10 8.10457 10 7C10 5.89543 9.10457 5 8 5C6.89543 5 6 5.89543 6 7Z" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                                        </svg>
                                        <span>
                                            Ralswiek/Rügen
                                        </span>
                                    </div>
                                </div>
                            </div>
                            {order.show_snapshot?.image && (
                                <div className="w-full h-full overflow-hidden rounded-md">
                                    <img src={getMediaUrl({ imageName: order.show_snapshot?.image })} alt={order.show_snapshot?.name} className="w-full h-full object-cover" />
                                </div>
                            )}
                        </div>
                    }

                    {/* Tickets - Desktop table */}
                    {order.line_items && order.line_items?.filter(item => item.type === 'ticket')?.length > 0 && (
                        <div className='hidden lg:block overflow-x-auto'>
                            <table className="w-full">
                                <thead className='dark:text-white'>
                                    <tr className="border-b-4 text-xl border-gray-200 dark:border-darkBlue">
                                        <th className="text-left py-6 font-semibold">Tickettyp</th>
                                        <th className="text-left py-6 font-semibold">Platzgruppe</th>
                                        <th className="text-left py-6 font-semibold">Reihe</th>
                                        <th className="text-left py-6 font-semibold">Sitz</th>
                                        <th className="text-right py-6 font-semibold">Preis</th>
                                        <th className="text-left py-6 w-24 font-semibold"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const tickets = (order.line_items || []).filter(li => li.type === 'ticket') as TicketLineItem[];
                                        const isNumericRow = (row?: string) => !!row && /^\d+$/.test(row.trim());
                                        const numeric: TicketLineItem[] = [];
                                        const nonNumeric: TicketLineItem[] = [];
                                        tickets.forEach(t => {
                                            const row = t.seat?.seat_row;
                                            if (isNumericRow(row)) numeric.push(t); else nonNumeric.push(t);
                                        });
                                        numeric.sort((a, b) => {
                                            const ra = parseInt((a.seat?.seat_row || '0').trim(), 10);
                                            const rb = parseInt((b.seat?.seat_row || '0').trim(), 10);
                                            if (ra !== rb) return ra - rb;
                                            const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                            const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                            return sna - snb;
                                        });
                                        nonNumeric.sort((a, b) => {
                                            const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                            const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                            return sna - snb;
                                        });
                                        const sortedTickets = [...numeric, ...nonNumeric];
                                        return sortedTickets.map((ticketItem, index) => {
                                            const item = ticketItem as unknown as TicketLineItem;
                                            if (ticketItem.exchange_id && ticketItem.exchanged) {
                                                return null;
                                            }
                                            const originalExchangedTicket = (ticketItem.exchange_id && !ticketItem.exchanged)
                                                ? (order.line_items?.find(li => li.type === 'ticket' && (li as TicketLineItem).exchange_id === ticketItem.exchange_id && (li as TicketLineItem).exchanged) as TicketLineItem | undefined)
                                                : undefined;
                                            const seatGroup = ticketItem.seat_group_name;
                                            const name = typeof ticketItem.price_category.category_name === 'string'
                                                ? ticketItem.price_category.category_name
                                                : (ticketItem.price_category.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie';
                                            const [row, seat] = getTicketRowAndSeat(ticketItem.seat);
                                            const ticketAddOns = order.line_items?.filter(li =>
                                                li.type === 'crossselling' &&
                                                'ticket_line_item_id' in li &&
                                                (li as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id
                                            ) || [];
                                            const isRefunded = (item as unknown as { refunded?: boolean }).refunded === true;

                                            return (
                                                <Fragment key={item.id}>
                                                    <tr className={`dark:text-white ${index > 0 ? 'border-t border-gray-100 dark:border-gray-500' : ''}`}>
                                                        <td className="py-4">
                                                            {originalExchangedTicket ? (
                                                                <div className="font-medium">
                                                                    <div className="line-through opacity-60">{typeof originalExchangedTicket.price_category.category_name === 'string' ? originalExchangedTicket.price_category.category_name : name}</div>
                                                                    <div>{name}</div>
                                                                </div>
                                                            ) : (
                                                                <div className={`font-medium ${isRefunded || (ticketItem.exchanged) ? 'line-through opacity-60' : ''}`}>{name}</div>
                                                            )}
                                                        </td>
                                                        <td className={`py-4 ${(isRefunded || (ticketItem.exchanged)) ? 'line-through opacity-60' : ''}`}>{seatGroup || 'Freie Platzwahl'}</td>
                                                        <td className={`py-4 ${(isRefunded || (ticketItem.exchanged)) ? 'line-through opacity-60' : ''}`}>{(ticketItem as TicketLineItem).free_seat_selection ? 'Freie Platzwahl' : (row || '-')}</td>
                                                        <td className={`py-4 ${(isRefunded || (ticketItem.exchanged)) ? 'line-through opacity-60' : ''}`}>{(ticketItem as TicketLineItem).free_seat_selection ? '-' : (seat || '-')}</td>
                                                        <td className={`py-4 text-right font-medium`}>
                                                            {originalExchangedTicket ? (
                                                                <div className="flex flex-col items-end">
                                                                    <div className="line-through opacity-60">{formatPrice(originalExchangedTicket.total_price)}</div>
                                                                    <div className="font-medium">{formatPrice(item.total_price)}</div>
                                                                </div>
                                                            ) : (
                                                                <span className={`${(isRefunded || (ticketItem.exchanged)) ? 'line-through opacity-60' : ''}`}>{formatPrice(item.total_price)}</span>
                                                            )}
                                                        </td>
                                                        <td className="py-4 px-6 text-center">
                                                            <Tooltip content={`ID: ${item.id}`} placement="top">
                                                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help css-1umw9bq-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="TagIcon"><path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4zm-6 4h-4v-4h4z"></path></svg>
                                                            </Tooltip>
                                                        </td>
                                                    </tr>
                                                    {ticketAddOns.map((addOnItem) => {
                                                        const addOnLineItem = addOnItem as TicketAddOnLineItem;
                                                        const addOnName = addOnLineItem.product.name;
                                                        const addOnRefunded = (addOnLineItem as unknown as { refunded?: boolean }).refunded === true;
                                                        const cls = addOnRefunded ? 'line-through opacity-60' : '';
                                                        return (
                                                            <Fragment key={addOnLineItem.id}>
                                                                <tr className="bg-gray-50 border-t border-dashed border-gray-300 dark:bg-darkBlue dark:border-baseBlue text-gray-600 dark:text-gray-200">
                                                                    <td className="py-3">
                                                                        <div className={`text-sm flex items-center gap-2 ${cls}`}>
                                                                            <span className="text-xs">↳</span>
                                                                            <span>{addOnLineItem.quantity}x {addOnName}</span>
                                                                        </div>
                                                                    </td>
                                                                    <td className={`py-3 text-sm ${cls}`}>Ticket Add-on</td>
                                                                    <td className={`py-3 text-sm ${cls}`}>-</td>
                                                                    <td className={`py-3 text-sm ${cls}`}>-</td>
                                                                    <td className={`py-3 text-right font-medium text-black dark:text-white ${cls}`}>{formatPrice(addOnLineItem.total_price)}</td>
                                                                    <td className="py-3 px-6 text-center">
                                                                        <Tooltip content={`ID: ${addOnLineItem.id}`} placement="top">
                                                                            <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help css-1umw9bq-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="TagIcon"><path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4zm-6 4h-4v-4h4z"></path></svg>
                                                                        </Tooltip>
                                                                    </td>
                                                                </tr>
                                                            </Fragment>
                                                        );
                                                    })}
                                                </Fragment>
                                            );
                                        });
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Tickets - Mobile cards */}
                    {order.line_items && order.line_items?.filter(item => item.type === 'ticket')?.length > 0 && (
                        <div className="lg:hidden space-y-4">
                            <h3 className="font-semibold text-lg pb-2">Tickets</h3>
                            {(() => {
                                const tickets = (order.line_items || []).filter(li => li.type === 'ticket') as TicketLineItem[];
                                const isNumericRow = (row?: string) => !!row && /^\d+$/.test(row.trim());
                                const numeric: TicketLineItem[] = [];
                                const nonNumeric: TicketLineItem[] = [];
                                tickets.forEach(t => {
                                    const row = t.seat?.seat_row;
                                    if (isNumericRow(row)) numeric.push(t); else nonNumeric.push(t);
                                });
                                numeric.sort((a, b) => {
                                    const ra = parseInt((a.seat?.seat_row || '0').trim(), 10);
                                    const rb = parseInt((b.seat?.seat_row || '0').trim(), 10);
                                    if (ra !== rb) return ra - rb;
                                    const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                    const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                    return sna - snb;
                                });
                                nonNumeric.sort((a, b) => {
                                    const sna = typeof a.seat?.seat_row_number === 'number' ? (a.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                    const snb = typeof b.seat?.seat_row_number === 'number' ? (b.seat!.seat_row_number) : Number.POSITIVE_INFINITY;
                                    return sna - snb;
                                });
                                const sortedTickets = [...numeric, ...nonNumeric];
                                return sortedTickets.map((ticketItem) => {
                                    const item = ticketItem as unknown as TicketLineItem;
                                    if (ticketItem.exchange_id && ticketItem.exchanged) {
                                        return null;
                                    }
                                    const originalExchangedTicket = (ticketItem.exchange_id && !ticketItem.exchanged)
                                        ? (order.line_items?.find(li => li.type === 'ticket' && (li as TicketLineItem).exchange_id === ticketItem.exchange_id && (li as TicketLineItem).exchanged) as TicketLineItem | undefined)
                                        : undefined;
                                    const isRefunded = (item as unknown as { refunded?: boolean }).refunded === true;
                                    const name = typeof ticketItem.price_category.category_name === 'string'
                                        ? ticketItem.price_category.category_name
                                        : (ticketItem.price_category.category_name as { de?: { value?: string } })?.de?.value || 'Preiskategorie';

                                    return (
                                        <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start justify-between mb-3">
                                                <div className="flex-1">
                                                    {originalExchangedTicket ? (
                                                        <div className="font-medium mb-2">
                                                            <div className="line-through opacity-60">{typeof originalExchangedTicket.price_category.category_name === 'string' ? originalExchangedTicket.price_category.category_name : name}</div>
                                                            <div>{name}</div>
                                                        </div>
                                                    ) : (
                                                        <div className={`font-medium mb-2 ${isRefunded || (ticketItem.exchanged) ? 'line-through opacity-60' : ''}`}>{name}</div>
                                                    )}
                                                </div>
                                                <div className="ml-4 text-right">
                                                    {originalExchangedTicket ? (
                                                        <div className="flex flex-col items-end">
                                                            <div className="line-through opacity-60 whitespace-nowrap">{formatPrice(originalExchangedTicket.total_price)}</div>
                                                            <div className="font-medium text-lg text-black whitespace-nowrap">{formatPrice(item.total_price)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className={`font-medium text-lg text-black whitespace-nowrap ${isRefunded || (ticketItem.exchanged) ? 'line-through opacity-60' : ''}`}>{formatPrice(item.total_price)}</div>
                                                    )}
                                                </div>
                                            </div>
                                            <div className={`text-sm text-gray-600 mb-1 ${isRefunded || (ticketItem.exchanged) ? 'line-through opacity-60' : ''}`}>
                                                {(ticketItem as TicketLineItem).free_seat_selection ? `${ticketItem.seat_group_name} - Freie Platzwahl` : getSeatDisplayNameWithSeatGroupName(ticketItem.seat, ticketItem.seat_group_name, 'de')}
                                            </div>
                                            {/* Add-ons for this ticket */}
                                            {(() => {
                                                const ticketAddOns = order.line_items?.filter(li => li.type === 'crossselling' && 'ticket_line_item_id' in li && (li as TicketAddOnLineItem).ticket_line_item_id === ticketItem.id) as TicketAddOnLineItem[];
                                                if (!ticketAddOns || ticketAddOns.length === 0) return null;
                                                return (
                                                    <div className="border-t border-dashed border-gray-300 pt-3 space-y-2">
                                                        {ticketAddOns.map(addOn => (
                                                            <div key={addOn.id} className="flex items-center justify-between text-sm text-gray-600">
                                                                <div>{addOn.quantity}x {addOn.product.name}</div>
                                                                <div className="whitespace-nowrap">{formatPrice(addOn.total_price)}</div>
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            })()}
                                        </div>
                                    );
                                });
                            })()}
                        </div>
                    )}

                    {order.line_items && order.line_items.filter(item => item.type === 'crossselling' && !('ticket_line_item_id' in item)).length > 0 && (
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className='font-medium dark:text-white'>
                                    <tr className="text-xl border-b-4 border-gray-200 dark:border-darkBlue">
                                        <th className="text-left py-6 font-semibold">Zusätzliche Produkte</th>
                                        <th className="text-center py-6 font-semibold">Anzahl</th>
                                        <th className="text-right py-6 font-semibold">Preis</th>
                                        <th className="text-center py-6 w-24 font-semibold"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {(() => {
                                        const items = order.line_items.filter(li => li.type === 'crossselling' && !('ticket_line_item_id' in li)) as CrossSellingLineItem[];
                                        const groups = new Map<string, { kept: CrossSellingLineItem[]; refunded: CrossSellingLineItem[] }>();
                                        for (const it of items) {
                                            const key = it.product_id;
                                            const g = groups.get(key) || { kept: [], refunded: [] };
                                            if ((it as unknown as { refunded?: boolean }).refunded === true) g.refunded.push(it); else g.kept.push(it);
                                            groups.set(key, g);
                                        }
                                        const rows: React.ReactNode[] = [];
                                        let idx = 0;
                                        groups.forEach((g) => {
                                            const sample = g.kept[0] || g.refunded[0];
                                            if (!sample) return;
                                            const name = sample.name;
                                            const unitPrice = Number(sample.unit_price || 0);
                                            const keptQty = g.kept.reduce((n, it) => n + it.quantity, 0);
                                            const refundedQty = g.refunded.reduce((n, it) => n + it.quantity, 0);
                                            const keptSystemFeeForRefunded = g.refunded
                                                .filter(it => (it as { system_fee_refunded?: boolean }).system_fee_refunded !== true)
                                                .reduce((sum, it) => sum + (Number(it.system_fee) || 0) * it.quantity, 0);

                                            if (keptQty > 0) {
                                                rows.push(
                                                    <tr key={`${sample.product_id}-kept-${idx++}`} className={`${idx > 0 ? 'border-t border-gray-100 dark:border-gray-500' : ''} dark:text-white`}>
                                                        <td className="py-4"><div className={`font-medium`}>{name}</div></td>
                                                        <td className={`py-4 text-center`}>{keptQty}</td>
                                                        <td className={`py-4 text-right whitespace-nowrap`}>{formatPrice(unitPrice * keptQty)}</td>
                                                        <td className="py-4 px-6 text-center">
                                                            <Tooltip content={`IDs: ${g.kept.map(it => it.id).join(', ')}`} placement="top">
                                                                <svg className="w-4 h-4 text-gray-400 hover:text-gray-600 cursor-help css-1umw9bq-MuiSvgIcon-root" focusable="false" aria-hidden="true" viewBox="0 0 24 24" data-testid="TagIcon"><path d="M20 10V8h-4V4h-2v4h-4V4H8v4H4v2h4v4H4v2h4v4h2v-4h4v4h2v-4h4v-2h-4v-4zm-6 4h-4v-4h4z"></path></svg>
                                                            </Tooltip>
                                                        </td>
                                                    </tr>
                                                );
                                            }
                                            if (refundedQty > 0) {
                                                rows.push(
                                                    <tr key={`${sample.product_id}-ref-${idx++}`} className={`bg-gray-50 border-t border-dashed border-gray-300 dark:bg-darkBlue dark:border-baseBlue text-gray-600 dark:text-gray-200`}>
                                                        <td className="py-3"><div className="font-medium line-through opacity-60">{name}</div></td>
                                                        <td className="py-3 text-center line-through opacity-60">{refundedQty}</td>
                                                        <td className="py-3 text-right">
                                                            <div className="flex flex-col items-end">
                                                                <div className="line-through opacity-60 whitespace-nowrap">{formatPrice(unitPrice * refundedQty)}</div>
                                                                {keptSystemFeeForRefunded > 0 && (
                                                                    <div>{formatPrice(keptSystemFeeForRefunded)} (Systemgebühr)</div>
                                                                )}
                                                            </div>
                                                        </td>
                                                        <td className="py-3 px-6 text-center"></td>
                                                    </tr>
                                                );
                                            }
                                        });
                                        return rows;
                                    })()}
                                </tbody>
                            </table>
                        </div>
                    )}



                    {/* Cross-Selling - Mobile cards (grouped) */}
                    {order.line_items && order.line_items.filter(item => item.type === 'crossselling' && !('ticket_line_item_id' in item)).length > 0 && (
                        <div className="lg:hidden space-y-4 mt-6">
                            <h3 className="font-semibold text-lg pb-2 lg:mt-12">Zusätzliche Produkte</h3>
                            {(() => {
                                const items = order.line_items.filter(item => item.type === 'crossselling' && !('ticket_line_item_id' in item)) as CrossSellingLineItem[];
                                const groups = new Map<string, { kept: CrossSellingLineItem[]; refunded: CrossSellingLineItem[] }>();
                                for (const it of items) {
                                    const key = it.product_id;
                                    const g = groups.get(key) || { kept: [], refunded: [] };
                                    if ((it as unknown as { refunded?: boolean }).refunded === true) g.refunded.push(it); else g.kept.push(it);
                                    groups.set(key, g);
                                }
                                const cards: React.ReactNode[] = [];
                                groups.forEach((g, key) => {
                                    const sample = g.kept[0] || g.refunded[0];
                                    if (!sample) return;
                                    const name = sample.name;
                                    const unitPrice = Number(sample.unit_price || 0);
                                    const keptQty = g.kept.reduce((n, it) => n + it.quantity, 0);
                                    const refundedQty = g.refunded.reduce((n, it) => n + it.quantity, 0);
                                    const keptPrice = unitPrice * keptQty;
                                    const refundedPrice = unitPrice * refundedQty;
                                    const keptSystemFeeForRefunded = g.refunded
                                        .filter(it => (it as { system_fee_refunded?: boolean }).system_fee_refunded !== true)
                                        .reduce((sum, it) => sum + (Number(it.system_fee) || 0) * it.quantity, 0);

                                    cards.push(
                                        <div key={`${key}-card`} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                            <div className="flex items-start justify-between mb-2">
                                                <div className="flex-1">
                                                    <div className={`font-medium ${keptQty === 0 ? 'line-through opacity-60 text-gray-600' : ''}`}>{name}</div>
                                                </div>
                                                <div className="ml-4 text-right">
                                                    {refundedQty > 0 && keptQty > 0 ? (
                                                        <div className="flex flex-col items-end">
                                                            <div className="line-through opacity-60 whitespace-nowrap">{formatPrice(refundedPrice)}</div>
                                                            <div className="font-medium text-lg text-black whitespace-nowrap">{formatPrice(keptPrice)}</div>
                                                        </div>
                                                    ) : (
                                                        <div className={`font-medium whitespace-nowrap text-lg text-black ${keptQty === 0 ? 'line-through opacity-60 text-gray-600' : ''}`}>{formatPrice(keptQty > 0 ? keptPrice : refundedPrice)}</div>
                                                    )}
                                                </div>
                                            </div>
                                            {/* Kept quantity */}
                                            {keptQty > 0 && (
                                                <div className="flex items-center justify-between text-sm text-black">
                                                    <div>Anzahl: {keptQty}</div>
                                                    <div className="whitespace-nowrap">{formatPrice(keptPrice)}</div>
                                                </div>
                                            )}
                                            {/* Refunded quantity */}
                                            {refundedQty > 0 && (
                                                <div className="mt-2 bg-gray-50 border-t border-dashed border-gray-300 pt-2 text-gray-600">
                                                    <div className="flex items-center justify-between text-sm">
                                                        <div className="line-through opacity-60">Anzahl: {refundedQty}</div>
                                                        <div className="line-through opacity-60 whitespace-nowrap">{formatPrice(refundedPrice)}</div>
                                                    </div>
                                                    {keptSystemFeeForRefunded > 0 && (
                                                        <div className="text-xs text-right mt-1 whitespace-nowrap">{formatPrice(keptSystemFeeForRefunded)} (Systemgebühr)</div>
                                                    )}
                                                </div>
                                            )}
                                        </div>
                                    );
                                });
                                return cards;
                            })()}
                        </div>
                    )}

                    {/* Vouchers - Desktop table */}
                    {order.line_items && order.line_items.filter(item => item.type === 'voucher').length > 0 && (
                        <div className="hidden lg:block overflow-x-auto">
                            <table className="w-full">
                                <thead className='font-medium dark:text-white'>
                                    <tr className="text-xl border-b-4 border-gray-200 dark:border-darkBlue">
                                        <th className="text-left py-6 font-semibold">Gutscheine</th>
                                        <th className='text-left py-6 font-semibold'>Codes</th>
                                        <th className='text-left py-6 font-semibold'>Typ</th>
                                        <th className="text-center py-6 font-semibold">Anzahl</th>
                                        <th className="text-right py-6 font-semibold">Preis</th>
                                        <th className="text-center py-6 w-24 font-semibold"><span className="sr-only">Details</span></th>
                                    </tr>
                                </thead>
                                <tbody>
                                    {order.line_items
                                        .filter(item => item.type === 'voucher')
                                        .map((item, index) => {
                                            const voucherItem = item as VoucherLineItem;
                                            const isRefunded = voucherItem.refunded === true;
                                            return (
                                                <tr key={item.id} className={`${index > 0 ? 'border-t border-gray-100 dark:border-gray-500' : ''} dark:text-white`}>
                                                    <td className="py-4"><div className={`font-medium ${isRefunded ? 'line-through opacity-60' : ''}`}>{item.name}</div></td>
                                                    <td className={`py-4 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                        <div className="font-mono text-sm font-medium text-gray-900 dark:text-white">
                                                            {(item.generated_coupons && item.generated_coupons.length > 0) ? item.generated_coupons.map(coupon => (
                                                                <div key={coupon.id} className="">
                                                                    {coupon.code}
                                                                </div>
                                                            )) : '-'}
                                                        </div>
                                                    </td>
                                                    <td className={`py-4 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                        {item.voucher_product_type === 'digital' ? 'Digital' : 'Physisch'}
                                                    </td>
                                                    <td className={`py-4 text-center ${isRefunded ? 'line-through opacity-60' : ''}`}>{item.quantity}</td>
                                                    <td className={`py-4 text-right ${isRefunded ? 'line-through opacity-60' : ''}`}>{formatPrice(item.total_price)}</td>
                                                    <td className="py-4 px-6 text-center">
                                                        <Tooltip content={`ID: ${item.id}`} placement="top">
                                                            {/* Keep Tag for vouchers as per original behavior */}
                                                            <svg className="w-4 h-4 text-gray-400" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M20 12c0 4.418-3.582 8-8 8s-8-3.582-8-8 3.582-8 8-8 8 3.582 8 8zm-9-4h2v2h-2V8zm0 4h2v6h-2v-6z" /></svg>
                                                        </Tooltip>
                                                    </td>
                                                </tr>
                                            );
                                        })}
                                </tbody>
                            </table>
                        </div>
                    )}

                    {/* Vouchers - Mobile cards */}
                    {order.line_items && order.line_items.filter(item => item.type === 'voucher').length > 0 && (
                        <div className="lg:hidden space-y-4 mt-6">
                            <h3 className="font-semibold text-lg pb-2 lg:mt-12">Gutscheine</h3>
                            {order.line_items
                                .filter(item => item.type === 'voucher')
                                .map((item) => {
                                    const voucherItem = item as VoucherLineItem;
                                    const isRefunded = voucherItem.refunded === true;
                                    return (
                                    <div key={item.id} className="bg-white border border-gray-200 rounded-lg p-4 shadow-sm">
                                        <div className="flex items-start justify-between mb-1">
                                            <div className="flex-1">
                                                <div className="font-medium flex items-center justify-between mb-2">
                                                    {voucherItem.name}
                                                    <div className={`font-medium text-lg text-black whitespace-nowrap ${isRefunded ? 'line-through opacity-60' : ''}`}>{formatPrice(voucherItem.total_price)}</div>
                                                </div>
                                                <div className="text-sm text-gray-600 mb-1">
                                                    {voucherItem.quantity}x {voucherItem.voucher_product_type === 'digital' ? 'Digital' : 'Gedruckt'} Gutschein {isRefunded ? '(Storniert)' : ''}
                                                </div>
                                            </div>
                                        </div>
                                    </div>
                                    );
                                })}
                        </div>
                    )}
                </div>

                {/* Financial Breakdown */}
                <div className="p-8 bg-darkBlue dark:bg-baseBlue rounded-b-2xl text-white">
                    <div className="flex flex-col gap-5">
                        {order.financial_breakdown && (
                            <>
                                <div className="flex justify-between text-sm">
                                    <span>Zwischensumme:</span>
                                    <span className="whitespace-nowrap">{formatPrice(order.financial_breakdown.subtotal)}</span>
                                </div>
                                {order.financial_breakdown.total_system_fee > 0 ? (
                                    <div className="flex justify-between text-xs -mt-2">
                                        <span>inkl. Systemgebühr:</span>
                                        <span className="whitespace-nowrap">{formatPrice(order.financial_breakdown.total_system_fee)}</span>
                                    </div>
                                ) : null}
                                {order.line_items && order.line_items.filter(item => item.type === 'coupon' && !item.is_voucher).length > 0 ? (
                                    <div className="space-y-1">
                                        {order.line_items
                                            .filter(item => item.type === 'coupon' && !item.is_voucher)
                                            .map((item) => {
                                                const couponItem = item as CouponLineItem;
                                                const isVoucher = couponItem.is_voucher || couponItem.coupon_snapshot?.is_voucher;
                                                const label = isVoucher ? 'Gutschein' : 'Rabattcode';
                                                const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                                return (
                                                    <div key={couponItem.id} className={`flex justify-between text-xs text-gray-300 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                        <span>→ {label}: {couponItem.coupon_code}</span>
                                                        <span className="whitespace-nowrap">- {formatPrice(Math.abs(couponItem.total_price))}</span>
                                                    </div>
                                                );
                                            })
                                        }
                                    </div>
                                ) : null}
                                {order.financial_breakdown.delivery_fee && order.financial_breakdown.delivery_fee > 0 ? (
                                    <div className="flex justify-between text-sm">
                                        <span>zzgl.Liefergebühr:</span>
                                        <span className="whitespace-nowrap">{formatPrice(order.financial_breakdown.delivery_fee)}</span>
                                    </div>
                                ) : null}
                                {order.financial_breakdown.vat_breakdown && order.financial_breakdown.vat_breakdown.length > 0 ? (
                                    <div className="space-y-1">
                                        {order.financial_breakdown.vat_breakdown.map((vatItem, index) => (
                                            <div key={index} className="flex justify-between text-[10px]">
                                                <span>inkl. MwSt. {vatItem.rate}%:</span>
                                                <span className="whitespace-nowrap">{formatPrice(vatItem.amount)}</span>
                                            </div>
                                        ))}
                                    </div>
                                ) : null}
                                {(!order.financial_breakdown.vat_breakdown || order.financial_breakdown.vat_breakdown.length === 0) ? (
                                    <div className="flex justify-between text-[10px]">
                                        <span>inkl. MwSt.:</span>
                                        <span className="whitespace-nowrap">{formatPrice(order.financial_breakdown.total_vat)}</span>
                                    </div>
                                ) : null}
                            </>
                        )}
                        {order.financial_breakdown?.invoice_total && (
                            <div className="flex justify-between items-center pt-4">
                                <span className="text-base font-medium">Rechnungsbetrag:</span>
                                <span className="text-base font-medium whitespace-nowrap">{formatPrice(order.financial_breakdown?.invoice_total)}</span>
                            </div>
                        )}

                        {order.line_items && order.line_items.filter(item => item.type === 'coupon' && item.is_voucher).length > 0 ? (
                            <div className="space-y-1">
                                {order.line_items
                                    .filter(item => item.type === 'coupon' && item.is_voucher)
                                    .map((item) => {
                                        const couponItem = item as CouponLineItem;
                                        const label = 'Gutschein';
                                        const isRefunded = (couponItem as unknown as { refunded?: boolean }).refunded === true;
                                        const remainingBalance = couponItem.voucher_remaining_balance ? formatPrice(couponItem.voucher_remaining_balance) : '0';
                                        return (
                                            <div key={couponItem.id} className={`flex justify-between text-xs text-gray-300 ${isRefunded ? 'line-through opacity-60' : ''}`}>
                                                <span>→ {label}: {couponItem.coupon_code} (Restguthaben: {remainingBalance})</span>
                                                <span className="whitespace-nowrap">- {formatPrice(Math.abs(couponItem.total_price))}</span>
                                            </div>
                                        );
                                    })
                                }
                            </div>
                        ) : null}
                        <div className="flex justify-between items-center pt-6 border-t border-gray-300">
                            <span className="text-lg font-semibold">Gesamtbetrag:</span>
                            <span className="text-xl font-semibold whitespace-nowrap">{formatPrice(order.total_amount)}</span>
                        </div>

                        {/* Refund history overview */}
                        {order.financial_breakdown_history && order.financial_breakdown_history.length > 1 && (
                            <div className="mt-6 space-y-3">
                                <div className="text-sm font-medium">Storno-Verlauf</div>
                                <div className="space-y-3 text-xs text-gray-200">
                                    {/* display history, leaving out the first item (initial order breakdown) */}
                                    {order.financial_breakdown_history.slice(1).map((snap, idx) => {
                                        const fullHistory = order.financial_breakdown_history || [];
                                        const prev = fullHistory[idx];
                                        const fmt = (n: number) => formatPrice(n);
                                        const delta = (a: number, b: number) => b - a;
                                        const deltaSubtotal = delta(Number(prev?.subtotal ?? 0), Number(snap.subtotal));
                                        const deltaDiscount = delta(Number(prev?.total_discount ?? 0), Number(snap.total_discount));
                                        const deltaVoucher = delta(Number(prev?.voucher_payments ?? 0), Number(snap.voucher_payments));
                                        const deltaDelivery = delta(Number(prev?.delivery_fee ?? 0), Number(snap.delivery_fee ?? 0));
                                        const deltaSystemFee = delta(Number(prev?.total_system_fee ?? 0), Number(snap.total_system_fee ?? 0));
                                        const deltaVat = delta(Number(prev?.total_vat ?? 0), Number(snap.total_vat ?? 0));
                                        const deltaTotal = delta(Number(prev?.total_amount ?? 0), Number(snap.total_amount));
                                        const refundedStep = Math.max(0, Number(prev?.total_amount ?? 0) - Number(snap.total_amount));
                                        const initialTotal = Number(fullHistory[0]?.total_amount ?? 0);
                                        const cumulativeRefunded = Math.max(0, initialTotal - Number(snap.total_amount));
                                        const arrow = <span className="opacity-70">→</span>;
                                        const showIfChanged = (label: string, oldVal: number, newVal: number, deltaVal: number) => (
                                            deltaVal !== 0 ? (
                                                <span className="inline-flex items-center gap-1">
                                                    {label}: {fmt(oldVal)} {arrow} {fmt(newVal)} (<span className={deltaVal < 0 ? 'text-red-200' : 'text-green-200'}>{deltaVal < 0 ? '' : '+'}{fmt(deltaVal)}</span>)
                                                </span>
                                            ) : null
                                        );
                                        return (
                                            <div key={idx} className="space-y-1">
                                                <div className="flex items-center gap-2">
                                                    <span className="inline-block px-2 py-0.5 rounded bg-white/10">Schritt {idx + 1}</span>
                                                    <span className="opacity-80">{new Date(snap.timestamp).toLocaleString('de-DE')}</span>
                                                </div>
                                                <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2 md:gap-4">
                                                    <div className="flex flex-wrap gap-3">
                                                        <span className="inline-flex items-center gap-1 font-medium">
                                                            Gesamt: {fmt(Number(prev?.total_amount ?? 0))} {arrow} {fmt(Number(snap.total_amount))} (<span className={deltaTotal < 0 ? 'text-red-200' : 'text-green-200'}>{deltaTotal < 0 ? '' : '+'}{fmt(deltaTotal)}</span>)
                                                        </span>
                                                        <span className="inline-flex items-center gap-1">Erstattet (Schritt): {fmt(refundedStep)}</span>
                                                        <span className="inline-flex items-center gap-1">Erstattet (kumuliert): {fmt(cumulativeRefunded)}</span>
                                                    </div>
                                                    <div className="flex flex-wrap gap-3 opacity-90">
                                                        {showIfChanged('Zwischensumme', Number(prev?.subtotal ?? 0), Number(snap.subtotal), deltaSubtotal)}
                                                        {showIfChanged('Rabatte', Number(prev?.total_discount ?? 0), Number(snap.total_discount), deltaDiscount)}
                                                        {showIfChanged('Gutscheine', Number(prev?.voucher_payments ?? 0), Number(snap.voucher_payments), deltaVoucher)}
                                                        {showIfChanged('Liefergebühr', Number(prev?.delivery_fee ?? 0), Number(snap.delivery_fee ?? 0), deltaDelivery)}
                                                        {showIfChanged('Systemgebühr', Number(prev?.total_system_fee ?? 0), Number(snap.total_system_fee ?? 0), deltaSystemFee)}
                                                        {showIfChanged('MwSt.', Number(prev?.total_vat ?? 0), Number(snap.total_vat ?? 0), deltaVat)}
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            </div>
                        )}


                        {typeof order.original_total_amount !== 'undefined' && Number(order.original_total_amount) !== Number(order.total_amount) && (
                            <div className="mt-6 space-y-3">
                                <div className="text-sm font-medium">Gesamtübersicht</div>
                                <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                                    <div className="bg-white/10 rounded p-3">
                                        <div className="text-xs text-gray-200">Ursprünglicher Gesamtbetrag</div>
                                        <div className="text-lg font-medium whitespace-nowrap">{formatPrice(order.original_total_amount || 0)}</div>
                                    </div>
                                    <div className="bg-white/10 rounded p-3">
                                        <div className="text-xs text-gray-200">Aktueller Zahlbetrag (negativ bei Gutscheinüberzahlung)</div>
                                        <div className="text-lg font-medium whitespace-nowrap">{formatPrice(order.total_amount)}</div>
                                    </div>
                                    <div className="bg-white/10 rounded p-3">
                                        <div className="text-xs text-gray-200">Erstattet gesamt</div>
                                        <div className="text-lg font-medium whitespace-nowrap">{formatPrice(order.total_refunded_amount ?? Math.max(0, Number(order.original_total_amount || 0) - Number(order.total_amount)))}</div>
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                </div>
            </>

            {/* Addresses */}
            {
                (order.billing_address || order.delivery_address) && (
                    <div className="mt-12">
                        <div className="bg-white dark:bg-darkBlue rounded-2xl p-8">
                            <div className={`grid gap-6 ${order.billing_address && order.delivery_address ? 'grid-cols-1 lg:grid-cols-2' : 'grid-cols-1'}`}>
                                {/* Billing Address */}
                                {order.billing_address && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-medium text-black dark:text-white mb-4">
                                            Rechnungsadresse
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="font-medium text-black dark:text-white">
                                                    {order.billing_address.first_name} {order.billing_address.last_name}
                                                </span>
                                            </div>
                                            {order.billing_address.company && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.billing_address.company}
                                                </div>
                                            )}
                                            <div className="text-gray-600 dark:text-gray-400">
                                                {order.billing_address.street}
                                                {order.billing_address.address_add && (
                                                    <span>, {order.billing_address.address_add}</span>
                                                )}
                                            </div>
                                            <div className="text-gray-600 dark:text-gray-400">
                                                {order.billing_address.postcode} {order.billing_address.city}
                                            </div>
                                            {order.billing_address.country_code && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.billing_address.country_code}
                                                </div>
                                            )}
                                            {order.billing_address.phone && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    Tel: {order.billing_address.phone}
                                                </div>
                                            )}
                                            {order.billing_address.email && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.billing_address.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}

                                {/* Delivery Address */}
                                {order.delivery_address && (
                                    <div className="space-y-3">
                                        <h3 className="text-lg font-medium text-black dark:text-white mb-4">
                                            Lieferadresse
                                        </h3>
                                        <div className="space-y-2 text-sm">
                                            <div className="flex flex-wrap gap-2">
                                                <span className="font-medium text-black dark:text-white">
                                                    {order.delivery_address.first_name} {order.delivery_address.last_name}
                                                </span>
                                            </div>
                                            {order.delivery_address.company && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.delivery_address.company}
                                                </div>
                                            )}
                                            <div className="text-gray-600 dark:text-gray-400">
                                                {order.delivery_address.street}
                                                {order.delivery_address.address_add && (
                                                    <span>, {order.delivery_address.address_add}</span>
                                                )}
                                            </div>
                                            <div className="text-gray-600 dark:text-gray-400">
                                                {order.delivery_address.postcode} {order.delivery_address.city}
                                            </div>
                                            {order.delivery_address.country_code && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.delivery_address.country_code}
                                                </div>
                                            )}
                                            {order.delivery_address.phone && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    Tel: {order.delivery_address.phone}
                                                </div>
                                            )}
                                            {order.delivery_address.email && (
                                                <div className="text-gray-600 dark:text-gray-400">
                                                    {order.delivery_address.email}
                                                </div>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </div>
                        </div>
                    </div>
                )
            }

        </div >
    );
}