import React from 'react'
import { X, Upload, AlertCircle, CheckCircle, RefreshCw } from 'lucide-react'

interface ImportPDFModalProps {
  show: boolean;
  onClose: () => void;
  importFile: File | null;
  setImportFile: (file: File | null) => void;
  importing: boolean;
  importResult: any;
  onSubmit: () => void;
}

const ImportPDFModal: React.FC<ImportPDFModalProps> = ({
  show,
  onClose,
  importFile,
  setImportFile,
  importing,
  importResult,
  onSubmit
}) => {
  if (!show) return null;

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-semibold text-white">Import from Student List PDF</h3>
          <button onClick={onClose} className="text-slate-400 hover:text-white">
            <X className="w-5 h-5" />
          </button>
        </div>

        <div className="space-y-6">
          <div className="p-4 bg-blue-900/20 border border-blue-600/30 rounded-lg">
            <div className="flex items-start gap-3">
              <AlertCircle className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
              <div className="text-blue-300 text-sm">
                <p className="font-medium mb-1">How it works</p>
                <p>This tool parses your official student registration PDF. It will automatically detect <strong>Sessions, Courses, Home Classes, and Students</strong>. Duplicate entries will be skipped.</p>
              </div>
            </div>
          </div>

          <div className="border-2 border-dashed border-slate-700 rounded-xl p-8 text-center">
            <input
              type="file"
              id="pdf-upload"
              className="hidden"
              accept=".pdf"
              onChange={e => setImportFile(e.target.files?.[0] || null)}
            />
            {!importFile ? (
              <label htmlFor="pdf-upload" className="cursor-pointer group">
                <Upload className="w-12 h-12 text-slate-500 mx-auto mb-4 group-hover:text-emerald-400 transition-colors" />
                <p className="text-slate-300 font-medium">Click to select PDF file</p>
                <p className="text-slate-500 text-xs mt-1">Maximum file size: 10MB</p>
              </label>
            ) : (
              <div>
                <div className="flex items-center justify-center gap-3 mb-4">
                  <div className="bg-emerald-500/10 p-3 rounded-lg">
                    <Upload className="w-8 h-8 text-emerald-400" />
                  </div>
                  <div className="text-left">
                    <p className="text-white font-medium">{importFile.name}</p>
                    <p className="text-slate-500 text-xs">{(importFile.size / 1024 / 1024).toFixed(2)} MB</p>
                  </div>
                  <button onClick={() => setImportFile(null)} className="ml-4 text-red-400 hover:text-red-300">
                    <X className="w-4 h-4" />
                  </button>
                </div>
                <button
                  onClick={onSubmit}
                  disabled={importing}
                  className="bg-emerald-600 hover:bg-emerald-500 text-white px-8 py-2 rounded-lg transition-colors flex items-center justify-center gap-2 mx-auto disabled:opacity-50"
                >
                  {importing ? (
                    <>
                      <RefreshCw className="w-4 h-4 animate-spin" />
                      Parsing PDF...
                    </>
                  ) : (
                    'Start Import'
                  )}
                </button>
              </div>
            )}
          </div>

          {importResult && (
            <div className="p-4 bg-slate-900 border border-slate-700 rounded-lg">
              <div className="flex items-center gap-2 mb-3 text-emerald-400 font-semibold">
                <CheckCircle className="w-5 h-5" />
                Import Complete
              </div>
              <div className="grid grid-cols-4 gap-4">
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{importResult.sessions_created || 0}</p>
                  <p className="text-xs text-slate-500 uppercase">Sessions</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{importResult.courses_created || 0}</p>
                  <p className="text-xs text-slate-500 uppercase">Courses</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{importResult.classes_created || 0}</p>
                  <p className="text-xs text-slate-500 uppercase">Classes</p>
                </div>
                <div className="text-center">
                  <p className="text-2xl font-bold text-white">{importResult.students_created || 0}</p>
                  <p className="text-xs text-slate-500 uppercase">Students</p>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default ImportPDFModal
