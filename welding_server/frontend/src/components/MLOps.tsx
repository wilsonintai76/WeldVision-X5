import { useEffect, useState, FC } from 'react'
import { HardDrive, RefreshCw } from 'lucide-react'
import { getStoredToken } from '../services/authAPI'
import type { Model, TabId, UploadMetadata } from './mlops/types'
import { PipelineSteps } from './mlops/PipelineSteps'
import { UploadOnnxPanel } from './mlops/UploadOnnxPanel'
import { ModelRegistryTable } from './mlops/ModelRegistryTable'
import { ModelCompareTable } from './mlops/ModelCompareTable'
import { DeployOptions } from './mlops/DeployOptions'

function authHeaders(json = false): Record<string, string> {
  const token = getStoredToken()
  const h: Record<string, string> = token ? { 'Authorization': `Bearer ${token}` } : {}
  if (json) h['Content-Type'] = 'application/json'
  return h
}

const MLOps: FC = () => {
  const [models, setModels] = useState<Model[]>([])
  const [uploading, setUploading] = useState(false)
  const [uploadStatus, setUploadStatus] = useState('')
  const [nextVersion, setNextVersion] = useState<string | null>(null)
  const [lanIp, setLanIp] = useState('')
  const [activeAction, setActiveAction] = useState<string | number | null>(null)
  const [compileError, setCompileError] = useState<string | null>(null)
  const [activeTab, setActiveTab] = useState<TabId>('registry')
  const [sortKey, setSortKey] = useState<keyof Model>('map50')

  const fetchModels = async () => {
    try {
      const res = await fetch('/api/models', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json() as any
        setModels(Array.isArray(data) ? data : (data.results || []))
      }
    } catch { /* silent */ }
  }

  const fetchNextVersion = async () => {
    try {
      const res = await fetch('/api/models/next-version', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json() as any
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

  // Upload ONNX to R2, then register metadata in D1
  const uploadModel = async (file: File, metadata: UploadMetadata): Promise<boolean> => {
    setUploading(true)
    setUploadStatus('Uploading to Cloudflare R2...')
    try {
      const form = new FormData()
      form.append('file', file)
      form.append('folder', 'models')
      const token = getStoredToken()
      const r2Res = await fetch('/api/storage/upload', {
        method: 'POST',
        headers: token ? { 'Authorization': `Bearer ${token}` } : {},
        body: form,
      })
      if (!r2Res.ok) {
        const err = await r2Res.json().catch(() => ({})) as any
        alert(`Upload failed: ${err.error || r2Res.statusText}`)
        return false
      }
      const { key } = await r2Res.json() as any

      setUploadStatus('Registering in D1...')
      const regRes = await fetch('/api/models', {
        method: 'POST',
        headers: authHeaders(true),
        body: JSON.stringify({
          model_file_key: key,
          status: 'uploaded',
          map50: metadata.map50 ? parseFloat(metadata.map50) : undefined,
          map50_95: metadata.map50_95 ? parseFloat(metadata.map50_95) : undefined,
          epochs: metadata.epochs ? parseInt(metadata.epochs) : undefined,
          dataset_version: metadata.datasetVersion || undefined,
          framework_version: metadata.frameworkVersion || undefined,
          model_size_bytes: file.size,
        }),
      })
      if (!regRes.ok) {
        const err = await regRes.json().catch(() => ({})) as any
        alert(`Registration failed: ${err.error || regRes.statusText}`)
        return false
      }
      const { version } = await regRes.json() as any
      await fetchModels()
      await fetchNextVersion()
      alert(`✓ yolov8_weld ${version} uploaded to R2.\n\nNext: click "Compile" in the table to trigger GitHub Actions → Horizon BPU .bin.`)
      return true
    } catch (err) {
      alert(`Error: ${(err as Error).message}`)
      return false
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
        const err = await res.json().catch(() => ({})) as any
        const msg = `Dispatch failed: ${err.error || res.statusText}`
        setCompileError(msg)
        return alert(msg)
      }
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
        const err = await res.json().catch(() => ({})) as any
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
        const err = await res.json().catch(() => ({})) as any
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

  return (
    <div className="p-4 md:p-8 space-y-6">
      {/* Header */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold text-white">AI Pipeline</h2>
          <p className="text-slate-400 mt-1">Roboflow → Colab → R2 → GitHub Actions → RDK X5</p>
        </div>
        <div className="flex items-center gap-3 flex-wrap">
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
      <div className="flex gap-1 p-1 bg-slate-900 border border-slate-800 rounded-xl w-fit max-w-full overflow-x-auto">
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

      <PipelineSteps />

      <UploadOnnxPanel
        nextVersion={nextVersion}
        uploading={uploading}
        uploadStatus={uploadStatus}
        onUpload={uploadModel}
      />

      {activeTab === 'compare' && (
        <ModelCompareTable models={models} sortKey={sortKey} onSortChange={setSortKey} />
      )}

      {activeTab === 'registry' && (
        <ModelRegistryTable
          models={models}
          onnxModels={onnxModels}
          lanIp={lanIp}
          activeAction={activeAction}
          compileError={compileError}
          onCompile={compileModel}
          onDeployOnline={deployOnline}
          onDeployLAN={deployLAN}
          onDelete={deleteModel}
          onRefresh={fetchModels}
        />
      )}

      <DeployOptions lanIp={lanIp} onLanIpChange={setLanIp} />
    </div>
  )
}

export default MLOps
