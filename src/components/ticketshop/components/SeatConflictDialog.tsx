import React from 'react';

interface SeatConflictDialogProps {
    isOpen: boolean;
    onClose: () => void;
    onConfirm: () => void;
    conflictType: 'manual-to-bestplatz' | 'bestplatz-to-manual';
}

export default function SeatConflictDialog({
    isOpen,
    onClose,
    onConfirm,
    conflictType
}: SeatConflictDialogProps) {
    if (!isOpen) return null;

    const getDialogContent = () => {
        if (conflictType === 'manual-to-bestplatz') {
            return {
                title: 'Platzwahl ändern?',
                message: 'Sie haben bereits spezifische Plätze ausgewählt. Wenn Sie zur Bestplatzwahl wechseln, werden alle manuell ausgewählten Plätze entfernt.',
                confirmText: 'Zur Bestplatzwahl wechseln',
                cancelText: 'Abbrechen'
            };
        } else {
            return {
                title: 'Platzwahl ändern?',
                message: 'Sie haben bereits Bestplatzwahl-Tickets im Warenkorb. Wenn Sie einen spezifischen Platz auswählen, werden alle Bestplatzwahl-Tickets entfernt.',
                confirmText: 'Spezifischen Platz auswählen',
                cancelText: 'Abbrechen'
            };
        }
    };

    const content = getDialogContent();

    return (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white rounded-lg shadow-xl max-w-md w-full mx-4 p-6">
                <div className="mb-4">
                    <h3 className="text-lg font-semibold text-black mb-2">
                        {content.title}
                    </h3>
                    <p className="text-gray-600">
                        {content.message}
                    </p>
                </div>
                
                <div className="flex justify-end gap-3">
                    <button
                        onClick={onClose}
                        className="px-4 py-2 text-sm font-medium text-gray-700 bg-gray-200 rounded-md hover:bg-gray-300 transition-colors"
                    >
                        {content.cancelText}
                    </button>
                    <button
                        onClick={onConfirm}
                        className="px-4 py-2 text-sm font-medium text-white bg-darkBlue rounded-md hover:bg-darkBlue/90 transition-colors"
                    >
                        {content.confirmText}
                    </button>
                </div>
            </div>
        </div>
    );
}