import { useState, useEffect } from 'react'
import { Play, Clock, CheckCircle, XCircle, Loader, Download, GitBranch, Database, Settings } from 'lucide-react'

function Training() {
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [jobs, setJobs] = useState([])
  const [jobsLoading, setJobsLoading] = useState(false)
  const [trainForm, setTrainForm] = useState({
    dataset_id: '',
    base_model: 'yolov8n.pt',
    epochs: 50,
    imgsz: 640,
    batch: 16,
    name: 'weldvision-model',
    version: '1.0.0'
  })

  useEffect(() => {
    fetchDatasets()
    fetchJobs()
  }, [])

  const fetchDatasets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/datasets/')
      if (response.ok) {
        const data = await response.json()
        setDatasets(data)
      }
    } catch (error) {
      console.error('Error fetching datasets:', error)
    }
  }

  const fetchJobs = async () => {
    setJobsLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/jobs/')
      if (response.ok) {
        const data = await response.json()
        setJobs(data.filter(job => job.job_type === 'train'))
      }
    } catch (error) {
      console.error('Error fetching jobs:', error)
    } finally {
      setJobsLoading(false)
    }
  }

  const startTraining = async (e) => {
    e.preventDefault()
    
    if (!selectedDataset) {
      alert('Please select a dataset')
      return
    }

    try {
      const response = await fetch('http://localhost:8000/api/jobs/train/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...trainForm,
          dataset_id: selectedDataset.id,
          data_yaml: `datasets/${selectedDataset.name}/data.yaml`
        })
      })

      if (response.ok) {
        alert('✓ Training job started!')
        fetchJobs()
      } else {
        const error = await response.json()
        alert('Failed to start training: ' + (error.detail || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error starting training:', error)
      alert('Failed to start training')
    }
  }

  const getStatusIcon = (status) => {
    switch (status) {
      case 'completed':
        return <CheckCircle className="w-5 h-5 text-green-500" />
      case 'failed':
        return <XCircle className="w-5 h-5 text-red-500" />
      case 'running':
        return <Loader className="w-5 h-5 text-blue-500 animate-spin" />
      default:
        return <Clock className="w-5 h-5 text-yellow-500" />
    }
  }

  return (
    <div className="flex-1 flex flex-col overflow-hidden bg-slate-950">
      {/* Header */}
      <div className="border-b border-slate-800 bg-slate-900/50 px-8 py-6">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Training & Versions</h1>
            <p className="text-slate-400">Train YOLO models and manage versions</p>
          </div>
          <div className="flex items-center gap-2 text-sm text-slate-400">
            <GitBranch className="w-4 h-4" />
            <span>{jobs.length} versions</span>
          </div>
        </div>
      </div>

      <div className="flex-1 overflow-auto p-8">
        <div className="max-w-7xl mx-auto grid grid-cols-3 gap-6">
          {/* Training Configuration */}
          <div className="col-span-1 space-y-6">
            <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
              <h2 className="text-xl font-semibold text-white mb-4 flex items-center gap-2">
                <Settings className="w-5 h-5" />
                Configuration
              </h2>

              <form onSubmit={startTraining} className="space-y-4">
                {/* Dataset Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Dataset *
                  </label>
                  <select
                    value={selectedDataset?.id || ''}
                    onChange={(e) => {
                      const ds = datasets.find(d => d.id === parseInt(e.target.value))
                      setSelectedDataset(ds)
                    }}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select dataset</option>
                    {datasets.map(ds => (
                      <option key={ds.id} value={ds.id}>
                        {ds.name} ({ds.image_count} images)
                      </option>
                    ))}
                  </select>
                </div>

                {/* Dataset Stats */}
                {selectedDataset && (
                  <div className="bg-slate-800/50 border border-slate-700 rounded p-3 space-y-2">
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Train:</span>
                      <span className="text-white font-medium">{selectedDataset.train_count || 0} images</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Valid:</span>
                      <span className="text-white font-medium">{selectedDataset.valid_count || 0} images</span>
                    </div>
                    <div className="flex justify-between text-sm">
                      <span className="text-slate-400">Test:</span>
                      <span className="text-white font-medium">{selectedDataset.test_count || 0} images</span>
                    </div>
                    <div className="flex justify-between text-sm pt-2 border-t border-slate-700">
                      <span className="text-slate-400">Classes:</span>
                      <span className="text-white font-medium">{selectedDataset.classes?.length || 0}</span>
                    </div>
                  </div>
                )}

                {/* Model Settings */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Base Model
                  </label>
                  <select
                    value={trainForm.base_model}
                    onChange={(e) => setTrainForm({ ...trainForm, base_model: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                  >
                    <option value="yolov8n.pt">YOLOv8 Nano (fastest)</option>
                    <option value="yolov8s.pt">YOLOv8 Small</option>
                    <option value="yolov8m.pt">YOLOv8 Medium</option>
                    <option value="yolov8l.pt">YOLOv8 Large</option>
                    <option value="yolov8x.pt">YOLOv8 XLarge (best)</option>
                  </select>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Epochs
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={trainForm.epochs}
                      onChange={(e) => setTrainForm({ ...trainForm, epochs: parseInt(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Batch Size
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={trainForm.batch}
                      onChange={(e) => setTrainForm({ ...trainForm, batch: parseInt(e.target.value) })}
                      className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Image Size
                  </label>
                  <select
                    value={trainForm.imgsz}
                    onChange={(e) => setTrainForm({ ...trainForm, imgsz: parseInt(e.target.value) })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                  >
                    <option value="320">320x320</option>
                    <option value="416">416x416</option>
                    <option value="640">640x640</option>
                    <option value="1280">1280x1280</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Version Name
                  </label>
                  <input
                    type="text"
                    value={trainForm.version}
                    onChange={(e) => setTrainForm({ ...trainForm, version: e.target.value })}
                    className="w-full bg-slate-800 border border-slate-700 rounded px-3 py-2 text-white"
                    placeholder="e.g., 1.0.0, v2-improved"
                  />
                </div>

                <button
                  type="submit"
                  disabled={!selectedDataset}
                  className="w-full flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-slate-700 disabled:cursor-not-allowed text-white px-4 py-3 rounded-lg font-medium transition-colors"
                >
                  <Play className="w-5 h-5" />
                  Start Training
                </button>
              </form>
            </div>
          </div>

          {/* Training Jobs / Versions */}
          <div className="col-span-2">
            <div className="bg-slate-900 border border-slate-800 rounded-lg">
              <div className="p-6 border-b border-slate-800">
                <h2 className="text-xl font-semibold text-white flex items-center gap-2">
                  <GitBranch className="w-5 h-5" />
                  Training History
                </h2>
              </div>

              <div className="p-6">
                {jobsLoading ? (
                  <div className="text-center py-12">
                    <Loader className="w-8 h-8 mx-auto mb-4 text-slate-500 animate-spin" />
                    <p className="text-slate-400">Loading training jobs...</p>
                  </div>
                ) : jobs.length === 0 ? (
                  <div className="text-center py-12">
                    <GitBranch className="w-16 h-16 mx-auto mb-4 text-slate-700" />
                    <p className="text-slate-400 mb-2">No training jobs yet</p>
                    <p className="text-sm text-slate-500">Start your first training to create a model version</p>
                  </div>
                ) : (
                  <div className="space-y-3">
                    {jobs.map((job) => (
                      <div
                        key={job.id}
                        className="bg-slate-800 border border-slate-700 rounded-lg p-4 hover:border-slate-600 transition-colors"
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start gap-3 flex-1">
                            {getStatusIcon(job.status)}
                            <div className="flex-1">
                              <div className="flex items-center gap-2 mb-1">
                                <h3 className="text-white font-medium">{job.name || 'Training Job'}</h3>
                                {job.version && (
                                  <span className="px-2 py-0.5 bg-slate-700 text-slate-300 text-xs rounded">
                                    {job.version}
                                  </span>
                                )}
                                <span className={`px-2 py-0.5 text-xs rounded ${
                                  job.status === 'completed' ? 'bg-green-600/20 text-green-400' :
                                  job.status === 'failed' ? 'bg-red-600/20 text-red-400' :
                                  job.status === 'running' ? 'bg-blue-600/20 text-blue-400' :
                                  'bg-yellow-600/20 text-yellow-400'
                                }`}>
                                  {job.status}
                                </span>
                              </div>
                              <div className="text-sm text-slate-400 space-y-1">
                                <div className="flex items-center gap-4">
                                  <span>Model: {job.base_model || 'yolov8n.pt'}</span>
                                  <span>Epochs: {job.epochs || 50}</span>
                                  <span>Size: {job.imgsz || 640}px</span>
                                </div>
                                <div className="text-xs text-slate-500">
                                  Started: {new Date(job.created_at).toLocaleString()}
                                </div>
                                {job.completed_at && (
                                  <div className="text-xs text-slate-500">
                                    Completed: {new Date(job.completed_at).toLocaleString()}
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                          {job.status === 'completed' && (
                            <button className="flex items-center gap-2 px-3 py-1.5 bg-emerald-600 hover:bg-emerald-700 text-white text-sm rounded">
                              <Download className="w-4 h-4" />
                              Download
                            </button>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  )
}

export default Training
