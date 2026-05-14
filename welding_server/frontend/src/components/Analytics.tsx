import React, { useState, useEffect, FC } from 'react'
import {
  ExternalLink,
  Database,
  Tag,
  CheckCircle,
  Github,
  Zap,
  RefreshCw,
  AlertCircle,
} from 'lucide-react'
import { getStoredToken } from '../services/authAPI'

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

interface Model {
  id: string | number
  name: string
  version: string
  accuracy?: number
  status?: string
  is_deployed?: boolean
  created_at?: string
  model_file_key?: string
}

const ROBOFLOW_URL = 'https://roboflow.com'
const COLAB_NOTEBOOK = 'https://colab.research.google.com'
const GITHUB_ACTIONS_URL = 'https://github.com/wilsonintai76/WeldVision-X5/actions'

const Analytics: FC = () => {
  const [models, setModels] = useState<Model[]>([])
  const [loading, setLoading] = useState(false)
  const [rfWorkspace, setRfWorkspace] = useState(() => localStorage.getItem('rf_workspace') || '')
  const [rfProject, setRfProject] = useState(() => localStorage.getItem('rf_project') || '')

  useEffect(() => {
    fetchModels()
  }, [])

  const fetchModels = async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/models', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json() as any
        setModels(Array.isArray(data) ? data : (data.results || []))
      }
    } catch { /* silent */ }
    setLoading(false)
  }

  const saveRoboflowConfig = () => {
    localStorage.setItem('rf_workspace', rfWorkspace)
    localStorage.setItem('rf_project', rfProject)
  }

  const openRoboflow = () => {
    const url = rfWorkspace && rfProject
      ? `${ROBOFLOW_URL}/${rfWorkspace}/${rfProject}`
      : ROBOFLOW_URL
    window.open(url, '_blank')
  }

  const deployedModel = models.find(m => m.is_deployed)
  const onnxCount = models.filter(m => m.model_file_key?.endsWith?.('.onnx')).length
  const binCount = models.filter(m => m.model_file_key?.endsWith?.('.bin')).length
  const bestAccuracy = models.reduce((best, m) => Math.max(best, m.accuracy ?? 0), 0)

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">ML Pipeline</h2>
        <p className="text-slate-400 mt-1">Roboflow → Google Colab → R2 → GitHub Actions → RDK X5</p>
      </div>

      {/* Pipeline Status Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <Database className="w-7 h-7 text-purple-400 mb-3" />
          <div className="text-2xl font-black text-white mb-1">{models.length}</div>
          <div className="text-xs text-slate-500 uppercase font-bold">Models in R2</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <Tag className="w-7 h-7 text-amber-400 mb-3" />
          <div className="text-2xl font-black text-white mb-1">{onnxCount}</div>
          <div className="text-xs text-slate-500 uppercase font-bold">ONNX (Colab)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <Zap className="w-7 h-7 text-blue-400 mb-3" />
          <div className="text-2xl font-black text-white mb-1">{binCount}</div>
          <div className="text-xs text-slate-500 uppercase font-bold">BPU .bin (compiled)</div>
        </div>
        <div className="bg-slate-900 border border-slate-800 rounded-xl p-5">
          <CheckCircle className={`w-7 h-7 mb-3 ${deployedModel ? 'text-emerald-400' : 'text-slate-700'}`} />
          <div className="text-2xl font-black text-white mb-1">
            {bestAccuracy > 0 ? `${(bestAccuracy * 100).toFixed(1)}%` : '—'}
          </div>
          <div className="text-xs text-slate-500 uppercase font-bold">Best mAP@.5</div>
        </div>
      </div>

      {/* Roboflow Integration */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-purple-600/20 rounded-xl flex items-center justify-center">
              <Tag className="w-5 h-5 text-purple-400" />
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Roboflow — Annotation & Dataset</h3>
              <p className="text-xs text-slate-500">Label weld images, augment dataset, export YOLO format</p>
            </div>
          </div>
          <button
            onClick={openRoboflow}
            className="flex items-center gap-2 px-4 py-2 bg-purple-700 hover:bg-purple-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Open Roboflow <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Workspace Slug</label>
            <input
              value={rfWorkspace}
              onChange={e => { setRfWorkspace(e.target.value); saveRoboflowConfig() }}
              placeholder="your-workspace"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Project Name</label>
            <input
              value={rfProject}
              onChange={e => { setRfProject(e.target.value); saveRoboflowConfig() }}
              placeholder="weld-defect-detection"
              className="w-full px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-purple-500"
            />
          </div>
        </div>

        {/* Roboflow Workflow Steps */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mt-4">
          {[
            { step: '1', title: 'Upload Images', desc: 'Drag & drop weld photos' },
            { step: '2', title: 'Annotate', desc: 'Label defects with bounding boxes' },
            { step: '3', title: 'Augment', desc: 'Apply transforms to grow dataset' },
            { step: '4', title: 'Export YOLO', desc: 'Download YOLOv8 format for Colab' },
          ].map(s => (
            <div key={s.step} className="p-3 bg-purple-950/20 border border-purple-800/20 rounded-lg">
              <div className="text-xs font-black text-purple-500 uppercase mb-1">Step {s.step}</div>
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Colab Training */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-amber-600/20 rounded-xl flex items-center justify-center">
              <span className="text-lg">🔬</span>
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">Google Colab Training</h3>
              <p className="text-xs text-slate-500">YOLOv8 training with free GPU — export to ONNX</p>
            </div>
          </div>
          <button
            onClick={() => window.open(COLAB_NOTEBOOK, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-amber-700 hover:bg-amber-600 text-white text-sm font-semibold rounded-lg transition-colors"
          >
            Open Colab <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="bg-slate-800/50 rounded-lg p-4 font-mono text-xs text-slate-300 space-y-1 select-all">
          <div className="text-slate-500"># In Colab notebook:</div>
          <div><span className="text-amber-400">from</span> ultralytics <span className="text-amber-400">import</span> YOLO</div>
          <div>model = YOLO(<span className="text-emerald-400">'yolov8n.pt'</span>)</div>
          <div>model.train(data=<span className="text-emerald-400">'data.yaml'</span>, epochs=<span className="text-blue-400">100</span>, imgsz=<span className="text-blue-400">640</span>)</div>
          <div>model.export(format=<span className="text-emerald-400">'onnx'</span>)  <span className="text-slate-500"># → runs/detect/train/weights/best.onnx</span></div>
          <div className="text-slate-500"># Then upload best.onnx in the AI Pipeline tab</div>
        </div>
      </div>

      {/* GitHub Actions BPU Compiler */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <Github className="w-6 h-6 text-white" />
            <div>
              <h3 className="text-lg font-bold text-white">GitHub Actions — BPU Compiler</h3>
              <p className="text-xs text-slate-500">compile_model.yml: ONNX → Horizon BPU .bin (~10 min)</p>
            </div>
          </div>
          <button
            onClick={() => window.open(GITHUB_ACTIONS_URL, '_blank')}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg border border-slate-700 transition-colors"
          >
            View Runs <ExternalLink className="w-3.5 h-3.5" />
          </button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
          {[
            { step: '1', title: 'Trigger', desc: 'Click "Compile" next to an ONNX model in AI Pipeline tab' },
            { step: '2', title: 'Convert', desc: 'Workflow runs hb_mapper to produce Horizon BPU .bin' },
            { step: '3', title: 'Store', desc: 'Compiled .bin is uploaded back to R2 automatically' },
          ].map(s => (
            <div key={s.step} className="p-3 bg-slate-800/50 border border-slate-700/50 rounded-lg">
              <div className="text-xs font-black text-blue-500 uppercase mb-1">Step {s.step}</div>
              <div className="text-sm font-semibold text-white">{s.title}</div>
              <div className="text-xs text-slate-500 mt-1">{s.desc}</div>
            </div>
          ))}
        </div>
      </div>

      {/* Model History */}
      <div className="bg-slate-900 border border-slate-800 rounded-xl p-6">
        <div className="flex items-center justify-between mb-4">
          <h3 className="text-lg font-bold text-white">Model History</h3>
          <button onClick={fetchModels} title="Refresh models" aria-label="Refresh models" className="p-2 text-slate-500 hover:text-white transition-colors">
            <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          </button>
        </div>

        {deployedModel && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
            <CheckCircle className="w-5 h-5 text-emerald-400" />
            <div>
              <p className="text-sm font-semibold text-emerald-300">
                {deployedModel.name} v{deployedModel.version} is live on RDK X5
              </p>
              {deployedModel.accuracy && (
                <p className="text-xs text-emerald-400/70">mAP@.5: {(deployedModel.accuracy * 100).toFixed(1)}%</p>
              )}
            </div>
          </div>
        )}

        {!deployedModel && models.length > 0 && (
          <div className="flex items-center gap-3 p-3 mb-4 bg-amber-900/20 border border-amber-700/30 rounded-lg">
            <AlertCircle className="w-5 h-5 text-amber-400" />
            <p className="text-sm text-amber-300">No model deployed — go to AI Pipeline tab to deploy</p>
          </div>
        )}

        {models.length === 0 ? (
          <p className="text-center text-slate-600 py-8 italic">No models yet — upload a .onnx in the AI Pipeline tab</p>
        ) : (
          <div className="space-y-2">
            {models.map(m => {
              const ext = m.model_file_key?.split('.').pop()?.toUpperCase() ?? '?'
              return (
                <div key={m.id} className="flex items-center justify-between p-3 bg-slate-800/50 rounded-lg">
                  <div className="flex items-center gap-3">
                    {m.is_deployed && <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />}
                    <span className="text-white font-semibold text-sm">{m.name}</span>
                    <span className="text-slate-500 text-xs font-mono">{m.version}</span>
                    <span className={`text-xs px-1.5 py-0.5 rounded font-bold uppercase ${
                      ext === 'ONNX' ? 'bg-amber-900/30 text-amber-400' :
                      ext === 'BIN'  ? 'bg-emerald-900/30 text-emerald-400' :
                      'bg-slate-700 text-slate-400'
                    }`}>{ext}</span>
                  </div>
                  <div className="flex items-center gap-3">
                    {m.accuracy && (
                      <span className="text-emerald-400 text-xs font-bold">{(m.accuracy * 100).toFixed(1)}% mAP</span>
                    )}
                    <span className={`text-xs px-2 py-0.5 rounded font-bold ${
                      m.is_deployed ? 'bg-emerald-900/30 text-emerald-400' : 'bg-slate-700 text-slate-400'
                    }`}>
                      {m.is_deployed ? 'LIVE' : m.status || 'uploaded'}
                    </span>
                    {m.created_at && (
                      <span className="text-slate-600 text-xs">{new Date(m.created_at).toLocaleDateString()}</span>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        )}
      </div>
    </div>
  )
}

export default Analytics
