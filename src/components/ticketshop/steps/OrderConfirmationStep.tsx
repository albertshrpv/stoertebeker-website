import React, { useEffect, useState } from 'react';
import { useBooking } from '../contexts/BookingContext';
import { componentContentPadding } from '../../../lib/utils';
import {
  adyenPaymentService,
  type AdyenSessionResponse
} from '../services/adyenPaymentService';
import { AdyenCheckout, Dropin } from '@adyen/adyen-web/auto';

// Import Adyen CSS
import '@adyen/adyen-web/styles/adyen.css';
import { useAuth } from '../contexts/AuthContext';
import OrderOverview from '../components/OrderOverview';
import { PUBLIC_ADYEN_CLIENT_KEY, PUBLIC_ADYEN_ENVIRONMENT } from '../../../environment';
import type { OrderData, PaymentDeadlineType } from '../types/order';


export function OrderConfirmationStep() {
  const { state } = useBooking();
  const [error, setError] = useState<string | null>(null);

  // Get order data from placedOrderSnapshot
  const order: OrderData | null = state.placedOrderSnapshot;

  // Adyen state
  const [adyenSessionData, setAdyenSessionData] = useState<AdyenSessionResponse | null>(null);
  const [isCreatingSession, setIsCreatingSession] = useState(false);
  const [paymentStatus, setPaymentStatus] = useState<'pending' | 'success' | 'failed'>('pending');

  const { customer, isAuthenticated, isLoading } = useAuth();

  // Check if this is an Adyen payment based on the order snapshot
  useEffect(() => {
    if (order) {
      const paymentMethodKey = order.payment_method_snapshot?.payment_method.key;
      if (paymentMethodKey === 'adyen-online') {
        if (order.payment_status === 'paid') {
          setPaymentStatus('success');
        } else if (order.payment_status === 'failed') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }
      } else {
        if (order.payment_status === 'paid') {
          setPaymentStatus('success');
        } else if (order.payment_status === 'failed') {
          setPaymentStatus('failed');
        } else {
          setPaymentStatus('pending');
        }
      }
    }
  }, [order]);

  // Create Adyen session when needed
  useEffect(() => {
    const paymentMethodKey = order?.payment_method_snapshot?.payment_method.key;
    const isAdyenPayment = paymentMethodKey === 'adyen-online';
    if (isAdyenPayment && order && paymentStatus === 'pending' && !adyenSessionData && !isCreatingSession) {
      createAdyenSession();
    }
  }, [order, paymentStatus, adyenSessionData, isCreatingSession]);

  const createAdyenSession = async () => {
    if (!order) return;

    setIsCreatingSession(true);
    try {
      const sessionData = await adyenPaymentService.createSession({
        orderId: order.id
      });

      setAdyenSessionData(sessionData);

      const adyenConfig = getAdyenConfig();
      const checkout = await AdyenCheckout({
        environment: adyenConfig.environment,
        clientKey: adyenConfig.clientKey,
        session: {
          id: sessionData.sessionId,
          sessionData: sessionData.sessionData,
        },
        onPaymentCompleted: (result, component) => {
          // console.log('🎉 Payment completed:', result);

          // Check Adyen's result code to determine payment status
          if (result.resultCode === 'Authorised') {
            setPaymentStatus('success');
          } else if (result.resultCode === 'Refused' || result.resultCode === 'Error') {
            setPaymentStatus('failed');
            setError('Zahlung fehlgeschlagen');
          } else {
            // Handle other result codes like 'Pending', 'Cancelled', etc.
            setPaymentStatus('failed');
            setError(`Zahlungsstatus: ${result.resultCode}`);
          }
        },
        onError: (error, component) => {
          console.error('❌ Payment error:', error);
          setPaymentStatus('failed');
          setError(error.message || 'Zahlung fehlgeschlagen');
        },
        // Add other configurations as needed
      });
      const dropin = new Dropin(checkout).mount('#adyen-dropin');

    } catch (error: any) {
      console.error('Failed to create Adyen session:', error);
      setError(error.message || 'Fehler beim Initialisieren der Zahlung');
    } finally {
      setIsCreatingSession(false);
    }
  };

  const getAdyenConfig = () => ({
    environment: PUBLIC_ADYEN_ENVIRONMENT,
    clientKey: PUBLIC_ADYEN_CLIENT_KEY
  });

  const formatPaymentDeadline = (seconds: number): string => {
    const days = Math.floor(seconds / 86400);
    const hours = Math.floor((seconds % 86400) / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);

    if (days > 0) {
      if (hours > 0 && days < 2) {
        return `${days} ${days === 1 ? 'Tag' : 'Tagen'} und ${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
      }
      return `${days} ${days === 1 ? 'Tag' : 'Tagen'}`;
    }

    if (hours > 0) {
      if (minutes > 0 && hours < 2) {
        return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'} und ${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
      }
      return `${hours} ${hours === 1 ? 'Stunde' : 'Stunden'}`;
    }

    return `${minutes} ${minutes === 1 ? 'Minute' : 'Minuten'}`;
  };

  const renderDeadlineMessage = (deadlineType: PaymentDeadlineType | undefined, deadlineSeconds: number | null | undefined, paymentMethodKey?: string): string | null => {
    if (!deadlineType || deadlineType === 'none' || deadlineSeconds === undefined || deadlineSeconds === null) {
      return null;
    }

    // Subtract 4 days (345600 seconds) for bank-transfer payments (internal buffer)
    let adjustedDeadlineSeconds = deadlineSeconds;
    if (paymentMethodKey === 'bank-transfer') {
      adjustedDeadlineSeconds = Math.max(0, deadlineSeconds - 345600); // 4 days in seconds
    }

    const formattedTime = formatPaymentDeadline(adjustedDeadlineSeconds);

    if (deadlineType === 'after_order_date') {
      return `Sollte die Zahlung nach ${formattedTime} nicht abgeschlossen werden, wird die Bestellung automatisch storniert und Ihre ausgewählten Tickets werden wieder freigegeben.`;
    }

    if (deadlineType === 'before_show_date') {
      return `Die Zahlung muss spätestens ${formattedTime} vor der Vorstellung abgeschlossen werden, damit die Bestellung nicht automatisch storniert wird.`;
    }

    return null;
  };

  const renderPaymentSection = () => {
    if (!order) return null;
    const paymentMethodKey = order.payment_method_snapshot?.payment_method.key;
    const isAdyenPayment = paymentMethodKey === 'adyen-online';
    const paymentSnapshot = order.payment_method_snapshot;
    const deadlineType = paymentSnapshot?.payment_deadline_type;
    const deadlineSeconds = paymentSnapshot?.payment_deadline_seconds;
    const deadlineMessage = renderDeadlineMessage(deadlineType, deadlineSeconds, paymentMethodKey);

    switch (paymentMethodKey) {
      case 'adyen-online':
        return (
          <>
            <h1 className="text-3xl font-semibold mb-2">Zahlung abschließen</h1>
            <p className="mb-4">
              Bitte schließen Sie Ihre Zahlung ab, um die Bestellung abzuschließen.
              {deadlineMessage && <> {deadlineMessage}</>}
            </p>

            {isAdyenPayment && paymentStatus === 'pending' && (
              <div className="mb-8">
                {isCreatingSession && (
                  <div className="flex items-center justify-center py-8">
                    <div className="animate-spin rounded-full h-8 w-8"></div>
                    <span className="ml-3 text-darkBlue">Zahlungsformular wird geladen...</span>
                  </div>
                )}

                {adyenSessionData && getAdyenConfig().clientKey && (
                  <div id="adyen-dropin"></div>
                )}
              </div>
            )}

            {paymentStatus === 'success' && (
              <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-md">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-green-900">Zahlung erfolgreich!</h3>
                    <p className="text-green-800">Ihre Bestellung wurde erfolgreich bezahlt.</p>
                  </div>
                </div>
                {isAuthenticated && customer && (
                  <div className="mt-4">
                    <a
                      href={`/${window.location.pathname.startsWith('/en/') ? 'en/shop/account/orders' : 'de/shop/konto/bestellungen'}/${state.placedOrderNumber}`}
                      className="inline-flex items-center px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Bestellung ansehen
                    </a>
                  </div>
                )}
              </div>
            )}

            {isAdyenPayment && paymentStatus === 'failed' && (
              <div className="mb-8 p-6 bg-red-50 border border-red-200 rounded-md">
                <div className="flex items-center">
                  <svg className="w-6 h-6 text-red-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  <div>
                    <h3 className="text-lg font-semibold text-red-900">Zahlung fehlgeschlagen</h3>
                    <p className="text-red-800">Bitte versuchen Sie es erneut oder wählen Sie eine andere Zahlungsmethode.</p>
                    <button
                      onClick={() => {
                        setPaymentStatus('pending');
                        setError(null);
                        createAdyenSession();
                      }}
                      className="mt-3 px-4 py-2 bg-red-100 text-red-800 rounded-md hover:bg-red-200"
                    >
                      Erneut versuchen
                    </button>
                  </div>
                </div>
              </div>
            )}
          </>
        );

      case 'bank-transfer':
        return (
          <>
            <h1 className="text-3xl font-semibold mb-2">Zahlung per Überweisung</h1>
            <p className="mb-4">
              Bitte überweisen Sie den Rechnungsbetrag.
              {deadlineMessage && <> {deadlineMessage}</>}
            </p>
            <div className="mb-8 p-6 bg-white rounded-2xl">
              <div className="mt-4 bg-gray-50 rounded-md p-6 text-base">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  <div className="">Empfänger</div>
                  <div className="font-medium text-black">Störtebeker Festspiele GmbH & Co. KG</div>
                  <div className="">IBAN</div>
                  <div className="font-medium text-black">DE23 1505 0500 0833 0018 09</div>
                  <div className="">BIC</div>
                  <div className="font-medium text-black">NOLADE21GRW</div>
                  <div className="">Bank</div>
                  <div className="font-medium text-black">Sparkasse Vorpommern</div>
                  <div className="">Verwendungszweck</div>
                  <div className="font-medium text-black">Bestellnummer #{state.placedOrderNumber ?? '—'}</div>
                </div>
              </div>
            </div>
          </>
        );

      case 'voucher-payment':
        return (
          <>
            <h1 className="text-3xl font-semibold mb-2">Bestellung abgeschlossen</h1>
            <p className="mb-4">
              Die Bezahlung erfolgte mittels Gutschein. Es sind keine weiteren Schritte erforderlich.
            </p>
            <div className="mb-8 p-6 bg-green-50 border border-green-200 rounded-md">
              <div className="flex items-center">
                <svg className="w-6 h-6 text-green-600 mr-3" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                <div>
                  <h3 className="text-lg font-semibold text-green-900">Zahlung mit Gutschein abgeschlossen</h3>
                  <p className="text-green-800">Die Bezahlung erfolgte mittels Gutschein. Es sind keine weiteren Schritte erforderlich.</p>
                </div>
              </div>
            </div>
          </>
        );

      default:
        return (
          <>
            <h1 className="text-3xl font-semibold mb-2">Zahlung</h1>
            <p className="mb-4">
              Bitte wenden Sie sich an den Support oder versuchen Sie es erneut.
            </p>
            <div className="mb-8 p-6 bg-yellow-50 border border-yellow-200 rounded-md">
              <h3 className="text-lg font-semibold text-yellow-900">Unbekannte Zahlungsart</h3>
              <p className="text-yellow-800">Bitte wenden Sie sich an den Support oder versuchen Sie es erneut.</p>
            </div>
          </>
        );
    }
  };


  return (
    <div className="bg-gray-50">
      <div className={`max-w-screen-2xl mx-auto ${componentContentPadding}`}>
        <p className="mb-8">
          Bestellnummer: <span className="font-semibold">#{state.placedOrderNumber ?? '—'}</span>
        </p>

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
            {error}
          </div>
        )}

        {/* Payment-specific content */}
        {renderPaymentSection()}

        {/* Order Summary at bottom */}
        {order && (
          <div className="space-y-8">
            <OrderOverview order={order} />
          </div>
        )}
      </div>
    </div>
  );
}
