import { type LucideIcon, PackageOpen } from 'lucide-react'

interface EmptyStateProps {
  icon?: LucideIcon
  title: string
  description?: string
  action?: { label: string; onClick: () => void }
}

export default function EmptyState({
  icon: Icon = PackageOpen,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center py-16 px-4">
      <div className="bg-gray-100 rounded-full p-6 mb-4">
        <Icon className="text-gray-400" size={48} strokeWidth={1.5} />
      </div>
      <h3 className="text-lg font-semibold text-gray-700 mb-1">{title}</h3>
      {description && (
        <p className="text-gray-400 text-sm mb-6 text-center max-w-sm">{description}</p>
      )}
      {action && (
        <button onClick={action.onClick} className="btn-primary px-6 py-2.5 text-sm font-semibold">
          {action.label}
        </button>
      )}
    </div>
  )
}
