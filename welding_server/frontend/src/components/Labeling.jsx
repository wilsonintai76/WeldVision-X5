import { useState, useEffect, useRef } from 'react'
import { FolderPlus, ImagePlus, Download, Tag, Trash2, X, Save, ChevronLeft, ChevronRight, Wand2, Upload, Plus, Search, Folder, Image as ImageIcon, Check, Database } from 'lucide-react'

function Labeling({ initialView = 'datasets' }) {
  const [currentView, setCurrentView] = useState(initialView) // 'upload', 'annotate', 'datasets', 'classes'
  const [datasets, setDatasets] = useState([])
  const [defectClasses, setDefectClasses] = useState([]) // All available defect classes
  const [selectedDataset, setSelectedDataset] = useState(null)
  const [images, setImages] = useState([])
  const [selectedImage, setSelectedImage] = useState(null)
  const [annotations, setAnnotations] = useState([])
  const [selectedClass, setSelectedClass] = useState(null)
  const [annotationMode, setAnnotationMode] = useState(false) // Toggle between list and annotation view
  const [pendingBox, setPendingBox] = useState(null) // Box waiting for class selection
  const [showClassPicker, setShowClassPicker] = useState(false) // Show class picker modal
  const [selectedClassForAnnotation, setSelectedClassForAnnotation] = useState(null) // Selected class in annotation editor
  const [selectedImages, setSelectedImages] = useState([]) // Selected images for bulk operations
  const [selectMode, setSelectMode] = useState(false) // Enable/disable selection mode
  
  // Canvas state
  const canvasRef = useRef(null)
  const [isDrawing, setIsDrawing] = useState(false)
  const [startPoint, setStartPoint] = useState(null)
  const [currentBox, setCurrentBox] = useState(null)
  const [imageLoaded, setImageLoaded] = useState(false)
  const [imageDimensions, setImageDimensions] = useState({ width: 0, height: 0 })
  
  // Modals
  const [showDatasetModal, setShowDatasetModal] = useState(false)
  const [showClassModal, setShowClassModal] = useState(false)
  const [showEditDatasetModal, setShowEditDatasetModal] = useState(false)
  const [isDragging, setIsDragging] = useState(false)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState({ current: 0, total: 0 })
  const fileInputRef = useRef(null)
  const folderInputRef = useRef(null)
  const [selectedClassIds, setSelectedClassIds] = useState([]) // IDs of classes selected for dataset
  const [editingClass, setEditingClass] = useState(null) // Class being edited
  const [batchName, setBatchName] = useState(`Uploaded on ${new Date().toLocaleDateString()} at ${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`)
  const [datasetForm, setDatasetForm] = useState({
    name: '',
    description: '',
    created_by: '',
    train_split: 80,
    valid_split: 10,
    test_split: 10
  })
  const [classForm, setClassForm] = useState({
    name: '',
    display_name: '',
    color: '#3B82F6',
    description: ''
  })

  // Update view when prop changes
  useEffect(() => {
    setCurrentView(initialView)
  }, [initialView])

  useEffect(() => {
    fetchDefectClasses()
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
  }, [annotations, currentBox, pendingBox, imageLoaded, selectedImage])

  // Retry loading image when canvas becomes available
  useEffect(() => {
    if (annotationMode && selectedImage && canvasRef.current && !imageLoaded) {
      // Small delay to ensure canvas is mounted
      const timer = setTimeout(() => {
        if (canvasRef.current && selectedImage?.image_url) {
          loadImage(selectedImage.image_url)
        }
      }, 50)
      return () => clearTimeout(timer)
    }
  }, [annotationMode, selectedImage, imageLoaded])

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyPress = (e) => {
      if (!selectedImage) return
      
      // Escape key - cancel pending box or exit annotation mode
      if (e.key === 'Escape') {
        if (showClassPicker && pendingBox) {
          cancelPendingBox()
        }
        return
      }
      
      // Arrow keys for navigation (disabled when class picker is open)
      if (!showClassPicker) {
        if (e.key === 'ArrowRight') {
          e.preventDefault()
          navigateImage('next')
        } else if (e.key === 'ArrowLeft') {
          e.preventDefault()
          navigateImage('prev')
        }
      }
      
      // Number keys for class selection (1-9) - works in class picker modal
      if (showClassPicker && pendingBox) {
        const num = parseInt(e.key)
        const classList = selectedDataset?.classes || []
        if (num >= 1 && num <= classList.length && num <= 9) {
          saveAnnotationWithClass(classList[num - 1].name)
        }
      }
      
      // Delete key to remove last annotation (disabled when class picker is open)
      if (e.key === 'Delete' && annotations.length > 0 && !showClassPicker) {
        const lastAnn = annotations[annotations.length - 1]
        deleteAnnotation(lastAnn.id)
      }
    }

    window.addEventListener('keydown', handleKeyPress)
    return () => window.removeEventListener('keydown', handleKeyPress)
  }, [selectedImage, annotations, showClassPicker, pendingBox])

  const fetchDefectClasses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/defect-classes/')
      const data = await response.json()
      setDefectClasses(data)
    } catch (error) {
      console.error('Error fetching defect classes:', error)
    }
  }

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
        body: JSON.stringify({
          ...datasetForm,
          class_ids: selectedClassIds
        }),
      })
      if (response.ok) {
        await fetchDatasets()
        setShowDatasetModal(false)
        setDatasetForm({ name: '', description: '', created_by: '' })
        setSelectedClassIds([])
        return
      }

      const err = await response.json().catch(() => ({}))
      alert(`Create dataset failed: ${err.detail || JSON.stringify(err) || response.statusText}`)
    } catch (error) {
      console.error('Error creating dataset:', error)
      alert('Create dataset failed: backend not reachable')
    }
  }

  const createDefectClass = async (e) => {
    e.preventDefault()
    try {
      const url = editingClass 
        ? `http://localhost:8000/api/defect-classes/${editingClass.id}/`
        : 'http://localhost:8000/api/defect-classes/'
      
      const response = await fetch(url, {
        method: editingClass ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...classForm,
          name: classForm.name.toLowerCase().replace(/\s+/g, '_')
        }),
      })
      if (response.ok) {
        await fetchDefectClasses()
        setShowClassModal(false)
        setEditingClass(null)
        setClassForm({ name: '', display_name: '', color: '#3B82F6', description: '' })
        alert(editingClass ? '✓ Class updated successfully!' : '✓ Defect class created successfully!')
        return
      }

      const err = await response.json().catch(() => ({}))
      // Format error messages nicely
      let errorMsg = editingClass ? 'Update class failed: ' : 'Create class failed: '
      if (err.name && Array.isArray(err.name)) {
        errorMsg += err.name.join(', ')
      } else if (err.display_name && Array.isArray(err.display_name)) {
        errorMsg += err.display_name.join(', ')
      } else if (err.detail) {
        errorMsg += err.detail
      } else {
        errorMsg += JSON.stringify(err) || response.statusText
      }
      alert(errorMsg)
    } catch (error) {
      console.error('Error saving class:', error)
      alert('Save class failed: backend not reachable')
    }
  }

  const deleteDefectClass = async (classId) => {
    if (!confirm('Are you sure you want to delete this defect class?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/defect-classes/${classId}/`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await fetchDefectClasses()
        alert('✓ Class deleted successfully!')
      } else {
        alert('Failed to delete class')
      }
    } catch (error) {
      console.error('Error deleting class:', error)
      alert('Delete failed: backend not reachable')
    }
  }

  const updateDatasetClasses = async (e) => {
    e.preventDefault()
    if (!selectedDataset) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset.id}/`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          class_ids: selectedClassIds
        }),
      })
      if (response.ok) {
        await fetchDatasets()
        const updatedDataset = await response.json()
        setSelectedDataset(updatedDataset)
        setShowEditDatasetModal(false)
        setSelectedClassIds([])
        if (updatedDataset.classes?.length > 0) {
          setSelectedClass(updatedDataset.classes[0].name)
        }
        alert('✓ Dataset classes updated!')
      } else {
        alert('Failed to update dataset')
      }
    } catch (error) {
      console.error('Error updating dataset:', error)
      alert('Update failed: backend not reachable')
    }
  }

  const uploadImages = async (e) => {
    let files = Array.from(e.target.files)
    
    // Filter only image files (for folder uploads that might include non-image files)
    files = files.filter(file => file.type.startsWith('image/'))
    
    if (files.length === 0) {
      alert('No image files found. Please select JPG, PNG, or other image files.')
      return
    }
    
    console.log(`Uploading ${files.length} images...`)
    
    // Upload in chunks to avoid request size limits
    setUploading(true)
    setUploadProgress({ current: 0, total: files.length })
    const chunkSize = 20 // Upload 20 images at a time
    let totalUploaded = 0
    let totalErrors = []
    
    try {
      for (let i = 0; i < files.length; i += chunkSize) {
        const chunk = files.slice(i, i + chunkSize)
        const formData = new FormData()
        
        chunk.forEach(file => {
          formData.append('images', file)
        })
        
        try {
          const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset.id}/batch_upload/`, {
            method: 'POST',
            body: formData,
          })
          
          if (response.ok) {
            const result = await response.json()
            totalUploaded += result.uploaded
            totalErrors = [...totalErrors, ...result.errors]
            setUploadProgress({ current: totalUploaded, total: files.length })
            console.log(`Progress: ${totalUploaded}/${files.length} images uploaded`)
          } else {
            console.error(`Chunk upload failed:`, await response.text())
            totalErrors.push(`Failed to upload chunk ${i / chunkSize + 1}`)
          }
        } catch (chunkError) {
          console.error('Error uploading chunk:', chunkError)
          totalErrors.push(`Error uploading chunk ${i / chunkSize + 1}: ${chunkError.message}`)
        }
      }
      
      // Show final result
      if (totalErrors.length > 0) {
        alert(`Uploaded ${totalUploaded}/${files.length} images. ${totalErrors.length} errors.`)
        console.error('Upload errors:', totalErrors)
      } else {
        alert(`Successfully uploaded all ${totalUploaded} images!`)
      }
      
      fetchImages(selectedDataset.id)
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images: ' + error.message)
    } finally {
      setUploading(false)
      setUploadProgress({ current: 0, total: 0 })
      // Reset file inputs to prevent duplicate uploads
      if (e?.target) e.target.value = ''
      if (fileInputRef.current) fileInputRef.current.value = ''
      if (folderInputRef.current) folderInputRef.current.value = ''
    }
  }

  const deleteImage = async (imageId) => {
    if (!confirm('Are you sure you want to delete this image and all its annotations?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/labeled-images/${imageId}/`, {
        method: 'DELETE'
      })
      if (response.ok) {
        if (selectedDataset) {
          await fetchImages(selectedDataset.id)
        }
        alert('✓ Image deleted successfully!')
      } else {
        const error = await response.json()
        alert('Failed to delete image: ' + (error.detail || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting image:', error)
      alert('Delete failed: backend not reachable')
    }
  }

  const bulkDeleteImages = async () => {
    if (selectedImages.length === 0) {
      alert('Please select images to delete')
      return
    }
    
    if (!confirm(`Are you sure you want to delete ${selectedImages.length} images and all their annotations?`)) return
    
    try {
      let deleted = 0
      let failed = 0
      
      for (const imageId of selectedImages) {
        try {
          const response = await fetch(`http://localhost:8000/api/labeled-images/${imageId}/`, {
            method: 'DELETE'
          })
          if (response.ok) {
            deleted++
          } else {
            failed++
          }
        } catch (err) {
          failed++
        }
      }
      
      if (selectedDataset) {
        await fetchImages(selectedDataset.id)
      }
      setSelectedImages([])
      setSelectMode(false)
      alert(`✓ Deleted ${deleted} images. ${failed > 0 ? `${failed} failed.` : ''}`)
    } catch (error) {
      console.error('Error bulk deleting images:', error)
      alert('Bulk delete failed: ' + error.message)
    }
  }

  const toggleImageSelection = (imageId) => {
    setSelectedImages(prev => 
      prev.includes(imageId) 
        ? prev.filter(id => id !== imageId)
        : [...prev, imageId]
    )
  }

  const selectAllImages = () => {
    setSelectedImages(images.map(img => img.id))
  }

  const deselectAllImages = () => {
    setSelectedImages([])
  }

  const deleteDataset = async (datasetId) => {
    if (!confirm('Are you sure you want to delete this dataset? All images and annotations will be permanently deleted.')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/datasets/${datasetId}/`, {
        method: 'DELETE'
      })
      if (response.ok) {
        await fetchDatasets()
        if (selectedDataset?.id === datasetId) {
          setSelectedDataset(null)
          setImages([])
        }
        alert('✓ Dataset deleted successfully!')
      } else {
        const error = await response.json()
        alert('Failed to delete dataset: ' + (error.detail || 'Unknown error'))
      }
    } catch (error) {
      console.error('Error deleting dataset:', error)
      alert('Delete failed: backend not reachable')
    }
  }

  // Drag and drop handlers
  const handleDragEnter = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(true)
  }

  const handleDragLeave = (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
    e.stopPropagation()
  }

  const handleDrop = async (e) => {
    e.preventDefault()
    e.stopPropagation()
    setIsDragging(false)

    if (!selectedDataset) {
      alert('Please select a dataset first')
      return
    }

    const files = Array.from(e.dataTransfer.files).filter(file => 
      file.type.startsWith('image/')
    )

    if (files.length === 0) {
      alert('No image files found')
      return
    }

    // Batch upload
    setUploading(true)
    const formData = new FormData()
    files.forEach(file => {
      formData.append('images', file)
    })

    try {
      const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset.id}/batch_upload/`, {
        method: 'POST',
        body: formData,
      })

      if (response.ok) {
        const result = await response.json()
        alert(`Uploaded ${result.uploaded}/${result.total} images!`)
        fetchImages(selectedDataset.id)
      }
    } catch (error) {
      console.error('Error uploading images:', error)
      alert('Failed to upload images')
    } finally {
      setUploading(false)
    }
  }

  const autoAnnotateImage = async () => {
    if (!selectedImage) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/labeled-images/${selectedImage.id}/auto_annotate/`, {
        method: 'POST',
      })
      const result = await response.json()
      alert(result.message)
    } catch (error) {
      console.error('Error auto-annotating:', error)
    }
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
    if (!canvas) {
      console.error('Canvas not available')
      return
    }

    // Make sure we have full URL
    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `http://localhost:8000${imgUrl}`
    console.log('Loading image:', fullUrl)

    const ctx = canvas.getContext('2d')
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      // Get available viewport space (use window dimensions minus sidebar and padding)
      const containerWidth = window.innerWidth - 280 - 80 // sidebar width + padding
      const containerHeight = window.innerHeight - 120 // header + padding
      
      let width = img.width
      let height = img.height
      
      // Scale to fit container while maintaining aspect ratio
      const scaleX = containerWidth / width
      const scaleY = containerHeight / height
      const scale = Math.min(scaleX, scaleY, 1) // Don't upscale
      
      width = width * scale
      height = height * scale
      
      canvas.width = width
      canvas.height = height
      setImageDimensions({ width: img.width, height: img.height })
      
      ctx.drawImage(img, 0, 0, width, height)
      setImageLoaded(true)
    }
    img.onerror = (e) => {
      console.error('Failed to load image:', fullUrl, e)
    }
    img.src = fullUrl
  }

  const drawCanvas = () => {
    const canvas = canvasRef.current
    if (!canvas || !selectedImage) return

    const ctx = canvas.getContext('2d')
    
    // Make sure we have full URL
    const imgUrl = selectedImage.image_url
    const fullUrl = imgUrl.startsWith('http') ? imgUrl : `http://localhost:8000${imgUrl}`
    
    // Reload image
    const img = new Image()
    img.crossOrigin = 'anonymous'
    img.onload = () => {
      ctx.clearRect(0, 0, canvas.width, canvas.height)
      ctx.drawImage(img, 0, 0, canvas.width, canvas.height)
      
      // Draw existing annotations
      annotations.forEach(ann => {
        const defectClass = selectedDataset?.classes?.find(cls => cls.name === ann.class_name)
        const classColor = defectClass?.color || '#6B7280'
        const displayName = defectClass?.display_name || ann.class_name
        drawBox(ctx, ann, classColor, displayName, canvas.width, canvas.height)
      })
      
      // Draw current box being drawn or pending box
      if (currentBox || pendingBox?.pixelBox) {
        const box = currentBox || pendingBox.pixelBox
        ctx.strokeStyle = '#FFFF00' // Yellow for pending box
        ctx.fillStyle = 'rgba(255, 255, 0, 0.1)'
        ctx.lineWidth = 3
        ctx.strokeRect(box.x, box.y, box.width, box.height)
        ctx.fillRect(box.x, box.y, box.width, box.height)
        
        // Draw "Select Class" text
        if (pendingBox) {
          ctx.fillStyle = '#FFFF00'
          ctx.fillRect(box.x, box.y - 22, 100, 22)
          ctx.fillStyle = '#000'
          ctx.font = 'bold 12px sans-serif'
          ctx.fillText('Select Class →', box.x + 5, box.y - 7)
        }
      }
    }
    img.src = fullUrl
  }

  const drawBox = (ctx, ann, color, displayName, canvasWidth, canvasHeight) => {
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
    const labelText = displayName || ann.class_name
    const textWidth = ctx.measureText(labelText).width
    ctx.fillStyle = color
    ctx.fillRect(x, y - 20, textWidth + 10, 20)
    ctx.fillStyle = '#fff'
    ctx.font = '12px sans-serif'
    ctx.fillText(labelText, x + 5, y - 5)
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

  const handleMouseUp = () => {
    if (!isDrawing || !currentBox || !selectedImage) return
    
    const canvas = canvasRef.current
    // Convert pixel coordinates to normalized YOLO format
    const x_center = (currentBox.x + currentBox.width / 2) / canvas.width
    const y_center = (currentBox.y + currentBox.height / 2) / canvas.height
    const width = currentBox.width / canvas.width
    const height = currentBox.height / canvas.height
    
    // Minimum box size check
    if (width < 0.01 || height < 0.01) {
      setIsDrawing(false)
      setStartPoint(null)
      setCurrentBox(null)
      return
    }
    
    // Store pending box and show class picker
    setPendingBox({
      x_center,
      y_center,
      width,
      height,
      pixelBox: currentBox
    })
    setShowClassPicker(true)
    
    setIsDrawing(false)
    setStartPoint(null)
  }

  const saveAnnotationWithClass = async () => {
    if (!pendingBox || !selectedImage || !selectedClassForAnnotation) {
      alert('Please select a class first')
      return
    }
    
    try {
      const response = await fetch('http://localhost:8000/api/annotations/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          image: selectedImage.id,
          class_name: selectedClassForAnnotation,
          x_center: pendingBox.x_center,
          y_center: pendingBox.y_center,
          width: pendingBox.width,
          height: pendingBox.height
        }),
      })
      
      if (!response.ok) {
        const errorData = await response.json()
        console.error('Server error:', errorData)
        throw new Error(errorData.detail || 'Failed to save annotation')
      }
      
      fetchAnnotations(selectedImage.id)
      setPendingBox(null)
      setCurrentBox(null)
      setShowClassPicker(false)
      setSelectedClassForAnnotation(null)
    } catch (error) {
      console.error('Error saving annotation:', error)
      alert('Failed to save annotation: ' + error.message)
    }
  }

  const cancelPendingBox = () => {
    setPendingBox(null)
    setCurrentBox(null)
    setShowClassPicker(false)
    setSelectedClassForAnnotation(null)
  }

  const selectImage = (img) => {
    setSelectedImage(img)
    setAnnotationMode(true) // Enter annotation mode
    setImageLoaded(false)
    loadImage(img.image_url)
  }

  const exitAnnotationMode = () => {
    setAnnotationMode(false)
    setSelectedImage(null)
    setAnnotations([])
    setCurrentBox(null)
    setImageLoaded(false)
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
    <div 
      className="flex h-full bg-slate-950"
      onDragEnter={handleDragEnter}
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
    >
      {/* Drag and drop overlay */}
      {isDragging && (
        <div className="fixed inset-0 bg-purple-600 bg-opacity-50 z-50 flex items-center justify-center pointer-events-none">
          <div className="bg-slate-800 rounded-xl p-8 text-center border-2 border-dashed border-purple-400">
            <Upload className="w-16 h-16 mx-auto mb-4 text-purple-400" />
            <p className="text-2xl font-bold text-white">Drop images here to upload</p>
            <p className="text-slate-400 mt-2">Supports batch upload</p>
          </div>
        </div>
      )}

      {/* UPLOAD DATA VIEW */}
      {currentView === 'upload' && !annotationMode && (
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            {/* Header */}
            <div className="flex items-center gap-3 mb-8">
              <Upload className="w-8 h-8 text-purple-500" />
              <h1 className="text-2xl font-bold text-white">Upload</h1>
            </div>

            {/* Batch Settings */}
            <div className="grid grid-cols-2 gap-6 mb-6">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Batch Name:</label>
                <input
                  type="text"
                  value={batchName}
                  onChange={(e) => setBatchName(e.target.value)}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500 focus:border-transparent"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">Dataset:</label>
                <select
                  value={selectedDataset?.id || ''}
                  onChange={(e) => {
                    const dataset = datasets.find(d => d.id === parseInt(e.target.value))
                    setSelectedDataset(dataset)
                  }}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-purple-500"
                >
                  <option value="">Select or create dataset</option>
                  {datasets.map(ds => (
                    <option key={ds.id} value={ds.id}>{ds.name}</option>
                  ))}
                </select>
              </div>
            </div>

            {/* Upload Area */}
            <div className="bg-slate-900 border-2 border-dashed border-slate-700 rounded-xl p-12 text-center hover:border-purple-500 transition-colors">
              <div className="w-16 h-16 mx-auto mb-4 bg-slate-800 rounded-full flex items-center justify-center">
                <Upload className="w-8 h-8 text-slate-400" />
              </div>
              <p className="text-lg text-white mb-2">Drag and drop file(s) to upload, or:</p>
              <div className="flex items-center justify-center gap-4 mt-6">
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-colors">
                    <ImageIcon className="w-5 h-5" />
                    Select File(s)
                  </div>
                  <input
                    ref={fileInputRef}
                    type="file"
                    multiple
                    accept="image/*"
                    onChange={uploadImages}
                    className="hidden"
                    disabled={uploading || !selectedDataset}
                  />
                </label>
                <label className="cursor-pointer">
                  <div className="flex items-center gap-2 px-6 py-3 bg-slate-800 hover:bg-slate-700 text-white rounded-lg border border-slate-600 transition-colors">
                    <Folder className="w-5 h-5" />
                    Select Folder
                  </div>
                  <input
                    ref={folderInputRef}
                    type="file"
                    multiple
                    onChange={uploadImages}
                    className="hidden"
                    disabled={uploading || !selectedDataset}
                    webkitdirectory="true"
                  />
                </label>
              </div>

              {!selectedDataset && (
                <p className="text-yellow-500 text-sm mt-4">Please select or create a dataset first</p>
              )}
              
              {uploading && (
                <div className="mt-6">
                  <div className="w-full bg-slate-700 rounded-full h-2">
                    <div 
                      className="bg-purple-600 h-2 rounded-full transition-all duration-300" 
                      style={{ width: `${uploadProgress.total > 0 ? (uploadProgress.current / uploadProgress.total * 100) : 0}%` }}
                    ></div>
                  </div>
                  <p className="text-slate-400 text-sm mt-2">
                    Uploading {uploadProgress.current} / {uploadProgress.total} images...
                  </p>
                </div>
              )}
            </div>

            {/* Supported Formats */}
            <div className="mt-8 text-center">
              <p className="text-slate-500 text-sm mb-4">Supported Formats</p>
              <div className="flex items-center justify-center gap-8 text-slate-400 text-sm">
                <div className="flex items-center gap-2">
                  <ImageIcon className="w-4 h-4" />
                  <span>Images</span>
                  <span className="text-slate-600">.jpg, .png, .bmp, .webp</span>
                </div>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="mt-8 flex items-center gap-4">
              <button
                onClick={() => setShowDatasetModal(true)}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm"
              >
                <FolderPlus className="w-4 h-4" />
                Create New Dataset
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DATASETS VIEW */}
      {currentView === 'datasets' && !annotationMode && (
        <>
          {/* Sidebar - Datasets List */}
          <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-lg font-semibold text-white">Datasets</h2>
                <button
                  onClick={() => setShowDatasetModal(true)}
                  className="p-2 bg-emerald-600 hover:bg-emerald-700 rounded-lg text-white"
                  title="New Dataset"
                >
                  <Plus className="w-4 h-4" />
                </button>
              </div>
              
              <div className="relative">
                <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Search datasets..."
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg pl-10 pr-4 py-2 text-white text-sm focus:ring-2 focus:ring-emerald-500"
                />
              </div>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2">
              {datasets.map(ds => (
                <div
                  key={ds.id}
                  className={`group p-4 rounded-lg cursor-pointer transition-all relative ${
                    selectedDataset?.id === ds.id
                      ? 'bg-emerald-600/20 border border-emerald-500'
                      : 'bg-slate-800 hover:bg-slate-700 border border-transparent'
                  }`}
                >
                  <div
                    onClick={() => {
                      setSelectedDataset(ds)
                      if (ds.classes?.length > 0) {
                        setSelectedClass(ds.classes[0].name)
                      }
                    }}
                  >
                    <div className="flex items-start gap-3">
                      <div className="w-12 h-12 bg-slate-700 rounded-lg flex items-center justify-center flex-shrink-0">
                        <Database className="w-6 h-6 text-slate-400" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-white font-medium truncate">{ds.name}</h3>
                        <p className="text-slate-400 text-sm">{ds.image_count || 0} images</p>
                        <div className="flex items-center gap-2 mt-2">
                          {(ds.classes || []).slice(0, 3).map(cls => (
                            <div
                              key={cls.id}
                              className="w-3 h-3 rounded-full"
                              style={{ backgroundColor: cls.color }}
                              title={cls.display_name}
                            ></div>
                          ))}
                          {(ds.classes?.length || 0) > 3 && (
                            <span className="text-xs text-slate-500">+{ds.classes.length - 3}</span>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                  {/* Delete button */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation()
                      deleteDataset(ds.id)
                    }}
                    className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity"
                    title="Delete dataset"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
              ))}
              
              {datasets.length === 0 && (
                <div className="text-center py-12 text-slate-500">
                  <Database className="w-12 h-12 mx-auto mb-3 opacity-50" />
                  <p className="text-sm">No datasets yet</p>
                  <button
                    onClick={() => setShowDatasetModal(true)}
                    className="mt-4 text-emerald-400 hover:text-emerald-300 text-sm"
                  >
                    Create your first dataset
                  </button>
                </div>
              )}
            </div>
          </aside>

          {/* Main Content - Image Grid */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedDataset ? (
              <>
                {/* Dataset Header */}
                <div className="p-6 border-b border-slate-800 bg-slate-900/50">
                  <div className="flex items-center justify-between">
                    <div>
                      <h2 className="text-2xl font-bold text-white">{selectedDataset.name}</h2>
                      <p className="text-slate-400 mt-1">{images.length} images • {selectedDataset.classes?.length || 0} classes</p>
                    </div>
                    <div className="flex items-center gap-3">
                      {!selectMode ? (
                        <>
                          <button
                            onClick={() => {
                              setSelectMode(true)
                              setSelectedImages([])
                            }}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            <Check className="w-4 h-4" />
                            Select Images
                          </button>
                          <label className="cursor-pointer">
                            <div className={`flex items-center gap-2 px-4 py-2 ${uploading ? 'bg-gray-600' : 'bg-emerald-600 hover:bg-emerald-700'} text-white rounded-lg text-sm`}>
                              <Upload className="w-4 h-4" />
                              {uploading ? 'Uploading...' : 'Upload Images'}
                            </div>
                            <input 
                              ref={fileInputRef}
                              type="file" 
                              multiple 
                              accept="image/*" 
                              onChange={uploadImages} 
                              className="hidden"
                              disabled={uploading}
                            />
                          </label>
                          <button
                            onClick={exportDataset}
                            className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            <Download className="w-4 h-4" />
                            Export YOLO
                          </button>
                          <button
                            onClick={() => deleteDataset(selectedDataset.id)}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg text-sm"
                            title="Delete dataset"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Dataset
                          </button>
                        </>
                      ) : (
                        <>
                          <span className="text-slate-300 text-sm">
                            {selectedImages.length} selected
                          </span>
                          <button
                            onClick={selectAllImages}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            Select All
                          </button>
                          <button
                            onClick={deselectAllImages}
                            className="px-3 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            Deselect All
                          </button>
                          <button
                            onClick={bulkDeleteImages}
                            disabled={selectedImages.length === 0}
                            className="flex items-center gap-2 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-slate-600 disabled:cursor-not-allowed text-white rounded-lg text-sm"
                          >
                            <Trash2 className="w-4 h-4" />
                            Delete Selected ({selectedImages.length})
                          </button>
                          <button
                            onClick={() => {
                              setSelectMode(false)
                              setSelectedImages([])
                            }}
                            className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg text-sm"
                          >
                            Cancel
                          </button>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Dataset Split Statistics - Roboflow Style */}
                <div className="px-6 py-4 bg-slate-900/30 border-b border-slate-800">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-sm font-semibold text-slate-300">Dataset Split</h3>
                    <button
                      onClick={async () => {
                        if (confirm('Auto-assign images to train/valid/test splits based on configured ratios?')) {
                          try {
                            const response = await fetch(`http://localhost:8000/api/datasets/${selectedDataset.id}/auto_split/`, {
                              method: 'POST'
                            })
                            if (response.ok) {
                              const result = await response.json()
                              alert(`✓ Split assigned: ${result.train} train, ${result.valid} valid, ${result.test} test`)
                              await fetchDatasets()
                              if (selectedDataset) {
                                const updated = datasets.find(d => d.id === selectedDataset.id)
                                if (updated) setSelectedDataset(updated)
                              }
                            } else {
                              alert('Failed to auto-split dataset')
                            }
                          } catch (error) {
                            console.error('Error auto-splitting:', error)
                            alert('Auto-split failed')
                          }
                        }
                      }}
                      className="text-xs px-3 py-1 bg-purple-600 hover:bg-purple-700 text-white rounded"
                    >
                      Auto-Split
                    </button>
                  </div>
                  <div className="grid grid-cols-3 gap-4">
                    {/* Train Set */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400 uppercase">Train Set</span>
                        <span className="text-xs px-2 py-0.5 bg-orange-600 text-white rounded">{selectedDataset.train_split || 80}%</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{selectedDataset.train_count || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Images</p>
                    </div>
                    
                    {/* Valid Set */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400 uppercase">Valid Set</span>
                        <span className="text-xs px-2 py-0.5 bg-cyan-600 text-white rounded">{selectedDataset.valid_split || 10}%</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{selectedDataset.valid_count || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Images</p>
                    </div>
                    
                    {/* Test Set */}
                    <div className="bg-slate-800 rounded-lg p-4 border border-slate-700">
                      <div className="flex items-center justify-between mb-2">
                        <span className="text-xs font-medium text-slate-400 uppercase">Test Set</span>
                        <span className="text-xs px-2 py-0.5 bg-purple-600 text-white rounded">{selectedDataset.test_split || 10}%</span>
                      </div>
                      <p className="text-2xl font-bold text-white">{selectedDataset.test_count || 0}</p>
                      <p className="text-xs text-slate-500 mt-1">Images</p>
                    </div>
                  </div>
                </div>

                {/* Image Grid */}
                <div className="flex-1 overflow-auto p-6">
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {images.map(img => (
                      <div
                        key={img.id}
                        className="group relative bg-slate-800 rounded-lg overflow-hidden hover:ring-2 hover:ring-emerald-500 transition-all"
                      >
                        {/* Selection checkbox */}
                        {selectMode && (
                          <div className="absolute top-2 left-2 z-20">
                            <input
                              type="checkbox"
                              checked={selectedImages.includes(img.id)}
                              onChange={() => toggleImageSelection(img.id)}
                              className="w-5 h-5 rounded cursor-pointer"
                              onClick={(e) => e.stopPropagation()}
                            />
                          </div>
                        )}
                        <div 
                          onClick={() => !selectMode && selectImage(img)}
                          className={!selectMode ? "cursor-pointer" : ""}
                        >
                          <div className="aspect-square bg-slate-900 flex items-center justify-center">
                            <img
                              src={img.image_url}
                              alt={img.filename}
                              className="w-full h-full object-cover"
                            />
                          </div>
                          <div className="p-3">
                            <div className="text-sm font-medium text-white truncate">{img.filename}</div>
                            <div className="text-xs text-slate-400 flex items-center justify-between mt-1">
                              <span>{img.annotation_count} boxes</span>
                              {img.is_labeled && <span className="text-emerald-400">✓ Labeled</span>}
                            </div>
                          </div>
                          <div className="absolute inset-0 bg-black bg-opacity-0 group-hover:bg-opacity-30 transition-all flex items-center justify-center pointer-events-none">
                            <Tag className="w-12 h-12 text-white opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                        </div>
                        {/* Delete button */}
                        {!selectMode && (
                          <button
                            onClick={(e) => {
                              e.stopPropagation()
                              deleteImage(img.id)
                            }}
                            className="absolute top-2 right-2 p-1.5 bg-red-600 hover:bg-red-700 text-white rounded opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Delete image"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        )}
                      </div>
                    ))}
                    {images.length === 0 && (
                      <div className="col-span-full text-center py-16 text-slate-500">
                        <ImagePlus className="w-16 h-16 mx-auto mb-4 opacity-50" />
                        <p className="text-lg">No images yet</p>
                        <p className="text-sm mt-2">Upload some images to start labeling</p>
                      </div>
                    )}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <Database className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a dataset to view images</p>
                  <p className="text-sm mt-2">Or create a new dataset from the sidebar</p>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* ANNOTATE VIEW - Direct to image grid for annotation */}
      {currentView === 'annotate' && !annotationMode && (
        <>
          {/* Sidebar */}
          <aside className="w-72 bg-slate-900 border-r border-slate-800 flex flex-col">
            <div className="p-4 border-b border-slate-800">
              <h2 className="text-lg font-semibold text-white mb-4">Select Dataset</h2>
              <select
                value={selectedDataset?.id || ''}
                onChange={(e) => {
                  const dataset = datasets.find(d => d.id === parseInt(e.target.value))
                  setSelectedDataset(dataset)
                  if (dataset?.classes?.length > 0) {
                    setSelectedClass(dataset.classes[0].name)
                  }
                }}
                className="w-full bg-slate-800 border border-slate-700 rounded-lg px-3 py-2 text-white"
              >
                <option value="">Choose a dataset</option>
                {datasets.map(ds => (
                  <option key={ds.id} value={ds.id}>
                    {ds.name} ({ds.image_count} images)
                  </option>
                ))}
              </select>
            </div>

            {selectedDataset && (
              <>
                <div className="p-4 border-b border-slate-800">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Classes</h3>
                  <div className="space-y-2">
                    {(selectedDataset.classes || []).map(cls => (
                      <div key={cls.id} className="flex items-center gap-2 text-white text-sm">
                        <div className="w-3 h-3 rounded-full" style={{ backgroundColor: cls.color }}></div>
                        <span>{cls.display_name}</span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="flex-1 overflow-y-auto p-4">
                  <h3 className="text-sm font-medium text-slate-400 mb-3">Images ({images.length})</h3>
                  <div className="space-y-2">
                    {images.map(img => (
                      <div
                        key={img.id}
                        onClick={() => selectImage(img)}
                        className="p-2 rounded cursor-pointer bg-slate-800 hover:bg-slate-700 text-white text-sm"
                      >
                        <div className="truncate">{img.filename}</div>
                        <div className="text-xs text-slate-400">{img.annotation_count} annotations</div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            )}
          </aside>

          {/* Main Content */}
          <main className="flex-1 flex flex-col overflow-hidden">
            {selectedDataset ? (
              <>
                <div className="p-6 border-b border-slate-800">
                  <h2 className="text-xl font-bold text-white">Annotate: {selectedDataset.name}</h2>
                  <p className="text-slate-400 text-sm mt-1">Click an image to start annotating</p>
                </div>
                <div className="flex-1 overflow-auto p-6">
                  <div className="grid grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
                    {images.map(img => (
                      <div
                        key={img.id}
                        onClick={() => selectImage(img)}
                        className="group relative bg-slate-800 rounded-lg overflow-hidden cursor-pointer hover:ring-2 hover:ring-purple-500 transition-all"
                      >
                        <div className="aspect-square">
                          <img src={img.image_url} alt={img.filename} className="w-full h-full object-cover" />
                        </div>
                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-3">
                          <div className="text-white text-sm truncate">{img.filename}</div>
                          <div className="text-xs text-slate-300">{img.annotation_count} boxes</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </>
            ) : (
              <div className="flex-1 flex items-center justify-center text-slate-500">
                <div className="text-center">
                  <ImageIcon className="w-16 h-16 mx-auto mb-4 opacity-50" />
                  <p className="text-lg">Select a dataset to annotate</p>
                </div>
              </div>
            )}
          </main>
        </>
      )}

      {/* CLASSES & TAGS VIEW */}
      {currentView === 'classes' && !annotationMode && (
        <div className="flex-1 p-8">
          <div className="max-w-4xl mx-auto">
            <div className="flex items-center justify-between mb-8">
              <div>
                <h1 className="text-2xl font-bold text-white">Classes & Tags</h1>
                <p className="text-slate-400 mt-1">Manage defect classes for annotation</p>
              </div>
              <button
                onClick={() => {
                  setEditingClass(null)
                  setClassForm({ name: '', display_name: '', color: '#3B82F6', description: '' })
                  setShowClassModal(true)
                }}
                className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg"
              >
                <Plus className="w-4 h-4" />
                New Class
              </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {defectClasses.map(cls => (
                <div
                  key={cls.id}
                  className="bg-slate-800 rounded-lg p-4 border border-slate-700 hover:border-slate-600 transition-colors"
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="w-10 h-10 rounded-lg flex-shrink-0"
                      style={{ backgroundColor: cls.color }}
                    ></div>
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium">{cls.display_name}</h3>
                      <p className="text-slate-500 text-sm">{cls.name}</p>
                      {cls.description && (
                        <p className="text-slate-400 text-sm mt-1 line-clamp-2">{cls.description}</p>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-slate-700">
                    <button
                      onClick={() => {
                        setEditingClass(cls)
                        setClassForm({
                          name: cls.name,
                          display_name: cls.display_name,
                          color: cls.color,
                          description: cls.description || ''
                        })
                        setShowClassModal(true)
                      }}
                      className="flex-1 px-3 py-1.5 bg-slate-700 hover:bg-slate-600 text-white text-sm rounded"
                    >
                      Edit
                    </button>
                    <button
                      onClick={() => deleteDefectClass(cls.id)}
                      className="px-3 py-1.5 bg-red-600/20 hover:bg-red-600/40 text-red-400 text-sm rounded"
                    >
                      Delete
                    </button>
                  </div>
                </div>
              ))}
            </div>

            {defectClasses.length === 0 && (
              <div className="text-center py-16 text-slate-500">
                <Tag className="w-16 h-16 mx-auto mb-4 opacity-50" />
                <p className="text-lg">No classes defined yet</p>
                <p className="text-sm mt-2">Create classes to start labeling your data</p>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ANNOTATION MODE - Full screen annotation */}
      {annotationMode && selectedImage && (
          <>
            {/* Main Content - Left Sidebar + Canvas */}
            <div className="flex-1 flex flex-col overflow-hidden">
              {/* Annotation Navigation Bar - Under Header */}
              <div className="bg-slate-800 border-b border-slate-700 px-4 py-2.5">
                <div className="flex items-center justify-between">
                  {/* Left: Back button and breadcrumb */}
                  <div className="flex items-center gap-3">
                    <button
                      onClick={exitAnnotationMode}
                      className="p-1.5 hover:bg-slate-700 rounded text-slate-300 hover:text-white"
                    >
                      <ChevronLeft className="w-5 h-5" />
                    </button>
                    <div className="flex items-center gap-2 text-sm">
                      <span className="text-slate-400">{selectedDataset?.name.toUpperCase()}</span>
                      <span className="text-slate-600">/</span>
                      <span className="text-emerald-400 font-medium">ANNOTATE</span>
                    </div>
                    <span className="text-slate-600">|</span>
                    <span className="text-white text-sm font-medium truncate max-w-md">{selectedImage.filename}</span>
                  </div>
                  
                  {/* Center: Image navigation */}
                  <div className="flex items-center gap-2 bg-slate-900 rounded-lg px-3 py-1.5">
                    <button
                      onClick={() => navigateImage('prev')}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300"
                    >
                      <ChevronLeft className="w-4 h-4" />
                    </button>
                    <span className="text-white text-sm font-medium px-2">
                      {images.findIndex(img => img.id === selectedImage?.id) + 1} / {images.length}
                    </span>
                    <button
                      onClick={() => navigateImage('next')}
                      className="p-1 hover:bg-slate-700 rounded text-slate-300"
                    >
                      <ChevronRight className="w-4 h-4" />
                    </button>
                  </div>
                  
                  {/* Right: Image Split Status */}
                  <div className="flex items-center gap-2">
                    <span className="text-slate-400 text-xs">Split:</span>
                    <select
                      value={selectedImage?.split || 'unassigned'}
                      onChange={async (e) => {
                        const newSplit = e.target.value
                        try {
                          const res = await fetch(`http://localhost:8000/api/labeled-images/${selectedImage.id}/`, {
                            method: 'PATCH',
                            headers: { 'Content-Type': 'application/json' },
                            body: JSON.stringify({ split: newSplit })
                          })
                          if (res.ok) {
                            setImages(images.map(img => 
                              img.id === selectedImage.id ? { ...img, split: newSplit } : img
                            ))
                            setSelectedImage({ ...selectedImage, split: newSplit })
                          }
                        } catch (error) {
                          console.error('Error updating split:', error)
                        }
                      }}
                      className={`px-3 py-1.5 text-white text-sm font-medium rounded cursor-pointer ${
                        selectedImage?.split === 'train' ? 'bg-green-600' :
                        selectedImage?.split === 'valid' ? 'bg-blue-600' :
                        selectedImage?.split === 'test' ? 'bg-purple-600' :
                        'bg-slate-600'
                      }`}
                    >
                      <option value="unassigned">Unassigned</option>
                      <option value="train">Train</option>
                      <option value="valid">Valid</option>
                      <option value="test">Test</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Annotation Workspace */}
              <div className="flex-1 flex overflow-hidden">
                {/* Left Sidebar - Roboflow Style */}
                <aside className="w-64 bg-slate-900 border-r border-slate-700 flex flex-col">
                {/* Annotations Section */}
                <div className="p-3 border-b border-slate-700">
                  <div className="flex items-center justify-between mb-3">
                    <h3 className="text-white text-sm font-semibold">Annotations</h3>
                    <span className="bg-slate-700 text-white text-xs px-2 py-0.5 rounded">{annotations.length}</span>
                  </div>
                  {annotations.length > 0 && (
                    <div className="text-xs text-slate-400 mb-2">
                      Group: {annotations[0].class_name.replace(/_/g, ' ')}
                    </div>
                  )}
                </div>

                {/* Classes Section */}
                <div className="p-3 border-b border-slate-700">
                  <div className="flex items-center gap-2 mb-3 pb-2 border-b border-slate-700">
                    <button className="text-emerald-400 text-sm font-medium border-b-2 border-emerald-400 pb-1">
                      Classes
                    </button>
                    <button className="text-slate-500 text-sm">Layers</button>
                  </div>
                  <div className="space-y-1">
                    {(selectedDataset?.classes || []).map((defectClass) => (
                      <div
                        key={defectClass.id}
                        className="flex items-center gap-2 p-2 rounded hover:bg-slate-800 cursor-pointer"
                      >
                        <div 
                          className="w-3 h-3 rounded-full" 
                          style={{ backgroundColor: defectClass.color }}
                        ></div>
                        <span className="text-white text-sm flex-1">{defectClass.display_name}</span>
                        <span className="text-slate-500 text-xs">
                          {annotations.filter(a => a.class_name === defectClass.name).length}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Unused Classes */}
                {defectClasses.filter(dc => !(selectedDataset?.classes || []).some(c => c.id === dc.id)).length > 0 && (
                  <div className="p-3 border-b border-slate-700">
                    <h4 className="text-slate-400 text-xs font-medium mb-2">Unused Classes</h4>
                    <div className="space-y-1">
                      {defectClasses.filter(dc => !(selectedDataset?.classes || []).some(c => c.id === dc.id)).slice(0, 5).map((dc) => (
                        <div key={dc.id} className="flex items-center gap-2 text-slate-500 text-sm">
                          <span>{dc.display_name}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {/* Labels Panel */}
                <div className="mt-auto p-3 border-t border-slate-700">
                  <div className="text-center">
                    <div className="w-12 h-12 mx-auto mb-2 flex items-center justify-center">
                      <Tag className="w-8 h-8 text-slate-600" />
                    </div>
                    <div className="text-slate-500 text-xs mb-1">Labels</div>
                  </div>
                </div>
              </aside>
              {/* Canvas Area - Fullscreen Centered */}
              <div className="flex-1 relative bg-slate-950 flex items-center justify-center">
                <canvas
                  ref={canvasRef}
                  onMouseDown={handleMouseDown}
                  onMouseMove={handleMouseMove}
                  onMouseUp={handleMouseUp}
                  className="cursor-crosshair max-w-full max-h-full"
                />
                
                {/* Zoom Controls - Bottom Left */}
                <div className="absolute bottom-4 left-4 flex items-center gap-2 bg-slate-800 rounded-lg p-2">
                  <button className="p-1.5 hover:bg-slate-700 rounded text-white">
                    <span className="text-xs">−</span>
                  </button>
                  <span className="text-white text-xs font-medium px-2">100%</span>
                  <button className="p-1.5 hover:bg-slate-700 rounded text-white">
                    <span className="text-xs">+</span>
                  </button>
                  <div className="w-px h-4 bg-slate-600 mx-1"></div>
                  <button className="px-2 py-1 text-xs text-white hover:bg-slate-700 rounded">RESET</button>
                </div>
              </div>
            </div>
            </div>
          </>
      )}

      {/* Dataset Modal */}
      {showDatasetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-lg w-full border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
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
                    className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white"
                    placeholder="e.g., Weld Defects 2026"
                  />
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={datasetForm.description}
                    onChange={(e) => setDatasetForm({ ...datasetForm, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    rows="3"
                  />
                </div>

                {/* Defect Class Selection */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">
                    Defect Classes * ({selectedClassIds.length} selected)
                  </label>
                  <p className="text-xs text-slate-500 mb-2">
                    Select the defect classes you want to label in this dataset
                  </p>
                  <div className="max-h-64 overflow-y-auto bg-slate-900 border border-slate-700 rounded p-3 space-y-2">
                    {defectClasses.map(defectClass => (
                      <label
                        key={defectClass.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-700 p-2 rounded transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassIds.includes(defectClass.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassIds([...selectedClassIds, defectClass.id])
                            } else {
                              setSelectedClassIds(selectedClassIds.filter(id => id !== defectClass.id))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: defectClass.color }}></div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{defectClass.display_name}</div>
                          {defectClass.description && (
                            <div className="text-xs text-slate-400">{defectClass.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Created By</label>
                  <input
                    type="text"
                    value={datasetForm.created_by}
                    onChange={(e) => setDatasetForm({ ...datasetForm, created_by: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    placeholder="Your name"
                  />
                </div>

                {/* Train/Valid/Test Split Ratios */}
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-3">Dataset Split Ratios</label>
                  <div className="grid grid-cols-3 gap-3">
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Train %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={datasetForm.train_split || 80}
                        onChange={(e) => setDatasetForm({ ...datasetForm, train_split: parseInt(e.target.value) || 80 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Valid %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={datasetForm.valid_split || 10}
                        onChange={(e) => setDatasetForm({ ...datasetForm, valid_split: parseInt(e.target.value) || 10 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-slate-400 mb-1">Test %</label>
                      <input
                        type="number"
                        min="0"
                        max="100"
                        value={datasetForm.test_split || 10}
                        onChange={(e) => setDatasetForm({ ...datasetForm, test_split: parseInt(e.target.value) || 10 })}
                        className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white text-sm"
                      />
                    </div>
                  </div>
                  <p className="text-xs text-slate-500 mt-2">
                    Total: {(datasetForm.train_split || 80) + (datasetForm.valid_split || 10) + (datasetForm.test_split || 10)}%
                    {((datasetForm.train_split || 80) + (datasetForm.valid_split || 10) + (datasetForm.test_split || 10)) !== 100 && (
                      <span className="text-yellow-500 ml-2">⚠ Should sum to 100%</span>
                    )}
                  </p>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowDatasetModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedClassIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  <Save className="w-5 h-5" />
                  Create Dataset
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Create/Edit Defect Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-slate-800 rounded-lg max-w-4xl w-full border border-slate-700 my-8">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">{editingClass ? 'Edit Defect Class' : 'Manage Defect Classes'}</h2>
              <button onClick={() => {
                setShowClassModal(false)
                setEditingClass(null)
                setClassForm({ name: '', display_name: '', color: '#3B82F6', description: '' })
              }} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <div className="grid grid-cols-2 gap-6 p-6">
              {/* Existing Classes List */}
              <div>
                <h3 className="text-sm font-medium text-slate-300 mb-3">Existing Classes ({defectClasses.length})</h3>
                <div className="max-h-96 overflow-y-auto space-y-2 bg-slate-900 rounded p-3">
                  {defectClasses.map(dc => (
                    <div
                      key={dc.id}
                      className="flex items-center gap-3 bg-slate-700 hover:bg-slate-600 p-3 rounded transition"
                    >
                      <div className="w-6 h-6 rounded" style={{ backgroundColor: dc.color }}></div>
                      <div className="flex-1">
                        <div className="text-white font-medium">{dc.display_name}</div>
                        {dc.description && (
                          <div className="text-xs text-slate-400">{dc.description}</div>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setEditingClass(dc)
                          setClassForm({
                            name: dc.name,
                            display_name: dc.display_name,
                            color: dc.color,
                            description: dc.description || ''
                          })
                        }}
                        className="p-1 text-blue-400 hover:text-blue-300"
                        title="Edit"
                      >
                        <Tag className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        onClick={() => deleteDefectClass(dc.id)}
                        className="p-1 text-red-400 hover:text-red-300"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  ))}
                  {defectClasses.length === 0 && (
                    <div className="text-center py-8 text-slate-500">
                      <Tag className="w-12 h-12 mx-auto mb-2 opacity-50" />
                      <p className="text-sm">No classes yet. Create one →</p>
                    </div>
                  )}
                </div>
              </div>

              {/* Create/Edit Form */}
              <form onSubmit={createDefectClass} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Display Name *</label>
                  <input
                    type="text"
                    required
                    value={classForm.display_name}
                    onChange={(e) => {
                      const displayName = e.target.value
                      setClassForm({ 
                        ...classForm, 
                        display_name: displayName,
                        name: displayName.toLowerCase().replace(/\s+/g, '_')
                      })
                    }}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    placeholder="e.g., Porosity, Crack"
                  />
                  <p className="text-xs text-slate-500 mt-1">
                    Internal name: {classForm.name || 'auto-generated'}
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Color *</label>
                  <div className="flex gap-3 items-center">
                    <input
                      type="color"
                      required
                      value={classForm.color}
                      onChange={(e) => setClassForm({ ...classForm, color: e.target.value })}
                      className="w-16 h-10 bg-slate-900 border border-slate-700 rounded cursor-pointer"
                    />
                    <input
                      type="text"
                      value={classForm.color}
                      onChange={(e) => setClassForm({ ...classForm, color: e.target.value })}
                      className="flex-1 bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white font-mono text-sm"
                      placeholder="#3B82F6"
                      pattern="^#[0-9A-Fa-f]{6}$"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-2">Description</label>
                  <textarea
                    value={classForm.description}
                    onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                    className="w-full bg-slate-900 border border-slate-700 rounded px-3 py-2 text-white"
                    rows="3"
                    placeholder="Brief description of this defect type"
                  />
                </div>
                
                <div className="flex gap-3 mt-4">
                  {editingClass && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditingClass(null)
                        setClassForm({ name: '', display_name: '', color: '#3B82F6', description: '' })
                      }}
                      className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                    >
                      Cancel Edit
                    </button>
                  )}
                  <button
                    type="submit"
                    className="flex-1 flex items-center justify-center gap-2 bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded"
                  >
                    <Save className="w-4 h-4" />
                    {editingClass ? 'Update Class' : 'Create Class'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        </div>
      )}

      {/* Edit Dataset Classes Modal */}
      {showEditDatasetModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-800 rounded-lg max-w-lg w-full border border-slate-700">
            <div className="p-6 border-b border-slate-700 flex justify-between items-center">
              <h2 className="text-xl font-bold text-white">Edit Dataset Classes</h2>
              <button onClick={() => setShowEditDatasetModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-6 h-6" />
              </button>
            </div>
            
            <form onSubmit={updateDatasetClasses} className="p-6">
              <div className="space-y-4">
                <div>
                  <p className="text-sm text-slate-300 mb-3">
                    Select which defect classes you want to use in <span className="font-bold text-white">{selectedDataset?.name}</span>
                  </p>
                  <div className="max-h-96 overflow-y-auto bg-slate-900 border border-slate-700 rounded p-3 space-y-2">
                    {defectClasses.map(defectClass => (
                      <label
                        key={defectClass.id}
                        className="flex items-center gap-3 cursor-pointer hover:bg-slate-700 p-2 rounded transition"
                      >
                        <input
                          type="checkbox"
                          checked={selectedClassIds.includes(defectClass.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setSelectedClassIds([...selectedClassIds, defectClass.id])
                            } else {
                              setSelectedClassIds(selectedClassIds.filter(id => id !== defectClass.id))
                            }
                          }}
                          className="w-4 h-4"
                        />
                        <div className="w-4 h-4 rounded" style={{ backgroundColor: defectClass.color }}></div>
                        <div className="flex-1">
                          <div className="text-white font-medium">{defectClass.display_name}</div>
                          {defectClass.description && (
                            <div className="text-xs text-slate-400">{defectClass.description}</div>
                          )}
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              </div>
              
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => setShowEditDatasetModal(false)}
                  className="flex-1 bg-slate-700 hover:bg-slate-600 text-white px-4 py-2 rounded"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={selectedClassIds.length === 0}
                  className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-600 text-white px-4 py-2 rounded"
                >
                  <Save className="w-4 h-4" />
                  Save Classes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Annotation Editor Modal - Roboflow Style */}
      {showClassPicker && pendingBox && (
        <div className="fixed inset-0 z-50 flex items-center justify-center pointer-events-none">
          <div className="pointer-events-auto bg-slate-800 rounded-lg w-80 border border-emerald-500 shadow-2xl">
            {/* Header */}
            <div className="flex items-center justify-between p-3 border-b border-slate-700 bg-emerald-600\">\n              <h3 className="text-white font-semibold text-sm">Annotation Editor</h3>
              <button
                onClick={cancelPendingBox}
                className="text-white hover:bg-emerald-700 p-1 rounded"
              >
                <X className="w-4 h-4" />
              </button>
            </div>
            
            {/* Label Input */}
            <div className="p-3 border-b border-slate-700">
              <label className="text-slate-300 text-xs font-medium mb-1 block">Label</label>
              <input
                type="text"
                value={selectedClassForAnnotation ? defectClasses.find(c => c.name === selectedClassForAnnotation)?.display_name || '' : ''}
                placeholder="Select a class below"
                className="w-full bg-slate-900 border border-slate-600 rounded px-3 py-2 text-white text-sm"
                readOnly
              />
            </div>
            
            {/* Action Buttons */}
            <div className="p-3 flex gap-2 border-b border-slate-700">
              <button
                onClick={cancelPendingBox}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white text-sm rounded font-medium"
              >
                Delete
              </button>
              <div className="flex-1"></div>
              <button
                onClick={saveAnnotationWithClass}
                disabled={!selectedClassForAnnotation}
                className="px-4 py-1.5 bg-emerald-500 hover:bg-emerald-600 disabled:bg-slate-600 disabled:cursor-not-allowed text-white text-sm rounded font-medium"
              >
                Save
              </button>
            </div>
            
            {/* Class List */}
            <div className="p-3 bg-slate-900 max-h-64 overflow-y-auto">
              <div className="space-y-1">
                {defectClasses.map((defectClass, idx) => (
                  <button
                    key={defectClass.id}
                    onClick={() => setSelectedClassForAnnotation(defectClass.name)}
                    className={`w-full flex items-center gap-2 p-2 rounded text-left transition-colors ${
                      selectedClassForAnnotation === defectClass.name 
                        ? 'bg-emerald-600 hover:bg-emerald-700' 
                        : 'hover:bg-slate-800'
                    }`}
                  >
                    <span className="text-slate-400 text-sm font-medium w-5">{idx + 1}</span>
                    <span className="text-white text-sm flex-1">{defectClass.display_name}</span>
                    <div 
                      className="w-3 h-3 rounded-full" 
                      style={{ backgroundColor: defectClass.color }}
                    ></div>
                  </button>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Labeling
