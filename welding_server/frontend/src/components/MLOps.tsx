import { useEffect, useMemo, useState, useRef, FC } from 'react'
import { Wifi, WifiOff, Download, CheckCircle, RefreshCw, FileUp, Database, HardDrive } from 'lucide-react'

// New Sub-components
import ModelUpload from './ModelUpload'
import BPUConverter from './BPUConverter'
import ImageUpload from './ImageUpload'

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
  job_type: string;
  status: string;
  name?: string;
}

interface UploadForm {
  name: string;
  version: string;
  description: string;
}

interface ConvertForm {
  model_id: string;
  format: string;
  imgsz: number;
  name: string;
  version: string;
}

const MLOps = () => {
  const [apiStatus, setApiStatus] = useState<boolean>(false)
  const [jobs, setJobs] = useState<Job[]>([])
  const [jobsLoading, setJobsLoading] = useState<boolean>(false)
  const [models, setModels] = useState<Model[]>([])
  const [convertibleModels, setConvertibleModels] = useState<Model[]>([])
  const [uploadForm, setUploadForm] = useState<UploadForm>({
    name: '',
    version: '',
    description: '',
  })
  const [uploadFile, setUploadFile] = useState<File | null>(null)
  const [uploading, setUploading] = useState<boolean>(false)
  const fileInputRef = useRef<HTMLInputElement>(null)
  
  const [convertForm, setConvertForm] = useState<ConvertForm>({
    model_id: '',
    format: 'onnx',
    imgsz: 640,
    name: 'weldvision-yolo',
    version: '',
  })

  const apiBase = useMemo(() => '/api', [])

  // Check API Status - real endpoint
  const checkApiStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/jobs/`, { credentials: 'include', method: 'HEAD' })
      setApiStatus(res.ok)
    } catch {
      setApiStatus(false)
    }
  }

  const refreshJobs = async () => {
    setJobsLoading(true)
    try {
      const res = await fetch(`${apiBase}/jobs/`)
      if (res.ok) {
        const data = await res.json()
        setJobs(Array.isArray(data) ? data : (data.results || []))
      }
    } finally {
      setJobsLoading(false)
    }
  }

  const fetchModels = async () => {
    try {
      const res = await fetch(`${apiBase}/models/`)
      if (res.ok) {
        const data = await res.json()
        setModels(Array.isArray(data) ? data : (data.results || []))
      }
    } catch (error) {
      console.error('Error fetching models:', error)
    }
  }

  const fetchConvertibleModels = async () => {
    try {
      const res = await fetch(`${apiBase}/convertible-models/`)
      if (res.ok) {
        const data = await res.json()
        setConvertibleModels(data)
      }
    } catch (error) {
      console.error('Error fetching convertible models:', error)
    }
  }

  useEffect(() => {
    checkApiStatus()
    fetchModels()
    refreshJobs()
    fetchConvertibleModels()
    const t = setInterval(() => {
      checkApiStatus()
      refreshJobs()
      fetchModels()
      fetchConvertibleModels()
    }, 5000)
    return () => clearInterval(t)
  }, [apiBase])



  const startConvert = async () => {
    const payload: any = {
      format: convertForm.format,
      imgsz: convertForm.imgsz,
      name: convertForm.name,
      version: convertForm.version,
    }

    if (convertForm.model_id) {
      payload.model_id = Number(convertForm.model_id)
    } else {
      alert('Please select an uploaded model weights file.')
      return
    }

    const res = await fetch(`${apiBase}/convert-model/`, {
      credentials: 'include', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Convert failed to start: ${err.error || res.statusText}`)
      return
    }
    await refreshJobs()
    alert('Convert job started. Check Jobs section for progress/logs.')
  }

  const uploadPretrainedModel = async () => {
    if (!uploadFile) {
      alert('Please select a model file (.pt, .onnx, or .bin)')
      return
    }
    if (!uploadForm.name || !uploadForm.version) {
      alert('Please enter model name and version')
      return
    }

    setUploading(true)
    try {
      const formData = new FormData()
      formData.append('model_file', uploadFile)
      formData.append('name', uploadForm.name)
      formData.append('version', uploadForm.version)
      formData.append('description', uploadForm.description || '')

      const res = await fetch(`${apiBase}/upload-model/`, {
        credentials: 'include', method: 'POST',
        body: formData,
      })

      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Upload failed: ${err.error || JSON.stringify(err) || res.statusText}`)
        return
      }

      const data = await res.json()
      alert(`Model uploaded successfully! ${data.message}`)

      // Reset form
      setUploadForm({ name: '', version: '', description: '' })
      setUploadFile(null)
      if (fileInputRef.current) fileInputRef.current.value = ''

      // Refresh lists
      await fetchModels()
      await fetchConvertibleModels()
    } catch (error) {
      alert(`Upload error: ${(error as Error).message}`)
    } finally {
      setUploading(false)
    }
  }

  const registerArtifact = async (jobId: string | number) => {
    const version = window.prompt('Model version to save as (must be unique):', '')
    if (version === null) return
    const res = await fetch(`${apiBase}/register-artifact/`, {
      credentials: 'include', method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ job_id: jobId, name: 'weldvision-yolo', version }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Register failed: ${err.error || res.statusText}`)
      return
    }
    alert('Artifact registered as a model. You can now deploy it from the Models table.')
    await fetchModels()
  }

  const viewLogs = async (jobId: string | number) => {
    const res = await fetch(`${apiBase}/jobs/${jobId}/logs/`)
    if (!res.ok) return
    const data = await res.json()
    const text = `STDOUT:\n${data.stdout || ''}\n\nSTDERR:\n${data.stderr || ''}`
    // quick-and-dirty viewer
    window.alert(text.slice(0, 4000))
  }

  const handleDeploy = async (modelId: string | number) => {
    const model = models.find((m: Model) => m.id === modelId)
    if (!model) return

    if (!window.confirm(`Deploy "${model.name}" (v${model.version}) to RDK X5?`)) return

    try {
      const res = await fetch(`${apiBase}/models/${modelId}/deploy/`, {
        credentials: 'include', method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ device_ip: 'auto' }),
      })
      if (!res.ok) {
        const err = await res.json().catch(() => ({}))
        alert(`Deploy failed: ${err.error || res.statusText}`)
        return
      }
      alert(`Model "${model.name}" deployed to RDK X5 successfully!`)
      await fetchModels()
    } catch (error) {
      alert(`Deploy error: ${(error as Error).message}`)
    }
  }

  const triggerGitHubCompile = async () => {
    if (!convertForm.model_id) {
      alert('Please select a .pt model to compile.')
      return
    }
    const model = models.find((m: Model) => String(m.id) === String(convertForm.model_id))
    if (!model) return
    if (!window.confirm(`Trigger GitHub Actions to compile "${model.name}" v${model.version} to Horizon .bin?\n\nThe job will appear under the Actions tab of your GitHub repository.`)) return

    const res = await fetch(`${apiBase}/models/github-compile`, {
      credentials: 'include',
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ model_id: Number(convertForm.model_id) }),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Dispatch failed: ${err.error || res.statusText}`)
      return
    }
    alert('GitHub Actions compile job dispatched!\n\nTrack progress at:\nhttps://github.com/wilsonintai76/WeldVision-X5/actions')
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">AI Workspace</h2>
          <p className="text-slate-400 mt-1">Model deployment and device management</p>
        </div>

        {/* API Status Indicator */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${apiStatus
          ? 'bg-green-950/30 border-green-600'
          : 'bg-red-950/30 border-red-600'
          }`}>
          {apiStatus ? (
            <>
              <Wifi className="w-5 h-5 text-green-500" />
              <div>
                <p className="text-sm font-semibold text-white">API Online</p>
                <p className="text-xs text-green-400">Connected to RDK X5</p>
              </div>
            </>
          ) : (
            <>
              <WifiOff className="w-5 h-5 text-red-500" />
              <div>
                <p className="text-sm font-semibold text-white">API Offline</p>
                <p className="text-xs text-red-400">Connection Lost</p>
              </div>
            </>
          )}
        </div>
      </div>

      {/* 1. Upload Pre-trained Model Section */}
      <ModelUpload 
        uploadForm={uploadForm}
        setUploadForm={setUploadForm}
        uploadFile={uploadFile}
        setUploadFile={setUploadFile}
        uploading={uploading}
        onUpload={uploadPretrainedModel}
        fileInputRef={fileInputRef}
      />

      {/* Training image upload (webapp method) */}
      <ImageUpload folder="images/training" />

      {/* 2. Available Models Table */}
      <div className="bg-slate-900 rounded-xl border border-slate-800 p-6 shadow-sm">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-emerald-600/10 rounded-lg flex items-center justify-center">
              <Database className="w-6 h-6 text-emerald-500" />
            </div>
            <div>
              <h3 className="text-xl font-bold text-white">Model Inventory</h3>
              <p className="text-sm text-slate-500">Manage and deploy registered artifacts</p>
            </div>
          </div>
          <button
            onClick={fetchModels}
            className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors border border-slate-700"
          >
            <RefreshCw className="w-4 h-4" />
            Sync
          </button>
        </div>

        <div className="overflow-x-auto">
          {models.length === 0 ? (
            <div className="text-center py-12 border-2 border-dashed border-slate-800 rounded-xl">
              <HardDrive className="w-12 h-12 text-slate-800 mx-auto mb-3" />
              <p className="text-slate-400 font-medium">Your workspace is empty</p>
              <p className="text-sm text-slate-500 mt-1">Upload a model from the top section to get started</p>
            </div>
          ) : (
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Identity</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Version</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-center">Metrics</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Timestamp</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase">Status</th>
                  <th className="py-3 px-4 text-xs font-bold text-slate-500 uppercase text-right">Deployment</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/50">
                {models.map((model: Model) => (
                  <tr key={model.id} className="hover:bg-slate-800/30 transition-colors group">
                    <td className="py-4 px-4">
                      <div className="flex items-center gap-3">
                        <div className="w-8 h-8 bg-slate-800 rounded flex items-center justify-center group-hover:bg-blue-600/20 transition-colors">
                          <Download className="w-4 h-4 text-slate-400 group-hover:text-blue-400" />
                        </div>
                        <span className="text-white font-semibold">{model.name}</span>
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-slate-800 text-slate-400 rounded text-xs font-mono">{model.version}</span>
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="text-emerald-400 font-bold">{model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : '—'}</span>
                      <p className="text-[10px] text-slate-600 font-medium">mAP@.5</p>
                    </td>
                    <td className="py-4 px-4 text-slate-500 text-sm">{model.created_at ? new Date(model.created_at).toLocaleDateString() : 'N/A'}</td>
                    <td className="py-4 px-4">
                      {model.is_deployed ? (
                        <div className="flex items-center gap-2 text-emerald-400 text-sm font-bold bg-emerald-400/10 px-3 py-1 rounded-full w-fit">
                          <div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" />
                          Live on X5
                        </div>
                      ) : (
                        <span className="text-slate-600 text-sm font-medium italic">Available</span>
                      )}
                    </td>
                    <td className="py-4 px-4 text-right">
                      <button
                        onClick={() => handleDeploy(model.id)}
                        disabled={model.is_deployed}
                        className={`px-4 py-2 rounded-lg text-sm font-bold transition-all ${model.is_deployed
                          ? 'bg-slate-800 text-slate-600 cursor-not-allowed border border-slate-700'
                          : 'bg-white hover:bg-emerald-50 text-slate-950 shadow-sm active:scale-95'
                          }`}
                      >
                        {model.is_deployed ? 'Running' : 'Deploy Now'}
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* 3. BPU Converter Section */}
        <BPUConverter 
          convertForm={convertForm}
          setConvertForm={setConvertForm}
          convertibleModels={convertibleModels}
          onConvert={startConvert}
          onGitHubCompile={triggerGitHubCompile}
        />

        {/* 4. Jobs Section */}
        <div className="p-6 bg-slate-900 rounded-xl border border-slate-800 shadow-sm flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-blue-600/10 rounded-lg flex items-center justify-center">
                <RefreshCw className="w-6 h-6 text-blue-500" />
              </div>
              <div>
                <h3 className="text-xl font-bold text-white">Process Monitor</h3>
                <p className="text-sm text-slate-500">Live logs and background jobs</p>
              </div>
            </div>
            <button
              onClick={refreshJobs}
              title="Refresh jobs"
              className="p-2 text-slate-500 hover:text-white transition-colors"
            >
              <RefreshCw className={`w-5 h-5 ${jobsLoading ? 'animate-spin' : ''}`} />
            </button>
          </div>

          <div className="flex-1 overflow-auto max-h-[440px]">
            <table className="w-full">
              <thead>
                <tr className="text-left border-b border-slate-800">
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">ID</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase">Task</th>
                  <th className="py-2 px-3 text-[10px] font-bold text-slate-500 uppercase text-center">Status</th>
                  <th className="py-2 px-3 text-right text-[10px] font-bold text-slate-500 uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/30">
                {jobs.map((j: Job) => (
                  <tr key={j.id} className="group">
                    <td className="py-3 px-3 text-slate-500 text-xs">#{j.id}</td>
                    <td className="py-3 px-3">
                      <span className="text-white text-xs font-semibold capitalize">{j.job_type}</span>
                    </td>
                    <td className="py-3 px-3">
                      <div className="flex justify-center">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider ${j.status === 'succeeded' ? 'bg-emerald-500/10 text-emerald-500' :
                          j.status === 'failed' ? 'bg-red-500/10 text-red-500' :
                            j.status === 'running' ? 'bg-blue-500/10 text-blue-500 animate-pulse' :
                              'bg-slate-800 text-slate-500'
                          }`}>{j.status}</span>
                      </div>
                    </td>
                    <td className="py-3 px-3 text-right">
                      <div className="flex justify-end gap-1">
                        <button
                          onClick={() => viewLogs(j.id)}
                          className="p-1.5 bg-slate-800 hover:bg-slate-700 text-slate-400 hover:text-white rounded transition-colors"
                          title="View Logs"
                        >
                          <FileUp className="w-3.5 h-3.5" />
                        </button>
                        <button
                          onClick={() => registerArtifact(j.id)}
                          disabled={j.status !== 'succeeded'}
                          className={`p-1.5 rounded transition-all ${j.status === 'succeeded'
                            ? 'bg-emerald-600 hover:bg-emerald-500 text-white shadow-sm'
                            : 'bg-slate-800 text-slate-600 cursor-not-allowed'
                            }`}
                          title="Save as Model"
                        >
                          <CheckCircle className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={4} className="py-12 text-center">
                      <p className="text-slate-600 text-xs italic">No active processes</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  )
}

export default MLOps


