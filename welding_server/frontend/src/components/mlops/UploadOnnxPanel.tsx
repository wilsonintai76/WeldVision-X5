import { useState, useRef, FC } from 'react'
import { Upload, RefreshCw } from 'lucide-react'
import type { UploadMetadata } from './types'

interface UploadOnnxPanelProps {
  nextVersion: string | null
  uploading: boolean
  uploadStatus: string
  /** Returns true on success, false on error (error already alerted by parent). */
  onUpload: (file: File, metadata: UploadMetadata) => Promise<boolean>
}

export const UploadOnnxPanel: FC<UploadOnnxPanelProps> = ({
  nextVersion,
  uploading,
  uploadStatus,
  onUpload,
}) => {
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [onnxWarn, setOnnxWarn] = useState(false)
  const [map50, setMap50] = useState('')
  const [map50_95, setMap5095] = useState('')
  const [epochs, setEpochs] = useState('')
  const [datasetVersion, setDatasetVersion] = useState('')
  const [frameworkVersion, setFrameworkVersion] = useState('')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setUploadFile(f)
    setOnnxWarn(!!f && !f.name.toLowerCase().endsWith('.onnx'))
  }

  const handleUpload = async () => {
    if (!uploadFile) return alert('Select a .onnx file exported from Google Colab')
    if (!uploadFile.name.toLowerCase().endsWith('.onnx'))
      return alert('Only .onnx files supported. Export from Colab with: model.export(format="onnx")')

    const success = await onUpload(uploadFile, { map50, map50_95, epochs, datasetVersion, frameworkVersion })
    if (success) {
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMap50(''); setMap5095(''); setEpochs(''); setDatasetVersion(''); setFrameworkVersion('')
    }
  }

  return (
    <div className="p-6 bg-gradient-to-br from-blue-900/20 to-slate-900 rounded-xl border border-blue-500/30">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">1</div>
        <div>
          <h3 className="text-lg font-bold text-white">Upload ONNX from Colab</h3>
          <p className="text-xs text-slate-400">
            Export with: <code className="text-blue-300 font-mono">model.export(format="onnx")</code> — Colab saves as{' '}
            <code className="text-blue-300 font-mono">best.onnx</code> → upload here → R2
          </p>
        </div>
      </div>

      {/* ONNX input node reminder */}
      <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/40 rounded-lg text-xs text-amber-300 flex gap-2">
        <span className="text-amber-400 font-bold shrink-0">⚠</span>
        <span>
          Verify your ONNX input node is named <code className="font-mono bg-amber-900/40 px-1 rounded">images</code> before compiling.{' '}
          Run in Colab:{' '}
          <code className="font-mono bg-amber-900/40 px-1 rounded">
            import onnx; m=onnx.load('best.onnx'); print(m.graph.input[0].name)
          </code>
        </span>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Left: file picker + name/version */}
        <div className="space-y-3">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Model File (.onnx)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".onnx"
              title="Select a .onnx model file (e.g. best.onnx from Colab)"
              aria-label="Select model file (.onnx)"
              onChange={handleFileChange}
              className={`w-full px-3 py-2 bg-slate-900 border rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-semibold cursor-pointer transition-all ${
                onnxWarn ? 'border-red-500' : 'border-slate-700 hover:border-slate-600'
              }`}
            />
            {onnxWarn && <p className="text-red-400 text-xs mt-1">File must end in .onnx</p>}
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Model Name</label>
              <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm font-mono">yolov8_weld</div>
            </div>
            <div>
              <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Next Version</label>
              <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-blue-300 text-sm font-mono">
                {nextVersion ?? '...'}
              </div>
            </div>
          </div>
        </div>

        {/* Right: Colab training metadata */}
        <div className="space-y-3">
          <p className="text-xs font-semibold text-slate-400 uppercase">Colab Training Metadata (optional)</p>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs text-slate-500 mb-1">mAP@0.5</label>
              <input
                value={map50}
                onChange={e => setMap50(e.target.value)}
                placeholder="0.923"
                type="number" min="0" max="1" step="0.001"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">mAP@0.5:0.95</label>
              <input
                value={map50_95}
                onChange={e => setMap5095(e.target.value)}
                placeholder="0.741"
                type="number" min="0" max="1" step="0.001"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Epochs</label>
              <input
                value={epochs}
                onChange={e => setEpochs(e.target.value)}
                placeholder="100"
                type="number" min="1"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
              />
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Dataset Version</label>
              <input
                value={datasetVersion}
                onChange={e => setDatasetVersion(e.target.value)}
                placeholder="Roboflow v4"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500"
              />
            </div>
          </div>
          <div>
            <label className="block text-xs text-slate-500 mb-1">Framework Version</label>
            <input
              value={frameworkVersion}
              onChange={e => setFrameworkVersion(e.target.value)}
              placeholder="ultralytics==8.3.140"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
            />
          </div>
        </div>
      </div>

      <div className="mt-4 flex items-center gap-3">
        <button
          onClick={handleUpload}
          disabled={uploading}
          className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
        >
          {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
          {uploading ? uploadStatus : 'Upload to R2'}
        </button>
        {uploadFile && (
          <span className="text-sm text-slate-400">
            {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)
          </span>
        )}
      </div>
    </div>
  )
}
