import React from 'react'
import { X, FileText } from 'lucide-react'

interface BulkImportFormatModalProps {
  show: boolean;
  onClose: () => void;
}

const BulkImportFormatModal: React.FC<BulkImportFormatModalProps> = ({
  show,
  onClose
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">CSV Format Requirement</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>
        <div className="space-y-4">
          <p className="text-slate-300 text-sm">Upload a .csv file with the following columns (no header):</p>
          <div className="bg-slate-900 p-3 rounded-lg font-mono text-sm text-emerald-400 border border-slate-700">
            RegistrationNumber, FullName
          </div>
          <div className="text-xs text-slate-500 space-y-1">
            <p>• RegistrationNumber: Unique ID (e.g. 2024001)</p>
            <p>• FullName: Student's complete name</p>
            <p>• Make sure the file is comma-separated.</p>
          </div>
          <button
            onClick={onClose}
            className="w-full py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  )
}

export default BulkImportFormatModal
