import { useState, useEffect } from 'react'
import { getStoredToken } from '../services/authAPI'
import type { Model } from '../components/mlops/types'

export function useModelNotifications() {
  const [newCompiledModels, setNewCompiledModels] = useState<Model[]>([])
  const [newOnnxModels, setNewOnnxModels] = useState<Model[]>([])

  useEffect(() => {
    const fetchModels = async () => {
      const token = getStoredToken()
      if (!token) return

      try {
        const res = await fetch('/api/models', {
          headers: { 'Authorization': `Bearer ${token}` }
        })
        if (res.ok) {
          const data = await res.json() as any
          const models: Model[] = Array.isArray(data) ? data : (data.results || [])
          
          // Find newly compiled .bin models not yet deployed
          const compiled = models.filter(
            m => m.status === 'compiled' && !m.is_deployed && m.model_file_key?.endsWith('.bin')
          )
          setNewCompiledModels(compiled)

          // Find newly uploaded .onnx models (waiting to compile or compiling)
          const onnx = models.filter(
            m => (m.status === 'uploaded' || m.status === 'compiling') && m.model_file_key?.endsWith('.onnx')
          )
          setNewOnnxModels(onnx)
        }
      } catch {
        // silently ignore fetch errors
      }
    }

    fetchModels()
    const interval = setInterval(fetchModels, 15000)
    return () => clearInterval(interval)
  }, [])

  return {
    newCompiledModels,
    newOnnxModels
  }
}
