import { AlertTriangle } from 'lucide-react'
import Modal from './Modal'

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
  type = 'danger',
}: ConfirmModalProps) {
  const colors = {
    danger: {
      bg: 'bg-red-50',
      text: 'text-red-600',
      border: 'border-red-100',
      button: 'bg-red-600 hover:bg-red-700 focus:ring-red-500',
    },
    warning: {
      bg: 'bg-amber-50',
      text: 'text-amber-600',
      border: 'border-amber-100',
      button: 'bg-amber-600 hover:bg-amber-700 focus:ring-amber-500',
    },
    info: {
      bg: 'bg-blue-50',
      text: 'text-blue-600',
      border: 'border-blue-100',
      button: 'bg-blue-600 hover:bg-blue-700 focus:ring-blue-500',
    },
  }
  const theme = colors[type]

  return (
    <Modal isOpen={isOpen} onClose={onClose} size="sm">
      <div className="flex items-center gap-4 mb-4">
        <div className={`p-3 rounded-xl ${theme.bg} ${theme.border} border`}>
          <AlertTriangle className={theme.text} size={24} />
        </div>
        <div>
          <h3 className="text-xl font-bold text-gray-900">{title}</h3>
          <p className="text-gray-500 leading-relaxed mt-1">{message}</p>
        </div>
      </div>
      <div className="flex flex-col-reverse sm:flex-row sm:justify-end gap-3 mt-6">
        <button onClick={onClose} className="btn-secondary sm:flex-1 py-2.5 px-4 font-semibold">
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
    </Modal>
  )
}
