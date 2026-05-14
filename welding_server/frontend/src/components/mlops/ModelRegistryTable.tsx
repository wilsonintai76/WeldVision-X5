import { FC } from 'react'
import { HardDrive, RefreshCw, ExternalLink, Github, Wifi, Zap, CheckCircle, Trash2 } from 'lucide-react'
import type { Model } from './types'
import { GITHUB_ACTIONS_URL } from './types'

interface ModelRegistryTableProps {
  models: Model[]
  onnxModels: Model[]
  lanIp: string
  activeAction: string | number | null
  compileError: string | null
  onCompile: (id: string | number) => void
  onDeployOnline: (id: string | number) => void
  onDeployLAN: (id: string | number) => void
  onDelete: (id: string | number) => void
  onRefresh: () => void
}

export const ModelRegistryTable: FC<ModelRegistryTableProps> = ({
  models,
  onnxModels,
  lanIp,
  activeAction,
  compileError,
  onCompile,
  onDeployOnline,
  onDeployLAN,
  onDelete,
  onRefresh,
}) => (
  <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
    <div className="flex items-center justify-between mb-6">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
          <HardDrive className="w-6 h-6 text-slate-400" />
        </div>
        <div>
          <h3 className="text-xl font-bold text-white">Model Registry</h3>
          <p className="text-sm text-slate-500">
            {models.length} models · {onnxModels.length} ONNX ready to compile
          </p>
        </div>
      </div>
      <button
        onClick={onRefresh}
        className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700 text-sm"
      >
        <RefreshCw className="w-4 h-4" /> Sync
      </button>
    </div>

    <div className="mb-4 flex flex-wrap items-center gap-3 text-xs">
      <span className="text-slate-400">Compile runs in background. Status updates here.</span>
      <button
        onClick={() => window.open(GITHUB_ACTIONS_URL, '_blank')}
        className="inline-flex items-center gap-1.5 px-2.5 py-1 bg-slate-800 hover:bg-slate-700 border border-slate-700 rounded text-slate-300"
      >
        <ExternalLink className="w-3 h-3" /> View GitHub Actions
      </button>
      {compileError && <span className="text-red-400">{compileError}</span>}
    </div>

    {models.length === 0 ? (
      <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
        <HardDrive className="w-12 h-12 text-slate-800 mx-auto mb-3" />
        <p className="text-slate-500">No models yet — upload a .onnx from Colab above</p>
      </div>
    ) : (
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead>
            <tr className="border-b border-slate-800 text-left">
              {['Name', 'Version', 'Format', 'Accuracy', 'Status', 'Actions'].map(h => (
                <th key={h} className={`py-3 px-4 text-xs font-bold text-slate-500 uppercase${h === 'Actions' ? ' text-right' : ''}`}>
                  {h}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-800/50">
            {models.map(model => {
              const ext = model.model_file_key?.split('.').pop()?.toUpperCase() ?? '?'
              const isActive = activeAction === model.id
              return (
                <tr key={model.id} className="hover:bg-slate-800/30 transition-colors">
                  <td className="py-4 px-4 text-white font-semibold">{model.name}</td>
                  <td className="py-4 px-4">
                    <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs font-mono">{model.version}</span>
                  </td>
                  <td className="py-4 px-4">
                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${
                      ext === 'ONNX' ? 'bg-amber-900/30 text-amber-400' :
                      ext === 'BIN'  ? 'bg-emerald-900/30 text-emerald-400' :
                      'bg-slate-800 text-slate-400'
                    }`}>{ext}</span>
                  </td>
                  <td className="py-4 px-4 text-emerald-400 font-bold">
                    {model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}
                  </td>
                  <td className="py-4 px-4">
                    {model.is_deployed ? (
                      <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-bold">
                        <div className="w-1.5 h-1.5 bg-emerald-400 rounded-full animate-pulse" /> Live on X5
                      </div>
                    ) : model.status === 'compiling' ? (
                      <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold">
                        <RefreshCw className="w-3 h-3 animate-spin" /> Compiling
                      </div>
                    ) : model.status === 'failed' ? (
                      <div className="flex items-center gap-1.5 text-red-400 text-xs font-bold">
                        Failed
                        <button
                          onClick={() => window.open(GITHUB_ACTIONS_URL, '_blank')}
                          className="text-red-300 underline"
                        >
                          logs
                        </button>
                      </div>
                    ) : (
                      <span className="text-slate-600 text-xs">{model.status || 'uploaded'}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <div className="flex items-center justify-end gap-2">
                      {ext === 'ONNX' && (
                        <button
                          onClick={() => onCompile(model.id)}
                          disabled={isActive}
                          title="Compile ONNX → Horizon BPU .bin via GitHub Actions"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-amber-600 hover:bg-amber-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {isActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Github className="w-3 h-3" />}
                          Compile
                        </button>
                      )}
                      {!model.is_deployed && (
                        <button
                          onClick={() => onDeployOnline(model.id)}
                          disabled={isActive}
                          title="Edge device polls KV and downloads from R2"
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {isActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Wifi className="w-3 h-3" />}
                          Online
                        </button>
                      )}
                      {!model.is_deployed && (
                        <button
                          onClick={() => onDeployLAN(model.id)}
                          disabled={isActive || !lanIp}
                          title={lanIp ? `Push directly to ${lanIp}:8080` : 'Enter LAN IP below first'}
                          className="flex items-center gap-1.5 px-3 py-1.5 bg-blue-700 hover:bg-blue-600 disabled:opacity-40 text-white text-xs font-bold rounded-lg transition-colors"
                        >
                          {isActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Zap className="w-3 h-3" />}
                          LAN
                        </button>
                      )}
                      {model.is_deployed && (
                        <span className="flex items-center gap-1 px-3 py-1.5 bg-emerald-900/30 text-emerald-500 text-xs font-bold rounded-lg border border-emerald-800/50">
                          <CheckCircle className="w-3 h-3" /> Running
                        </span>
                      )}
                      <button
                        onClick={() => onDelete(model.id)}
                        disabled={isActive || !!model.is_deployed}
                        title={model.is_deployed ? 'Cannot delete a live model' : 'Delete from R2 + registry'}
                        className="flex items-center gap-1.5 px-2.5 py-1.5 bg-red-900/30 hover:bg-red-700 disabled:opacity-30 text-red-400 hover:text-white text-xs font-bold rounded-lg transition-colors border border-red-900/50 hover:border-red-600"
                      >
                        {isActive ? <RefreshCw className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
                      </button>
                    </div>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    )}
  </div>
)
