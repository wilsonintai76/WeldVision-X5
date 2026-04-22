import { Upload, FileUp, CheckCircle, RefreshCw, FlaskConical } from 'lucide-react'
import React from 'react'

interface UploadForm {
  name: string;
  version: string;
  description: string;
}

interface ModelUploadProps {
  uploadForm: UploadForm;
  setUploadForm: React.Dispatch<React.SetStateAction<UploadForm>>;
  uploadFile: File | null;
  setUploadFile: React.Dispatch<React.SetStateAction<File | null>>;
  uploading: boolean;
  onUpload: () => void;
  fileInputRef: React.RefObject<HTMLInputElement>;
}

const ModelUpload: React.FC<ModelUploadProps> = ({ 
  uploadForm, 
  setUploadForm, 
  uploadFile, 
  setUploadFile, 
  uploading, 
  onUpload, 
  fileInputRef 
}) => {
  return (
    <div className="p-6 bg-gradient-to-br from-blue-900/20 to-emerald-900/10 rounded-xl border border-blue-500/30 shadow-lg shadow-blue-500/5">
      <div className="flex flex-col md:flex-row gap-6">
        <div className="flex-1">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 bg-blue-600/20 rounded-lg flex items-center justify-center">
              <Upload className="w-6 h-6 text-blue-400" />
            </div>
            <div>
              <h4 className="text-xl font-bold text-white">Upload Pre-trained Model</h4>
              <p className="text-sm text-slate-400">Import models from Google Colab, Roboflow, or local training</p>
            </div>
          </div>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-6">
            <div className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-400 uppercase tracking-wider mb-2">Model File (.pt, .onnx, .bin)</label>
                <input
                  ref={fileInputRef}
                  type="file"
                  accept=".pt,.onnx,.bin"
                  onChange={(e) => {
                    const file = e.target.files?.[0]
                    setUploadFile(file || null)
                    if (file && !uploadForm.name) {
                      const baseName = file.name.replace(/\.(pt|onnx|bin)$/i, '')
                      setUploadForm({ ...uploadForm, name: baseName })
                    }
                  }}
                  className="w-full px-4 py-3 bg-slate-900 border border-slate-700 rounded-xl text-white text-sm file:mr-4 file:py-1.5 file:px-4 file:rounded-lg file:border-0 file:bg-blue-600 file:text-white file:font-semibold file:cursor-pointer hover:border-slate-600 transition-all"
                />
                {uploadFile && (
                  <p className="text-xs text-emerald-400 mt-2 flex items-center gap-1">
                    <CheckCircle className="w-3 h-3" /> Ready: {uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(2)} MB)
                  </p>
                )}
              </div>
              <Input
                label="Model Name"
                value={uploadForm.name}
                onChange={(v) => setUploadForm({ ...uploadForm, name: v })}
                placeholder="e.g., weld-defect-yolov8"
              />
            </div>
            <div className="space-y-4">
              <Input
                label="Version Tag"
                value={uploadForm.version}
                onChange={(v) => setUploadForm({ ...uploadForm, version: v })}
                placeholder="e.g., 1.0.0-gold"
              />
              <Input
                label="Notes / Metadata"
                value={uploadForm.description}
                onChange={(v) => setUploadForm({ ...uploadForm, description: v })}
                placeholder="e.g., Trained for 100 epochs on industrial dataset"
              />
            </div>
          </div>

          <button
            onClick={onUpload}
            disabled={uploading || !uploadFile || !uploadForm.name || !uploadForm.version}
            className={`mt-6 w-full px-6 py-4 rounded-xl font-bold text-lg transition-all flex items-center justify-center gap-3 ${uploading || !uploadFile || !uploadForm.name || !uploadForm.version
              ? 'bg-slate-800 text-slate-500 cursor-not-allowed border border-slate-700'
              : 'bg-gradient-to-r from-blue-600 to-emerald-600 hover:from-blue-50 hover:to-emerald-500 text-white shadow-lg shadow-blue-600/20 active:scale-[0.98]'
              }`}
          >
            {uploading ? (
              <>
                <RefreshCw className="w-6 h-6 animate-spin" />
                Uploading Weights...
              </>
            ) : (
              <>
                <FileUp className="w-6 h-6" />
                Register Model in Workspace
              </>
            )}
          </button>
        </div>

        <div className="md:w-64 bg-slate-900/50 rounded-xl border border-slate-800 p-4">
          <h5 className="text-xs font-bold text-slate-500 uppercase tracking-widest mb-4 flex items-center gap-2">
            <FlaskConical className="w-3 h-3" /> External Training Tips
          </h5>
          <ul className="space-y-3">
            <li className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-blue-400 block mb-0.5">YOLOv8/v10/v11</strong>
              Export from Colab using <code className="bg-slate-800 px-1 rounded text-white">format='onnx'</code> and <code className="bg-slate-800 px-1 rounded text-white">imgsz=640</code>.
            </li>
            <li className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-emerald-400 block mb-0.5">RDK X5 Deployment</strong>
              Once uploaded, use the <strong>Convert</strong> tool below to generate the Sunrise 5 <code className="text-white">.bin</code> file.
            </li>
            <li className="text-[11px] text-slate-400 leading-relaxed">
              <strong className="text-purple-400 block mb-0.5">Label Consistency</strong>
              Ensure your YAML classes match your current assessment rubrics.
            </li>
          </ul>
        </div>
      </div>
    </div>
  )
}

interface InputProps {
  label: string;
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
}

const Input: React.FC<InputProps> = ({ label, value, onChange, placeholder }) => {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 transition-colors"
      />
    </label>
  )
}

export default ModelUpload
