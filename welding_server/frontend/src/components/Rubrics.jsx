import { useState, useEffect } from 'react'
import { ClipboardCheck, Plus, Edit2, Trash2, X, Save, CheckCircle, ChevronDown, ChevronRight, Star, AlertTriangle } from 'lucide-react'

// Helper to get CSRF token
function getCSRFToken() {
  const name = 'csrftoken';
  let cookieValue = null;
  if (document.cookie && document.cookie !== '') {
    const cookies = document.cookie.split(';');
    for (let i = 0; i < cookies.length; i++) {
      const cookie = cookies[i].trim();
      if (cookie.substring(0, name.length + 1) === (name + '=')) {
        cookieValue = decodeURIComponent(cookie.substring(name.length + 1));
        break;
      }
    }
  }
  return cookieValue;
}

function Rubrics() {
  const [rubrics, setRubrics] = useState([])
  const [selectedRubric, setSelectedRubric] = useState(null)
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showRubricModal, setShowRubricModal] = useState(false)
  const [showCriterionModal, setShowCriterionModal] = useState(false)
  const [editingRubric, setEditingRubric] = useState(null)
  const [editingCriterion, setEditingCriterion] = useState(null)

  // Forms
  const [rubricForm, setRubricForm] = useState({
    name: '',
    description: '',
    rubric_type: 'custom',
    passing_score: 3.0
  })

  const [criterionForm, setCriterionForm] = useState({
    name: '',
    category: 'visual',
    weight: 1.0,
    order: 0,
    score_1_label: 'Poor',
    score_1_description: '',
    score_2_label: 'Below Average',
    score_2_description: '',
    score_3_label: 'Acceptable',
    score_3_description: '',
    score_4_label: 'Good',
    score_4_description: '',
    score_5_label: 'Excellent',
    score_5_description: ''
  })

  useEffect(() => {
    fetchRubrics()
  }, [])

  const fetchRubrics = async () => {
    try {
      const res = await fetch('/api/assessment-rubrics/', { credentials: 'include' })
      if (res.ok) {
        const data = await res.json()
        setRubrics(Array.isArray(data) ? data : (data.results || []))
      }
    } catch (error) {
      console.error('Error fetching rubrics:', error)
    }
  }

  const createRubric = async () => {
    setLoading(true)
    try {
      const url = editingRubric
        ? `/api/assessment-rubrics/${editingRubric.id}/`
        : '/api/assessment-rubrics/'
      const csrfToken = getCSRFToken();
      const res = await fetch(url, {
        credentials: 'include', method: editingRubric ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(rubricForm)
      })
      if (res.ok) {
        fetchRubrics()
        setShowRubricModal(false)
        resetRubricForm()
      }
    } catch (error) {
      console.error('Error saving rubric:', error)
    }
    setLoading(false)
  }

  const deleteRubric = async (id) => {
    if (!confirm('Delete this rubric? All criteria will also be deleted.')) return
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/assessment-rubrics/${id}/`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken }
      })
      fetchRubrics()
      if (selectedRubric?.id === id) setSelectedRubric(null)
    } catch (error) {
      console.error('Error deleting rubric:', error)
    }
  }

  const activateRubric = async (id) => {
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/assessment-rubrics/${id}/activate/`, {
        credentials: 'include',
        method: 'POST',
        headers: { 'X-CSRFToken': csrfToken }
      })
      fetchRubrics()
    } catch (error) {
      console.error('Error activating rubric:', error)
    }
  }

  const createISO5817 = async () => {
    setLoading(true)
    try {
      const csrfToken = getCSRFToken();
      const res = await fetch('/api/assessment-rubrics/create_iso_5817/', {
        credentials: 'include', method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify({ name: `ISO 5817 Rubric - ${new Date().toLocaleString()}` })
      })
      if (res.ok) {
        fetchRubrics()
        alert('ISO 5817 rubric created with standard criteria!')
      } else {
        const errorData = await res.json()
        alert(`Failed to create rubric: ${errorData.detail || errorData.error || 'Unknown error'}`)
      }
    } catch (error) {
      console.error('Error creating ISO rubric:', error)
      alert('Error creating ISO rubric. Check console for details.')
    }
    setLoading(false)
  }

  const createCriterion = async () => {
    if (!selectedRubric) return
    setLoading(true)
    try {
      const url = editingCriterion
        ? `/api/rubric-criteria/${editingCriterion.id}/`
        : `/api/assessment-rubrics/${selectedRubric.id}/add_criterion/`
      const csrfToken = getCSRFToken();
      const res = await fetch(url, {
        credentials: 'include', method: editingCriterion ? 'PUT' : 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRFToken': csrfToken
        },
        body: JSON.stringify(criterionForm)
      })
      if (res.ok) {
        fetchRubrics()
        setShowCriterionModal(false)
        resetCriterionForm()
        // Refresh selected rubric
        const updatedRes = await fetch(`/api/assessment-rubrics/${selectedRubric.id}/`, { credentials: 'include' })
        if (updatedRes.ok) {
          setSelectedRubric(await updatedRes.json())
        }
      }
    } catch (error) {
      console.error('Error saving criterion:', error)
    }
    setLoading(false)
  }

  const deleteCriterion = async (id) => {
    if (!confirm('Delete this criterion?')) return
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/rubric-criteria/${id}/`, {
        credentials: 'include',
        method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken }
      })
      // Refresh selected rubric
      const res = await fetch(`/api/assessment-rubrics/${selectedRubric.id}/`, { credentials: 'include' })
      if (res.ok) {
        setSelectedRubric(await res.json())
      }
      fetchRubrics()
    } catch (error) {
      console.error('Error deleting criterion:', error)
    }
  }

  const openRubricModal = (rubric = null) => {
    if (rubric) {
      setEditingRubric(rubric)
      setRubricForm({
        name: rubric.name,
        description: rubric.description || '',
        rubric_type: rubric.rubric_type,
        passing_score: rubric.passing_score
      })
    } else {
      setEditingRubric(null)
      resetRubricForm()
    }
    setShowRubricModal(true)
  }

  const openCriterionModal = (criterion = null) => {
    if (criterion) {
      setEditingCriterion(criterion)
      setCriterionForm({ ...criterion })
    } else {
      setEditingCriterion(null)
      resetCriterionForm()
    }
    setShowCriterionModal(true)
  }

  const resetRubricForm = () => {
    setRubricForm({ name: '', description: '', rubric_type: 'custom', passing_score: 3.0 })
    setEditingRubric(null)
  }

  const resetCriterionForm = () => {
    setCriterionForm({
      name: '', category: 'visual', weight: 1.0, order: 0,
      score_1_label: 'Poor', score_1_description: '',
      score_2_label: 'Below Average', score_2_description: '',
      score_3_label: 'Acceptable', score_3_description: '',
      score_4_label: 'Good', score_4_description: '',
      score_5_label: 'Excellent', score_5_description: ''
    })
    setEditingCriterion(null)
  }

  const categoryColors = {
    geometric: 'bg-blue-900/50 text-blue-400',
    visual: 'bg-purple-900/50 text-purple-400',
    technique: 'bg-emerald-900/50 text-emerald-400',
    safety: 'bg-orange-900/50 text-orange-400'
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Assessment Rubrics</h2>
          <p className="text-slate-400 mt-1">Likert-scale (1-5) rubrics for student welding evaluation</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={createISO5817}
            disabled={loading}
            className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors"
          >
            <Star className="w-4 h-4" />
            Create ISO 5817 Template
          </button>
          <button
            onClick={() => openRubricModal()}
            className="flex items-center gap-2 px-4 py-2 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg transition-colors"
          >
            <Plus className="w-4 h-4" />
            New Rubric
          </button>
        </div>
      </div>

      <div className="grid grid-cols-3 gap-6">
        {/* Rubrics List */}
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-4">
          <h3 className="text-lg font-semibold text-white mb-4">Rubrics</h3>

          {rubrics.length === 0 ? (
            <div className="text-center py-8">
              <ClipboardCheck className="w-12 h-12 text-slate-700 mx-auto mb-3" />
              <p className="text-slate-500 text-sm">No rubrics yet</p>
              <p className="text-slate-600 text-xs mt-1">Create one or use ISO 5817 template</p>
            </div>
          ) : (
            <div className="space-y-2">
              {rubrics.map(rubric => (
                <div
                  key={rubric.id}
                  onClick={() => setSelectedRubric(rubric)}
                  className={`p-3 rounded-lg cursor-pointer transition-all ${selectedRubric?.id === rubric.id
                    ? 'bg-industrial-blue/20 border-2 border-industrial-blue'
                    : 'bg-industrial-dark hover:bg-industrial-gray border-2 border-transparent'
                    }`}
                >
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2">
                        <h4 className="text-white font-medium">{rubric.name}</h4>
                        {rubric.is_active && (
                          <span className="px-1.5 py-0.5 bg-green-900/50 text-green-400 text-xs rounded">Active</span>
                        )}
                      </div>
                      <p className="text-xs text-slate-500 mt-1">
                        {rubric.criteria_count || 0} criteria • Pass: ≥{rubric.passing_score}
                      </p>
                      <span className="text-xs text-slate-600">{rubric.rubric_type.replace('_', ' ').toUpperCase()}</span>
                    </div>
                    <div className="flex gap-1">
                      <button
                        onClick={(e) => { e.stopPropagation(); openRubricModal(rubric) }}
                        className="p-1.5 text-slate-500 hover:text-white transition-colors"
                      >
                        <Edit2 className="w-3.5 h-3.5" />
                      </button>
                      <button
                        onClick={(e) => { e.stopPropagation(); deleteRubric(rubric.id) }}
                        className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Criteria Editor */}
        <div className="col-span-2 bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          {selectedRubric ? (
            <>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <div className="flex items-center gap-3">
                    <h3 className="text-xl font-semibold text-white">{selectedRubric.name}</h3>
                    {!selectedRubric.is_active && (
                      <button
                        onClick={() => activateRubric(selectedRubric.id)}
                        className="px-2 py-1 text-xs bg-green-600 hover:bg-green-700 text-white rounded transition-colors"
                      >
                        Set Active
                      </button>
                    )}
                  </div>
                  <p className="text-slate-400 text-sm mt-1">
                    {selectedRubric.description || 'No description'}
                  </p>
                </div>
                <button
                  onClick={() => openCriterionModal()}
                  className="flex items-center gap-2 px-3 py-2 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg text-sm transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Criterion
                </button>
              </div>

              {/* Passing Score Info */}
              <div className="mb-4 p-3 bg-industrial-dark rounded-lg flex items-center gap-4">
                <div className="flex items-center gap-2">
                  <span className="text-slate-400 text-sm">Passing Score:</span>
                  <span className="text-white font-bold">≥ {selectedRubric.passing_score}</span>
                </div>
                <div className="flex gap-1">
                  {[1, 2, 3, 4, 5].map(score => (
                    <div
                      key={score}
                      className={`w-8 h-8 rounded flex items-center justify-center text-sm font-bold ${score >= selectedRubric.passing_score
                        ? 'bg-green-600 text-white'
                        : 'bg-red-900/50 text-red-400'
                        }`}
                    >
                      {score}
                    </div>
                  ))}
                </div>
              </div>

              {/* Criteria List */}
              {selectedRubric.criteria?.length === 0 ? (
                <div className="text-center py-12 border-2 border-dashed border-industrial-gray rounded-lg">
                  <AlertTriangle className="w-10 h-10 text-slate-700 mx-auto mb-3" />
                  <p className="text-slate-500">No criteria defined</p>
                  <p className="text-slate-600 text-sm mt-1">Add criteria to start evaluating students</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {selectedRubric.criteria?.map((criterion, idx) => (
                    <div key={criterion.id} className="bg-industrial-dark rounded-lg p-4">
                      <div className="flex items-start justify-between mb-3">
                        <div className="flex items-center gap-3">
                          <span className="w-6 h-6 bg-slate-700 rounded-full flex items-center justify-center text-xs text-white font-bold">
                            {idx + 1}
                          </span>
                          <div>
                            <h4 className="text-white font-medium">{criterion.name}</h4>
                            <div className="flex items-center gap-2 mt-1">
                              <span className={`px-2 py-0.5 rounded text-xs ${categoryColors[criterion.category]}`}>
                                {criterion.category}
                              </span>
                              <span className="text-xs text-slate-500">Weight: {criterion.weight}x</span>
                            </div>
                          </div>
                        </div>
                        <div className="flex gap-1">
                          <button
                            onClick={() => openCriterionModal(criterion)}
                            className="p-1.5 text-slate-500 hover:text-white transition-colors"
                          >
                            <Edit2 className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => deleteCriterion(criterion.id)}
                            className="p-1.5 text-slate-500 hover:text-red-400 transition-colors"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>

                      {/* Likert Scale Preview */}
                      <div className="grid grid-cols-5 gap-2 text-xs">
                        {[1, 2, 3, 4, 5].map(score => (
                          <div key={score} className="p-2 bg-slate-800 rounded text-center">
                            <div className={`font-bold mb-1 ${score >= selectedRubric.passing_score ? 'text-green-400' : 'text-red-400'
                              }`}>
                              {score}
                            </div>
                            <div className="text-slate-400">{criterion[`score_${score}_label`]}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </>
          ) : (
            <div className="flex items-center justify-center h-64">
              <div className="text-center">
                <ClipboardCheck className="w-16 h-16 text-slate-700 mx-auto mb-4" />
                <p className="text-slate-500">Select a rubric to view and edit criteria</p>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Rubric Modal */}
      {showRubricModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingRubric ? 'Edit Rubric' : 'New Rubric'}
              </h3>
              <button onClick={() => setShowRubricModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Rubric Name *</label>
                <input
                  type="text"
                  value={rubricForm.name}
                  onChange={(e) => setRubricForm({ ...rubricForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., SMAW Basic Assessment"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Type</label>
                <select
                  value={rubricForm.rubric_type}
                  onChange={(e) => setRubricForm({ ...rubricForm, rubric_type: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                >
                  <option value="custom">Custom Rubric</option>
                  <option value="iso_5817">ISO 5817</option>
                  <option value="aws_d1_1">AWS D1.1</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Passing Score (1-5)</label>
                <input
                  type="number"
                  min="1"
                  max="5"
                  step="0.5"
                  value={rubricForm.passing_score}
                  onChange={(e) => setRubricForm({ ...rubricForm, passing_score: parseFloat(e.target.value) })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                />
                <p className="text-xs text-slate-500 mt-1">Student must score ≥ this average to pass</p>
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={rubricForm.description}
                  onChange={(e) => setRubricForm({ ...rubricForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  rows={3}
                  placeholder="Rubric description..."
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowRubricModal(false)}
                  className="flex-1 px-4 py-2 bg-industrial-gray text-white rounded hover:bg-industrial-gray/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createRubric}
                  disabled={loading || !rubricForm.name}
                  className="flex-1 px-4 py-2 bg-industrial-blue text-white rounded hover:bg-industrial-blue-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingRubric ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Criterion Modal */}
      {showCriterionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6 w-full max-w-2xl max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingCriterion ? 'Edit Criterion' : 'Add Criterion'}
              </h3>
              <button onClick={() => setShowCriterionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Criterion Name *</label>
                  <input
                    type="text"
                    value={criterionForm.name}
                    onChange={(e) => setCriterionForm({ ...criterionForm, name: e.target.value })}
                    className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                    placeholder="e.g., Bead Appearance"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Category</label>
                  <select
                    value={criterionForm.category}
                    onChange={(e) => setCriterionForm({ ...criterionForm, category: e.target.value })}
                    className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  >
                    <option value="visual">Visual Inspection</option>
                    <option value="geometric">Geometric (Dimensional)</option>
                    <option value="technique">Welding Technique</option>
                    <option value="safety">Safety & Procedure</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Weight Multiplier</label>
                  <input
                    type="number"
                    min="0.1"
                    max="10"
                    step="0.1"
                    value={criterionForm.weight}
                    onChange={(e) => setCriterionForm({ ...criterionForm, weight: parseFloat(e.target.value) })}
                    className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  />
                  <p className="text-xs text-slate-500 mt-1">Higher weight = more impact on final score</p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Display Order</label>
                  <input
                    type="number"
                    min="0"
                    value={criterionForm.order}
                    onChange={(e) => setCriterionForm({ ...criterionForm, order: parseInt(e.target.value) })}
                    className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  />
                </div>
              </div>

              {/* Likert Scale Descriptors */}
              <div>
                <h4 className="text-white font-medium mb-3">Likert Scale Descriptors (1-5)</h4>
                <div className="space-y-3">
                  {[1, 2, 3, 4, 5].map(score => (
                    <div key={score} className={`p-3 rounded-lg ${score >= (selectedRubric?.passing_score || 3) ? 'bg-green-950/30 border border-green-800' : 'bg-red-950/30 border border-red-800'}`}>
                      <div className="flex items-center gap-3 mb-2">
                        <span className={`w-8 h-8 rounded-full flex items-center justify-center font-bold ${score >= (selectedRubric?.passing_score || 3) ? 'bg-green-600 text-white' : 'bg-red-600 text-white'
                          }`}>
                          {score}
                        </span>
                        <input
                          type="text"
                          value={criterionForm[`score_${score}_label`]}
                          onChange={(e) => setCriterionForm({ ...criterionForm, [`score_${score}_label`]: e.target.value })}
                          className="flex-1 px-3 py-1 bg-industrial-dark border border-industrial-gray rounded text-white text-sm"
                          placeholder="Label (e.g., Excellent)"
                        />
                      </div>
                      <textarea
                        value={criterionForm[`score_${score}_description`]}
                        onChange={(e) => setCriterionForm({ ...criterionForm, [`score_${score}_description`]: e.target.value })}
                        className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white text-sm"
                        rows={2}
                        placeholder={`Description for score ${score}...`}
                      />
                    </div>
                  ))}
                </div>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowCriterionModal(false)}
                  className="flex-1 px-4 py-2 bg-industrial-gray text-white rounded hover:bg-industrial-gray/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={createCriterion}
                  disabled={loading || !criterionForm.name}
                  className="flex-1 px-4 py-2 bg-emerald-600 text-white rounded hover:bg-emerald-700 transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCriterion ? 'Update' : 'Add Criterion'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Rubrics


