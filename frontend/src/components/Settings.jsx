import { useState, useEffect } from 'react'
import { Camera, Plus, Edit2, Trash2, X, Save, CheckCircle, Circle } from 'lucide-react'

function Settings() {
  const [calibrations, setCalibrations] = useState([])
  const [loading, setLoading] = useState(false)
  const [showModal, setShowModal] = useState(false)
  const [editingCalibration, setEditingCalibration] = useState(null)
  
  const [form, setForm] = useState({
    name: '',
    image_width: 1280,
    image_height: 720,
    board_width: 9,
    board_height: 6,
    square_size_mm: 25.0,
    is_active: false
  })

  useEffect(() => {
    fetchCalibrations()
  }, [])

  const fetchCalibrations = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/stereo-calibrations/')
      const data = await response.json()
      setCalibrations(data)
    } catch (error) {
      console.error('Error fetching calibrations:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setLoading(true)

    try {
      const url = editingCalibration
        ? `http://localhost:8000/api/stereo-calibrations/${editingCalibration.id}/`
        : 'http://localhost:8000/api/stereo-calibrations/'
      
      const method = editingCalibration ? 'PUT' : 'POST'

      const response = await fetch(url, {
        method,
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(form),
      })

      if (response.ok) {
        await fetchCalibrations()
        closeModal()
      } else {
        const error = await response.json()
        alert(`Error: ${JSON.stringify(error)}`)
      }
    } catch (error) {
      console.error('Error saving calibration:', error)
      alert('Failed to save calibration')
    } finally {
      setLoading(false)
    }
  }

  const handleDelete = async (id) => {
    if (!confirm('Are you sure you want to delete this calibration?')) return

    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/stereo-calibrations/${id}/`, {
        method: 'DELETE',
      })

      if (response.ok) {
        await fetchCalibrations()
      }
    } catch (error) {
      console.error('Error deleting calibration:', error)
    } finally {
      setLoading(false)
    }
  }

  const handleSetActive = async (id) => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/stereo-calibrations/${id}/set_active/`, {
        method: 'POST',
      })

      if (response.ok) {
        await fetchCalibrations()
      }
    } catch (error) {
      console.error('Error setting active calibration:', error)
    } finally {
      setLoading(false)
    }
  }

  const openModal = (calibration = null) => {
    if (calibration) {
      setEditingCalibration(calibration)
      setForm({
        name: calibration.name,
        image_width: calibration.image_width,
        image_height: calibration.image_height,
        board_width: calibration.board_width,
        board_height: calibration.board_height,
        square_size_mm: calibration.square_size_mm,
        is_active: calibration.is_active
      })
    } else {
      setEditingCalibration(null)
      setForm({
        name: '',
        image_width: 1280,
        image_height: 720,
        board_width: 9,
        board_height: 6,
        square_size_mm: 25.0,
        is_active: false
      })
    }
    setShowModal(true)
  }

  const closeModal = () => {
    setShowModal(false)
    setEditingCalibration(null)
  }

  return (
    <div className="p-8">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="flex justify-between items-center mb-8">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Stereo Calibration Settings</h1>
            <p className="text-slate-400">Configure stereo camera calibration parameters</p>
          </div>
          <button
            onClick={() => openModal()}
            className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors"
          >
            <Plus className="w-5 h-5" />
            New Calibration
          </button>
        </div>

        {/* Calibration Cards */}
        {loading && calibrations.length === 0 ? (
          <div className="text-center text-slate-400 py-12">Loading...</div>
        ) : calibrations.length === 0 ? (
          <div className="text-center text-slate-400 py-12">
            <Camera className="w-16 h-16 mx-auto mb-4 opacity-50" />
            <p>No calibrations configured yet</p>
            <p className="text-sm mt-2">Click "New Calibration" to get started</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {calibrations.map((calibration) => (
              <div
                key={calibration.id}
                className={`bg-industrial-dark rounded-lg p-6 border-2 transition-all ${
                  calibration.is_active
                    ? 'border-green-500 shadow-lg shadow-green-500/20'
                    : 'border-industrial-gray hover:border-industrial-slate'
                }`}
              >
                <div className="flex justify-between items-start mb-4">
                  <div className="flex items-center gap-2">
                    {calibration.is_active ? (
                      <CheckCircle className="w-5 h-5 text-green-500" />
                    ) : (
                      <Circle className="w-5 h-5 text-slate-600" />
                    )}
                    <h3 className="text-lg font-semibold text-white">{calibration.name}</h3>
                  </div>
                  {calibration.is_active && (
                    <span className="text-xs bg-green-500 text-white px-2 py-1 rounded">
                      ACTIVE
                    </span>
                  )}
                </div>

                <div className="space-y-2 mb-4">
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Resolution:</span>
                    <span className="text-white">
                      {calibration.image_width} × {calibration.image_height}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Board Size:</span>
                    <span className="text-white">
                      {calibration.board_width} × {calibration.board_height}
                    </span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Square Size:</span>
                    <span className="text-white">{calibration.square_size_mm} mm</span>
                  </div>
                  <div className="flex justify-between text-sm">
                    <span className="text-slate-400">Updated:</span>
                    <span className="text-white">
                      {new Date(calibration.updated_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2">
                  {!calibration.is_active && (
                    <button
                      onClick={() => handleSetActive(calibration.id)}
                      className="flex-1 bg-green-600 hover:bg-green-700 text-white text-sm px-3 py-2 rounded transition-colors"
                      disabled={loading}
                    >
                      Set Active
                    </button>
                  )}
                  <button
                    onClick={() => openModal(calibration)}
                    className="flex items-center justify-center gap-1 bg-industrial-slate hover:bg-industrial-gray text-white text-sm px-3 py-2 rounded transition-colors"
                    disabled={loading}
                  >
                    <Edit2 className="w-4 h-4" />
                    Edit
                  </button>
                  <button
                    onClick={() => handleDelete(calibration.id)}
                    className="flex items-center justify-center bg-red-600 hover:bg-red-700 text-white text-sm px-3 py-2 rounded transition-colors"
                    disabled={loading}
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-industrial-dark rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto">
              <div className="sticky top-0 bg-industrial-dark border-b border-industrial-gray p-6 flex justify-between items-center">
                <h2 className="text-2xl font-bold text-white">
                  {editingCalibration ? 'Edit Calibration' : 'New Calibration'}
                </h2>
                <button
                  onClick={closeModal}
                  className="text-slate-400 hover:text-white transition-colors"
                >
                  <X className="w-6 h-6" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="p-6">
                <div className="space-y-6">
                  {/* Name */}
                  <div>
                    <label className="block text-sm font-medium text-slate-300 mb-2">
                      Configuration Name *
                    </label>
                    <input
                      type="text"
                      required
                      value={form.name}
                      onChange={(e) => setForm({ ...form, name: e.target.value })}
                      className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      placeholder="e.g., Production Camera Setup"
                    />
                  </div>

                  {/* Image Resolution */}
                  <div className="grid grid-cols-2 gap-4">
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image Width (px) *
                      </label>
                      <input
                        type="number"
                        required
                        min="640"
                        max="3840"
                        value={form.image_width}
                        onChange={(e) =>
                          setForm({ ...form, image_width: parseInt(e.target.value) })
                        }
                        className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Image Height (px) *
                      </label>
                      <input
                        type="number"
                        required
                        min="480"
                        max="2160"
                        value={form.image_height}
                        onChange={(e) =>
                          setForm({ ...form, image_height: parseInt(e.target.value) })
                        }
                        className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                    </div>
                  </div>

                  {/* Chessboard Parameters */}
                  <div className="border-t border-industrial-gray pt-6">
                    <h3 className="text-lg font-semibold text-white mb-4">Chessboard Parameters</h3>
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Board Width (corners) *
                        </label>
                        <input
                          type="number"
                          required
                          min="3"
                          max="20"
                          value={form.board_width}
                          onChange={(e) =>
                            setForm({ ...form, board_width: parseInt(e.target.value) })
                          }
                          className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Inner corners only</p>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-slate-300 mb-2">
                          Board Height (corners) *
                        </label>
                        <input
                          type="number"
                          required
                          min="3"
                          max="20"
                          value={form.board_height}
                          onChange={(e) =>
                            setForm({ ...form, board_height: parseInt(e.target.value) })
                          }
                          className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                        />
                        <p className="text-xs text-slate-500 mt-1">Inner corners only</p>
                      </div>
                    </div>
                    <div className="mt-4">
                      <label className="block text-sm font-medium text-slate-300 mb-2">
                        Square Size (mm) *
                      </label>
                      <input
                        type="number"
                        required
                        min="1"
                        max="100"
                        step="0.1"
                        value={form.square_size_mm}
                        onChange={(e) =>
                          setForm({ ...form, square_size_mm: parseFloat(e.target.value) })
                        }
                        className="w-full bg-industrial-darker border border-industrial-gray rounded-lg px-4 py-2 text-white focus:outline-none focus:border-blue-500"
                      />
                      <p className="text-xs text-slate-500 mt-1">Physical size of each square</p>
                    </div>
                  </div>

                  {/* Active Toggle */}
                  <div className="flex items-center gap-3 pt-4">
                    <input
                      type="checkbox"
                      id="is_active"
                      checked={form.is_active}
                      onChange={(e) => setForm({ ...form, is_active: e.target.checked })}
                      className="w-4 h-4 text-blue-600 bg-industrial-darker border-industrial-gray rounded focus:ring-blue-500"
                    />
                    <label htmlFor="is_active" className="text-sm text-slate-300">
                      Set as active configuration
                    </label>
                  </div>
                </div>

                {/* Actions */}
                <div className="flex gap-3 mt-8 pt-6 border-t border-industrial-gray">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="flex-1 bg-industrial-slate hover:bg-industrial-gray text-white px-4 py-2 rounded-lg transition-colors"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="flex-1 flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition-colors disabled:opacity-50"
                  >
                    <Save className="w-5 h-5" />
                    {loading ? 'Saving...' : 'Save Calibration'}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}

export default Settings
