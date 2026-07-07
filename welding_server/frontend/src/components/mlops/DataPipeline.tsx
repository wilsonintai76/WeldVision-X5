import { useState, useEffect, useRef, FC } from 'react'
import { Upload, RefreshCw, BoxSelect, Database, Trash2, ArrowRight } from 'lucide-react'
import { getStoredToken } from '../../services/authAPI'

const CVAT_LABELS = [
  { name: 'porosity', color: '#ff0000', attributes: [] },
  { name: 'crack', color: '#00ff00', attributes: [] },
  { name: 'spatter', color: '#ff00ff', attributes: [] }
]

function authHeaders(): Record<string, string> {
  const token = getStoredToken()
  return token ? { 'Authorization': `Bearer ${token}` } : {}
}

export const DataPipeline: FC = () => {
  const [batches, setBatches] = useState<string[]>([])
  const [selectedBatch, setSelectedBatch] = useState<string>('')
  const [newBatchName, setNewBatchName] = useState<string>('')
  
  const [cvatToken, setCvatToken] = useState(localStorage.getItem('CVAT_TOKEN') || '')
  const cvatHost = 'https://cvat.weldvision-x5.com'
  const cvatCloudStorageId = 2
  
  const [tasks, setTasks] = useState<any[]>([])
  const [loadingTasks, setLoadingTasks] = useState(false)
  
  const [tunnelStatus, setTunnelStatus] = useState<'checking' | 'online' | 'offline'>('checking')
  
  const [uploadFiles, setUploadFiles] = useState<FileList | null>(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  
  const fileInputRef = useRef<HTMLInputElement>(null)

  useEffect(() => {
    fetchBatches()
    checkTunnelStatus()
  }, [])

  const checkTunnelStatus = async () => {
    setTunnelStatus('checking')
    try {
      const res = await fetch('/api/models/tunnel-status', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json() as { status: 'online' | 'offline' }
        setTunnelStatus(data.status)
      } else {
        setTunnelStatus('offline')
      }
    } catch {
      setTunnelStatus('offline')
    }
  }

  useEffect(() => {
    if (cvatToken) {
      localStorage.setItem('CVAT_TOKEN', cvatToken)
      fetchTasks()
    }
  }, [cvatToken])

  const fetchBatches = async () => {
    try {
      const res = await fetch('/api/storage/batches', { headers: authHeaders() })
      if (res.ok) {
        const data = await res.json() as { batches: string[] }
        setBatches(data.batches || [])
      }
    } catch { /* ignore */ }
  }

  const cvatHeaders = () => ({
    'Authorization': `Token ${cvatToken}`,
    'Content-Type': 'application/json'
  })

  const fetchTasks = async () => {
    if (!cvatToken) return
    setLoadingTasks(true)
    try {
      const res = await fetch(`${cvatHost}/api/tasks`, { headers: cvatHeaders() })
      if (res.ok) {
        const data = await res.json() as any;
        setTasks(data.results || [])
      }
    } catch {
      console.warn('Could not fetch CVAT tasks. Is the tunnel running and token correct?')
    } finally {
      setLoadingTasks(false)
    }
  }

  const handleUpload = async () => {
    if (!uploadFiles || uploadFiles.length === 0) return alert('Select images to upload')
    const targetBatch = newBatchName || selectedBatch
    if (!targetBatch) return alert('Enter or select a batch name')

    setUploading(true)
    let uploadedCount = 0
    
    for (let i = 0; i < uploadFiles.length; i++) {
      const file = uploadFiles[i]
      const form = new FormData()
      form.append('file', file)
      form.append('folder', `raw/${targetBatch}`)
      
      try {
        await fetch('/api/storage/upload', {
          method: 'POST',
          headers: authHeaders(),
          body: form
        })
        uploadedCount++
        setUploadProgress(Math.round((uploadedCount / uploadFiles.length) * 100))
      } catch (err) {
        console.error('Failed to upload', file.name)
      }
    }
    
    setUploading(false)
    setUploadFiles(null)
    if (fileInputRef.current) fileInputRef.current.value = ''
    setUploadProgress(0)
    alert(`Successfully uploaded ${uploadedCount} images to R2 (raw/${targetBatch})`)
    fetchBatches()
    if (!selectedBatch) setSelectedBatch(targetBatch)
  }

  const handleCreateTask = async () => {
    if (!cvatToken) return alert('Please enter your CVAT Token first.')
    const targetBatch = selectedBatch || newBatchName
    if (!targetBatch) return alert('Select a batch first.')
    
    try {
      // 1. Fetch the exact list of files from R2 for this batch
      const filesRes = await fetch(`/api/storage/files?prefix=raw/${targetBatch}/`, { headers: authHeaders() })
      if (!filesRes.ok) return alert('Failed to fetch file list for batch')
      const { files } = await filesRes.json() as { files: string[] }
      if (!files || files.length === 0) return alert('No files found in R2 for this batch. Upload some first.')

      // 2. Create CVAT Task connected to R2 Cloud Storage
      const res = await fetch(`${cvatHost}/api/tasks`, {
        method: 'POST',
        headers: cvatHeaders(),
        body: JSON.stringify({
          name: `weld-${targetBatch}`,
          labels: CVAT_LABELS,
          source_storage: {
            location: 'cloud_storage',
            cloud_storage_id: cvatCloudStorageId,
          },
          // CVAT requires the explicit list of relative file paths to sync from cloud storage
          server_files: files
        })
      })
      
      if (!res.ok) {
        const err = await res.json()
        return alert(`Failed to create task: ${JSON.stringify(err)}`)
      }
      
      alert(`Task created for batch ${targetBatch} with ${files.length} images!`)
      fetchTasks()
    } catch (err) {
      alert(`Error creating task: ${(err as Error).message}`)
    }
  }

  const handleDeleteTask = async (taskId: number) => {
    if (!confirm(`Delete task ${taskId}?`)) return
    try {
      await fetch(`${cvatHost}/api/tasks/${taskId}`, {
        method: 'DELETE',
        headers: cvatHeaders()
      })
      fetchTasks()
    } catch (err) {
      alert(`Failed to delete task: ${(err as Error).message}`)
    }
  }

  const handleExport = async (batch: string) => {
    if (!confirm(`Trigger GitHub Actions to export YOLO annotations for batch '${batch}'?`)) return
    try {
      const res = await fetch('/api/models/github-export-cvat', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      })
      if (!res.ok) throw new Error(await res.text())
      alert(`Export triggered via GitHub Actions! Check your repo actions tab.`)
    } catch (err) {
      alert(`Export dispatch failed: ${(err as Error).message}`)
    }
  }

  const handleTrain = async (batch: string) => {
    if (!confirm(`Trigger Kaggle Training for batch '${batch}'?\nThis will provision a GPU and run weldvision_train.ipynb.`)) return
    try {
      const res = await fetch('/api/models/github-train-kaggle', {
        method: 'POST',
        headers: { ...authHeaders(), 'Content-Type': 'application/json' },
        body: JSON.stringify({ batch })
      })
      if (!res.ok) throw new Error(await res.text())
      alert(`Training triggered via GitHub Actions! Model will appear in Model Registry when done.`)
    } catch (err) {
      alert(`Train dispatch failed: ${(err as Error).message}`)
    }
  }

  return (
    <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4 duration-500">
      
      {/* CVAT Auth Bar */}
      <div className="p-4 bg-slate-900 border border-slate-800 rounded-xl flex items-center gap-4 flex-wrap">
        <BoxSelect className="w-5 h-5 text-blue-400" />
        <div className="flex-1">
          <label className="text-xs font-semibold text-slate-400 uppercase mb-1 block">CVAT API Token</label>
          <input 
            type="password"
            value={cvatToken}
            onChange={(e) => setCvatToken(e.target.value)}
            placeholder="Paste CVAT token here..."
            className="w-full max-w-md px-3 py-1.5 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:outline-none focus:border-blue-500"
          />
        </div>
        <div className="text-xs text-slate-500 max-w-sm space-y-2">
          <div className="flex items-center gap-2">
            Tunnel Status: 
            {tunnelStatus === 'checking' && <span className="text-slate-400 flex items-center gap-1"><RefreshCw className="w-3 h-3 animate-spin" /> Checking...</span>}
            {tunnelStatus === 'online' && <span className="text-emerald-400 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-emerald-400 rounded-full animate-pulse" /> Connected to Docker</span>}
            {tunnelStatus === 'offline' && <span className="text-red-400 font-bold flex items-center gap-1"><div className="w-2 h-2 bg-red-400 rounded-full" /> Offline</span>}
            <button onClick={checkTunnelStatus} className="p-1 hover:text-white transition-colors" title="Check status">
              <RefreshCw className="w-3 h-3" />
            </button>
          </div>
          <div>
            Ensure Cloudflared tunnel is running to connect to <code className="text-slate-300">cvat.weldvision-x5.com</code>
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Upload & Setup */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-5">
          <h3 className="text-lg font-bold text-white flex items-center gap-2">
            <Database className="w-5 h-5 text-emerald-400" /> Data Source (R2)
          </h3>
          
          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">1. Select Existing Batch (e.g. from RDK)</label>
            <div className="flex gap-2">
              <select 
                value={selectedBatch} 
                onChange={e => setSelectedBatch(e.target.value)}
                className="flex-1 px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-emerald-500 outline-none"
              >
                <option value="">-- Select a batch --</option>
                {batches.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <button onClick={fetchBatches} className="p-2 bg-slate-800 rounded-lg hover:bg-slate-700 transition-colors">
                <RefreshCw className="w-4 h-4 text-slate-300" />
              </button>
            </div>
          </div>

          <div className="relative py-2">
            <div className="absolute inset-0 flex items-center"><div className="w-full border-t border-slate-800"></div></div>
            <div className="relative flex justify-center"><span className="bg-slate-900 px-2 text-xs text-slate-500 uppercase font-bold">OR</span></div>
          </div>

          <div className="space-y-3">
            <label className="block text-sm font-semibold text-slate-300">2. Upload New Local Batch</label>
            <input 
              type="text" 
              placeholder="New batch name (e.g. batch2)"
              value={newBatchName}
              onChange={e => { setNewBatchName(e.target.value); setSelectedBatch(''); }}
              className="w-full px-3 py-2 bg-slate-950 border border-slate-800 rounded-lg text-sm text-slate-200 focus:border-emerald-500 outline-none"
            />
            <input 
              type="file" multiple accept="image/*"
              ref={fileInputRef}
              onChange={e => setUploadFiles(e.target.files)}
              className="w-full text-sm text-slate-400 file:mr-4 file:py-2 file:px-4 file:rounded-lg file:border-0 file:text-sm file:font-semibold file:bg-slate-800 file:text-white hover:file:bg-slate-700"
            />
            <button 
              onClick={handleUpload}
              disabled={uploading || (!uploadFiles || uploadFiles.length === 0)}
              className="w-full py-2 bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white font-bold rounded-lg flex justify-center items-center gap-2"
            >
              {uploading ? <RefreshCw className="w-4 h-4 animate-spin" /> : <Upload className="w-4 h-4" />}
              {uploading ? `Uploading... ${uploadProgress}%` : 'Upload Images'}
            </button>
          </div>

          <div className="pt-4 border-t border-slate-800">
            <button 
              onClick={handleCreateTask}
              className="w-full py-2.5 bg-blue-600 hover:bg-blue-500 text-white font-bold rounded-lg shadow-lg flex justify-center items-center gap-2"
            >
              <BoxSelect className="w-4 h-4" /> Create CVAT Task
            </button>
            <p className="text-xs text-center text-slate-500 mt-2">Creates a new annotation task in CVAT linked to the selected batch.</p>
          </div>
        </div>

        {/* Tasks & Actions */}
        <div className="p-6 bg-slate-900 border border-slate-800 rounded-xl space-y-4">
          <div className="flex justify-between items-center mb-2">
            <h3 className="text-lg font-bold text-white">Annotation Tasks</h3>
            <button onClick={fetchTasks} className="text-slate-400 hover:text-white"><RefreshCw className={`w-4 h-4 ${loadingTasks ? 'animate-spin' : ''}`} /></button>
          </div>
          
          {!cvatToken && (
            <div className="text-sm text-amber-400 bg-amber-400/10 p-3 rounded-lg border border-amber-400/20">
              Provide your CVAT Token to view tasks.
            </div>
          )}

          {cvatToken && tasks.length === 0 && !loadingTasks && (
            <div className="text-sm text-slate-500 text-center py-8">No tasks found.</div>
          )}

          <div className="space-y-3 overflow-y-auto max-h-[500px] pr-2">
            {tasks.map(t => {
              const batchName = t.name.replace('weld-', '')
              return (
                <div key={t.id} className="p-4 bg-slate-950 border border-slate-800 rounded-lg hover:border-slate-700 transition-colors">
                  <div className="flex justify-between items-start mb-3">
                    <div>
                      <div className="font-bold text-slate-200">{t.name}</div>
                      <div className="text-xs text-slate-500">Status: {t.status} | ID: {t.id}</div>
                    </div>
                    <button onClick={() => handleDeleteTask(t.id)} className="text-red-500 hover:text-red-400 p-1">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <a 
                      href={`${cvatHost}/tasks/${t.id}`} 
                      target="_blank" rel="noreferrer"
                      className="px-3 py-1.5 bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold rounded-md border border-slate-700 flex items-center gap-1"
                    >
                      Annotate <ArrowRight className="w-3 h-3" />
                    </a>
                    <button 
                      onClick={() => handleExport(batchName)}
                      className="px-3 py-1.5 bg-blue-600/20 hover:bg-blue-600/30 text-blue-400 text-xs font-semibold rounded-md border border-blue-500/30"
                    >
                      Export YOLO
                    </button>
                    <button 
                      onClick={() => handleTrain(batchName)}
                      className="px-3 py-1.5 bg-emerald-600/20 hover:bg-emerald-600/30 text-emerald-400 text-xs font-semibold rounded-md border border-emerald-500/30"
                    >
                      Train Kaggle
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>

      </div>
    </div>
  )
}
