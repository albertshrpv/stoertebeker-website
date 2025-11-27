import { useState } from 'react';
import {
    Button,
    Label,
    TextInput,
    Badge,
    Modal,
    ModalHeader,
    ModalBody,
    ModalFooter,
    Checkbox,
    Select,
} from 'flowbite-react';
import { HiPlus, HiPencil, HiTrash, HiCheck, HiX, HiRefresh } from 'react-icons/hi';
import type { CreateCustomerAddressData, UpdateCustomerAddressData } from '../types/customer';
import { ALL_COUNTRIES } from '../utils/countries';

interface CustomerAddressManagerProps {
    addresses: (CreateCustomerAddressData | UpdateCustomerAddressData)[];
    onAddressesChange: (addresses: (CreateCustomerAddressData | UpdateCustomerAddressData)[]) => void;
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

export function CustomerAddressManager({ addresses, onAddressesChange }: CustomerAddressManagerProps) {
    const [showModal, setShowModal] = useState(false);
    const [editingIndex, setEditingIndex] = useState<number | null>(null);
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
    const [errors, setErrors] = useState<Partial<Record<keyof AddressFormData, string>>>({});

    // Show all addresses including those marked for deletion

    const resetForm = () => {
        setFormData({
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
        setErrors({});
        setEditingIndex(null);
    };

    const openAddModal = () => {
        resetForm();
        setShowModal(true);
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
        setErrors({});
        setShowModal(true);
    };

    const handleInputChange = (field: keyof AddressFormData) => (
        e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
    ) => {
        const value = e.target.type === 'checkbox' ? (e.target as HTMLInputElement).checked : e.target.value;
        setFormData(prev => ({ ...prev, [field]: value }));

        // Clear error
        if (errors[field]) {
            setErrors(prev => ({ ...prev, [field]: undefined }));
        }
    };

    const validateForm = (): boolean => {
        const newErrors: Partial<Record<keyof AddressFormData, string>> = {};

        // Required field validation
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

        setErrors(newErrors);
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
                // Existing address from API - preserve the id and reset _delete flag
                newAddresses[editingIndex] = {
                    ...addressData,
                    id: existingAddress.id,
                    _delete: false, // Reset deletion flag when editing
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

        onAddressesChange(newAddresses);
        setShowModal(false);
        resetForm();
    };

    const handleDeleteAddress = (index: number) => {
        const newAddresses = [...addresses];
        const address = addresses[index];

        // Check if address has an id (existing from API) or is newly created
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

        onAddressesChange(newAddresses);
    };

    const handleUndoDelete = (index: number) => {
        const newAddresses = [...addresses];
        const address = addresses[index];

        // Only existing addresses (with id) can be unmarked for deletion
        if ('id' in address && address.id) {
            newAddresses[index] = {
                ...address,
                _delete: false,
            } as UpdateCustomerAddressData;
        }

        onAddressesChange(newAddresses);
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-4">
                <h3 className="text-lg font-semibold text-black dark:text-white">
                    Adressen
                </h3>
                <Button
                    size="sm"
                    onClick={openAddModal}
                    className="flex items-center"
                >
                    <HiPlus className="w-4 h-4 mr-2" />
                    Adresse hinzufügen
                </Button>
            </div>

            {addresses.length === 0 ? (
                <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                    <p>Noch keine Adressen hinzugefügt</p>
                </div>
            ) : (
                <div className="space-y-4 grid grid-cols-1 xl:grid-cols-2 gap-4">
                    {addresses.map((address, index) => {
                        const isMarkedForDeletion = '_delete' in address && address._delete;
                        return (
                            <div
                                key={index}
                                className={`relative h-full p-6 border border-gray-200 dark:border-gray-600 rounded-lg ${isMarkedForDeletion ? 'opacity-50 bg-red-50 dark:bg-red-900/20' : ''}`}
                            >
                                <div className="flex justify-between items-start">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-2">
                                            <h4 className={`font-medium text-black dark:text-white ${isMarkedForDeletion ? 'line-through' : ''}`}>
                                                {address.name}
                                            </h4>
                                            {/* {(address.is_default && !isMarkedForDeletion) ?
                                                <Badge color="blue" size="sm">
                                                    Standard
                                                </Badge>
                                                : null} */}
                                            {isMarkedForDeletion ? (
                                                <Badge color="red" size="sm">
                                                    Zur Löschung vorgemerkt
                                                </Badge>
                                            ) : null}
                                        </div>
                                        <div className={`text-sm text-gray-600 dark:text-gray-400 space-y-1 ${isMarkedForDeletion ? 'line-through' : ''}`}>
                                            <p>{address.first_name} {address.last_name}</p>
                                            {address.company && <p>{address.company}</p>}
                                            <p>{address.street}</p>
                                            {address.address_add && <p>{address.address_add}</p>}
                                            <p>{address.postcode} {address.city}</p>
                                            <p>{COUNTRY_OPTIONS.find(c => c.value === address.country_code)?.label || address.country_code}</p>
                                        </div>
                                    </div>
                                    <div className="flex items-center space-x-2">
                                        {!isMarkedForDeletion && (
                                            <Button
                                                size="xs"
                                                color="gray"
                                                onClick={() => openEditModal(index)}
                                            >
                                                <HiPencil className="w-3 h-3" />
                                            </Button>
                                        )}
                                        {isMarkedForDeletion ? (
                                            <Button
                                                size="xs"
                                                color="green"
                                                onClick={() => handleUndoDelete(index)}
                                                title="Löschung rückgängig machen"
                                            >
                                                <HiRefresh className="w-3 h-3" />
                                            </Button>
                                        ) : (
                                            <Button
                                                size="xs"
                                                color="red"
                                                onClick={() => handleDeleteAddress(index)}
                                            >
                                                <HiTrash className="w-3 h-3" />
                                            </Button>
                                        )}
                                    </div>
                                </div>
                            </div>
                        );
                    })}
                </div>
            )}

            {/* Address Modal */}
            <Modal show={showModal} onClose={() => setShowModal(false)} size="lg">
                <ModalHeader>
                    {editingIndex !== null ? 'Adresse bearbeiten' : 'Neue Adresse hinzufügen'}
                </ModalHeader>
                <ModalBody>
                    <div className="space-y-4">
                        {/* Address Name */}
                        <div>
                            <Label htmlFor="name">Adressname *</Label>
                            <TextInput
                                id="name"
                                type="text"
                                placeholder="z.B. Zuhause, Büro"
                                value={formData.name}
                                onChange={handleInputChange('name')}
                                color={errors.name ? 'failure' : 'gray'}
                            />
                            {errors.name && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.name}</p>
                            )}
                        </div>

                        {/* Is Default */}
                        <div className="flex items-center">
                            <Checkbox
                                id="is_default"
                                checked={formData.is_default}
                                onChange={handleInputChange('is_default')}
                            />
                            <Label htmlFor="is_default" className="ml-2">
                                Als Standardadresse festlegen
                            </Label>
                        </div>

                        {/* Name Fields */}
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="first_name">Vorname *</Label>
                                <TextInput
                                    id="first_name"
                                    type="text"
                                    value={formData.first_name}
                                    onChange={handleInputChange('first_name')}
                                    color={errors.first_name ? 'failure' : 'gray'}
                                />
                                {errors.first_name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.first_name}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="last_name">Nachname *</Label>
                                <TextInput
                                    id="last_name"
                                    type="text"
                                    value={formData.last_name}
                                    onChange={handleInputChange('last_name')}
                                    color={errors.last_name ? 'failure' : 'gray'}
                                />
                                {errors.last_name && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.last_name}</p>
                                )}
                            </div>
                        </div>

                        {/* Company */}
                        <div>
                            <Label htmlFor="company">Firma</Label>
                            <TextInput
                                id="company"
                                type="text"
                                value={formData.company}
                                onChange={handleInputChange('company')}
                                color="gray"
                            />
                        </div>

                        {/* Address Fields */}
                        <div>
                            <Label htmlFor="street">Straße *</Label>
                            <TextInput
                                id="street"
                                type="text"
                                value={formData.street}
                                onChange={handleInputChange('street')}
                                color={errors.street ? 'failure' : 'gray'}
                            />
                            {errors.street && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.street}</p>
                            )}
                        </div>

                        <div>
                            <Label htmlFor="address_add">Adresszusatz</Label>
                            <TextInput
                                id="address_add"
                                type="text"
                                value={formData.address_add}
                                onChange={handleInputChange('address_add')}
                                color="gray"
                            />
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <Label htmlFor="postcode">Postleitzahl *</Label>
                                <TextInput
                                    id="postcode"
                                    type="text"
                                    value={formData.postcode}
                                    onChange={handleInputChange('postcode')}
                                    color={errors.postcode ? 'failure' : 'gray'}
                                />
                                {errors.postcode && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.postcode}</p>
                                )}
                            </div>
                            <div>
                                <Label htmlFor="city">Stadt *</Label>
                                <TextInput
                                    id="city"
                                    type="text"
                                    value={formData.city}
                                    onChange={handleInputChange('city')}
                                    color={errors.city ? 'failure' : 'gray'}
                                />
                                {errors.city && (
                                    <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.city}</p>
                                )}
                            </div>
                        </div>

                        {/* Country */}
                        <div>
                            <Label htmlFor="country_code">Land *</Label>
                            <Select
                                id="country_code"
                                value={formData.country_code}
                                onChange={handleInputChange('country_code')}
                            >
                                {COUNTRY_OPTIONS.map(option => (
                                    <option key={option.value} value={option.value}>
                                        {option.label}
                                    </option>
                                ))}
                            </Select>
                            {errors.country_code && (
                                <p className="mt-1 text-sm text-red-600 dark:text-red-400">{errors.country_code}</p>
                            )}
                        </div>
                    </div>
                </ModalBody>
                <ModalFooter>
                    <div className="flex justify-end space-x-3 w-full">
                        <Button
                            color="gray"
                            onClick={() => setShowModal(false)}
                        >
                            <HiX className="w-4 h-4 mr-2" />
                            Abbrechen
                        </Button>
                        <Button
                            onClick={handleSaveAddress}
                            className="flex items-center"
                        >
                            <HiCheck className="w-4 h-4 mr-2" />
                            {editingIndex !== null ? 'Änderungen speichern' : 'Adresse hinzufügen'}
                        </Button>
                    </div>
                </ModalFooter>
            </Modal>
        </div>
    );
} 