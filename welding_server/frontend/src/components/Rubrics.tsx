import { useState, useEffect, FC } from 'react'
import { Plus, Star } from 'lucide-react'

// Types
import { Rubric, Criterion, RubricForm as RubricFormType } from './rubrics/types'

// Components
import RubricList from './rubrics/RubricList'
import RubricCriteriaEditor from './rubrics/RubricCriteriaEditor'
import RubricModal from './rubrics/RubricModal'
import CriterionModal from './rubrics/CriterionModal'

// Helper to get CSRF token
function getCSRFToken(): string | null {
  const name = 'csrftoken';
  let cookieValue: string | null = null;
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

const Rubrics: FC = () => {
  const [rubrics, setRubrics] = useState<Rubric[]>([])
  const [selectedRubric, setSelectedRubric] = useState<Rubric | null>(null)
  const [loading, setLoading] = useState(false)

  // Modal states
  const [showRubricModal, setShowRubricModal] = useState(false)
  const [showCriterionModal, setShowCriterionModal] = useState(false)
  const [editingRubric, setEditingRubric] = useState<Rubric | null>(null)
  const [editingCriterion, setEditingCriterion] = useState<Criterion | null>(null)

  // Forms
  const [rubricForm, setRubricForm] = useState<RubricFormType>({
    name: '',
    description: '',
    rubric_type: 'custom',
    passing_score: 3.0
  })

  const [criterionForm, setCriterionForm] = useState<Criterion>({
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

  const handleRubricSubmit = async () => {
    setLoading(true)
    try {
      const url = editingRubric ? `/api/assessment-rubrics/${editingRubric.id}/` : '/api/assessment-rubrics/'
      const csrfToken = getCSRFToken();
      const res = await fetch(url, {
        credentials: 'include', method: editingRubric ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        body: JSON.stringify(rubricForm)
      })
      if (res.ok) {
        fetchRubrics()
        setShowRubricModal(false)
      }
    } catch (error) {
      console.error('Error saving rubric:', error)
    }
    setLoading(false)
  }

  const deleteRubric = async (id: number) => {
    if (!confirm('Delete this rubric?')) return
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/assessment-rubrics/${id}/`, {
        credentials: 'include', method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken || '' }
      })
      fetchRubrics()
      if (selectedRubric?.id === id) setSelectedRubric(null)
    } catch (error) {
      console.error('Error deleting rubric:', error)
    }
  }

  const activateRubric = async (id: number) => {
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/assessment-rubrics/${id}/activate/`, {
        credentials: 'include', method: 'POST',
        headers: { 'X-CSRFToken': csrfToken || '' }
      })
      fetchRubrics()
      if (selectedRubric?.id === id) setSelectedRubric({ ...selectedRubric, is_active: true })
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
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        body: JSON.stringify({ name: `ISO 5817 - ${new Date().toLocaleDateString()}` })
      })
      if (res.ok) {
        fetchRubrics()
        alert('ISO 5817 template created')
      }
    } catch (error) {
      console.error('Error creating ISO rubric:', error)
    }
    setLoading(false)
  }

  const handleCriterionSubmit = async () => {
    if (!selectedRubric) return
    setLoading(true)
    try {
      const url = editingCriterion ? `/api/rubric-criteria/${editingCriterion.id}/` : `/api/assessment-rubrics/${selectedRubric.id}/add_criterion/`
      const csrfToken = getCSRFToken();
      const res = await fetch(url, {
        credentials: 'include', method: editingCriterion ? 'PUT' : 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRFToken': csrfToken || '' },
        body: JSON.stringify(criterionForm)
      })
      if (res.ok) {
        fetchRubrics()
        setShowCriterionModal(false)
        const updatedRes = await fetch(`/api/assessment-rubrics/${selectedRubric.id}/`, { credentials: 'include' })
        if (updatedRes.ok) setSelectedRubric(await updatedRes.json())
      }
    } catch (error) {
      console.error('Error saving criterion:', error)
    }
    setLoading(false)
  }

  const deleteCriterion = async (id: number) => {
    if (!confirm('Delete this criterion?')) return
    try {
      const csrfToken = getCSRFToken();
      await fetch(`/api/rubric-criteria/${id}/`, {
        credentials: 'include', method: 'DELETE',
        headers: { 'X-CSRFToken': csrfToken || '' }
      })
      if (selectedRubric) {
        const res = await fetch(`/api/assessment-rubrics/${selectedRubric.id}/`, { credentials: 'include' })
        if (res.ok) setSelectedRubric(await res.json())
      }
      fetchRubrics()
    } catch (error) {
      console.error('Error deleting criterion:', error)
    }
  }

  const openRubricModal = (rubric: Rubric | null = null) => {
    if (rubric) {
      setEditingRubric(rubric)
      setRubricForm({ name: rubric.name, description: rubric.description || '', rubric_type: rubric.rubric_type, passing_score: rubric.passing_score })
    } else {
      setEditingRubric(null)
      setRubricForm({ name: '', description: '', rubric_type: 'custom', passing_score: 3.0 })
    }
    setShowRubricModal(true)
  }

  const openCriterionModal = (criterion: Criterion | null = null) => {
    if (criterion) {
      setEditingCriterion(criterion)
      setCriterionForm({ ...criterion })
    } else {
      setEditingCriterion(null)
      setCriterionForm({
        name: '', category: 'visual', weight: 1.0, order: 0,
        score_1_label: 'Poor', score_1_description: '',
        score_2_label: 'Below Average', score_2_description: '',
        score_3_label: 'Acceptable', score_3_description: '',
        score_4_label: 'Good', score_4_description: '',
        score_5_label: 'Excellent', score_5_description: ''
      })
    }
    setShowCriterionModal(true)
  }

  return (
    <div className="p-8 space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Assessment Rubrics</h2>
          <p className="text-slate-400 mt-1">Likert-scale (1-5) rubrics for welding evaluation</p>
        </div>
        <div className="flex gap-3">
          <button onClick={createISO5817} disabled={loading} className="flex items-center gap-2 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-bold text-sm">
            <Star className="w-4 h-4" /> ISO 5817 Template
          </button>
          <button onClick={() => openRubricModal()} className="flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-bold text-sm">
            <Plus className="w-4 h-4" /> New Rubric
          </button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        <RubricList
          rubrics={rubrics}
          selectedRubric={selectedRubric}
          setSelectedRubric={setSelectedRubric}
          openRubricModal={openRubricModal}
          deleteRubric={deleteRubric}
        />

        <div className="lg:col-span-2">
          <RubricCriteriaEditor
            selectedRubric={selectedRubric}
            activateRubric={activateRubric}
            openCriterionModal={openCriterionModal}
            deleteCriterion={deleteCriterion}
          />
        </div>
      </div>

      <RubricModal
        show={showRubricModal}
        onClose={() => setShowRubricModal(false)}
        editingRubric={editingRubric}
        rubricForm={rubricForm}
        setRubricForm={setRubricForm}
        onSubmit={handleRubricSubmit}
        loading={loading}
      />

      <CriterionModal
        show={showCriterionModal}
        onClose={() => setShowCriterionModal(false)}
        editingCriterion={editingCriterion}
        criterionForm={criterionForm}
        setCriterionForm={setCriterionForm}
        onSubmit={handleCriterionSubmit}
        loading={loading}
      />
    </div>
  )
}

export default Rubrics
