import { RefreshCw, AlertTriangle } from 'lucide-react'
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



interface ConvertForm {
  model_id: string;
  format: string;
  imgsz: number;
  name: string;
  version: string;
}

interface BPUConverterProps {
  convertForm: ConvertForm;
  setConvertForm: React.Dispatch<React.SetStateAction<ConvertForm>>;
  convertibleModels: Model[];
  onConvert: () => void;
}

const BPUConverter = ({
  convertForm,
  setConvertForm,
  convertibleModels,
  onConvert
}: BPUConverterProps) => {
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
        {/* Source Selection (Fixed to Uploaded Model) */}
        <div>
          <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-3">Source weights</label>
          <div className="min-h-[60px]">
            <select
              value={convertForm.model_id}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConvertForm({ ...convertForm, model_id: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600 transition-all"
            >
              <option value="">Choose an uploaded model weights file...</option>
              {convertibleModels.filter((m: Model) => m.can_convert_to_onnx || m.can_convert_to_bin).map((model: Model) => (
                <option key={model.id} value={model.id}>
                  {model.name} v{model.version} (.{model.file_type})
                </option>
              ))}
            </select>
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="block text-xs font-bold text-slate-500 uppercase tracking-widest mb-2">Target Format</label>
            <select
              value={convertForm.format}
              onChange={(e: React.ChangeEvent<HTMLSelectElement>) => setConvertForm({ ...convertForm, format: e.target.value })}
              className="w-full px-4 py-3 bg-slate-950 border border-slate-800 rounded-xl text-white text-sm focus:outline-none focus:ring-2 focus:ring-blue-600"
            >
              <option value="onnx">ONNX (Intermediate)</option>
              <option value="bin">Horizon .bin (BPU)</option>
              <option value="torchscript">TorchScript</option>
            </select>
          </div>
          <Input label="Image Size" value={String(convertForm.imgsz)} onChange={(v: string) => setConvertForm({ ...convertForm, imgsz: Number(v || 0) })} />
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

const Input = ({ label, value, onChange, placeholder }: InputProps) => {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e: React.ChangeEvent<HTMLInputElement>) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white placeholder:text-slate-500 focus:border-blue-500 transition-colors"
      />
    </label>
  )
}

export default BPUConverter
