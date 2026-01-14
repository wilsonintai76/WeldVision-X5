import { useEffect, useMemo, useState } from 'react'
import { Power, Wifi, WifiOff, Download, CheckCircle, FlaskConical, RefreshCw, FileUp } from 'lucide-react'

function MLOps() {
  const [apiStatus, setApiStatus] = useState(false)
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [models, setModels] = useState([])
  const [trainForm, setTrainForm] = useState({
    name: 'weldvision-yolo',
    version: '',
    data_yaml: '',
    base_model: 'yolov8n.pt',
    epochs: 50,
    imgsz: 640,
  })
  const [convertForm, setConvertForm] = useState({
    source_job_id: '',
    weights_path: '',
    format: 'onnx',
    imgsz: 640,
    name: 'weldvision-yolo',
    version: '',
  })

  const apiBase = useMemo(() => 'http://localhost:8000/api', [])

  // Check API Status - real endpoint
  const checkApiStatus = async () => {
    try {
      const res = await fetch(`${apiBase}/jobs/`, { method: 'HEAD' })
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

  const fetchDatasets = async () => {
    try {
      const res = await fetch('http://localhost:8000/api/datasets/')
      if (res.ok) {
        const data = await res.json()
        setDatasets(data)
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
    }
  }

  useEffect(() => {
    checkApiStatus()
    fetchDatasets()
    fetchModels()
    refreshJobs()
    const t = setInterval(() => {
      checkApiStatus()
      refreshJobs()
      fetchModels()
    }, 5000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  const startTrain = async () => {
    if (!trainForm.data_yaml || !selectedDataset) {
      alert('Please select a dataset')
      return
    }
    const res = await fetch(`${apiBase}/train-model/`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(trainForm),
    })
    if (!res.ok) {
      const err = await res.json().catch(() => ({}))
      alert(`Train failed to start: ${err.error || res.statusText}`)
      return
    }
    await refreshJobs()
    alert('Training job started. Check Jobs section for progress/logs.')
  }

  const startConvert = async () => {
    if (!convertForm.source_job_id && !convertForm.weights_path) {
      alert('Set either source_job_id or weights_path')
      return
    }
    const payload = {
      ...convertForm,
      source_job_id: convertForm.source_job_id ? Number(convertForm.source_job_id) : undefined,
    }
    const res = await fetch(`${apiBase}/convert-model/`, {
      method: 'POST',
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

  const registerArtifact = async (jobId) => {
    const version = window.prompt('Model version to save as (must be unique):', '')
    if (version === null) return
    const res = await fetch(`${apiBase}/register-artifact/`, {
      method: 'POST',
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

  const viewLogs = async (jobId) => {
    const res = await fetch(`${apiBase}/jobs/${jobId}/logs/`)
    if (!res.ok) return
    const data = await res.json()
    const text = `STDOUT:\n${data.stdout || ''}\n\nSTDERR:\n${data.stderr || ''}`
    // quick-and-dirty viewer
    window.alert(text.slice(0, 4000))
  }

  const handleDeploy = async (modelId) => {
    const model = models.find(m => m.id === modelId)
    if (!model) return
    
    if (!window.confirm(`Deploy "${model.name}" (v${model.version}) to RDK X5?`)) return
    
    try {
      const res = await fetch(`${apiBase}/models/${modelId}/deploy/`, {
        method: 'POST',
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
      alert(`Deploy error: ${error.message}`)
    }
  }

  const handleReboot = () => {
    if (window.confirm('⚠️ Are you sure you want to reboot the RDK X5? This will interrupt live monitoring.')) {
      alert('Rebooting RDK X5 Edge Device...')
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">MLOps Center</h2>
          <p className="text-slate-400 mt-1">Model deployment and device management</p>
        </div>
        
        {/* API Status Indicator */}
        <div className={`flex items-center gap-3 px-4 py-2 rounded-lg border-2 ${
          apiStatus 
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

      {/* Model Management Section */}
      <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
        <div className="flex items-center justify-between mb-6">
          <h3 className="text-xl font-semibold text-white">Available Models</h3>
          <button 
            onClick={fetchModels}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-dark hover:bg-industrial-gray text-white rounded-lg transition-colors"
          >
            <RefreshCw className="w-4 h-4" />
            Refresh
          </button>
        </div>

        {/* Model Table */}
        <div className="overflow-x-auto">
          {models.length === 0 ? (
            <div className="text-center py-12">
              <Download className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500">No models registered yet</p>
              <p className="text-sm text-slate-600 mt-1">Train a model and register the artifact to see it here</p>
            </div>
          ) : (
          <table className="w-full">
            <thead>
              <tr className="border-b border-industrial-gray">
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Model Name</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Version</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Size</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Accuracy</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Date</th>
                <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Status</th>
                <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
              </tr>
            </thead>
            <tbody>
              {models.map((model) => (
                <tr key={model.id} className="border-b border-industrial-gray/50 hover:bg-industrial-dark transition-colors">
                  <td className="py-4 px-4">
                    <div className="flex items-center gap-2">
                      <Download className="w-4 h-4 text-slate-400" />
                      <span className="text-white font-medium">{model.name}</span>
                    </div>
                  </td>
                  <td className="py-4 px-4 text-slate-400">{model.version}</td>
                  <td className="py-4 px-4 text-slate-400">{model.file_size_mb ? `${model.file_size_mb.toFixed(1)} MB` : 'N/A'}</td>
                  <td className="py-4 px-4">
                    <span className="text-green-400 font-semibold">{model.accuracy ? `${(model.accuracy * 100).toFixed(1)}%` : 'N/A'}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-400">{model.created_at ? new Date(model.created_at).toLocaleDateString() : 'N/A'}</td>
                  <td className="py-4 px-4">
                    {model.is_deployed ? (
                      <span className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Deployed
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">{model.status || 'Inactive'}</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleDeploy(model.id)}
                      disabled={model.is_deployed}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        model.is_deployed
                          ? 'bg-industrial-gray text-slate-500 cursor-not-allowed'
                          : 'bg-industrial-blue hover:bg-industrial-blue-dark text-white'
                      }`}
                    >
                      {model.is_deployed ? 'Active' : 'Deploy to Device'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          )}
        </div>
      </div>

      {/* Training & Conversion */}
      <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-xl font-semibold text-white">Training & Conversion</h3>
            <p className="text-sm text-slate-400">Run on PC/server; deploy output to RDK X5</p>
          </div>
          <button
            onClick={refreshJobs}
            className="flex items-center gap-2 px-3 py-2 bg-industrial-dark hover:bg-industrial-gray text-white rounded-lg transition-colors"
          >
            <RefreshCw className={`w-4 h-4 ${jobsLoading ? 'animate-spin' : ''}`} />
            Refresh Jobs
          </button>
        </div>

        <div className="grid grid-cols-2 gap-6">
          <div className="p-4 bg-industrial-dark rounded-lg border border-industrial-gray/60">
            <div className="flex items-center gap-2 mb-3">
              <FlaskConical className="w-4 h-4 text-slate-300" />
              <p className="text-white font-semibold">Train (YOLOv8)</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Dataset</label>
                <select
                  value={selectedDataset?.id || ''}
                  onChange={(e) => {
                    const dataset = datasets.find(d => d.id === Number(e.target.value))
                    setSelectedDataset(dataset || null)
                    if (dataset) {
                      setTrainForm({ ...trainForm, data_yaml: `datasets/${dataset.name}/data.yaml` })
                    } else {
                      setTrainForm({ ...trainForm, data_yaml: '' })
                    }
                  }}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-industrial-blue"
                >
                  <option value="">Select dataset...</option>
                  {datasets.map((ds) => (
                    <option key={ds.id} value={ds.id}>
                      {ds.name} ({ds.image_count || 0} images)
                    </option>
                  ))}
                </select>
              </div>
              
              {selectedDataset && (
                <div className="p-3 bg-industrial-dark/50 border border-industrial-gray/40 rounded-lg">
                  <p className="text-xs font-medium text-slate-300 mb-2">Dataset Split</p>
                  <div className="grid grid-cols-3 gap-2 text-center">
                    <div>
                      <p className="text-lg font-bold text-green-400">{selectedDataset.train_count || 0}</p>
                      <p className="text-xs text-slate-400">Train</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-blue-400">{selectedDataset.valid_count || 0}</p>
                      <p className="text-xs text-slate-400">Valid</p>
                    </div>
                    <div>
                      <p className="text-lg font-bold text-purple-400">{selectedDataset.test_count || 0}</p>
                      <p className="text-xs text-slate-400">Test</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-3">
                <Input label="epochs" value={String(trainForm.epochs)} onChange={(v) => setTrainForm({ ...trainForm, epochs: Number(v || 0) })} />
                <Input label="imgsz" value={String(trainForm.imgsz)} onChange={(v) => setTrainForm({ ...trainForm, imgsz: Number(v || 0) })} />
              </div>
              <Input label="base_model" value={trainForm.base_model} onChange={(v) => setTrainForm({ ...trainForm, base_model: v })} placeholder="yolov8n.pt" />
              <Input label="version (optional)" value={trainForm.version} onChange={(v) => setTrainForm({ ...trainForm, version: v })} placeholder="1.0.0" />
              <button
                onClick={startTrain}
                className="w-full px-4 py-3 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg font-semibold transition-colors"
              >
                Start Training
              </button>
              <p className="text-xs text-slate-400">Requires backend env to have `ultralytics` installed.</p>
            </div>
          </div>

          <div className="p-4 bg-industrial-dark rounded-lg border border-industrial-gray/60">
            <div className="flex items-center gap-2 mb-3">
              <FileUp className="w-4 h-4 text-slate-300" />
              <p className="text-white font-semibold">Convert (Export)</p>
            </div>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium text-slate-300 mb-1">Source Training Job</label>
                <select
                  value={convertForm.source_job_id}
                  onChange={(e) => setConvertForm({ ...convertForm, source_job_id: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-industrial-blue"
                >
                  <option value="">Select completed training job...</option>
                  {jobs.filter(j => j.job_type === 'train' && j.status === 'success').map((job) => (
                    <option key={job.id} value={job.id}>
                      Job #{job.id} - {job.name || 'Training'} ({new Date(job.created_at).toLocaleDateString()})
                    </option>
                  ))}
                </select>
              </div>
              <div className="text-center text-xs text-slate-500 py-1">— or —</div>
              <Input label="weights_path (manual)" value={convertForm.weights_path} onChange={(v) => setConvertForm({ ...convertForm, weights_path: v })} placeholder="D:/.../best.pt" />
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label className="block text-xs font-medium text-slate-300 mb-1">format</label>
                  <select
                    value={convertForm.format}
                    onChange={(e) => setConvertForm({ ...convertForm, format: e.target.value })}
                    className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded-lg text-white text-sm focus:outline-none focus:ring-2 focus:ring-industrial-blue"
                  >
                    <option value="onnx">ONNX</option>
                    <option value="torchscript">TorchScript</option>
                    <option value="openvino">OpenVINO</option>
                    <option value="tflite">TFLite</option>
                  </select>
                </div>
                <Input label="imgsz" value={String(convertForm.imgsz)} onChange={(v) => setConvertForm({ ...convertForm, imgsz: Number(v || 0) })} />
              </div>
              <Input label="version (optional)" value={convertForm.version} onChange={(v) => setConvertForm({ ...convertForm, version: v })} placeholder="1.0.0-onnx" />
              <button
                onClick={startConvert}
                className="w-full px-4 py-3 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg font-semibold transition-colors"
              >
                Start Convert
              </button>
              <p className="text-xs text-slate-400">This exports to ONNX; RDK `.bin` needs Horizon toolchain.</p>
            </div>
          </div>
        </div>

        <div className="mt-6">
          <h4 className="text-white font-semibold mb-3">Jobs</h4>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-industrial-gray">
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">ID</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Type</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Status</th>
                  <th className="text-left py-2 px-3 text-sm font-semibold text-slate-300">Artifact</th>
                  <th className="text-right py-2 px-3 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {jobs.map((j) => (
                  <tr key={j.id} className="border-b border-industrial-gray/50">
                    <td className="py-2 px-3 text-slate-300">#{j.id}</td>
                    <td className="py-2 px-3 text-slate-400">{j.job_type}</td>
                    <td className="py-2 px-3">
                      <span className={`text-sm font-semibold ${
                        j.status === 'succeeded' ? 'text-green-400' :
                        j.status === 'failed' ? 'text-red-400' :
                        j.status === 'running' ? 'text-blue-400' :
                        'text-slate-400'
                      }`}>{j.status}</span>
                    </td>
                    <td className="py-2 px-3 text-slate-500 text-sm truncate max-w-[360px]">{j.artifact_path || '-'}</td>
                    <td className="py-2 px-3 text-right space-x-2">
                      <button
                        onClick={() => viewLogs(j.id)}
                        className="px-3 py-1 bg-industrial-gray hover:bg-industrial-slate text-white rounded-lg text-sm"
                      >
                        Logs
                      </button>
                      <button
                        onClick={() => registerArtifact(j.id)}
                        disabled={j.status !== 'succeeded'}
                        className={`px-3 py-1 rounded-lg text-sm ${
                          j.status === 'succeeded'
                            ? 'bg-green-700 hover:bg-green-800 text-white'
                            : 'bg-industrial-gray text-slate-500 cursor-not-allowed'
                        }`}
                      >
                        Register
                      </button>
                    </td>
                  </tr>
                ))}
                {jobs.length === 0 && (
                  <tr>
                    <td colSpan={5} className="py-4 px-3 text-slate-500">No jobs yet.</td>
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

function Input({ label, value, onChange, placeholder }) {
  return (
    <label className="block">
      <span className="text-xs text-slate-400">{label}</span>
      <input
        value={value}
        onChange={(e) => onChange(e.target.value)}
        placeholder={placeholder}
        className="mt-1 w-full px-3 py-2 bg-industrial-slate border border-industrial-gray rounded-lg text-white placeholder:text-slate-500"
      />
    </label>
  )
}

// Helper Component
function InfoRow({ label, value }) {
  return (
    <div className="flex items-center justify-between py-2 border-b border-industrial-gray/50">
      <span className="text-sm text-slate-400">{label}</span>
      <span className="text-sm text-white font-medium">{value}</span>
    </div>
  )
}

export default MLOps
