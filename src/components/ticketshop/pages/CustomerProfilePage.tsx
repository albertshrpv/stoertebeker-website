import React, { useState, useEffect } from 'react';
import { useAuth } from '../contexts/AuthContext';
import { componentContentPadding, componentContentPaddingX } from '../../../lib/utils';
import { CustomerAddressModal } from '../components/CustomerAddressModal';
import { MainButton } from '../components/MainButton';
import { MainTextInput } from '../components/MainTextInput';
import EditButton from '../components/EditButton';
import type { UpdateCustomerData } from '../types/customer';

export function CustomerProfilePage() {
    const { customer, updateCustomer, logout, isAuthenticated, isLoading } = useAuth();
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [success, setSuccess] = useState<string | null>(null);
    const [showAddressModal, setShowAddressModal] = useState(false);

    const [formData, setFormData] = useState({
        firstName: customer?.first_name || '',
        lastName: customer?.last_name || '',
        email: customer?.email || '',
        phone: customer?.phone || '',
        dateOfBirth: customer?.date_of_birth ? customer.date_of_birth.toISOString().split('T')[0] : ''
    });

    // Redirect helper function
    const redirectToTickets = () => {
        const currentPath = window.location.pathname;
        const isEnglish = currentPath.startsWith('/en/');
        const ticketsPath = isEnglish ? '/en/shop' : '/de/shop';
        // console.log('🔄 Redirecting to tickets page:', {
        //     currentPath,
        //     isEnglish,
        //     ticketsPath
        // });
        window.location.href = ticketsPath;
    };

    // Handle authentication state changes (mainly for debugging now that ProtectedRoute handles auth)
    useEffect(() => {
        // console.log('🔍 CustomerProfilePage Auth State:', {
        //     isLoading,
        //     isAuthenticated,
        //     customer: customer ? `Customer ID: ${customer.id}` : 'null',
        //     customerExists: !!customer
        // });
    }, [isAuthenticated, customer, isLoading]);

    const handleSave = async () => {
        if (!customer) return;

        setIsSaving(true);
        setError(null);
        setSuccess(null);

        try {
            const updateData: UpdateCustomerData = {
                first_name: formData.firstName,
                last_name: formData.lastName,
                email: formData.email,
                phone: formData.phone,
                date_of_birth: formData.dateOfBirth ? new Date(formData.dateOfBirth).toISOString().split('T')[0] : undefined
            };

            await updateCustomer(updateData);
            setIsEditing(false);
            setSuccess('Profil erfolgreich aktualisiert');
        } catch (err) {
            setError(err instanceof Error ? err.message : 'Fehler beim Speichern');
        } finally {
            setIsSaving(false);
        }
    };

    // Handle logout with redirect
    const handleLogout = () => {
        // console.log('🚪 Logout button clicked, logging out and redirecting...');
        logout();
        redirectToTickets();
    };

    // ProtectedRoute handles authentication, but we still need to check for customer data
    if (!customer) {
        return (
            <div className="min-h-screen flex items-center justify-center">
                <div className="text-center">
                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-600 mx-auto mb-4"></div>
                    <p className="text-gray-600">Lade Profil...</p>
                </div>
            </div>
        );
    }

    return (
        <div className="min-h-screen bg-gray-50">
            <div className='w-full bg-darkBlue'>
                <div className={`w-full max-w-screen-2xl mx-auto ${componentContentPaddingX} py-5 text-white flex items-center justify-between`}>
                    <div className='hidden lg:block font-medium text-xl'>
                        Guten Tag {customer?.first_name} {customer?.last_name}
                    </div>
                    <div className='w-full lg:w-auto flex items-center justify-center gap-4'>
                        <button
                            className='bg-darkBlue border-[1.5px] border-white text-white hover:bg-white hover:text-darkBlue transition-colors duration-300 font-medium text-xs lg:text-sm rounded-full px-6 py-2'
                            onClick={() => {
                                window.location.href = window.location.pathname.startsWith('/en/') ? '/en/shop/account/orders' : '/de/shop/konto/bestellungen';
                            }}
                        >
                            Meine Bestellungen
                        </button>
                        <button
                            className='bg-white text-darkBlue font-medium text-xs lg:text-sm rounded-full px-4 lg:px-6 py-2'
                            disabled
                        >
                            Persönliche Daten
                        </button>
                    </div>
                </div>
            </div>
            <div className={`max-w-screen-2xl mx-auto ${componentContentPadding}`}>
                <div className="mb-6 lg:mb-24">
                    <h1 className="text-xl md:text-2xl lg:text-4xl font-medium mb-4">Mein Profil</h1>
                </div>

                <div className="bg-white rounded-2xl p-8">
                    <div className="flex justify-between items-center mb-8">
                        <h2 className="text-lg md:text-xl lg:text-2xl font-medium text-black dark:text-white">Persönliche Daten</h2>
                        {/* <div className="flex gap-3">
                            {!isEditing ? (
                                <EditButton onClick={() => setIsEditing(true)} />
                            ) : (
                                <>
                                    <MainButton
                                        style="secondary"
                                        handleClick={handleCancel}
                                        label="Abbrechen"
                                        size="small"
                                    />
                                    <MainButton
                                        style="primary"
                                        handleClick={handleSave}
                                        label={isSaving ? 'Speichere...' : 'Speichern'}
                                        size="small"
                                        disabled={isSaving}
                                    />
                                </>
                            )}
                        </div> */}
                    </div>

                    {error && (
                        <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg text-red-700">
                            {error}
                        </div>
                    )}

                    {success && (
                        <div className="mb-6 p-4 bg-green-50 border border-green-200 rounded-lg text-green-700">
                            {success}
                        </div>
                    )}

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                        <div>
                            {isEditing ? (
                                <MainTextInput
                                    type="text"
                                    value={formData.firstName}
                                    onChange={(value) => setFormData(prev => ({ ...prev, firstName: value }))}
                                    label="Vorname"
                                    required
                                />
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Vorname
                                    </label>
                                    <p className="text-black py-2">{customer.first_name}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            {isEditing ? (
                                <MainTextInput
                                    type="text"
                                    value={formData.lastName}
                                    onChange={(value) => setFormData(prev => ({ ...prev, lastName: value }))}
                                    label="Nachname"
                                    required
                                />
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Nachname
                                    </label>
                                    <p className="text-black py-2">{customer.last_name}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            {isEditing ? (
                                <MainTextInput
                                    type="email"
                                    value={formData.email}
                                    onChange={(value) => setFormData(prev => ({ ...prev, email: value }))}
                                    label="E-Mail"
                                    required
                                />
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        E-Mail
                                    </label>
                                    <p className="text-black py-2">{customer.email}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            {isEditing ? (
                                <MainTextInput
                                    type="tel"
                                    value={formData.phone}
                                    onChange={(value) => setFormData(prev => ({ ...prev, phone: value }))}
                                    label="Telefon"
                                />
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Telefon
                                    </label>
                                    <p className="text-black py-2">{customer.phone || 'Nicht angegeben'}</p>
                                </div>
                            )}
                        </div>

                        <div>
                            {isEditing ? (
                                <MainTextInput
                                    type="date"
                                    value={formData.dateOfBirth}
                                    onChange={(value) => setFormData(prev => ({ ...prev, dateOfBirth: value }))}
                                    label="Geburtsdatum"
                                />
                            ) : (
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-2">
                                        Geburtsdatum
                                    </label>
                                    <p className="text-black py-2">
                                        {customer.date_of_birth
                                            ? customer.date_of_birth.toLocaleDateString('de-DE')
                                            : 'Nicht angegeben'
                                        }
                                    </p>
                                </div>
                            )}
                        </div>
                    </div>

                    <div className="mt-8 pt-6 border-t border-gray-200 dark:border-gray-600">
                        <div className="flex flex-col sm:flex-row gap-4 justify-between items-start">
                            <MainButton
                                style="primary"
                                handleClick={() => setShowAddressModal(true)}
                                label="Adressen verwalten"
                                size="small"
                            />
                            <MainButton
                                style="secondary"
                                handleClick={handleLogout}
                                label="Abmelden"
                                size="small"
                            />
                        </div>
                    </div>
                </div>

                {/* Address Management Section */}
                {customer && customer.addresses && customer.addresses.length > 0 && (
                    <div className="bg-white rounded-2xl p-8 mt-12">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-lg md:text-xl lg:text-2xl font-medium">Ihre Adressen</h2>
                            <EditButton onClick={() => setShowAddressModal(true)} />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            {customer.addresses.map((address) => (
                                <div key={address.id} className="border border-gray-200 rounded-lg p-4">
                                    <div className="flex justify-between items-start">
                                        <div>
                                            <div className="flex items-center gap-2 mb-2">
                                                <h3 className="font-medium text-black">{address.name}</h3>
                                                {address.is_default ? (
                                                    <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                        Standard
                                                    </span>
                                                ) : null}
                                            </div>
                                            <div className="text-sm text-gray-600 space-y-1">
                                                <p>{address.first_name} {address.last_name}</p>
                                                {address.company && <p>{address.company}</p>}
                                                <p>{address.street}</p>
                                                {address.address_add && <p>{address.address_add}</p>}
                                                <p>{address.postcode} {address.city}</p>
                                                <p>{address.country_code}</p>
                                            </div>
                                        </div>
                                    </div>
                                </div>
                            ))}
                        </div>
                    </div>
                )}

                {/* Address Modal */}
                {customer && (
                    <CustomerAddressModal
                        isOpen={showAddressModal}
                        onClose={() => setShowAddressModal(false)}
                        customer={customer}
                    />
                )}
            </div>
        </div>
    );
}
