import { useState, useEffect } from 'react'
import { 
  BarChart3, 
  TrendingUp, 
  Database, 
  Image as ImageIcon,
  Tag,
  Activity,
  PieChart,
  Target,
  CheckCircle,
  AlertCircle
} from 'lucide-react'

function Analytics() {
  const [datasets, setDatasets] = useState([])
  const [stats, setStats] = useState({
    totalDatasets: 0,
    totalImages: 0,
    totalAnnotations: 0,
    totalClasses: 0,
    avgImagesPerDataset: 0,
    annotationCoverage: 0
  })

  useEffect(() => {
    fetchAnalytics()
  }, [])

  const fetchAnalytics = async () => {
    try {
      const res = await fetch('/api/datasets/', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setDatasets(data)
        
        // Calculate statistics
        const totalImages = data.reduce((sum, ds) => sum + (ds.images?.length || 0), 0)
        const totalAnnotations = data.reduce((sum, ds) => {
          return sum + (ds.images?.reduce((imgSum, img) => imgSum + (img.annotations?.length || 0), 0) || 0)
        }, 0)
        
        const allClasses = new Set()
        data.forEach(ds => {
          ds.classes?.forEach(cls => allClasses.add(cls))
        })
        
        setStats({
          totalDatasets: data.length,
          totalImages,
          totalAnnotations,
          totalClasses: allClasses.size,
          avgImagesPerDataset: data.length > 0 ? Math.round(totalImages / data.length) : 0,
          annotationCoverage: totalImages > 0 ? Math.round((totalAnnotations / totalImages) * 100) : 0
        })
      }
    } catch (error) {
      console.error('Error fetching analytics:', error)
    }
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">ML Analytics</h2>
        <p className="text-slate-400 mt-1">Dataset insights and annotation statistics</p>
      </div>

      {/* Key Metrics Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Database className="w-8 h-8 text-blue-400" />
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalDatasets}</div>
          <div className="text-sm text-slate-400">Total Datasets</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <ImageIcon className="w-8 h-8 text-purple-400" />
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalImages}</div>
          <div className="text-sm text-slate-400">Total Images</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Target className="w-8 h-8 text-emerald-400" />
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalAnnotations}</div>
          <div className="text-sm text-slate-400">Total Annotations</div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center justify-between mb-2">
            <Tag className="w-8 h-8 text-amber-400" />
            <TrendingUp className="w-5 h-5 text-emerald-400" />
          </div>
          <div className="text-3xl font-bold text-white mb-1">{stats.totalClasses}</div>
          <div className="text-sm text-slate-400">Unique Classes</div>
        </div>
      </div>

      {/* Secondary Metrics */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <Activity className="w-6 h-6 text-blue-400" />
            <h3 className="text-lg font-semibold text-white">Dataset Health</h3>
          </div>
          <div className="space-y-4">
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Avg Images per Dataset</span>
                <span className="text-sm font-semibold text-white">{stats.avgImagesPerDataset}</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-blue-500 h-2 rounded-full" 
                  style={{ width: `${Math.min((stats.avgImagesPerDataset / 100) * 100, 100)}%` }}
                ></div>
              </div>
            </div>
            <div>
              <div className="flex justify-between mb-2">
                <span className="text-sm text-slate-400">Annotation Coverage</span>
                <span className="text-sm font-semibold text-white">{stats.annotationCoverage}%</span>
              </div>
              <div className="w-full bg-slate-800 rounded-full h-2">
                <div 
                  className="bg-emerald-500 h-2 rounded-full" 
                  style={{ width: `${stats.annotationCoverage}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>

        <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
          <div className="flex items-center gap-3 mb-4">
            <PieChart className="w-6 h-6 text-purple-400" />
            <h3 className="text-lg font-semibold text-white">Data Quality</h3>
          </div>
          <div className="space-y-3">
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <CheckCircle className="w-5 h-5 text-emerald-400" />
                <span className="text-sm text-slate-300">Annotated Images</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.totalAnnotations > 0 ? 'Good' : 'None'}</span>
            </div>
            <div className="flex items-center justify-between p-3 bg-slate-800 rounded-lg">
              <div className="flex items-center gap-2">
                <AlertCircle className="w-5 h-5 text-amber-400" />
                <span className="text-sm text-slate-300">Classes Defined</span>
              </div>
              <span className="text-sm font-semibold text-white">{stats.totalClasses > 0 ? stats.totalClasses : 'None'}</span>
            </div>
          </div>
        </div>
      </div>

      {/* Dataset Breakdown Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-6">
          <BarChart3 className="w-6 h-6 text-emerald-400" />
          <h3 className="text-lg font-semibold text-white">Dataset Breakdown</h3>
        </div>
        
        {datasets.length === 0 ? (
          <div className="text-center py-12">
            <Database className="w-16 h-16 text-slate-700 mx-auto mb-4" />
            <p className="text-slate-500">No datasets available</p>
            <p className="text-sm text-slate-600 mt-1">Upload data to see analytics</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-slate-800">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Dataset Name</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Total Images</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Train</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Valid</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Test</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Classes</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Annotations</th>
                  <th className="text-center py-3 px-4 text-sm font-semibold text-slate-300">Split Ratio</th>
                </tr>
              </thead>
              <tbody>
                {datasets.map((dataset) => {
                  const imageCount = dataset.images?.length || 0
                  const annotationCount = dataset.images?.reduce((sum, img) => sum + (img.annotations?.length || 0), 0) || 0
                  const classCount = dataset.classes?.length || 0
                  
                  return (
                    <tr key={dataset.id} className="border-b border-slate-800/50 hover:bg-slate-800/30 transition-colors">
                      <td className="py-4 px-4">
                        <span className="text-white font-medium">{dataset.name}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-slate-300">{imageCount}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-green-900/30 text-green-400 rounded text-sm font-medium">
                          {dataset.train_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-blue-900/30 text-blue-400 rounded text-sm font-medium">
                          {dataset.valid_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-purple-900/30 text-purple-400 rounded text-sm font-medium">
                          {dataset.test_count || 0}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="px-2 py-1 bg-amber-900/30 text-amber-400 rounded text-sm font-medium">
                          {classCount}
                        </span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-emerald-400 font-semibold">{annotationCount}</span>
                      </td>
                      <td className="py-4 px-4 text-center">
                        <span className="text-sm text-slate-400">
                          {dataset.train_split || 80}/{dataset.valid_split || 10}/{dataset.test_split || 10}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Insights Section */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-6">
        <div className="flex items-center gap-3 mb-4">
          <Activity className="w-6 h-6 text-blue-400" />
          <h3 className="text-lg font-semibold text-white">Insights & Recommendations</h3>
        </div>
        
        <div className="space-y-3">
          {stats.totalImages === 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">No images uploaded</p>
                <p className="text-xs text-amber-400/70 mt-1">Upload images to start building your dataset</p>
              </div>
            </div>
          )}
          
          {stats.totalImages > 0 && stats.totalAnnotations === 0 && (
            <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">No annotations found</p>
                <p className="text-xs text-blue-400/70 mt-1">Start annotating your images to prepare for training</p>
              </div>
            </div>
          )}
          
          {stats.annotationCoverage < 50 && stats.totalImages > 0 && stats.totalAnnotations > 0 && (
            <div className="flex items-start gap-3 p-4 bg-amber-900/20 border border-amber-700/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-amber-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-amber-300">Low annotation coverage ({stats.annotationCoverage}%)</p>
                <p className="text-xs text-amber-400/70 mt-1">Consider annotating more images for better model performance</p>
              </div>
            </div>
          )}
          
          {stats.annotationCoverage >= 50 && stats.totalImages > 0 && (
            <div className="flex items-start gap-3 p-4 bg-emerald-900/20 border border-emerald-700/30 rounded-lg">
              <CheckCircle className="w-5 h-5 text-emerald-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-emerald-300">Good annotation coverage ({stats.annotationCoverage}%)</p>
                <p className="text-xs text-emerald-400/70 mt-1">Your dataset is ready for training</p>
              </div>
            </div>
          )}
          
          {stats.totalDatasets > 1 && stats.avgImagesPerDataset < 50 && (
            <div className="flex items-start gap-3 p-4 bg-blue-900/20 border border-blue-700/30 rounded-lg">
              <AlertCircle className="w-5 h-5 text-blue-400 mt-0.5" />
              <div>
                <p className="text-sm font-medium text-blue-300">Small dataset sizes (avg {stats.avgImagesPerDataset} images)</p>
                <p className="text-xs text-blue-400/70 mt-1">For production models, aim for 100+ images per dataset</p>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

export default Analytics


