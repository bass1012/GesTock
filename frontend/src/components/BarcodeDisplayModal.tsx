import { X, Printer } from 'lucide-react'
import Barcode from 'react-barcode'

interface Props {
  isOpen: boolean
  onClose: () => void
  sku: string
  productName: string
}

export default function BarcodeDisplayModal({ isOpen, onClose, sku, productName }: Props) {
  if (!isOpen) return null

  const handlePrint = () => {
    const printContent = document.getElementById('barcode-print-area')
    const printWindow = window.open('', '', 'width=600,height=400')
    if (printWindow && printContent) {
      printWindow.document.write(`
                <html>
                    <head>
                        <title>Impression Code-barres - ${productName}</title>
                        <style>
                            body { display: flex; flex-direction: column; align-items: center; justify-content: center; height: 100vh; margin: 0; font-family: sans-serif; }
                            .product-name { font-size: 14px; font-weight: bold; margin-bottom: 20px; text-transform: uppercase; letter-spacing: 1px }
                            .divider { width: 40px; height: 2px; background: #000; margin-bottom: 20px; }
                        </style>
                    </head>
                    <body>
                        <div class="product-name">${productName}</div>
                        <div class="divider"></div>
                        ${printContent.innerHTML}
                        <script>
                            window.onload = () => { window.print(); window.close(); }
                        </script>
                    </body>
                </html>
            `)
      printWindow.document.close()
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-zinc-900/50 backdrop-blur-sm">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-sm overflow-hidden">
        <div className="flex items-center justify-between p-6 border-b border-zinc-100 bg-zinc-50">
          <h3 className="text-lg font-semibold text-zinc-900">Code-barres Produit</h3>
          <button
            onClick={onClose}
            className="p-2 text-zinc-400 hover:text-zinc-600 rounded-lg hover:bg-zinc-100 transition-colors"
          >
            <X size={20} />
          </button>
        </div>
        <div className="p-8 flex flex-col items-center">
          <p className="text-sm font-medium text-zinc-700 mb-6 text-center">{productName}</p>
          <div id="barcode-print-area" className="bg-white rounded-lg flex justify-center">
            <Barcode value={sku} displayValue={true} width={2} height={80} fontSize={16} />
          </div>
        </div>
        <div className="p-6 bg-zinc-50 border-t border-zinc-100 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2.5 text-sm font-medium text-zinc-700 hover:text-zinc-900 hover:bg-white rounded-lg transition-colors border shadow-sm"
          >
            Annuler
          </button>
          <button
            onClick={handlePrint}
            className="px-4 py-2.5 text-sm font-medium bg-primary-600 hover:bg-primary-700 text-white rounded-lg flex items-center gap-2 shadow-sm transition-colors"
          >
            <Printer size={16} />
            Imprimer l'étiquette
          </button>
        </div>
      </div>
    </div>
  )
}
