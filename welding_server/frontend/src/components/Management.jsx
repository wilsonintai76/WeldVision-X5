import { useState, useEffect } from 'react'
import { Users, GraduationCap, Plus, Edit2, Trash2, X, Save, AlertCircle, RefreshCw, Filter } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import coreAPI from '../services/coreAPI'

function Management() {
  const { user, permissions } = useAuth()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  
  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)

  // Form data
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    name: '',
    class_group: '',
    email: ''
  })

  // Fetch classes on mount
  useEffect(() => {
    fetchClasses()
  }, [])

  // Fetch students when class filter changes
  useEffect(() => {
    fetchStudents()
  }, [selectedClassId])

  const fetchStudents = async () => {
    setLoading(true)
    setError(null)
    try {
      const data = selectedClassId 
        ? await coreAPI.getStudentsByClass(selectedClassId)
        : await coreAPI.getStudents()
      setStudents(data)
    } catch (err) {
      setError(err.message)
      console.error('Error fetching students:', err)
    } finally {
      setLoading(false)
    }
  }

  const fetchClasses = async () => {
    try {
      const data = await coreAPI.getClasses()
      setClasses(data)
      
      // For instructors, auto-select their first assigned class
      if (permissions.is_instructor && !permissions.is_admin && data.length > 0) {
        const instructorClasses = data.filter(c => 
          user.assigned_class_names && user.assigned_class_names.includes(c.name)
        )
        if (instructorClasses.length > 0) {
          setSelectedClassId(instructorClasses[0].id.toString())
        }
      }
    } catch (err) {
      setError(err.message)
      console.error('Error fetching classes:', err)
    }
  }

  // Student CRUD
  const handleCreateStudent = async () => {
    setLoading(true)
    setError(null)
    try {
      await coreAPI.createStudent({
        ...studentForm,
        class_group: studentForm.class_group || null
      })
      fetchStudents()
      setShowStudentModal(false)
      resetStudentForm()
    } catch (err) {
      setError(err.message)
      console.error('Error creating student:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleUpdateStudent = async () => {
    setLoading(true)
    setError(null)
    try {
      await coreAPI.updateStudent(editingStudent.id, {
        ...studentForm,
        class_group: studentForm.class_group || null
      })
      fetchStudents()
      setShowStudentModal(false)
      setEditingStudent(null)
      resetStudentForm()
    } catch (err) {
      setError(err.message)
      console.error('Error updating student:', err)
    } finally {
      setLoading(false)
    }
  }

  const handleDeleteStudent = async (id) => {
    if (!confirm('Are you sure you want to delete this student?')) return
    
    setError(null)
    try {
      await coreAPI.deleteStudent(id)
      fetchStudents()
    } catch (err) {
      setError(err.message)
      console.error('Error deleting student:', err)
    }
  }

  // Form handlers
  const openStudentModal = (student = null) => {
    if (student) {
      setEditingStudent(student)
      setStudentForm({
        student_id: student.student_id,
        name: student.name,
        class_group: student.class_group || '',
        email: student.email || ''
      })
    } else {
      setEditingStudent(null)
      resetStudentForm()
    }
    setShowStudentModal(true)
  }

  const resetStudentForm = () => {
    setStudentForm({ 
      student_id: '', 
      name: '', 
      class_group: selectedClassId || '',
      email: '' 
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Student Management</h2>
          <p className="text-slate-400 mt-1">View and manage enrolled students</p>
        </div>
        <button
          onClick={fetchStudents}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Filter Bar */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
        <div className="flex items-center gap-4 flex-wrap">
          <div className="flex items-center gap-2">
            <Filter className="w-5 h-5 text-slate-400" />
            <span className="text-slate-300 font-medium">Filter by Class:</span>
          </div>
          <select
            value={selectedClassId}
            onChange={(e) => setSelectedClassId(e.target.value)}
            className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
          >
            <option value="">All Students</option>
            {classes.map((cls) => (
              <option key={cls.id} value={cls.id}>
                {cls.name} {cls.semester && `(${cls.semester})`}
              </option>
            ))}
          </select>
          
          {selectedClassId && (
            <span className="text-slate-400 text-sm">
              Showing {students.length} student{students.length !== 1 ? 's' : ''}
            </span>
          )}
          
          <div className="ml-auto">
            <button
              onClick={() => openStudentModal()}
              className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
            >
              <Plus className="w-4 h-4" />
              Add Student
            </button>
          </div>
        </div>
      </div>

      {/* Students Table */}
      <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
        {loading ? (
          <div className="text-center py-12">
            <RefreshCw className="w-12 h-12 text-emerald-400 animate-spin mx-auto mb-4" />
            <p className="text-slate-400">Loading students...</p>
          </div>
        ) : students.length === 0 ? (
          <div className="text-center py-12">
            <Users className="w-16 h-16 text-slate-600 mx-auto mb-4" />
            <h3 className="text-white font-semibold text-lg mb-2">No Students Found</h3>
            <p className="text-slate-400 mb-6">
              {selectedClassId 
                ? 'No students enrolled in this class yet.' 
                : 'No students have been created yet.'}
            </p>
            <button
              onClick={() => openStudentModal()}
              className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
            >
              <Plus className="w-5 h-5" />
              Add Student
            </button>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Reg. Number</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Full Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Email</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Class</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 text-white font-medium font-mono">{student.student_id}</td>
                    <td className="py-4 px-4 text-white">{student.name}</td>
                    <td className="py-4 px-4 text-slate-400">{student.email || '-'}</td>
                    <td className="py-4 px-4">
                      <span className="inline-flex items-center gap-1 px-2 py-1 bg-blue-600/20 text-blue-400 rounded text-sm">
                        <GraduationCap className="w-3 h-3" />
                        {student.class_group_name || 'Unassigned'}
                      </span>
                    </td>
                    <td className="py-4 px-4 text-right">
                      <div className="flex gap-2 justify-end">
                        <button
                          onClick={() => openStudentModal(student)}
                          className="p-2 text-blue-400 hover:bg-blue-500/20 rounded-lg transition-colors"
                          title="Edit"
                        >
                          <Edit2 className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteStudent(student.id)}
                          className="p-2 text-red-400 hover:bg-red-500/20 rounded-lg transition-colors"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Student Modal */}
      {showStudentModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">
                {editingStudent ? 'Edit Student' : 'Add New Student'}
              </h3>
              <button 
                onClick={() => setShowStudentModal(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Registration Number *
                </label>
                <input
                  type="text"
                  value={studentForm.student_id}
                  onChange={(e) => setStudentForm({ ...studentForm, student_id: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="e.g., 2026001234"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Full Name *
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="Enter student's full name"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={studentForm.email}
                  onChange={(e) => setStudentForm({ ...studentForm, email: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white placeholder-slate-500 focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                  placeholder="student@example.com"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-slate-300 mb-2">
                  Assign to Class
                </label>
                <select
                  value={studentForm.class_group}
                  onChange={(e) => setStudentForm({ ...studentForm, class_group: e.target.value })}
                  className="w-full bg-slate-800 border border-slate-700 rounded-lg py-2.5 px-4 text-white focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">-- Select a class --</option>
                  {classes.map((cls) => (
                    <option key={cls.id} value={cls.id}>
                      {cls.name} {cls.semester && `(${cls.semester})`}
                    </option>
                  ))}
                </select>
              </div>

              <div className="flex items-center justify-end gap-3 pt-4">
                <button
                  onClick={() => setShowStudentModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white transition-colors"
                >
                  Cancel
                </button>
                <button
                  onClick={editingStudent ? handleUpdateStudent : handleCreateStudent}
                  disabled={loading || !studentForm.student_id || !studentForm.name}
                  className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-2 rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <Save className="w-4 h-4" />
                  {editingStudent ? 'Save Changes' : 'Add Student'}
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
