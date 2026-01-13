import { useState, useEffect, useRef } from 'react'
import { FolderPlus, ImagePlus, Download, Tag, Trash2, X, Save, ChevronLeft, ChevronRight } from 'lucide-react'

const DEFECT_CLASSES = [
  { name: 'porosity', color: '#ef4444' },
  { name: 'spatter', color: '#f97316' },
  { name: 'slag_inclusion', color: '#eab308' },
  { name: 'undercut', color: '#22c55e' },
  { name: 'burn_through', color: '#3b82f6' },
  { name: 'crack', color: '#a855f7' },
  { name: 'incomplete_fusion', color: '#ec4899' },
]

function Labeling() {
  const [datasets, setDatasets] = useState([])
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [selectedClass, setSelectedClass] = useState('porosity')
  
  // Canvas state
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [currentBox, setCurrentBox] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  
  // Modals
  const [showDatasetModal, setShowDatasetModal] = useState(false)
  const [datasetForm, setDatasetForm] = useState({
    name: '',
    description: '',
    classes: DEFECT_CLASSES.map(c => c.name),
    created_by: ''
  })

  useEffect(() => {
    fetchDatasets()
  }, [])

  useEffect(() => {
    if (selectedDataset) {
      fetchImages(selectedDataset.id)
    }
  }, [selectedDataset])

  useEffect(() => {
    if (selectedImage) {
      fetchAnnotations(selectedImage.id)
    }
  }, [selectedImage])

  useEffect(() => {
    if (canvasRef.current && imageLoaded && selectedImage) {
      drawCanvas()
    }
  }, [annotations, currentBox, imageLoaded, selectedImage])

  const fetchDatasets = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/datasets/')
      const data = await response.json()
      setDatasets(data)
    } catch (error) {
      console.error('Error fetching datasets:', error)
    }
  }

  const fetchImages = async (datasetId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/labeled-images/?dataset=${datasetId}`)
      const data = await response.json()
      setImages(data)
    } catch (error) {
      console.error('Error fetching images:', error)
    }
  }

  const fetchAnnotations = async (imageId) => {
    try {
      const response = await fetch(`http://localhost:8000/api/annotations/?image=${imageId}`)
      const data = await response.json()
      setAnnotations(data)
    } catch (error) {
      console.error('Error fetching annotations:', error)
    }
  }

  const createDataset = async (e) => {
    e.preventDefault()
    try {
      const response = await fetch('http://localhost:8000/api/datasets/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(datasetForm),
      })
      if (response.ok) {
        await fetchDatasets()
        setShowDatasetModal(false)
        setDatasetForm({ name: '', description: '', classes: DEFECT_CLASSES.map(c => c.name), created_by: '' })
      }
    } catch (error) {
      console.error('Error creating dataset:', error)
    }
  }

  const uploadImages = async (e) => {
    const files = Array.from(e.target.files)
    for (const file of files) {
      const formData = new FormData()
      formData.append('image', file)
      formData.append('dataset', selectedDataset.id)
      formData.append('filename', file.name)
      
      try {
        await fetch('http://localhost:8000/api/labeled-images/', {
          method: 'POST',
          body: formData,
        })
      } catch (error) {
        console.error('Error uploading image:', error)
      }
    }
    fetchImages(selectedDataset.id)
  }

  const exportDataset = async () => {
    if (!selectedDataset) return
    try {
      const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset.id}/export_yolo/`)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${selectedDataset.name}_yolo.zip`
      a.click()
    } catch (error) {
      console.error('Error exporting dataset:', error)
    }
  }

  const deleteAnnotation = async (annId) => {
    try {
      await fetch(`http://localhost:8000/api/annotations/${annId}/`, { method: 'DELETE' })
      fetchAnnotations(selectedImage.id)
    } catch (error) {
      console.error('Error deleting annotation:', error)
    }
  }

  // Canvas drawing functions
  const loadImage = (imgUrl) => {
    const canvas = canvasRef.current
    if (!canvas) return

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Set canvas size to image size (max 800x600)
      const maxWidth = 800
      const maxHeight = 600
      let width = img.width
      let height = img.height
      
      if (width > maxWidth) {
        height = (maxWidth / width) * height
        width = maxWidth
      }
      if (height > maxHeight) {
        width = (maxHeight / height) * width
        height = maxHeight
      }
      
      canvas.width = width
      canvas.height = height
      setImageDimensions({ width: img.width, height: img.height })
      
      ctx.drawImage(img, 0, 0, width, height)
      setImageLoaded(true)
    }
    img.src = imgUrl
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedImage) return

    const ctx = canvas.getContext('2d')
    
    // Reload image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Draw existing annotations
      annotations.forEach(ann => {
        const classColor = DEFECT_CLASSES.find(c => c.name === ann.class_name)?.color || '#ffffff'
        drawBox(ctx, ann, classColor, canvas.width, canvas.height)
      })
      
      // Draw current box being drawn
      if (currentBox) {
        const classColor = DEFECT_CLASSES.find(c => c.name === selectedClass)?.color || '#ffffff'
        ctx.strokeStyle = classColor
        ctx.lineWidth = 2
        ctx.strokeRect(currentBox.x, currentBox.y, currentBox.width, currentBox.height)
      }
    }
    img.src = selectedImage.image_url
  }

  const drawBox = (ctx, ann, color, canvasWidth, canvasHeight) => {
    // Convert normalized coordinates to pixel coordinates
    const x = (ann.x_center - ann.width / 2) * canvasWidth
    const y = (ann.y_center - ann.height / 2) * canvasHeight
    const width = ann.width * canvasWidth
    const height = ann.height * canvasHeight
    
    ctx.strokeStyle = color
    ctx.fillStyle = color + '30'
    ctx.lineWidth = 2
    ctx.strokeRect(x, y, width, height)
    ctx.fillRect(x, y, width, height)
    
    // Draw label
    ctx.fillStyle = color
    ctx.fillRect(x, y - 20, ctx.measureText(ann.class_name).width + 10, 20)
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.fillText(ann.class_name, x + 5, y - 5)
  }

  const handleMouseDown = (e) => {
    if (!selectedImage) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setIsDrawing(true)
    setStartPoint({ x, y })
  }

  const handleMouseMove = (e) => {
    if (!isDrawing || !startPoint) return
    const rect = canvasRef.current.getBoundingClientRect()
    const x = e.clientX - rect.left
    const y = e.clientY - rect.top
    setCurrentBox({
      x: Math.min(startPoint.x, x),
      y: Math.min(startPoint.y, y),
      width: Math.abs(x - startPoint.x),
      height: Math.abs(y - startPoint.y)
    })
  }

  const handleMouseUp = async () => {
    if (!isDrawing || !currentBox || !selectedImage) return
    
    const canvas = canvasRef.current
    // Convert pixel coordinates to normalized YOLO format
    const x_center = (currentBox.x + currentBox.width / 2) / canvas.width
    const y_center = (currentBox.y + currentBox.height / 2) / canvas.height
    const width = currentBox.width / canvas.width
    const height = currentBox.height / canvas.height
    
    // Save annotation
    try {
      await fetch('http://localhost:8000/api/annotations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage.id,
          class_name: selectedClass,
          x_center,
          y_center,
          width,
          height
        }),
      })
      fetchAnnotations(selectedImage.id)
    } catch (error) {
      console.error('Error saving annotation:', error)
    }
    
    setIsDrawing(false)
    setStartPoint(null)
    setCurrentBox(null)
  }

  const selectImage = (img) => {
    setSelectedImage(img)
    setImageLoaded(false)
    loadImage(img.image_url)
  }

  const navigateImage = (direction) => {
    const currentIndex = images.findIndex(img => img.id === selectedImage?.id)
    if (currentIndex === -1) return
    
    const newIndex = direction === 'next' 
      ? (currentIndex + 1) % images.length 
      : (currentIndex - 1 + images.length) % images.length
    
    selectImage(images[newIndex])
  }

  return (
    <div className="flex h-screen bg-industrial-darker">
      {/* Sidebar - Datasets & Images */}
      <aside className="w-80 bg-industrial-dark border-r border-industrial-gray flex flex-col">
        <div className="p-4 border-b border-industrial-gray">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-bold text-white">Datasets</h2>
            <button
              onClick={() => setShowDatasetModal(true)}
              className="p-2 bg-blue-600 hover:bg-blue-700 rounded text-white"
              title="New Dataset"
            >
              <FolderPlus className="w-4 h-4" />
            </button>
          </div>
          
          <select
            value={selectedDataset?.id || ''}
            onChange={(e) => {
              const dataset = datasets.find(d => d.id === parseInt(e.target.value))
              setSelectedDataset(dataset)
              setSelectedImage(null)
            }}
            className="w-full bg-industrial-darker border border-industrial-gray rounded px-3 py-2 text-white"
          >
            <option value="">Select Dataset</option>
            {datasets.map(ds => (
              <option key={ds.id} value={ds.id}>
                {ds.name} ({ds.image_count} images)
              </option>
            ))}
          </select>
        </div>

        {selectedDataset && (
          <>
            <div className="p-4 border-b border-industrial-gray">
              <div className="flex gap-2">
                <label className="flex-1 cursor-pointer">
                  <div className="flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-3 py-2 rounded text-sm">
                    <ImagePlus className="w-4 h-4" />
                    Upload Images
                  </div>
                  <input type="file" multiple accept="image/*" onChange={uploadImages} className="hidden" />
                </label>
                <button
                  onClick={exportDataset}
                  className="flex items-center gap-2 bg-industrial-slate hover:bg-industrial-gray text-white px-3 py-2 rounded text-sm"
                  title="Export YOLO Format"
                >
                  <Download className="w-4 h-4" />
                </button>
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4">
              <h3 className="text-sm font-medium text-slate-400 mb-2">Images ({images.length})</h3>
              <div className="space-y-2">
                {images.map(img => (
                  <div
                    key={img.id}
                    onClick={() => selectImage(img)}
                    className={`p-2 rounded cursor-pointer transition-colors ${
                      selectedImage?.id === img.id
                        ? 'bg-blue-600 text-white'
                        : 'bg-industrial-slate hover:bg-industrial-gray text-slate-300'
                    }`}
                  >
                    <div className="text-sm font-medium truncate">{img.filename}</div>
                    <div className="text-xs opacity-75">
                      {img.annotation_count} annotations {img.is_labeled && '✓'}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </>
        )}
      </aside>

      {/* Main Canvas Area */}
      <main className="flex-1 flex flex-col overflow-hidden">
        {selectedImage ? (
          <>
            {/* Top Toolbar */}
            <div className="bg-industrial-dark border-b border-industrial-gray p-4">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-4">
                  <button
                    onClick={() => navigateImage('prev')}
                    className="p-2 bg-industrial-slate hover:bg-industrial-gray rounded text-white"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                  <span className="text-white font-medium">{selectedImage.filename}</span>
                  <button
                    onClick={() => navigateImage('next')}
                    className="p-2 bg-industrial-slate hover:bg-industrial-gray rounded text-white"
                  >
                    <ChevronRight className="w-5 h-5" />
                  </button>
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Class:</span>
                  {DEFECT_CLASSES.map(cls => (
                    <button
                      key={cls.name}
                      onClick={() => setSelectedClass(cls.name)}
                      className={`px-3 py-1 rounded text-sm font-medium transition-all ${
                        selectedClass === cls.name
                          ? 'text-white'
                          : 'bg-industrial-slate text-slate-400 hover:text-white'
                      }`}
                      style={selectedClass === cls.name ? { backgroundColor: cls.color } : {}}
                    >
                      {cls.name.replace('_', ' ')}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Canvas */}
            <div className="flex-1 overflow-auto bg-slate-900 p-8">
              <div className="inline-block">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="border-2 border-industrial-gray cursor-crosshair"
                />
              </div>
            </div>

            {/* Annotations List */}
            <div className="bg-industrial-dark border-t border-industrial-gray p-4">
              <div className="flex items-center justify-between mb-2">
                <h3 className="text-sm font-medium text-white">Annotations ({annotations.length})</h3>
              </div>
              <div className="flex gap-2 overflow-x-auto">
                {annotations.map(ann => {
                  const classColor = DEFECT_CLASSES.find(c => c.name === ann.class_name)?.color || '#ffffff'
                  return (
                    <div
                      key={ann.id}
                      className="flex items-center gap-2 bg-industrial-slate rounded px-3 py-2 text-white text-sm whitespace-nowrap"
                    >
                      <div className="w-3 h-3 rounded" style={{ backgroundColor: classColor }}></div>
                      <span>{ann.class_name.replace('_', ' ')}</span>
                      <button
                        onClick={() => deleteAnnotation(ann.id)}
                        className="text-red-400 hover:text-red-300"
                      >
                        <X className="w-4 h-4" />
                      </button>
                    </div>
                  )
                })}
              </div>
            </div>
          </>
        ) : (
          <div className="flex-1 flex items-center justify-center text-slate-500">
            <div className="text-center">
              <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
              <p className="text-lg">Select a dataset and image to start labeling</p>
              <p className="text-sm mt-2">Draw bounding boxes to annotate defects</p>
            </div>
          </div>
        )}
      </main>

      {/* Dataset Modal */}
      {showDatasetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-industrial-dark rounded-lg max-w-lg w-full">
            <div className="p-6 border-b border-industrial-gray flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Create New Dataset</h2>
              <button onClick={() => setShowDatasetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={createDataset} className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Name *</label>
                  <input
                    type="text"
                    required
                    value={datasetForm.name}
                    onChange={(e) => setDatasetForm({ ...datasetForm, name: e.target.value })}
                    className="w-full bg-industrial-darker border border-industrial-gray rounded px-3 py-2 text-white"
                    placeholder="e.g., Weld Defects 2026"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={datasetForm.description}
                    onChange={(e) => setDatasetForm({ ...datasetForm, description: e.target.value })}
                    className="w-full bg-industrial-darker border border-industrial-gray rounded px-3 py-2 text-white"
                    rows="3"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Created By</label>
                  <input
                    type="text"
                    value={datasetForm.created_by}
                    onChange={(e) => setDatasetForm({ ...datasetForm, created_by: e.target.value })}
                    className="w-full bg-industrial-darker border border-industrial-gray rounded px-3 py-2 text-white"
                    placeholder="Your name"
                  />
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDatasetModal(false)}
                  className="flex-1 bg-industrial-slate hover:bg-industrial-gray text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded"
                >
                  <Save className="w-5 h-5" />
                  Create Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default Labeling
