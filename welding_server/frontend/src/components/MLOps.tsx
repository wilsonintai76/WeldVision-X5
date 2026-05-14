import { useEffect, useState, useRef, FC } from 'react'
import { Upload, Github, CheckCircle, RefreshCw, HardDrive, Wifi, ExternalLink, Zap, ChevronRight, Trash2 } from 'lucide-react'
import { getStoredToken } from '../services/authAPI'

function authHeaders(json = false): Record<string, string> {
  const token = getStoredToken()
  const h: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
  if (json) h['Content-Type'] = 'application/json'
  return h
}

interface Model {
  id: string | number
  name: string
  version: string
  accuracy?: number
  precision_score?: number
  recall?: number
  f1_score?: number
  map50?: number
  map50_95?: number
  epochs?: number
  dataset_version?: string
  model_size_bytes?: number
  framework_version?: string
  created_at?: string
  is_deployed?: boolean
  status?: string
  model_file_key?: string
}

const GITHUB_ACTIONS_URL  = 'https://github.com/wilsonintai76/WeldVision-X5/actions'
// Open training notebook directly from GitHub — avoids Colab reset losing the file
const COLAB_NOTEBOOK_URL  = 'https://colab.research.google.com/github/wilsonintai76/WeldVision-X5/blob/main/.github/workflows/training.ipynb'
const ROBOFLOW_URL        = 'https://app.roboflow.com/jwai/weldvision-ribcd'

type TabId = 'registry' | 'compare'

const MLOps: FC = () => {
  const [models, setModels] = useState<Model[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [nextVersion, setNextVersion] = useState<string | null>(null)
  const [lanIp, setLanIp] = useState('')
  const [activeAction, setActiveAction] = useState<string | number | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('registry')
  // Colab metadata form fields
  const [map50, setMap50] = useState('')
  const [map50_95, setMap5095] = useState('')
  const [epochs, setEpochs] = useState('')
  const [datasetVersion, setDatasetVersion] = useState('')
  const [frameworkVersion, setFrameworkVersion] = useState('')
  const [onnxWarn, setOnnxWarn] = useState(false)
  // Comparison sort
  const [sortKey, setSortKey] = useState<keyof Model>('map50')
  const fileInputRef = useRef<HTMLInputElement>(null)

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setModels(Array.isArray(data) ? data : (data.results || []))
      }
    } catch { /* silent */ }
  }

  const fetchNextVersion = async () => {
    try {
      const res = await fetch('/api/models/next-version', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json()
        setNextVersion(data.next_version)
      }
    } catch { /* silent */ }
  }

  useEffect(() => {
    fetchModels()
    fetchNextVersion()
    const t = setInterval(fetchModels, 10000)
    return () => clearInterval(t)
  }, [])

  // Warn if the selected file is not named 'best.onnx' / ends with .onnx and remind about input node
  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null
    setUploadFile(f)
    setOnnxWarn(!!f && !f.name.toLowerCase().endsWith('.onnx'))
  }

  // Upload ONNX to R2, then register metadata in D1
  const uploadModel = async () => {
    if (!uploadFile) return alert('Select a .onnx file exported from Google Colab')
    if (!uploadFile.name.toLowerCase().endsWith('.onnx')) return alert('Only .onnx files supported. Export from Colab with: model.export(format="onnx")')

    setUploading(true)
    setUploadStatus('Uploading to Cloudflare R2...')
    try {
      const form = new FormData()
      form.append('file', uploadFile)
      form.append('folder', 'models')
      const token = getStoredToken()
      const r2Res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form,
      })
      if (!r2Res.ok) {
        const err = await r2Res.json().catch(() => ({}))
        return alert(`Upload failed: ${err.error || r2Res.statusText}`)
      }
      const { key } = await r2Res.json()

      setUploadStatus('Registering in D1...')
      const regRes = await fetch('/api/models', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          model_file_key: key,
          status: 'uploaded',
          map50: map50 ? parseFloat(map50) : undefined,
          map50_95: map50_95 ? parseFloat(map50_95) : undefined,
          epochs: epochs ? parseInt(epochs) : undefined,
          dataset_version: datasetVersion || undefined,
          framework_version: frameworkVersion || undefined,
          model_size_bytes: uploadFile.size,
        }),
      })
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}))
        return alert(`Registration failed: ${err.error || regRes.statusText}`)
      }
      const { version } = await regRes.json()

      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      setMap50(''); setMap5095(''); setEpochs(''); setDatasetVersion(''); setFrameworkVersion('')
      await fetchModels()
      await fetchNextVersion()
      alert(`✓ yolov8_weld ${version} uploaded to R2.\n\nNext: click "Compile" in the table to trigger GitHub Actions → Horizon BPU .bin.`)
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setUploading(false)
      setUploadStatus('')
    }
  }

  // Trigger GitHub Actions: ONNX → Horizon BPU .bin
  const compileModel = async (modelId: string | number) => {
    const model = models.find(m => m.id === modelId)
    if (!model) return
    setCompileError(null)
    if (!window.confirm(`Trigger GitHub Actions to compile:\n"${model.name}" v${model.version}\nONNX → Horizon BPU .bin\n\n~10 minutes. Continue?`)) return

    setActiveAction(modelId)
    try {
      const res = await fetch('/api/models/github-compile', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ model_id: Number(modelId) }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        const msg = `Dispatch failed: ${err.error || res.statusText}`
        setCompileError(msg)
        return alert(msg)
      }
      // Keep user in-app and show compiling state immediately.
      setModels(prev => prev.map(m => m.id === modelId ? { ...m, status: 'compiling' } : m))
      await fetchModels()
    } catch (err) {
      const msg = `Error: ${(err as Error).message}`
      setCompileError(msg)
      alert(msg)
    } finally {
      setActiveAction(null)
    }
  }

  // Online deploy: mark in D1 + KV, edge polls and hot-swaps from R2
  const deployOnline = async (modelId: string | number) => {
    const model = models.find(m => m.id === modelId)
    if (!model) return
    if (!window.confirm(`Deploy "${model.name}" v${model.version} online?\n\nEdge device polls KV every 30s and will hot-swap the model from R2 within 5 minutes.`)) return

    setActiveAction(modelId)
    try {
      const res = await fetch(`/api/models/${modelId}/deploy`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ device_id: 'rdk-x5' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return alert(`Deploy failed: ${err.error || res.statusText}`)
      }
      await fetchModels()
      alert(`✓ "${model.name}" deployed.\nEdge device will hot-swap within 5 minutes.`)
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setActiveAction(null)
    }
  }

  // Offline/LAN deploy: push model info directly to edge device HTTP
  const deployLAN = async (modelId: string | number) => {
    const model = models.find(m => m.id === modelId)
    if (!model?.model_file_key) return
    if (!lanIp.trim()) return alert('Enter the edge device LAN IP address first')
    if (!window.confirm(`Push "${model.name}" directly to edge at ${lanIp}:8080?`)) return

    setActiveAction(modelId)
    try {
      const res = await fetch(`http://${lanIp}:8080/model/load`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model_key: model.model_file_key,
          r2_url: `/api/media/${model.model_file_key}`,
          name: model.name,
          version: model.version,
        }),
      })
      // Also mark deployed in D1
      await fetch(`/api/models/${modelId}/deploy`, {
        method: 'PATCH',
        headers: authHeaders(true),
        body: JSON.stringify({ device_id: `lan:${lanIp}` }),
      })
      if (res.ok) {
        await fetchModels()
        alert(`✓ Model pushed directly to ${lanIp}`)
      } else {
        alert('Edge device responded with an error. Check device logs.')
      }
    } catch {
      alert(`Cannot reach ${lanIp}:8080.\nVerify the edge device is running and on the same LAN.`)
    } finally {
      setActiveAction(null)
    }
  }

  // Delete model from D1 + R2
  const deleteModel = async (modelId: string | number) => {
    const model = models.find(m => m.id === modelId)
    if (!model) return
    if (model.is_deployed) return alert('Cannot delete a deployed model. Undeploy it first by deploying another version.')
    if (!window.confirm(`Delete "${model.name}" ${model.version}?\n\nThis permanently removes the file from Cloudflare R2 and the registry.`)) return

    setActiveAction(modelId)
    try {
      const res = await fetch(`/api/models/${modelId}`, {
        method: 'DELETE',
        headers: authHeaders(),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        return alert(`Delete failed: ${err.error || res.statusText}`)
      }
      await fetchModels()
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
    } finally {
      setActiveAction(null)
    }
  }

  const onnxModels = models.filter(m => m.model_file_key?.endsWith('.onnx'))
  const deployedModel = models.find(m => m.is_deployed)
  const sortedModels = [...models].sort((a, b) => {
    const av = (a[sortKey] as number | undefined) ?? -1
    const bv = (b[sortKey] as number | undefined) ?? -1
    return bv - av
  })

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">AI Pipeline</h2>
          <p className="text-slate-400 mt-1">Roboflow → Colab → R2 → GitHub Actions → RDK X5</p>
        </div>
        <div className="flex items-center gap-3">
          {deployedModel ? (
            <div className="flex items-center gap-2 px-4 py-2 bg-emerald-950/30 border border-emerald-600 rounded-lg">
              <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
              <span className="text-emerald-400 text-sm font-semibold">{deployedModel.name} v{deployedModel.version} live</span>
            </div>
          ) : (
            <div className="flex items-center gap-2 px-4 py-2 bg-slate-800/50 border border-slate-700 rounded-lg">
              <HardDrive className="w-4 h-4 text-slate-500" />
              <span className="text-slate-500 text-sm">No model deployed</span>
            </div>
          )}
          <button onClick={fetchModels} title="Refresh models" aria-label="Refresh models" className="p-2 text-slate-500 hover:text-white transition-colors">
            <RefreshCw className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Tab Bar */}
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit">
        {(['registry', 'compare'] as TabId[]).map(t => (
          <button
            key={t}
            onClick={() => setActiveTab(t)}
            className={`px-4 py-1.5 rounded-lg text-sm font-semibold transition-colors ${
              activeTab === t ? 'bg-blue-600 text-white' : 'text-slate-400 hover:text-white'
            }`}
          >
            {t === 'registry' ? 'Model Registry' : 'Compare Versions'}
          </button>
        ))}
      </div>

      {/* Pipeline Steps */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { step: '01', label: 'Label',   sub: 'Roboflow',       url: ROBOFLOW_URL,       color: 'hover:border-violet-600/50' },
          { step: '02', label: 'Train',   sub: 'Google Colab',   url: COLAB_NOTEBOOK_URL, color: 'hover:border-amber-600/50'  },
          { step: '03', label: 'Compile', sub: 'GitHub Actions', url: GITHUB_ACTIONS_URL, color: 'hover:border-slate-500'     },
          { step: '04', label: 'Deploy',  sub: 'RDK X5 Edge',   url: null,               color: ''                           },
        ].map((s, i) => (
          <div key={i}
            className={`relative p-4 bg-slate-900 border border-slate-800 rounded-xl ${s.url ? `cursor-pointer ${s.color}` : ''} transition-colors group`}
            onClick={() => s.url && window.open(s.url, '_blank')}>
            <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1">{s.step}</div>
            <div className="text-white font-bold">{s.label}</div>
            <div className="text-xs text-slate-500">{s.sub}</div>
            {s.url && <ExternalLink className="w-3 h-3 text-slate-600 group-hover:text-slate-400 absolute top-3 right-3 transition-colors" />}
            {i < 3 && <ChevronRight className="w-4 h-4 text-slate-700 absolute -right-3 top-1/2 -translate-y-1/2 z-10" />}
          </div>
        ))}
      </div>

      {/* Colab save warning */}
      <div className="p-3 bg-amber-950/20 border border-amber-800/30 rounded-xl flex items-start gap-3 text-xs">
        <span className="text-amber-500 text-base shrink-0">☁</span>
        <div className="space-y-1">
          <p className="text-amber-300 font-semibold">Important: Save a copy of the notebook</p>
          <p className="text-amber-400/70">
            The Colab notebook loads read-only from GitHub. If you see a "Failed to save" error, go to <strong className="text-amber-200">File → Save a copy in Drive</strong> in Colab to create your own editable copy.
          </p>
        </div>
      </div>

      {/* Upload ONNX from Colab */}
      <div className="p-6 bg-gradient-to-br from-blue-900/20 to-slate-900 rounded-xl border border-blue-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">1</div>
          <div>
            <h3 className="text-lg font-bold text-white">Upload ONNX from Colab</h3>
            <p className="text-xs text-slate-400">
              Export with: <code className="text-blue-300 font-mono">model.export(format="onnx")</code> — Colab saves as <code className="text-blue-300 font-mono">best.onnx</code> → upload here → R2
            </p>
          </div>
        </div>

        {/* Fix C — ONNX input node reminder */}
        <div className="mb-4 p-3 bg-amber-900/20 border border-amber-600/40 rounded-lg text-xs text-amber-300 flex gap-2">
          <span className="text-amber-400 font-bold shrink-0">⚠</span>
          <span>
            Verify your ONNX input node is named <code className="font-mono bg-amber-900/40 px-1 rounded">images</code> before compiling.{' '}
            Run in Colab: <code className="font-mono bg-amber-900/40 px-1 rounded">import onnx; m=onnx.load('best.onnx'); print(m.graph.input[0].name)</code>
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
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
                <div className="px-3 py-2 bg-slate-800 border border-slate-700 rounded-lg text-blue-300 text-sm font-mono">{nextVersion ?? '...'}</div>
              </div>
            </div>
          </div>

          {/* Fix A — Colab training metadata */}
          <div className="space-y-3">
            <p className="text-xs font-semibold text-slate-400 uppercase">Colab Training Metadata (optional)</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-xs text-slate-500 mb-1">mAP@0.5</label>
                <input value={map50} onChange={e => setMap50(e.target.value)} placeholder="0.923" type="number" min="0" max="1" step="0.001"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">mAP@0.5:0.95</label>
                <input value={map50_95} onChange={e => setMap5095(e.target.value)} placeholder="0.741" type="number" min="0" max="1" step="0.001"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Epochs</label>
                <input value={epochs} onChange={e => setEpochs(e.target.value)} placeholder="100" type="number" min="1"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono" />
              </div>
              <div>
                <label className="block text-xs text-slate-500 mb-1">Dataset Version</label>
                <input value={datasetVersion} onChange={e => setDatasetVersion(e.target.value)} placeholder="Roboflow v4"
                  className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500" />
              </div>
            </div>
            <div>
              <label className="block text-xs text-slate-500 mb-1">Framework Version</label>
              <input value={frameworkVersion} onChange={e => setFrameworkVersion(e.target.value)} placeholder="ultralytics==8.3.140"
                className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono" />
            </div>
          </div>
        </div>

        <div className="mt-4 flex items-center gap-3">
          <button
            onClick={uploadModel}
            disabled={uploading}
            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-500 disabled:bg-slate-700 disabled:text-slate-500 text-white font-bold rounded-lg transition-colors flex items-center gap-2"
          >
            {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
            {uploading ? uploadStatus : 'Upload to R2'}
          </button>
          {uploadFile && (
            <span className="text-sm text-slate-400">{uploadFile.name} ({(uploadFile.size / 1024 / 1024).toFixed(1)} MB)</span>
          )}
        </div>
      </div>

      {/* Fix E — Model Comparison Tab */}
      {activeTab === 'compare' && (
        <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xl font-bold text-white">Version Comparison</h3>
            <div className="flex items-center gap-2 text-xs text-slate-400">
              Sort by:
              {(['map50','map50_95','f1_score','recall','epochs'] as (keyof Model)[]).map(k => (
                <button key={k} onClick={() => setSortKey(k)}
                  className={`px-2 py-1 rounded font-mono transition-colors ${
                    sortKey === k ? 'bg-blue-600 text-white' : 'bg-slate-800 text-slate-400 hover:text-white'
                  }`}>{k}</button>
              ))}
            </div>
          </div>
          {models.length === 0 ? (
            <p className="text-slate-500 text-center py-8">No models yet — upload a .onnx above</p>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-slate-800 text-left">
                    {['Version','mAP@0.5','mAP@0.5:0.95','F1','Recall','Epochs','Dataset','Framework','Size','Status'].map(h => (
                      <th key={h} className="py-2 px-3 text-xs font-bold text-slate-500 uppercase whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-800/50">
                  {sortedModels.map(m => {
                    const isTop = sortedModels[0]?.id === m.id
                    const pct = (v?: number) => v != null ? `${(v * 100).toFixed(1)}%` : '—'
                    const kb = (b?: number) => b ? `${(b/1024/1024).toFixed(1)} MB` : '—'
                    return (
                      <tr key={m.id} className={`transition-colors ${
                        m.is_deployed ? 'bg-emerald-950/20' : isTop ? 'bg-blue-950/20' : 'hover:bg-slate-800/30'
                      }`}>
                        <td className="py-3 px-3 font-mono text-white font-bold">
                          {m.version}
                          {m.is_deployed && <span className="ml-2 text-xs text-emerald-400">● live</span>}
                          {isTop && !m.is_deployed && <span className="ml-2 text-xs text-blue-400">★ best</span>}
                        </td>
                        <td className="py-3 px-3 font-mono text-emerald-400 font-bold">{pct(m.map50 ?? m.accuracy)}</td>
                        <td className="py-3 px-3 font-mono text-emerald-300">{pct(m.map50_95)}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{pct(m.f1_score)}</td>
                        <td className="py-3 px-3 font-mono text-slate-300">{pct(m.recall)}</td>
                        <td className="py-3 px-3 font-mono text-slate-400">{m.epochs ?? '—'}</td>
                        <td className="py-3 px-3 text-slate-400 text-xs">{m.dataset_version || '—'}</td>
                        <td className="py-3 px-3 text-slate-500 text-xs font-mono">{m.framework_version || '—'}</td>
                        <td className="py-3 px-3 text-slate-400 text-xs">{kb(m.model_size_bytes)}</td>
                        <td className="py-3 px-3"><span className="text-xs text-slate-500">{m.status}</span></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {activeTab === 'registry' && <>
      {/* Model Registry Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-slate-800 rounded-lg flex items-center justify-center">
              <HardDrive className="w-6 h-6 text-slate-400" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Model Registry</h3>
              <p className="text-sm text-slate-500">{models.length} models · {onnxModels.length} ONNX ready to compile</p>
            </div>
          </div>
          <button
            onClick={fetchModels}
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
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Name</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Version</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Format</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Accuracy</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">Actions</th>
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
                              onClick={() => compileModel(model.id)}
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
                              onClick={() => deployOnline(model.id)}
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
                              onClick={() => deployLAN(model.id)}
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
                          {/* Delete button — always visible, blocked for deployed model */}
                          <button
                            onClick={() => deleteModel(model.id)}
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

      </> /* end registry tab */}

      {/* Deploy Options */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <div className="p-6 bg-emerald-950/20 border border-emerald-800/30 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Wifi className="w-5 h-5 text-emerald-400" />
            <h4 className="font-bold text-white">Online Deploy (Internet)</h4>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            Edge device polls Cloudflare KV every 30s. When a model is marked deployed, it downloads the .bin from R2 and hot-swaps — no reboot needed.
          </p>
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 bg-emerald-400 rounded-full" />
            <span className="text-xs text-emerald-400">Click "Online" in the table above</span>
          </div>
        </div>

        <div className="p-6 bg-blue-950/20 border border-blue-800/30 rounded-xl">
          <div className="flex items-center gap-3 mb-3">
            <Zap className="w-5 h-5 text-blue-400" />
            <h4 className="font-bold text-white">Offline LAN Deploy</h4>
          </div>
          <p className="text-sm text-slate-400 mb-3">
            For air-gapped or offline environments — pushes model info directly to edge device HTTP endpoint on the same LAN.
          </p>
          <div className="flex gap-2">
            <input
              value={lanIp}
              onChange={e => setLanIp(e.target.value)}
              placeholder="192.168.1.x"
              title="Edge device LAN IP address"
              aria-label="Edge device LAN IP address"
              className="flex-1 px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 font-mono"
            />
            <span className="flex items-center px-3 py-2 bg-slate-800 text-slate-400 text-sm rounded-lg border border-slate-700">:8080</span>
          </div>
          <p className="text-xs text-slate-600 mt-2">Then click "LAN" next to the model in the table</p>
        </div>
      </div>


    </div>
  )
}

export default MLOps
