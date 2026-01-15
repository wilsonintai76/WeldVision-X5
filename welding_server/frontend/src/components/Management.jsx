import { useState, useEffect, useRef } from 'react'
import { Users, GraduationCap, Plus, Edit2, Trash2, X, Save, AlertCircle, RefreshCw, Filter, Upload, FileText, CheckCircle, Info } from 'lucide-react'
import { useAuth } from '../context/AuthContext'
import coreAPI from '../services/coreAPI'

function Management() {
  const { user, permissions } = useAuth()
  const [students, setStudents] = useState([])
  const [classes, setClasses] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [success, setSuccess] = useState(null)
  const [selectedClassId, setSelectedClassId] = useState('')
  
  // Modals
  const [showStudentModal, setShowStudentModal] = useState(false)
  const [showBulkModal, setShowBulkModal] = useState(false)
  const [editingStudent, setEditingStudent] = useState(null)
  
  // Bulk import state
  const [bulkResult, setBulkResult] = useState(null)
  const [bulkLoading, setBulkLoading] = useState(false)
  const fileInputRef = useRef(null)

  // Form data
  const [studentForm, setStudentForm] = useState({
    student_id: '',
    name: '',
    class_group: ''
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
        student_id: studentForm.student_id,
        name: studentForm.name,
        class_group: studentForm.class_group || null
      })
      setSuccess(`Student "${studentForm.name}" created. Default password is their registration number.`)
      fetchStudents()
      setShowStudentModal(false)
      resetStudentForm()
      setTimeout(() => setSuccess(null), 5000)
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
        student_id: studentForm.student_id,
        name: studentForm.name,
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
    if (!confirm('Are you sure you want to delete this student? This will also delete their user account.')) return
    
    setError(null)
    try {
      await coreAPI.deleteStudent(id)
      fetchStudents()
    } catch (err) {
      setError(err.message)
      console.error('Error deleting student:', err)
    }
  }

  // Bulk import
  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0]
    if (!file) return
    
    if (!selectedClassId) {
      setError('Please select a class before importing students')
      return
    }
    
    setBulkLoading(true)
    setBulkResult(null)
    setError(null)
    
    try {
      const result = await coreAPI.bulkImportStudents(file, selectedClassId)
      setBulkResult(result)
      fetchStudents()
    } catch (err) {
      setError(err.message)
    } finally {
      setBulkLoading(false)
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
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

  const resetStudentForm = () => {
    setStudentForm({ 
      student_id: '', 
      name: '', 
      class_group: selectedClassId || ''
    })
  }

  return (
    <div className="p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-3xl font-bold text-white">Student Management</h2>
          <p className="text-slate-400 mt-1">Create and manage student accounts</p>
        </div>
        <button
          onClick={fetchStudents}
          className="flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg transition-colors"
        >
          <RefreshCw className={`w-4 h-4 ${loading ? 'animate-spin' : ''}`} />
          Refresh
        </button>
      </div>

      {/* Info Banner */}
      <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
        <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
        <div className="text-blue-300 text-sm">
          <p className="font-medium mb-1">Student Account Creation</p>
          <p>When you add a student, a user account is automatically created with:</p>
          <ul className="list-disc list-inside mt-1 text-blue-300/80">
            <li>Username: Their registration number</li>
            <li>Default password: Their registration number</li>
            <li>Students must change their password on first login</li>
          </ul>
        </div>
      </div>

      {/* Error Message */}
      {error && (
        <div className="flex items-start gap-3 bg-red-900/20 border border-red-600/30 rounded-lg p-4">
          <AlertCircle className="w-5 h-5 text-red-400 flex-shrink-0 mt-0.5" />
          <p className="text-red-300">{error}</p>
        </div>
      )}

      {/* Success Message */}
      {success && (
        <div className="flex items-start gap-3 bg-emerald-900/20 border border-emerald-600/30 rounded-lg p-4">
          <CheckCircle className="w-5 h-5 text-emerald-400 flex-shrink-0 mt-0.5" />
          <p className="text-emerald-300">{success}</p>
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
          
          <div className="ml-auto flex items-center gap-3">
            {/* Bulk Import */}
            <div className="relative">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleBulkImport}
                accept=".csv"
                className="hidden"
                id="bulk-import-file"
              />
              <label
                htmlFor="bulk-import-file"
                className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer ${!selectedClassId ? 'opacity-50 cursor-not-allowed' : ''}`}
                title={selectedClassId ? 'Import from CSV' : 'Select a class first'}
              >
                <Upload className="w-4 h-4" />
                Import CSV
              </label>
            </div>
            
            <button
              onClick={() => setShowBulkModal(true)}
              className="flex items-center gap-2 px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              title="View CSV format info"
            >
              <FileText className="w-4 h-4" />
              CSV Format
            </button>
            
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

      {/* Bulk Import Result */}
      {bulkResult && (
        <div className="bg-slate-900 border border-slate-800 rounded-lg p-4 space-y-3">
          <h4 className="text-white font-semibold">Import Result: {bulkResult.message}</h4>
          
          {bulkResult.created?.length > 0 && (
            <div>
              <p className="text-emerald-400 text-sm font-medium mb-1">✓ Created ({bulkResult.created.length}):</p>
              <p className="text-slate-400 text-sm">{bulkResult.created.join(', ')}</p>
            </div>
          )}
          
          {bulkResult.skipped?.length > 0 && (
            <div>
              <p className="text-amber-400 text-sm font-medium mb-1">⚠ Skipped ({bulkResult.skipped.length}):</p>
              <p className="text-slate-400 text-sm">{bulkResult.skipped.join(', ')}</p>
            </div>
          )}
          
          {bulkResult.errors?.length > 0 && (
            <div>
              <p className="text-red-400 text-sm font-medium mb-1">✗ Errors ({bulkResult.errors.length}):</p>
              <p className="text-slate-400 text-sm">{bulkResult.errors.join(', ')}</p>
            </div>
          )}
          
          <button
            onClick={() => setBulkResult(null)}
            className="text-slate-500 hover:text-white text-sm"
          >
            Dismiss
          </button>
        </div>
      )}

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
            <div className="flex items-center justify-center gap-4">
              <button
                onClick={() => openStudentModal()}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white px-6 py-3 rounded-lg transition-colors"
              >
                <Plus className="w-5 h-5" />
                Add Student
              </button>
            </div>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="bg-slate-800/50 border-b border-slate-700">
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Reg. Number</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Full Name</th>
                  <th className="text-left py-3 px-4 text-sm font-semibold text-slate-300">Class</th>
                  <th className="text-right py-3 px-4 text-sm font-semibold text-slate-300">Actions</th>
                </tr>
              </thead>
              <tbody>
                {students.map((student) => (
                  <tr key={student.id} className="border-b border-slate-800 hover:bg-slate-800/30 transition-colors">
                    <td className="py-4 px-4 text-white font-medium font-mono">{student.student_id}</td>
                    <td className="py-4 px-4 text-white">{student.name}</td>
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
              {!editingStudent && (
                <div className="bg-blue-900/20 border border-blue-600/30 rounded-lg p-3 text-sm text-blue-300">
                  <p>A user account will be created automatically with:</p>
                  <p className="mt-1 font-medium">Password = Registration Number</p>
                </div>
              )}
              
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
                  disabled={editingStudent} // Can't change ID after creation
                />
                {editingStudent && (
                  <p className="text-slate-500 text-xs mt-1">Registration number cannot be changed</p>
                )}
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
                  Assign to Class *
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
                  disabled={loading || !studentForm.student_id || !studentForm.name || !studentForm.class_group}
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

      {/* CSV Format Info Modal */}
      {showBulkModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-slate-900 border border-slate-800 rounded-xl w-full max-w-lg">
            <div className="flex items-center justify-between p-6 border-b border-slate-800">
              <h3 className="text-xl font-bold text-white">CSV Import Format</h3>
              <button 
                onClick={() => setShowBulkModal(false)} 
                className="p-2 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-6 space-y-4">
              <p className="text-slate-300">
                Create a CSV file with the following columns:
              </p>
              
              <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm">
                <p className="text-emerald-400">student_id,name</p>
                <p className="text-slate-300">2026001001,Ahmad bin Ali</p>
                <p className="text-slate-300">2026001002,Sarah binti Hassan</p>
                <p className="text-slate-300">2026001003,Kumar a/l Rajan</p>
              </div>
              
              <div className="text-slate-400 text-sm space-y-2">
                <p><strong className="text-slate-300">Required columns:</strong></p>
                <ul className="list-disc list-inside">
                  <li><code className="text-emerald-400">student_id</code> or <code className="text-emerald-400">reg_no</code> - Registration number</li>
                  <li><code className="text-emerald-400">name</code> or <code className="text-emerald-400">full_name</code> - Student's full name</li>
                </ul>
                
                <p className="mt-4"><strong className="text-slate-300">Notes:</strong></p>
                <ul className="list-disc list-inside">
                  <li>First row must be headers</li>
                  <li>Select a class before importing</li>
                  <li>Existing students will be skipped</li>
                  <li>Each student gets a user account with default password = reg number</li>
                </ul>
              </div>

              <button
                onClick={() => setShowBulkModal(false)}
                className="w-full px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Got it
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Management
