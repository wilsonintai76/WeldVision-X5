import { useEffect, useState, useRef, FC } from 'react'
import { Upload, Github, CheckCircle, RefreshCw, HardDrive, Wifi, ExternalLink, Zap, ChevronRight } from 'lucide-react'
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
  created_at?: string
  is_deployed?: boolean
  status?: string
  model_file_key?: string
}

const GITHUB_ACTIONS_URL = 'https://github.com/wilsonintai76/WeldVision-X5/actions'
const COLAB_URL = 'https://colab.research.google.com'
const ROBOFLOW_URL = 'https://roboflow.com'

const MLOps: FC = () => {
  const [models, setModels] = useState<Model[]>([])
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [modelName, setModelName] = useState('')
  const [modelVersion, setModelVersion] = useState('')
  const [lanIp, setLanIp] = useState('')
  const [activeAction, setActiveAction] = useState<string | number | null>(null)
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

  useEffect(() => {
    fetchModels()
    const t = setInterval(fetchModels, 10000)
    return () => clearInterval(t)
  }, [])

  // Upload ONNX to R2, then register metadata in D1
  const uploadModel = async () => {
    if (!uploadFile) return alert('Select a .onnx file exported from Google Colab')
    if (!modelName || !modelVersion) return alert('Enter model name and version')
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

      setUploadStatus('Registering metadata in D1...')
      const regRes = await fetch('/api/models', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({ name: modelName, version: modelVersion, model_file_key: key, status: 'uploaded' }),
      })
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({}))
        return alert(`Registration failed: ${err.error || regRes.statusText}`)
      }

      setModelName(''); setModelVersion(''); setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''
      await fetchModels()
      alert(`✓ "${modelName}" v${modelVersion} uploaded to R2.\n\nNext: click "Compile" in the table to trigger GitHub Actions → Horizon BPU .bin.`)
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
        return alert(`Dispatch failed: ${err.error || res.statusText}`)
      }
      window.open(GITHUB_ACTIONS_URL, '_blank')
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
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

  const onnxModels = models.filter(m => m.model_file_key?.endsWith('.onnx'))
  const deployedModel = models.find(m => m.is_deployed)

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

      {/* Pipeline Steps */}
      <div className="grid grid-cols-4 gap-2">
        {[
          { step: '01', label: 'Label', sub: 'Roboflow', url: ROBOFLOW_URL },
          { step: '02', label: 'Train', sub: 'Google Colab', url: COLAB_URL },
          { step: '03', label: 'Compile', sub: 'GitHub Actions', url: GITHUB_ACTIONS_URL },
          { step: '04', label: 'Deploy', sub: 'RDK X5 Edge', url: null },
        ].map((s, i) => (
          <div key={i}
            className={`relative p-4 bg-slate-900 border border-slate-800 rounded-xl ${s.url ? 'cursor-pointer hover:border-slate-600' : ''} transition-colors`}
            onClick={() => s.url && window.open(s.url, '_blank')}>
            <div className="text-xs font-black text-slate-600 uppercase tracking-widest mb-1">{s.step}</div>
            <div className="text-white font-bold">{s.label}</div>
            <div className="text-xs text-slate-500">{s.sub}</div>
            {s.url && <ExternalLink className="w-3 h-3 text-slate-600 absolute top-3 right-3" />}
            {i < 3 && <ChevronRight className="w-4 h-4 text-slate-700 absolute -right-3 top-1/2 -translate-y-1/2 z-10" />}
          </div>
        ))}
      </div>

      {/* Upload ONNX from Colab */}
      <div className="p-6 bg-gradient-to-br from-blue-900/20 to-slate-900 rounded-xl border border-blue-500/30">
        <div className="flex items-center gap-3 mb-4">
          <div className="w-8 h-8 bg-blue-600 rounded-lg flex items-center justify-center text-white font-black text-sm">1</div>
          <div>
            <h3 className="text-lg font-bold text-white">Upload ONNX from Colab</h3>
            <p className="text-xs text-slate-400">
              Export with: <code className="text-blue-300 font-mono">model.export(format="onnx")</code> — then upload here → saves to R2
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Model File (.onnx)</label>
            <input
              ref={fileInputRef}
              type="file"
              accept=".onnx"
              title="Select a .onnx model file"
              aria-label="Select model file (.onnx)"
              onChange={e => {
                const f = e.target.files?.[0] || null
                setUploadFile(f)
                if (f && !modelName) setModelName(f.name.replace(/\.onnx$/i, ''))
              }}
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm file:mr-3 file:py-1 file:px-3 file:rounded file:border-0 file:bg-blue-600 file:text-white file:text-xs file:font-semibold cursor-pointer hover:border-slate-600 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Model Name</label>
            <input
              value={modelName}
              onChange={e => setModelName(e.target.value)}
              placeholder="weldvision-yolo"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
            />
          </div>
          <div>
            <label className="block text-xs font-semibold text-slate-400 uppercase mb-1">Version</label>
            <input
              value={modelVersion}
              onChange={e => setModelVersion(e.target.value)}
              placeholder="v1.0.0"
              className="w-full px-3 py-2 bg-slate-900 border border-slate-700 rounded-lg text-white text-sm placeholder-slate-600 focus:outline-none focus:border-blue-500 transition-all"
            />
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

      {/* GitHub Actions link */}
      <div className="flex items-center justify-between p-4 bg-slate-900 border border-slate-800 rounded-xl">
        <div className="flex items-center gap-3">
          <Github className="w-5 h-5 text-white" />
          <div>
            <p className="text-sm font-semibold text-white">GitHub Actions — ONNX → BPU Compiler</p>
            <p className="text-xs text-slate-500">Monitor compile_model.yml workflow runs</p>
          </div>
        </div>
        <button
          onClick={() => window.open(GITHUB_ACTIONS_URL, '_blank')}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white text-sm font-semibold rounded-lg transition-colors border border-slate-700"
        >
          Open Actions <ExternalLink className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  )
}

export default MLOps
