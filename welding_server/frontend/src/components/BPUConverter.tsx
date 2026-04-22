import { RefreshCw, Cloud, HardDrive, AlertTriangle } from 'lucide-react'
import React from 'react'

interface Model {
  id: string | number;
  name: string;
  version: string;
  accuracy?: number;
  created_at?: string;
  is_deployed?: boolean;
  file_type?: string;
  can_convert_to_onnx?: boolean;
  can_convert_to_bin?: boolean;
}

interface Job {
  id: string | number;
  name?: string;
  job_type: string;
  status: string;
}

interface ConvertForm {
  model_id: string;
  source_job_id: string;
  weights_path: string;
  format: string;
  imgsz: number;
  name: string;
  version: string;
}

interface BPUConverterProps {
  convertForm: ConvertForm;
  setConvertForm: React.Dispatch<React.SetStateAction<ConvertForm>>;
  convertSource: 'model' | 'job' | 'manual';
  setConvertSource: React.Dispatch<React.SetStateAction<'model' | 'job' | 'manual'>>;
  convertibleModels: Model[];
  jobs: Job[];
  onConvert: () => void;
}

const BPUConverter: React.FC<BPUConverterProps> = ({
  convertForm,
  setConvertForm,
  convertSource,
  setConvertSource,
  convertibleModels,
  jobs,
  onConvert
}) => {
  return (
    <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-sm h-full">
      <div className="flex items-center gap-3 mb-6">
        <div className="w-10 h-10 bg-purple-600/10 rounded-lg flex items-center justify-center">
          <RefreshCw className="w-6 h-6 text-purple-500" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">BPU Converter</h3>
          <p className="text-sm text-slate-500">Optimize models for Horizon RDK X5</p>
        </div>
      </div>
      
      <div className="space-y-5">
        {/* Source Selection Tabs */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Select Source Weights</label>
          <div className="flex p-1 bg-slate-950 rounded-xl border border-slate-800">
            <button
              onClick={() => setConvertSource('model')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg transition-all ${convertSource === 'model'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <Cloud className="w-4 h-4" />
              Uploaded Model
            </button>
            <button
              onClick={() => setConvertSource('job')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg transition-all ${convertSource === 'job'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <RefreshCw className="w-4 h-4" />
              Training Job
            </button>
            <button
              onClick={() => setConvertSource('manual')}
              className={`flex-1 flex items-center justify-center gap-2 px-3 py-2.5 text-sm font-bold rounded-lg transition-all ${convertSource === 'manual'
                ? 'bg-slate-800 text-white shadow-sm'
                : 'text-slate-500 hover:text-slate-300'
                }`}
            >
              <HardDrive className="w-4 h-4" />
              Local Path
            </button>
          </div>
        </div>

        {/* Source Inputs */}
        <div className="min-h-[80px]">
          {convertSource === 'model' && (
            <div>
              <select
                value={convertForm.model_id}
                onChange={(e) => setConvertForm({ ...convertForm, model_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              >
                <option value="">Choose an uploaded model weights file...</option>
                {convertibleModels.filter(m => m.can_convert_to_onnx || m.can_convert_to_bin).map((model) => (
                  <option key={model.id} value={model.id}>
                    {model.name} v{model.version} (.{model.file_type})
                  </option>
                ))}
              </select>
            </div>
          )}

          {convertSource === 'job' && (
            <div>
              <select
                value={convertForm.source_job_id}
                onChange={(e) => setConvertForm({ ...convertForm, source_job_id: e.target.value })}
                className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
              >
                <option value="">Select a completed training job...</option>
                {jobs.filter(j => j.job_type === 'train' && (j.status === 'success' || j.status === 'succeeded')).map((job) => (
                  <option key={job.id} value={job.id}>
                    Job #{job.id} - {job.name || 'Training Run'}
                  </option>
                ))}
              </select>
            </div>
          )}

          {convertSource === 'manual' && (
            <Input
              label="Absolute Path on Server"
              value={convertForm.weights_path}
              onChange={(v) => setConvertForm({ ...convertForm, weights_path: v })}
              placeholder="/app/media/models/best.pt"
            />
          )}
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Format</label>
            <select
              value={convertForm.format}
              onChange={(e) => setConvertForm({ ...convertForm, format: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="onnx">ONNX (Intermediate)</option>
              <option value="bin">Horizon .bin (BPU)</option>
              <option value="torchscript">TorchScript</option>
            </select>
          </div>
          <Input label="Image Size" value={String(convertForm.imgsz)} onChange={(v) => setConvertForm({ ...convertForm, imgsz: Number(v || 0) })} />
        </div>

        <button
          onClick={onConvert}
          className="w-full px-4 py-4 bg-purple-600 hover:bg-purple-500 text-white rounded-xl font-bold shadow-lg shadow-purple-600/20 transition-all active:scale-[0.98]"
        >
          Initialize Conversion Engine
        </button>
        <div className="bg-slate-950 rounded-lg p-3 flex items-start gap-3 border border-slate-800">
          <AlertTriangle className="w-4 h-4 text-amber-500 shrink-0 mt-0.5" />
          <p className="text-[10px] text-slate-500 leading-relaxed">
            Direct export to <code className="text-slate-300">.bin</code> requires the Horizon OpenExplorer toolchain to be correctly configured.
          </p>
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

export default BPUConverter
