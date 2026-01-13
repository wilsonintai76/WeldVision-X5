import { useEffect, useMemo, useState } from 'react'
import { Upload, Power, Wifi, WifiOff, Download, CheckCircle, FlaskConical, RefreshCw, FileUp } from 'lucide-react'

function MLOps() {
  const [apiStatus, setApiStatus] = useState(false)
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
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
  const [models, setModels] = useState([
    { 
      id: 1, 
      name: 'v1.bin', 
      version: '1.0.0', 
      size: '45.2 MB', 
      date: '2026-01-05',
      deployed: false,
      accuracy: '92.3%'
    },
    { 
      id: 2, 
      name: 'v2.bin', 
      version: '2.0.0', 
      size: '48.7 MB', 
      date: '2026-01-10',
      deployed: true,
      accuracy: '94.7%'
    },
    { 
      id: 3, 
      name: 'v3-experimental.bin', 
      version: '3.0.0-beta', 
      size: '52.1 MB', 
      date: '2026-01-12',
      deployed: false,
      accuracy: '95.1%'
    },
  ])

  // Mock API Status Check
  useEffect(() => {
    const checkAPI = setInterval(() => {
      // Simulate random API connectivity
      setApiStatus(Math.random() > 0.1) // 90% uptime
    }, 3000)

    return () => clearInterval(checkAPI)
  }, [])

  const apiBase = useMemo(() => 'http://localhost:8000/api', [])

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

  useEffect(() => {
    refreshJobs()
    const t = setInterval(refreshJobs, 3000)
    return () => clearInterval(t)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [apiBase])

  const startTrain = async () => {
    if (!trainForm.data_yaml) {
      alert('Please set data.yaml path (data_yaml)')
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
    alert('Artifact registered as a model. You can now deploy it from the Models table/API.')
  }

  const viewLogs = async (jobId) => {
    const res = await fetch(`${apiBase}/jobs/${jobId}/logs/`)
    if (!res.ok) return
    const data = await res.json()
    const text = `STDOUT:\n${data.stdout || ''}\n\nSTDERR:\n${data.stderr || ''}`
    // quick-and-dirty viewer
    window.alert(text.slice(0, 4000))
  }

  const handleDeploy = (modelId) => {
    setModels(models.map(model => ({
      ...model,
      deployed: model.id === modelId
    })))
    alert(`Deploying model ${models.find(m => m.id === modelId).name} to RDK X5...`)
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
          <button className="flex items-center gap-2 px-4 py-2 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg transition-colors">
            <Upload className="w-4 h-4" />
            Upload New Model
          </button>
        </div>

        {/* Model Table */}
        <div className="overflow-x-auto">
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
                  <td className="py-4 px-4 text-slate-400">{model.size}</td>
                  <td className="py-4 px-4">
                    <span className="text-green-400 font-semibold">{model.accuracy}</span>
                  </td>
                  <td className="py-4 px-4 text-slate-400">{model.date}</td>
                  <td className="py-4 px-4">
                    {model.deployed ? (
                      <span className="flex items-center gap-2 text-green-400 text-sm font-medium">
                        <CheckCircle className="w-4 h-4" />
                        Deployed
                      </span>
                    ) : (
                      <span className="text-slate-500 text-sm">Inactive</span>
                    )}
                  </td>
                  <td className="py-4 px-4 text-right">
                    <button
                      onClick={() => handleDeploy(model.id)}
                      disabled={model.deployed}
                      className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${
                        model.deployed
                          ? 'bg-industrial-gray text-slate-500 cursor-not-allowed'
                          : 'bg-industrial-blue hover:bg-industrial-blue-dark text-white'
                      }`}
                    >
                      {model.deployed ? 'Active' : 'Deploy to Device'}
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
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
              <Input label="data_yaml" value={trainForm.data_yaml} onChange={(v) => setTrainForm({ ...trainForm, data_yaml: v })} placeholder="D:/datasets/weld/data.yaml" />
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
              <Input label="source_job_id (optional)" value={convertForm.source_job_id} onChange={(v) => setConvertForm({ ...convertForm, source_job_id: v })} placeholder="e.g. 12" />
              <Input label="weights_path (optional)" value={convertForm.weights_path} onChange={(v) => setConvertForm({ ...convertForm, weights_path: v })} placeholder="D:/.../best.pt" />
              <div className="grid grid-cols-2 gap-3">
                <Input label="format" value={convertForm.format} onChange={(v) => setConvertForm({ ...convertForm, format: v })} placeholder="onnx" />
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

      {/* Device Control Section */}
      <div className="grid grid-cols-2 gap-6">
        {/* Device Information */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Device Information</h3>
          <div className="space-y-3">
            <InfoRow label="Device Model" value="RDK X5" />
            <InfoRow label="IP Address" value="192.168.1.100" />
            <InfoRow label="Firmware Version" value="2.4.1" />
            <InfoRow label="Python Version" value="3.10.8" />
            <InfoRow label="OpenCV Version" value="4.8.1" />
            <InfoRow label="YOLOv8 Version" value="8.0.196" />
          </div>
        </div>

        {/* Device Control */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <h3 className="text-xl font-semibold text-white mb-4">Device Control</h3>
          
          <div className="space-y-4">
            <div className="p-4 bg-red-950/20 border-2 border-red-600/50 rounded-lg">
              <div className="flex items-center gap-2 mb-3">
                <Power className="w-5 h-5 text-red-400" />
                <span className="text-sm font-medium text-red-300">Danger Zone</span>
              </div>
              <p className="text-xs text-slate-400 mb-4">
                Rebooting the device will interrupt all live monitoring and require reconnection.
              </p>
              <button
                onClick={handleReboot}
                className="w-full px-4 py-3 bg-red-600 hover:bg-red-700 text-white rounded-lg font-semibold transition-colors flex items-center justify-center gap-2"
              >
                <Power className="w-4 h-4" />
                Reboot RDK X5
              </button>
            </div>

            {/* System Stats */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">CPU Usage</p>
                <p className="text-lg font-bold text-white">24%</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Memory</p>
                <p className="text-lg font-bold text-white">1.2 GB</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Temperature</p>
                <p className="text-lg font-bold text-white">42°C</p>
              </div>
              <div className="p-3 bg-industrial-dark rounded-lg">
                <p className="text-xs text-slate-400">Uptime</p>
                <p className="text-lg font-bold text-white">8d 4h</p>
              </div>
            </div>
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
