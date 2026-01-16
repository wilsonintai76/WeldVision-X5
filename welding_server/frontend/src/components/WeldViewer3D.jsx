import { useState, useRef, useEffect, useMemo } from 'react'
import { Canvas, useFrame, useThree } from '@react-three/fiber'
import { OrbitControls, PerspectiveCamera } from '@react-three/drei'
import * as THREE from 'three'

/**
 * WeldViewer3D - Interactive 3D point cloud viewer for weld assessments
 * 
 * Tier 1 (Student View): Displays decimated mesh (<50k points) in browser
 * Uses react-three-fiber for WebGL rendering
 */

// Point cloud component that renders the mesh data
function PointCloud({ meshData, pointSize = 0.5 }) {
  const pointsRef = useRef()
  
  const { positions, colors } = useMemo(() => {
    if (!meshData || !meshData.points || meshData.points.length === 0) {
      return { positions: new Float32Array(0), colors: new Float32Array(0) }
    }
    
    const points = meshData.points
    const colorData = meshData.colors
    
    // Create typed arrays for Three.js BufferGeometry
    const positionsArray = new Float32Array(points.length * 3)
    const colorsArray = new Float32Array(points.length * 3)
    
    for (let i = 0; i < points.length; i++) {
      // Positions
      positionsArray[i * 3] = points[i][0]
      positionsArray[i * 3 + 1] = points[i][1]
      positionsArray[i * 3 + 2] = points[i][2]
      
      // Colors (normalize from 0-255 to 0-1)
      if (colorData && colorData[i]) {
        colorsArray[i * 3] = colorData[i][0] / 255
        colorsArray[i * 3 + 1] = colorData[i][1] / 255
        colorsArray[i * 3 + 2] = colorData[i][2] / 255
      } else {
        // Default gray color
        colorsArray[i * 3] = 0.7
        colorsArray[i * 3 + 1] = 0.7
        colorsArray[i * 3 + 2] = 0.7
      }
    }
    
    return { positions: positionsArray, colors: colorsArray }
  }, [meshData])
  
  // Center the point cloud on load
  useEffect(() => {
    if (pointsRef.current && meshData?.bounds) {
      const { min, max } = meshData.bounds
      const centerX = (min[0] + max[0]) / 2
      const centerY = (min[1] + max[1]) / 2
      const centerZ = (min[2] + max[2]) / 2
      pointsRef.current.position.set(-centerX, -centerY, -centerZ)
    }
  }, [meshData])
  
  if (positions.length === 0) {
    return null
  }
  
  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={positions.length / 3}
          array={positions}
          itemSize={3}
        />
        <bufferAttribute
          attach="attributes-color"
          count={colors.length / 3}
          array={colors}
          itemSize={3}
        />
      </bufferGeometry>
      <pointsMaterial
        size={pointSize}
        vertexColors
        sizeAttenuation
      />
    </points>
  )
}

// Auto-rotating camera controller
function CameraController({ autoRotate = false }) {
  const { camera } = useThree()
  
  useEffect(() => {
    camera.position.set(0, 0, 300)
    camera.lookAt(0, 0, 0)
  }, [camera])
  
  return (
    <OrbitControls
      enableDamping
      dampingFactor={0.05}
      autoRotate={autoRotate}
      autoRotateSpeed={0.5}
      minDistance={50}
      maxDistance={1000}
    />
  )
}

// Loading indicator component
function LoadingIndicator() {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-emerald-400 border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-slate-400">Loading 3D model...</p>
      </div>
    </div>
  )
}

// Error display component
function ErrorDisplay({ message }) {
  return (
    <div className="absolute inset-0 flex items-center justify-center bg-slate-900/80">
      <div className="text-center p-6">
        <div className="w-16 h-16 bg-red-500/20 rounded-full flex items-center justify-center mx-auto mb-4">
          <svg className="w-8 h-8 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
          </svg>
        </div>
        <p className="text-red-400">{message}</p>
      </div>
    </div>
  )
}

// Main WeldViewer3D component
export default function WeldViewer3D({ 
  assessmentId,
  meshData = null,
  onLoad = null,
  onError = null,
  autoRotate = false,
  className = '',
  pointSize = 0.5,
}) {
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(null)
  const [data, setData] = useState(meshData)
  
  // Fetch mesh data from API if assessmentId provided
  useEffect(() => {
    if (meshData) {
      setData(meshData)
      return
    }
    
    if (!assessmentId) {
      return
    }
    
    const fetchMeshData = async () => {
      setLoading(true)
      setError(null)
      
      try {
        const response = await fetch(`/api/assessments/${assessmentId}/mesh-preview/`)
        
        if (!response.ok) {
          throw new Error(response.status === 404 
            ? 'No 3D preview available' 
            : 'Failed to load 3D model'
          )
        }
        
        const result = await response.json()
        setData(result.mesh)
        
        if (onLoad) {
          onLoad(result)
        }
      } catch (err) {
        setError(err.message)
        if (onError) {
          onError(err)
        }
      } finally {
        setLoading(false)
      }
    }
    
    fetchMeshData()
  }, [assessmentId, meshData, onLoad, onError])
  
  const hasData = data && data.points && data.points.length > 0
  
  return (
    <div className={`relative bg-slate-900 rounded-lg overflow-hidden ${className}`}>
      {/* Stats overlay */}
      {hasData && (
        <div className="absolute top-3 left-3 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-400">
          <span className="text-emerald-400 font-medium">{data.count?.toLocaleString() || data.points.length.toLocaleString()}</span> points
        </div>
      )}
      
      {/* Controls hint */}
      {hasData && (
        <div className="absolute bottom-3 left-3 z-10 bg-slate-800/80 backdrop-blur-sm rounded-lg px-3 py-2 text-xs text-slate-500">
          <span className="mr-3">🖱️ Rotate</span>
          <span className="mr-3">⚲ Zoom</span>
          <span>⇧ Pan</span>
        </div>
      )}
      
      {/* Loading state */}
      {loading && <LoadingIndicator />}
      
      {/* Error state */}
      {error && <ErrorDisplay message={error} />}
      
      {/* 3D Canvas */}
      {hasData && !loading && !error && (
        <Canvas
          gl={{ antialias: true, alpha: true }}
          dpr={[1, 2]}
        >
          <color attach="background" args={['#0f172a']} />
          <ambientLight intensity={0.5} />
          <pointLight position={[100, 100, 100]} intensity={1} />
          
          <PerspectiveCamera makeDefault fov={50} near={0.1} far={5000} />
          <CameraController autoRotate={autoRotate} />
          
          <PointCloud meshData={data} pointSize={pointSize} />
          
          {/* Grid helper for orientation */}
          <gridHelper args={[500, 50, '#334155', '#1e293b']} rotation={[Math.PI / 2, 0, 0]} />
        </Canvas>
      )}
      
      {/* Empty state */}
      {!hasData && !loading && !error && (
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="text-center text-slate-500">
            <svg className="w-16 h-16 mx-auto mb-4 opacity-50" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
            </svg>
            <p>No 3D data available</p>
          </div>
        </div>
      )}
    </div>
  )
}
