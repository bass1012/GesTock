import { AlertTriangle, X } from 'lucide-react'

interface ConfirmModalProps {
    isOpen: boolean
    onClose: () => void
    onConfirm: () => void
    title: string
    message: string
    confirmText?: string
    cancelText?: string
    type?: 'danger' | 'warning' | 'info'
}

export default function ConfirmModal({
    isOpen,
    onClose,
    onConfirm,
    title,
    message,
    confirmText = 'Confirmer',
    cancelText = 'Annuler',
    type = 'danger'
}: ConfirmModalProps) {
    if (!isOpen) return null

    const colors = {
        danger: {
            bg: 'bg-red-50',
            text: 'text-red-600',
            border: 'border-red-100',
            button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
            icon: <AlertTriangle className="text-red-600" size={24} />
        },
        warning: {
            bg: 'bg-amber-50',
            text: 'text-amber-600',
            border: 'border-amber-100',
            button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
            icon: <AlertTriangle className="text-amber-600" size={24} />
        },
        info: {
            bg: 'bg-blue-50',
            text: 'text-blue-600',
            border: 'border-blue-100',
            button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
            icon: <AlertTriangle className="text-blue-600" size={24} />
        }
    }

    const theme = colors[type]

    return (
        <div className="fixed inset-0 z-[100] flex items-center justify-center p-4">
            {/* Backdrop */}
            <div 
                className="absolute inset-0 bg-gray-900/60 backdrop-blur-sm transition-opacity" 
                onClick={onClose} 
            />

            {/* Modal */}
            <div className="relative bg-white rounded-2xl shadow-2xl w-full max-w-md overflow-hidden transform transition-all animate-in fade-in zoom-in duration-200">
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <div className={`p-3 rounded-xl ${theme.bg} ${theme.border} border`}>
                            {theme.icon}
                        </div>
                        <button 
                            onClick={onClose}
                            className="p-2 rounded-lg hover:bg-gray-100 transition-colors"
                        >
                            <X size={20} className="text-gray-400" />
                        </button>
                    </div>

                    <h3 className="text-xl font-bold text-gray-900 mb-2">{title}</h3>
                    <p className="text-gray-500 leading-relaxed">{message}</p>
                </div>

                <div className="bg-gray-50 px-6 py-4 flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-4">
                    <button
                        onClick={onClose}
                        className="btn-secondary sm:flex-1 py-2.5 px-4 font-semibold"
                    >
                        {cancelText}
                    </button>
                    <button
                        onClick={() => {
                            onConfirm()
                            onClose()
                        }}
                        className={`text-white py-2.5 px-4 rounded-xl font-bold shadow-lg transition-all active:scale-95 sm:flex-1 ${theme.button}`}
                    >
                        {confirmText}
                    </button>
                </div>
            </div>
        </div>
    )
}
