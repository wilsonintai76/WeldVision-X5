import { useState, useEffect } from 'react'
import { Users, GraduationCap, Plus, Edit2, Trash2, X, Save } from 'lucide-react'

function Management() {
  const [activeTab, setActiveTab] = useState('students')
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(false)
  
  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showClassModal, setShowClassModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  const [editingClass, setEditingClass] = useState(null)

  // Form data
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    name: '',
    class_group: ''
  })
  
  const [classForm, setClassForm] = useState({
    name: '',
    description: '',
    instructor: '',
    semester: ''
  })

  // Fetch data
  useEffect(() => {
    fetchStudents()
    fetchClasses()
  }, [])

  const fetchStudents = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/students/')
      const data = await response.json()
      setStudents(data)
    } catch (error) {
      console.error('Error fetching students:', error)
    }
  }

  const fetchClasses = async () => {
    try {
      const response = await fetch('http://localhost:8000/api/classes/')
      const data = await response.json()
      setClasses(data)
    } catch (error) {
      console.error('Error fetching classes:', error)
    }
  }

  // Student CRUD
  const handleCreateStudent = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/students/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      })
      if (response.ok) {
        fetchStudents()
        setShowStudentModal(false)
        resetStudentForm()
      }
    } catch (error) {
      console.error('Error creating student:', error)
    }
    setLoading(false)
  }

  const handleUpdateStudent = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/students/${editingStudent.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(studentForm)
      })
      if (response.ok) {
        fetchStudents()
        setShowStudentModal(false)
        setEditingStudent(null)
        resetStudentForm()
      }
    } catch (error) {
      console.error('Error updating student:', error)
    }
    setLoading(false)
  }

  const handleDeleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/students/${id}/`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchStudents()
      }
    } catch (error) {
      console.error('Error deleting student:', error)
    }
  }

  // Class CRUD
  const handleCreateClass = async () => {
    setLoading(true)
    try {
      const response = await fetch('http://localhost:8000/api/classes/', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm)
      })
      if (response.ok) {
        fetchClasses()
        setShowClassModal(false)
        resetClassForm()
      }
    } catch (error) {
      console.error('Error creating class:', error)
    }
    setLoading(false)
  }

  const handleUpdateClass = async () => {
    setLoading(true)
    try {
      const response = await fetch(`http://localhost:8000/api/classes/${editingClass.id}/`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(classForm)
      })
      if (response.ok) {
        fetchClasses()
        setShowClassModal(false)
        setEditingClass(null)
        resetClassForm()
      }
    } catch (error) {
      console.error('Error updating class:', error)
    }
    setLoading(false)
  }

  const handleDeleteClass = async (id) => {
    if (!confirm('Are you sure you want to delete this class?')) return
    
    try {
      const response = await fetch(`http://localhost:8000/api/classes/${id}/`, {
        method: 'DELETE'
      })
      if (response.ok) {
        fetchClasses()
      }
    } catch (error) {
      console.error('Error deleting class:', error)
    }
  }

  // Form handlers
  const openStudentModal = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setStudentForm({
        student_id: student.student_id,
        name: student.name,
        class_group: student.class_group || ''
      })
    } else {
      setEditingStudent(null)
      resetStudentForm()
    }
    setShowStudentModal(true)
  }

  const openClassModal = (classGroup = null) => {
    if (classGroup) {
      setEditingClass(classGroup)
      setClassForm({
        name: classGroup.name,
        description: classGroup.description || '',
        instructor: classGroup.instructor || '',
        semester: classGroup.semester || ''
      })
    } else {
      setEditingClass(null)
      resetClassForm()
    }
    setShowClassModal(true)
  }

  const resetStudentForm = () => {
    setStudentForm({ student_id: '', name: '', class_group: '' })
  }

  const resetClassForm = () => {
    setClassForm({ name: '', description: '', instructor: '', semester: '' })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div>
        <h2 className="text-3xl font-bold text-white">Student Management</h2>
        <p className="text-slate-400 mt-1">Manage students and class groups (Note: "Defect Classes" for labeling are in MLOps → Datasets)</p>
      </div>

      {/* Tabs */}
      <div className="flex gap-4 border-b border-industrial-gray">
        <button
          onClick={() => setActiveTab('students')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'students'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <Users className="w-5 h-5 inline-block mr-2" />
          Students
        </button>
        <button
          onClick={() => setActiveTab('classes')}
          className={`px-6 py-3 font-medium transition-colors ${
            activeTab === 'classes'
              ? 'text-white border-b-2 border-blue-500'
              : 'text-slate-400 hover:text-white'
          }`}
        >
          <GraduationCap className="w-5 h-5 inline-block mr-2" />
          Class Groups
        </button>
      </div>

      {/* Students Table */}
      {activeTab === 'students' && (
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Student List</h3>
            <button
              onClick={() => openStudentModal()}
              className="flex items-center gap-2 px-4 py-2 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-industrial-gray">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Student ID</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Class</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-industrial-gray/50 hover:bg-industrial-dark transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{student.student_id}</td>
                    <td className="py-4 px-4 text-white">{student.name}</td>
                    <td className="py-4 px-4 text-slate-400">{student.class_group_name || '-'}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openStudentModal(student)}
                          className="p-2 text-blue-400 hover:bg-industrial-dark rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-red-400 hover:bg-industrial-dark rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {students.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No students found. Click "Add Student" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Class Groups Table */}
      {activeTab === 'classes' && (
        <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-xl font-semibold text-white">Class Groups</h3>
            <button
              onClick={() => openClassModal()}
              className="flex items-center gap-2 px-4 py-2 bg-industrial-blue hover:bg-industrial-blue-dark text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Class Group
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-industrial-gray">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Group Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Instructor</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Semester</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Students</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Description</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {classes.map((classGroup) => (
                  <tr key={classGroup.id} className="border-b border-industrial-gray/50 hover:bg-industrial-dark transition-colors">
                    <td className="py-4 px-4 text-white font-medium">{classGroup.name}</td>
                    <td className="py-4 px-4 text-white">{classGroup.instructor || '-'}</td>
                    <td className="py-4 px-4 text-slate-400">{classGroup.semester || '-'}</td>
                    <td className="py-4 px-4">
                      <span className="px-2 py-1 bg-industrial-blue/20 text-blue-400 rounded text-sm font-medium">
                        {classGroup.student_count}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-slate-400 max-w-xs truncate">{classGroup.description || '-'}</td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openClassModal(classGroup)}
                          className="p-2 text-blue-400 hover:bg-industrial-dark rounded transition-colors"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(classGroup.id)}
                          className="p-2 text-red-400 hover:bg-industrial-dark rounded transition-colors"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {classes.length === 0 && (
              <div className="text-center py-12 text-slate-500">
                No class groups found. Click "Add Class Group" to create one.
              </div>
            )}
          </div>
        </div>
      )}

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingStudent ? 'Edit Student' : 'Add Student'}
              </h3>
              <button onClick={() => setShowStudentModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Student ID *</label>
                <input
                  type="text"
                  value={studentForm.student_id}
                  onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., S001"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Name *</label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., John Doe"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Class</label>
                <select
                  value={studentForm.class_group}
                  onChange={(e) => setStudentForm({ ...studentForm, class_group: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                >
                  <option value="">No Class</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="flex-1 px-4 py-2 bg-industrial-gray text-white rounded hover:bg-industrial-gray/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingStudent ? handleUpdateStudent : handleCreateStudent}
                  disabled={loading || !studentForm.student_id || !studentForm.name}
                  className="flex-1 px-4 py-2 bg-industrial-blue text-white rounded hover:bg-industrial-blue-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingStudent ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Class Group Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-industrial-slate rounded-lg border border-industrial-gray p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-xl font-semibold text-white">
                {editingClass ? 'Edit Class Group' : 'Add Class Group'}
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Group Name *</label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={(e) => setClassForm({ ...classForm, name: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., DKM-2A, Welding 101"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Instructor/Lecturer *</label>
                <input
                  type="text"
                  value={classForm.instructor}
                  onChange={(e) => setClassForm({ ...classForm, instructor: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., Dr. Smith"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Semester</label>
                <input
                  type="text"
                  value={classForm.semester}
                  onChange={(e) => setClassForm({ ...classForm, semester: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="e.g., Spring 2026"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={classForm.description}
                  onChange={(e) => setClassForm({ ...classForm, description: e.target.value })}
                  className="w-full px-3 py-2 bg-industrial-dark border border-industrial-gray rounded text-white"
                  placeholder="Class description..."
                  rows={3}
                />
              </div>

              <div className="flex gap-3 pt-4">
                <button
                  onClick={() => setShowClassModal(false)}
                  className="flex-1 px-4 py-2 bg-industrial-gray text-white rounded hover:bg-industrial-gray/80 transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingClass ? handleUpdateClass : handleCreateClass}
                  disabled={loading || !classForm.name || !classForm.instructor}
                  className="flex-1 px-4 py-2 bg-industrial-blue text-white rounded hover:bg-industrial-blue-dark transition-colors disabled:opacity-50 flex items-center justify-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Management
