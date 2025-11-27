import React, { useState, useEffect } from 'react';
import type { AuthenticatedCustomer } from '../types/customerAuth';
import type { CreateCustomerAddressData, UpdateCustomerAddressData, AddressData } from '../types/customer';
import { customerAuthApi } from '../api/customerAuth';
import { useAuth } from '../contexts/AuthContext';
import { MainButton } from './MainButton';
import { MainTextInput } from './MainTextInput';
import EditButton from './EditButton';
import { MainSelect } from './MainSelect';
import { ALL_COUNTRIES } from '../utils/countries';

interface CustomerAddressModalProps {
    isOpen: boolean;
    onClose: () => void;
    customer: AuthenticatedCustomer;
    // Optional props for address selection mode (used in CheckoutStep)
    parentSelectedAddressName?: string | null;
    onSelectedAddressChange?: (addressName: string) => void;
}

interface AddressFormData {
    name: string;
    is_default: boolean;
    first_name: string;
    last_name: string;
    company: string;
    street: string;
    address_add: string;
    postcode: string;
    city: string;
    country_code: string;
}

const COUNTRY_OPTIONS = ALL_COUNTRIES.map(country => ({
    value: country.code,
    label: country.name
}));

export function CustomerAddressModal({ 
    isOpen, 
    onClose, 
    customer, 
    parentSelectedAddressName, 
    onSelectedAddressChange 
}: CustomerAddressModalProps) {
    const [addresses, setAddresses] = useState<(AddressData | CreateCustomerAddressData | UpdateCustomerAddressData)[]>([]);
    const [showAddEditModal, setShowAddEditModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    const { updateCustomer } = useAuth();

    // Determine if we're in selection mode (when parent component provides selection props)
    const isSelectionMode = parentSelectedAddressName !== undefined && onSelectedAddressChange !== undefined;
    
    // Local state for tracking the currently selected address in the modal
    const [localSelectedAddressName, setLocalSelectedAddressName] = useState<string | null>(parentSelectedAddressName || null);

    const [formData, setFormData] = useState<AddressFormData>({
        name: '',
        is_default: false,
        first_name: '',
        last_name: '',
        company: '',
        street: '',
        address_add: '',
        postcode: '',
        city: '',
        country_code: 'DE',
    });
    const [formErrors, setFormErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

    // Initialize addresses from customer data
    useEffect(() => {
        if (customer) {
            setAddresses([...customer.addresses]);
        }
    }, [customer]);

    const resetForm = () => {
        setFormData({
            name: '',
            is_default: false,
            first_name: customer.first_name,
            last_name: customer.last_name,
            company: '',
            street: '',
            address_add: '',
            postcode: '',
            city: '',
            country_code: 'DE',
        });
        setFormErrors({});
        setEditingIndex(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowAddEditModal(true);
    };

    const openEditModal = (index: number) => {
        const address = addresses[index];
        setFormData({
            name: address.name || '',
            is_default: address.is_default || false,
            first_name: address.first_name || '',
            last_name: address.last_name || '',
            company: address.company || '',
            street: address.street || '',
            address_add: address.address_add || '',
            postcode: address.postcode || '',
            city: address.city || '',
            country_code: address.country_code || 'DE',
        });
        setEditingIndex(index);
        setFormErrors({});
        setShowAddEditModal(true);
    };


    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Adressname ist erforderlich';
        }
        if (!formData.first_name.trim()) {
            newErrors.first_name = 'Vorname ist erforderlich';
        }
        if (!formData.last_name.trim()) {
            newErrors.last_name = 'Nachname ist erforderlich';
        }
        if (!formData.street.trim()) {
            newErrors.street = 'Straße ist erforderlich';
        }
        if (!formData.postcode.trim()) {
            newErrors.postcode = 'Postleitzahl ist erforderlich';
        }
        if (!formData.city.trim()) {
            newErrors.city = 'Stadt ist erforderlich';
        }
        if (!formData.country_code) {
            newErrors.country_code = 'Land ist erforderlich';
        }

        setFormErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSaveAddress = () => {
        if (!validateForm()) {
            return;
        }

        const addressData: CreateCustomerAddressData | UpdateCustomerAddressData = {
            name: formData.name.trim(),
            is_default: formData.is_default,
            first_name: formData.first_name.trim(),
            last_name: formData.last_name.trim(),
            company: formData.company.trim() || undefined,
            street: formData.street.trim(),
            address_add: formData.address_add.trim() || undefined,
            postcode: formData.postcode.trim(),
            city: formData.city.trim(),
            country_code: formData.country_code,
        };

        const newAddresses = [...addresses];

        if (editingIndex !== null) {
            // Editing existing address
            const existingAddress = addresses[editingIndex];
            if ('id' in existingAddress && existingAddress.id) {
                // Existing address from API - preserve the id
                newAddresses[editingIndex] = {
                    ...addressData,
                    id: existingAddress.id,
                    _delete: false,
                } as UpdateCustomerAddressData;
            } else {
                // Newly created address - no id yet
                newAddresses[editingIndex] = addressData;
            }
        } else {
            // Adding new address
            newAddresses.push(addressData);
        }

        // If this address is set as default, unset all others
        if (formData.is_default) {
            for (let i = 0; i < newAddresses.length; i++) {
                if (i !== (editingIndex !== null ? editingIndex : newAddresses.length - 1)) {
                    newAddresses[i] = { ...newAddresses[i], is_default: false };
                }
            }
        }

        setAddresses(newAddresses);
        setShowAddEditModal(false);
        
        // In selection mode, auto-select the newly added address
        if (isSelectionMode && editingIndex === null) {
            setLocalSelectedAddressName(formData.name.trim());
        }
        
        resetForm();
    };

    const handleDeleteAddress = (index: number) => {
        const newAddresses = [...addresses];
        const address = addresses[index];

        if ('id' in address && address.id) {
            // Existing address from API - mark for deletion
            newAddresses[index] = {
                ...address,
                _delete: true,
            } as UpdateCustomerAddressData;
        } else {
            // Newly created address - remove completely
            newAddresses.splice(index, 1);
        }

        setAddresses(newAddresses);
    };

    const handleUndoDelete = (index: number) => {
        const newAddresses = [...addresses];
        const address = addresses[index];

        if ('id' in address && address.id) {
            newAddresses[index] = {
                ...address,
                _delete: false,
            } as UpdateCustomerAddressData;
        }

        setAddresses(newAddresses);
    };



    const handleSaveChanges = async () => {
        setIsLoading(true);
        setError(null);

        try {
            // Convert our working addresses to the format expected by the API
            const addressUpdates: UpdateCustomerAddressData[] = addresses.map(addr => {
                if ('id' in addr && addr.id) {
                    // Existing address - include all fields for update
                    return {
                        id: addr.id,
                        name: addr.name,
                        is_default: addr.is_default,
                        first_name: addr.first_name,
                        last_name: addr.last_name,
                        company: addr.company,
                        street: addr.street,
                        address_add: addr.address_add,
                        postcode: addr.postcode,
                        city: addr.city,
                        country_code: addr.country_code,
                        _delete: '_delete' in addr ? addr._delete : false,
                    };
                } else {
                    // New address - no id
                    return {
                        name: addr.name,
                        is_default: addr.is_default,
                        first_name: addr.first_name,
                        last_name: addr.last_name,
                        company: addr.company,
                        street: addr.street,
                        address_add: addr.address_add,
                        postcode: addr.postcode,
                        city: addr.city,
                        country_code: addr.country_code,
                    };
                }
            });

            await updateCustomer({
                addresses: addressUpdates,
            });

            // In selection mode, also update the selected address if one is chosen
            if (isSelectionMode && localSelectedAddressName && onSelectedAddressChange) {
                onSelectedAddressChange(localSelectedAddressName);
            }

            onClose();
        } catch (error) {
            console.error('Error updating addresses:', error);
            setError(error instanceof Error ? error.message : 'Fehler beim Speichern der Adressen');
        } finally {
            setIsLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-baseBlue rounded-2xl max-w-4xl w-full mx-4 max-h-[90vh] overflow-y-auto">
                <div className="p-8 border-b border-gray-200 dark:border-gray-600">
                    <h2 className="text-2xl font-medium text-black dark:text-white">
                        {isSelectionMode ? 'Adresse auswählen' : 'Adressen verwalten'}
                    </h2>
                </div>

                <div className="p-8">
                    {error && (
                        <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-md mb-6">
                            {error}
                        </div>
                    )}

                    <div className="flex flex-col lg:flex-row justify-between items-start gap-2 mb-6">
                        <h3 className="text-xl font-medium text-black dark:text-white">
                            Ihre Adressen
                        </h3>
                        <MainButton
                            style="primary"
                            handleClick={openAddModal}
                            label="Adresse hinzufügen"
                            size="small"
                        />
                    </div>

                    {addresses.length === 0 ? (
                        <div className="text-center py-8 text-gray-500">
                            <p>Noch keine Adressen hinzugefügt</p>
                        </div>
                    ) : (
                        <div className="space-y-4">
                            {addresses.map((address, index) => {
                                const isMarkedForDeletion = '_delete' in address && address._delete;

                                return (
                                    <div
                                        key={index}
                                        className={`relative p-4 border rounded-lg transition-colors ${isMarkedForDeletion
                                            ? 'opacity-50 bg-red-50 border-red-200 dark:bg-red-900/20 dark:border-red-400'
                                            : isSelectionMode && localSelectedAddressName === address.name
                                                ? 'border-blue-300 bg-blue-50 dark:bg-blue-900/20 dark:border-blue-400'
                                                : isSelectionMode
                                                    ? 'border-gray-200 dark:border-gray-600 hover:border-blue-200 hover:bg-blue-25 cursor-pointer'
                                                    : 'border-gray-200 dark:border-gray-600 hover:border-gray-300 dark:hover:border-gray-500'
                                            }`}
                                        onClick={() => isSelectionMode && !isMarkedForDeletion && address.name && setLocalSelectedAddressName(address.name)}
                                    >
                                        <div className="flex flex-col lg:flex-row gap-2 justify-between items-start">
                                            <div className="flex-1">
                                                <div className="flex items-center gap-2 mb-2">
                                                    {isSelectionMode && (
                                                        <input
                                                            type="radio"
                                                            name="selectedAddress"
                                                            checked={localSelectedAddressName === address.name}
                                                            onChange={() => !isMarkedForDeletion && address.name && setLocalSelectedAddressName(address.name)}
                                                            disabled={isMarkedForDeletion}
                                                            className="mr-2 pointer-events-none"
                                                        />
                                                    )}
                                                    <h4 className={`font-medium text-black dark:text-white ${isMarkedForDeletion ? 'line-through' : ''}`}>
                                                        {address.name}
                                                    </h4>
                                                    {(address.is_default && !isMarkedForDeletion) ? (
                                                        <span className="px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                                                            Standard
                                                        </span>
                                                    ) : null}
                                                    {isMarkedForDeletion ? (
                                                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded-full">
                                                            Zur Löschung vorgemerkt
                                                        </span>
                                                    ) : null}
                                                </div>
                                                <div className={`text-sm text-gray-600 dark:text-gray-300 space-y-1 ${isMarkedForDeletion ? 'line-through' : ''}`}>
                                                    <p>{address.first_name} {address.last_name}</p>
                                                    {address.company && <p>{address.company}</p>}
                                                    <p>{address.street}</p>
                                                    {address.address_add && <p>{address.address_add}</p>}
                                                    <p>{address.postcode} {address.city}</p>
                                                    <p>{COUNTRY_OPTIONS.find(c => c.value === address.country_code)?.label || address.country_code}</p>
                                                </div>
                                            </div>
                                            <div className="flex items-center space-x-2" onClick={(e) => e.stopPropagation()}>
                                                {!isMarkedForDeletion && (
                                                    <EditButton
                                                        onClick={() => openEditModal(index)}
                                                    />
                                                )}
                                                {isMarkedForDeletion ? (
                                                    <MainButton
                                                        style="secondary"
                                                        handleClick={() => handleUndoDelete(index)}
                                                        label="Wiederherstellen"
                                                        size="small"
                                                    />
                                                    
                                                ) : (
                                                    <MainButton
                                                        style="secondary"
                                                        handleClick={() => handleDeleteAddress(index)}
                                                        label="Löschen"
                                                        size="small"
                                                    />
                                                )}
                                            </div>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>

                <div className="flex flex-col lg:flex-row justify-end gap-3 p-8 border-t border-gray-200 dark:border-gray-600">
                    <MainButton
                        style="secondary"
                        handleClick={onClose}
                        label="Abbrechen"
                        size="small"
                        disabled={isLoading}
                    />
                    <MainButton
                        style="primary"
                        handleClick={handleSaveChanges}
                        label={isLoading ? "Speichere..." : "Änderungen speichern"}
                        size="small"
                        disabled={isLoading}
                    />
                </div>

                {/* Add/Edit Address Modal */}
                {showAddEditModal && (
                    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-60">
                        <div className="bg-white dark:bg-baseBlue rounded-2xl max-w-lg w-full mx-4 max-h-[90vh] overflow-y-auto">
                            <div className="p-8 border-b border-gray-200 dark:border-gray-600">
                                <h3 className="text-xl font-medium text-black dark:text-white">
                                    {editingIndex !== null ? 'Adresse bearbeiten' : 'Neue Adresse hinzufügen'}
                                </h3>
                            </div>

                            <div className="p-8 space-y-4 lg:space-y-6">
                                {/* Address Name */}
                                <MainTextInput
                                    type="text"
                                    value={formData.name}
                                    onChange={(value) => setFormData(prev => ({ ...prev, name: value }))}
                                    label="Adressname"
                                    placeholder="z.B. Zuhause, Büro"
                                    required
                                    error={formErrors.name}
                                />

                                {/* Is Default */}
                                <div className="flex items-center">
                                    <input
                                        type="checkbox"
                                        id="is_default"
                                        checked={formData.is_default}
                                        onChange={(e) => setFormData(prev => ({ ...prev, is_default: e.target.checked }))}
                                        className="mr-2"
                                    />
                                    <label htmlFor="is_default" className="text-sm text-gray-700 dark:text-gray-300">
                                        Als Standardadresse festlegen
                                    </label>
                                </div>

                                {/* Name Fields */}
                                <div className="grid grid-cols-2 gap-4">
                                    <MainTextInput
                                        type="text"
                                        value={formData.first_name}
                                        onChange={(value) => setFormData(prev => ({ ...prev, first_name: value }))}
                                        label="Vorname"
                                        required
                                        error={formErrors.first_name}
                                    />
                                    <MainTextInput
                                        type="text"
                                        value={formData.last_name}
                                        onChange={(value) => setFormData(prev => ({ ...prev, last_name: value }))}
                                        label="Nachname"
                                        required
                                        error={formErrors.last_name}
                                    />
                                </div>

                                {/* Company */}
                                <MainTextInput
                                    type="text"
                                    value={formData.company}
                                    onChange={(value) => setFormData(prev => ({ ...prev, company: value }))}
                                    label="Firma"
                                />

                                {/* Address Fields */}
                                <MainTextInput
                                    type="text"
                                    value={formData.street}
                                    onChange={(value) => setFormData(prev => ({ ...prev, street: value }))}
                                    label="Straße"
                                    required
                                    error={formErrors.street}
                                />

                                <MainTextInput
                                    type="text"
                                    value={formData.address_add}
                                    onChange={(value) => setFormData(prev => ({ ...prev, address_add: value }))}
                                    label="Adresszusatz"
                                />

                                <div className="grid grid-cols-2 gap-4">
                                    <MainTextInput
                                        type="text"
                                        value={formData.postcode}
                                        onChange={(value) => setFormData(prev => ({ ...prev, postcode: value }))}
                                        label="Postleitzahl"
                                        required
                                        error={formErrors.postcode}
                                    />
                                    <MainTextInput
                                        type="text"
                                        value={formData.city}
                                        onChange={(value) => setFormData(prev => ({ ...prev, city: value }))}
                                        label="Stadt"
                                        required
                                        error={formErrors.city}
                                    />
                                </div>

                                

                                {/* Country */}

                                <MainSelect
                                    value={formData.country_code}
                                    onChange={(value) => setFormData(prev => ({ ...prev, country_code: value }))}
                                    options={COUNTRY_OPTIONS}
                                    placeholder="Land*"
                                />
                                
                                {/* <div>
                                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                                        Land *
                                    </label>
                                    <select
                                        value={formData.country_code}
                                        onChange={(e) => setFormData(prev => ({ ...prev, country_code: e.target.value }))}
                                        className="h-12 text-sm w-full bg-white border border-black dark:border-gray-600 rounded-md px-6 py-3 text-black placeholder-gray-500 focus:ring-darkBlue focus:border-darkBlue transition-colors"
                                    >
                                        {COUNTRY_OPTIONS.map(option => (
                                            <option key={option.value} value={option.value}>
                                                {option.label}
                                            </option>
                                        ))}
                                    </select>
                                    {formErrors.country_code && (
                                        <p className="mt-1 text-sm text-red-600">{formErrors.country_code}</p>
                                    )}
                                </div> */}
                            </div>

                            <div className="flex flex-col lg:flex-row justify-end gap-3 p-8 border-t border-gray-200 dark:border-gray-600">
                                <MainButton
                                    style="secondary"
                                    handleClick={() => setShowAddEditModal(false)}
                                    label="Abbrechen"
                                    size="small"
                                />
                                <MainButton
                                    style="primary"
                                    handleClick={handleSaveAddress}
                                    label={editingIndex !== null ? 'Änderungen speichern' : 'Adresse hinzufügen'}
                                    size="small"
                                />
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}