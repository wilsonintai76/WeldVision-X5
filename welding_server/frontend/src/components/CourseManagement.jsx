/**
 * Course & Student Management Component
 * Unified interface for managing Sessions, Courses, Home Classes, and Students
 */
import { useState, useEffect, useRef } from 'react';
import {
  BookOpen,
  Plus,
  Edit,
  Trash2,
  AlertCircle,
  RefreshCw,
  Calendar,
  Users,
  Upload,
  X,
  Save,
  FileText,
  CheckCircle,
  ChevronDown,
  ChevronUp,
  GraduationCap,
  Filter,
  Info,
  Edit2
} from 'lucide-react';
import coreAPI from '../services/coreAPI';
import { useAuth } from '../context/AuthContext';

function CourseManagement() {
  const { user, permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('courses'); // 'courses', 'classes', 'students'

  // Shared State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);

  // --- Course Tab State ---
  const [sessions, setSessions] = useState([]);
  const [courses, setCourses] = useState([]);
  const [instructors, setInstructors] = useState([]);

  // Modal states (Course Tab)
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false); // For viewing enrolled students

  // Edit states (Course Tab)
  const [editingSession, setEditingSession] = useState(null);
  const [editingCourse, setEditingCourse] = useState(null);
  const [selectedCourse, setSelectedCourse] = useState(null);
  const [courseStudents, setCourseStudents] = useState([]);

  const [expandedSessions, setExpandedSessions] = useState({});

  const [sessionForm, setSessionForm] = useState({
    name: '',
    is_active: false,
    start_date: '',
    end_date: ''
  });

  const [courseForm, setCourseForm] = useState({
    code: '',
    name: '',
    section: '',
    session: '',
    instructor: '',
    description: ''
  });

  // PDF Import state
  const [importFile, setImportFile] = useState(null);
  const [importing, setImporting] = useState(false);
  const [importResult, setImportResult] = useState(null);

  // --- Home Class Tab State ---
  const [homeClasses, setHomeClasses] = useState([]);
  const [showClassModal, setShowClassModal] = useState(false);
  const [editingClass, setEditingClass] = useState(null);
  const [classForm, setClassForm] = useState({
    name: '',
    department: '',
    description: '',
  });

  // --- Student Tab State ---
  const [students, setStudents] = useState([]);
  const [filterClassId, setFilterClassId] = useState('');
  const [studentLoading, setStudentLoading] = useState(false);

  const [showStudentModalCRUD, setShowStudentModalCRUD] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);
  const [editingStudent, setEditingStudent] = useState(null);

  const [studentForm, setStudentForm] = useState({
    student_id: '',
    name: '',
    class_group: ''
  });

  // Bulk CSV state
  const [bulkResult, setBulkResult] = useState(null);
  const [bulkLoading, setBulkLoading] = useState(false);
  const fileInputRef = useRef(null);

  useEffect(() => {
    loadData();
  }, []);

  // Effect to load students when tab changes to students or filter changes
  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, filterClassId]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, coursesData, instructorsData, classesData] = await Promise.all([
        coreAPI.getSessions(),
        coreAPI.getCourses(),
        coreAPI.getInstructors(),
        coreAPI.getClasses() // Fetch home classes
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
      setInstructors(Array.isArray(instructorsData) ? instructorsData : (instructorsData.results || []));
      setHomeClasses(classesData);

      // Auto-expand active session
      const activeSession = sessionsData.find(s => s.is_active);
      if (activeSession) {
        setExpandedSessions({ [activeSession.id]: true });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  // --- Course Tab Logic ---

  const toggleSession = (sessionId) => {
    setExpandedSessions(prev => ({
      ...prev,
      [sessionId]: !prev[sessionId]
    }));
  };

  // Session handlers
  const handleCreateSession = () => {
    setEditingSession(null);
    setSessionForm({ name: '', is_active: false, start_date: '', end_date: '' });
    setShowSessionModal(true);
  };

  const handleEditSession = (session) => {
    setEditingSession(session);
    setSessionForm({
      name: session.name,
      is_active: session.is_active,
      start_date: session.start_date || '',
      end_date: session.end_date || ''
    });
    setShowSessionModal(true);
  };

  const handleDeleteSession = async (id) => {
    if (!confirm('Delete this session? All courses in this session will also be deleted.')) return;
    try {
      await coreAPI.deleteSession(id);
      await loadData();
      setSuccess('Session deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSetActiveSession = async (id) => {
    try {
      await coreAPI.setActiveSession(id);
      await loadData();
      setSuccess('Active session updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleSessionSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingSession) {
        await coreAPI.updateSession(editingSession.id, sessionForm);
      } else {
        await coreAPI.createSession(sessionForm);
      }
      setShowSessionModal(false);
      await loadData();
      setSuccess(editingSession ? 'Session updated' : 'Session created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // Course handlers
  const handleCreateCourse = (sessionId = null) => {
    setEditingCourse(null);
    setCourseForm({
      code: '',
      name: '',
      section: 'S1',
      session: sessionId || '',
      instructor: '',
      description: ''
    });
    setShowCourseModal(true);
  };

  const handleEditCourse = (course) => {
    setEditingCourse(course);
    setCourseForm({
      code: course.code,
      name: course.name,
      section: course.section,
      session: course.session,
      instructor: course.instructor || '',
      description: course.description || ''
    });
    setShowCourseModal(true);
  };

  const handleDeleteCourse = async (id) => {
    if (!confirm('Delete this course? All enrollments will be removed.')) return;
    try {
      await coreAPI.deleteCourse(id);
      await loadData();
      setSuccess('Course deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleCourseSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingCourse) {
        await coreAPI.updateCourse(editingCourse.id, courseForm);
      } else {
        await coreAPI.createCourse(courseForm);
      }
      setShowCourseModal(false);
      await loadData();
      setSuccess(editingCourse ? 'Course updated' : 'Course created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // View course students
  const handleViewStudents = async (course) => {
    setSelectedCourse(course);
    try {
      const students = await coreAPI.getCourseStudents(course.id);
      setCourseStudents(students);
      setShowStudentsModal(true);
    } catch (err) {
      setError(err.message);
    }
  };

  // PDF Import handlers
  const handleImportClick = () => {
    setImportFile(null);
    setImportResult(null);
    setShowImportModal(true);
  };

  const handleImportSubmit = async () => {
    if (!importFile) {
      setError('Please select a PDF file');
      return;
    }

    setImporting(true);
    setError(null);
    try {
      const result = await coreAPI.importPDF(importFile);
      setImportResult(result);
      await loadData(); // Reload all data as imports affect sessions, courses, classes, and students
      if (activeTab === 'students') fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const getSessionCourses = (sessionId) => {
    return courses.filter(c => c.session === sessionId);
  };

  // --- Home Class Tab Logic ---

  const handleCreateClass = () => {
    setEditingClass(null);
    setClassForm({ name: '', department: '', description: '' });
    setShowClassModal(true);
  };

  const handleEditClass = (cls) => {
    setEditingClass(cls);
    setClassForm({
      name: cls.name,
      department: cls.department || '',
      description: cls.description || '',
    });
    setShowClassModal(true);
  };

  const handleDeleteClass = async (id) => {
    if (!confirm('Delete this home class? Students will lose their home class assignment.')) return;
    try {
      await coreAPI.deleteClass(id);
      await loadData();
      setSuccess('Home class deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleClassSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (editingClass) {
        await coreAPI.updateClass(editingClass.id, classForm);
      } else {
        await coreAPI.createClass(classForm);
      }
      setShowClassModal(false);
      await loadData();
      setSuccess(editingClass ? 'Home class updated' : 'Home class created');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  // --- Student Tab Logic ---

  const fetchStudents = async () => {
    setStudentLoading(true);
    try {
      const data = filterClassId
        ? await coreAPI.getStudentsByClass(filterClassId)
        : await coreAPI.getStudents();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setStudentLoading(false);
    }
  };

  const openStudentModal = (student = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({
        student_id: student.student_id,
        name: student.name,
        class_group: student.class_group || ''
      });
    } else {
      setEditingStudent(null);
      setStudentForm({
        student_id: '',
        name: '',
        class_group: filterClassId || ''
      });
    }
    setShowStudentModalCRUD(true);
  };

  const handleCreateStudent = async () => {
    try {
      await coreAPI.createStudent({
        student_id: studentForm.student_id,
        name: studentForm.name,
        class_group: studentForm.class_group || null
      });
      setSuccess(`Student "${studentForm.name}" created.`);
      fetchStudents();
      setShowStudentModalCRUD(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStudent = async () => {
    try {
      await coreAPI.updateStudent(editingStudent.id, {
        student_id: studentForm.student_id,
        name: studentForm.name,
        class_group: studentForm.class_group || null
      });
      setSuccess('Student updated');
      fetchStudents();
      setShowStudentModalCRUD(false);
      setEditingStudent(null);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async (id) => {
    if (!confirm('Delete this student? This will also delete their user account.')) return;
    try {
      await coreAPI.deleteStudent(id);
      fetchStudents();
      setSuccess('Student deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkImport = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!filterClassId) {
      setError('Please select a class before importing CSV');
      return;
    }

    setBulkLoading(true);
    setBulkResult(null);
    setError(null);

    try {
      const result = await coreAPI.bulkImportStudents(file, filterClassId);
      setBulkResult(result);
      fetchStudents();
    } catch (err) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  if (loading && activeTab !== 'students') {
    return (
      <div className="flex items-center justify-center h-64">
        <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-bold text-white flex items-center gap-2">
            <BookOpen className="w-7 h-7 text-emerald-400" />
            Course & Student Management
          </h2>
          <p className="text-slate-400 mt-1">Manage academic sessions, courses, classes, and students</p>
        </div>
        <div className="flex gap-3">
          <button
            onClick={handleImportClick}
            className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
          >
            <Upload className="w-5 h-5" />
            Import PDF
          </button>
        </div>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'courses' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          onClick={() => setActiveTab('courses')}
        >
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4" />
            Sessions & Courses
          </div>
          {activeTab === 'courses' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'classes' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          onClick={() => setActiveTab('classes')}
        >
          <div className="flex items-center gap-2">
            <GraduationCap className="w-4 h-4" />
            Home Classes
          </div>
          {activeTab === 'classes' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
          )}
        </button>
        <button
          className={`px-6 py-3 font-medium text-sm transition-colors relative ${activeTab === 'students' ? 'text-emerald-400' : 'text-slate-400 hover:text-white'
            }`}
          onClick={() => setActiveTab('students')}
        >
          <div className="flex items-center gap-2">
            <Users className="w-4 h-4" />
            Students
          </div>
          {activeTab === 'students' && (
            <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />
          )}
        </button>
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto">
            <X className="w-4 h-4" />
          </button>
        </div>
      )}

      {success && (
        <div className="bg-emerald-900/50 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* --- Courses Tab Content --- */}
      {activeTab === 'courses' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleCreateSession}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Session
            </button>
          </div>

          {sessions.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <Calendar className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No sessions yet. Create a session or import from PDF.</p>
            </div>
          ) : (
            <div className="space-y-4">
              {sessions.map(session => (
                <div key={session.id} className="bg-slate-800 rounded-xl overflow-hidden">
                  {/* Session Header */}
                  <div
                    className={`p-4 flex items-center justify-between cursor-pointer hover:bg-slate-700/50 ${session.is_active ? 'border-l-4 border-emerald-500' : ''
                      }`}
                    onClick={() => toggleSession(session.id)}
                  >
                    <div className="flex items-center gap-4">
                      {expandedSessions[session.id] ? (
                        <ChevronUp className="w-5 h-5 text-slate-400" />
                      ) : (
                        <ChevronDown className="w-5 h-5 text-slate-400" />
                      )}
                      <div>
                        <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                          <Calendar className="w-5 h-5 text-blue-400" />
                          Session {session.name}
                          {session.is_active && (
                            <span className="text-xs bg-emerald-600 text-white px-2 py-0.5 rounded-full">
                              Active
                            </span>
                          )}
                        </h3>
                        <p className="text-sm text-slate-400">
                          {session.course_count} course{session.course_count !== 1 ? 's' : ''}
                          {session.start_date && ` • ${session.start_date} to ${session.end_date || '...'}`}
                        </p>
                      </div>
                    </div>
                    <div className="flex items-center gap-2" onClick={e => e.stopPropagation()}>
                      {!session.is_active && (
                        <button
                          onClick={() => handleSetActiveSession(session.id)}
                          className="text-emerald-400 hover:text-emerald-300 px-3 py-1 text-sm border border-emerald-600 rounded"
                        >
                          Set Active
                        </button>
                      )}
                      <button
                        onClick={() => handleCreateCourse(session.id)}
                        className="text-blue-400 hover:text-blue-300 p-2"
                        title="Add Course"
                      >
                        <Plus className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleEditSession(session)}
                        className="text-yellow-400 hover:text-yellow-300 p-2"
                        title="Edit Session"
                      >
                        <Edit className="w-5 h-5" />
                      </button>
                      <button
                        onClick={() => handleDeleteSession(session.id)}
                        className="text-red-400 hover:text-red-300 p-2"
                        title="Delete Session"
                      >
                        <Trash2 className="w-5 h-5" />
                      </button>
                    </div>
                  </div>

                  {/* Courses in Session */}
                  {expandedSessions[session.id] && (
                    <div className="border-t border-slate-700">
                      {getSessionCourses(session.id).length === 0 ? (
                        <div className="p-6 text-center text-slate-400">
                          No courses in this session
                        </div>
                      ) : (
                        <table className="w-full">
                          <thead className="bg-slate-900/50">
                            <tr>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Code</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Course Name</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Section</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Instructor</th>
                              <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Students</th>
                              <th className="px-4 py-3 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-slate-700">
                            {getSessionCourses(session.id).map(course => (
                              <tr key={course.id} className="hover:bg-slate-700/30">
                                <td className="px-4 py-3 text-white font-mono">{course.code}</td>
                                <td className="px-4 py-3 text-white">{course.name}</td>
                                <td className="px-4 py-3 text-slate-300">{course.section}</td>
                                <td className="px-4 py-3 text-slate-300">{course.instructor_name || '-'}</td>
                                <td className="px-4 py-3">
                                  <button
                                    onClick={() => handleViewStudents(course)}
                                    className="text-blue-400 hover:text-blue-300 flex items-center gap-1"
                                  >
                                    <Users className="w-4 h-4" />
                                    {course.student_count}
                                  </button>
                                </td>
                                <td className="px-4 py-3 text-right">
                                  <button
                                    onClick={() => handleEditCourse(course)}
                                    className="text-yellow-400 hover:text-yellow-300 p-1 mr-2"
                                    title="Edit"
                                  >
                                    <Edit className="w-4 h-4" />
                                  </button>
                                  <button
                                    onClick={() => handleDeleteCourse(course.id)}
                                    className="text-red-400 hover:text-red-300 p-1"
                                    title="Delete"
                                  >
                                    <Trash2 className="w-4 h-4" />
                                  </button>
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* --- Home Classes Tab Content --- */}
      {activeTab === 'classes' && (
        <div className="space-y-6">
          <div className="flex justify-end">
            <button
              onClick={handleCreateClass}
              className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
            >
              <Plus className="w-5 h-5" />
              New Home Class
            </button>
          </div>

          {homeClasses.length === 0 ? (
            <div className="bg-slate-800 rounded-xl p-8 text-center">
              <GraduationCap className="w-12 h-12 text-slate-500 mx-auto mb-4" />
              <p className="text-slate-400">No home classes yet.</p>
            </div>
          ) : (
            <div className="bg-slate-800 rounded-xl overflow-hidden">
              <table className="w-full">
                <thead className="bg-slate-900/50">
                  <tr>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Class Name</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Department</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Description</th>
                    <th className="px-6 py-4 text-left text-xs font-medium text-slate-400 uppercase">Students</th>
                    <th className="px-6 py-4 text-right text-xs font-medium text-slate-400 uppercase">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {homeClasses.map(cls => (
                    <tr key={cls.id} className="hover:bg-slate-700/30">
                      <td className="px-6 py-4">
                        <span className="text-white font-medium">{cls.name}</span>
                      </td>
                      <td className="px-6 py-4">
                        {cls.department ? (
                          <span className="bg-blue-600/20 text-blue-400 text-xs px-2 py-1 rounded">
                            {cls.department}
                          </span>
                        ) : (
                          <span className="text-slate-500">-</span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-slate-400 text-sm max-w-xs truncate">
                        {cls.description || '-'}
                      </td>
                      <td className="px-6 py-4 text-slate-300">
                        {cls.student_count || 0}
                      </td>
                      <td className="px-6 py-4 text-right">
                        <button
                          onClick={() => handleEditClass(cls)}
                          className="text-yellow-400 hover:text-yellow-300 p-2 mr-1"
                          title="Edit"
                        >
                          <Edit className="w-4 h-4" />
                        </button>
                        <button
                          onClick={() => handleDeleteClass(cls.id)}
                          className="text-red-400 hover:text-red-300 p-2"
                          title="Delete"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* --- Students Tab Content --- */}
      {activeTab === 'students' && (
        <div className="space-y-6">
          {/* Info Banner */}
          <div className="flex items-start gap-3 bg-blue-900/20 border border-blue-600/30 rounded-lg p-4">
            <Info className="w-5 h-5 text-blue-400 flex-shrink-0 mt-0.5" />
            <div className="text-blue-300 text-sm">
              <p className="font-medium mb-1">Student Account Note</p>
              <p>When created, username & default password are the <strong>Registration Number</strong>.</p>
            </div>
          </div>

          {/* Filter Bar */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg p-4">
            <div className="flex items-center gap-4 flex-wrap">
              <div className="flex items-center gap-2">
                <Filter className="w-5 h-5 text-slate-400" />
                <span className="text-slate-300 font-medium">Filter by Class:</span>
              </div>
              <select
                value={filterClassId}
                onChange={(e) => setFilterClassId(e.target.value)}
                className="bg-slate-800 border border-slate-700 rounded-lg py-2 px-4 text-white focus:outline-none focus:border-emerald-500"
              >
                <option value="">All Students</option>
                {homeClasses.map((cls) => (
                  <option key={cls.id} value={cls.id}>
                    {cls.name}
                  </option>
                ))}
              </select>

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
                    className={`flex items-center gap-2 px-4 py-2 bg-blue-600 hover:bg-blue-500 text-white rounded-lg transition-colors cursor-pointer ${!filterClassId ? 'opacity-50 cursor-not-allowed' : ''}`}
                    title={filterClassId ? 'Import from CSV' : 'Select a class first'}
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
                  Format
                </button>

                <button
                  onClick={() => openStudentModal(null)}
                  className="flex items-center gap-2 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-lg transition-colors"
                >
                  <Plus className="w-4 h-4" />
                  Add Student
                </button>
              </div>
            </div>
            {/* Bulk Result Display in Filter Bar */}
            {bulkResult && (
              <div className="mt-4 p-3 bg-slate-800 rounded-lg border border-slate-700 text-sm">
                <strong className="text-white">Import Result: {bulkResult.message}</strong>
                {bulkResult.errors?.length > 0 && (
                  <div className="text-red-400 mt-1">Errors: {bulkResult.errors.join(', ')}</div>
                )}
                <button onClick={() => setBulkResult(null)} className="text-xs text-slate-400 hover:text-white mt-1 underline">Dismiss</button>
              </div>
            )}
          </div>

          {/* Students Table */}
          <div className="bg-slate-900 border border-slate-800 rounded-lg overflow-hidden">
            {studentLoading ? (
              <div className="flex justify-center py-12">
                <RefreshCw className="w-8 h-8 animate-spin text-emerald-400" />
              </div>
            ) : students.length === 0 ? (
              <div className="text-center py-12 text-slate-500">
                <Users className="w-12 h-12 mx-auto mb-2 opacity-50" />
                No students found. Add a student or import data.
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
        </div>
      )}

      {/* --- Modals --- */}

      {/* Session Modal */}
      {showSessionModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingSession ? 'Edit Session' : 'New Session'}
              </h3>
              <button onClick={() => setShowSessionModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSessionSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Session Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={sessionForm.name}
                  onChange={e => setSessionForm({ ...sessionForm, name: e.target.value })}
                  placeholder="e.g., 2:2025/2026"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
                <p className="text-xs text-slate-500 mt-1">Format: semester:year (e.g., 2:2025/2026)</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Start Date</label>
                  <input
                    type="date"
                    value={sessionForm.start_date}
                    onChange={e => setSessionForm({ ...sessionForm, start_date: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">End Date</label>
                  <input
                    type="date"
                    value={sessionForm.end_date}
                    onChange={e => setSessionForm({ ...sessionForm, end_date: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  />
                </div>
              </div>
              <div className="flex items-center gap-2">
                <input
                  type="checkbox"
                  id="is_active"
                  checked={sessionForm.is_active}
                  onChange={e => setSessionForm({ ...sessionForm, is_active: e.target.checked })}
                  className="w-4 h-4 rounded border-slate-600 bg-slate-700"
                />
                <label htmlFor="is_active" className="text-sm text-slate-300">Set as active session</label>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowSessionModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingSession ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Course Modal */}
      {showCourseModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingCourse ? 'Edit Course' : 'New Course'}
              </h3>
              <button onClick={() => setShowCourseModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCourseSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Course Code <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseForm.code}
                    onChange={e => setCourseForm({ ...courseForm, code: e.target.value.toUpperCase() })}
                    placeholder="e.g., DJJ40173"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Section <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="text"
                    value={courseForm.section}
                    onChange={e => setCourseForm({ ...courseForm, section: e.target.value.toUpperCase() })}
                    placeholder="e.g., S1"
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    required
                  />
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Course Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={courseForm.name}
                  onChange={e => setCourseForm({ ...courseForm, name: e.target.value })}
                  placeholder="e.g., Engineering Design"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">
                    Session <span className="text-red-400">*</span>
                  </label>
                  <select
                    value={courseForm.session}
                    onChange={e => setCourseForm({ ...courseForm, session: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                    required
                  >
                    <option value="">Select session...</option>
                    {sessions.map(s => (
                      <option key={s.id} value={s.id}>{s.name}</option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-slate-300 mb-1">Instructor</label>
                  <select
                    value={courseForm.instructor}
                    onChange={e => setCourseForm({ ...courseForm, instructor: e.target.value })}
                    className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  >
                    <option value="">Select instructor...</option>
                    {instructors.map(i => (
                      <option key={i.id} value={i.id}>
                        {i.first_name} {i.last_name} ({i.username})
                      </option>
                    ))}
                  </select>
                </div>
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">Description</label>
                <textarea
                  value={courseForm.description}
                  onChange={e => setCourseForm({ ...courseForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowCourseModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingCourse ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Home Class Modal */}
      {showClassModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingClass ? 'Edit Home Class' : 'New Home Class'}
              </h3>
              <button onClick={() => setShowClassModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleClassSubmit} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Class Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={classForm.name}
                  onChange={e => setClassForm({ ...classForm, name: e.target.value })}
                  placeholder="e.g., DKM5A"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Department
                </label>
                <input
                  type="text"
                  value={classForm.department}
                  onChange={e => setClassForm({ ...classForm, department: e.target.value })}
                  placeholder="e.g., JKM"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Description
                </label>
                <textarea
                  value={classForm.description}
                  onChange={e => setClassForm({ ...classForm, description: e.target.value })}
                  rows={2}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  placeholder="Optional description"
                />
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowClassModal(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingClass ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Student Modal (CRUD) */}
      {showStudentModalCRUD && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-md">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                {editingStudent ? 'Edit Student' : 'New Student'}
              </h3>
              <button onClick={() => setShowStudentModalCRUD(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={(e) => { e.preventDefault(); editingStudent ? handleUpdateStudent() : handleCreateStudent(); }} className="space-y-4">
              {!editingStudent && (
                <p className="text-xs text-blue-400 mb-2">Note: User account will be created with password = Reg. Number</p>
              )}
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Registration Number <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={studentForm.student_id}
                  onChange={e => setStudentForm({ ...studentForm, student_id: e.target.value })}
                  placeholder="e.g., 2026001234"
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  disabled={!!editingStudent}
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Full Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={studentForm.name}
                  onChange={e => setStudentForm({ ...studentForm, name: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-slate-300 mb-1">
                  Assign to Home Class <span className="text-red-400">*</span>
                </label>
                <select
                  value={studentForm.class_group}
                  onChange={e => setStudentForm({ ...studentForm, class_group: e.target.value })}
                  className="w-full bg-slate-700 border border-slate-600 rounded-lg px-3 py-2 text-white"
                  required
                >
                  <option value="">-- Select Class --</option>
                  {homeClasses.map(cls => (
                    <option key={cls.id} value={cls.id}>{cls.name}</option>
                  ))}
                </select>
              </div>
              <div className="flex justify-end gap-3 pt-4">
                <button
                  type="button"
                  onClick={() => setShowStudentModalCRUD(false)}
                  className="px-4 py-2 text-slate-400 hover:text-white"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <Save className="w-4 h-4" />
                  {editingStudent ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* CSV Import Modal */}
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
              <p className="text-slate-300">Create a CSV file with columns: <code className="text-emerald-400">student_id</code>, <code className="text-emerald-400">name</code></p>
              <div className="bg-slate-800 rounded-lg p-4 font-mono text-sm">
                <p className="text-emerald-400">student_id,name</p>
                <p className="text-slate-300">05DKM23F2001,Ahmad bin Ali</p>
                <p className="text-slate-300">05DKM23F2002,Sarah binti Hassan</p>
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

      {/* Course Students Modal (View Only) */}
      {showStudentsModal && selectedCourse && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-2xl max-h-[80vh] overflow-hidden flex flex-col">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white">
                Students Enrolled in {selectedCourse.code}
              </h3>
              <button onClick={() => setShowStudentsModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-auto">
              <table className="w-full">
                <thead className="bg-slate-900/50 sticky top-0">
                  <tr>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Reg. Number</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Full Name</th>
                    <th className="px-4 py-3 text-left text-xs font-medium text-slate-400 uppercase">Class</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-700">
                  {courseStudents.map(student => (
                    <tr key={student.id} className="hover:bg-slate-700/30">
                      <td className="px-4 py-3 text-white font-mono">{student.student_id}</td>
                      <td className="px-4 py-3 text-white">{student.name}</td>
                      <td className="px-4 py-3 text-slate-300">{student.class_group_name || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              {courseStudents.length === 0 && (
                <div className="text-center py-8 text-slate-500">
                  No students enrollments
                </div>
              )}
            </div>

            <div className="pt-4 border-t border-slate-700 mt-auto flex justify-end">
              <button
                onClick={() => setShowStudentsModal(false)}
                className="px-4 py-2 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {/* PDF Import Modal */}
      {showImportModal && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-xl p-6 w-full max-w-lg">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-white flex items-center gap-2">
                <FileText className="w-5 h-5 text-purple-400" />
                Import from Attendance PDF
              </h3>
              <button onClick={() => setShowImportModal(false)} className="text-slate-400 hover:text-white">
                <X className="w-5 h-5" />
              </button>
            </div>

            {!importResult ? (
              <div className="space-y-4">
                <p className="text-slate-400 text-sm">
                  Upload a Malaysian polytechnic attendance sheet PDF to extract sessions, courses, classes and students.
                </p>
                <div className="border-2 border-dashed border-slate-600 rounded-lg p-6 text-center">
                  <input
                    type="file"
                    accept=".pdf"
                    onChange={e => setImportFile(e.target.files[0])}
                    className="hidden"
                    id="pdf-upload"
                  />
                  <label htmlFor="pdf-upload" className="cursor-pointer">
                    <Upload className="w-8 h-8 text-slate-400 mx-auto mb-2" />
                    {importFile ? (
                      <p className="text-emerald-400">{importFile.name}</p>
                    ) : (
                      <p className="text-slate-400">Click to select PDF file</p>
                    )}
                  </label>
                </div>

                <div className="flex justify-end gap-3">
                  <button
                    type="button"
                    onClick={() => setShowImportModal(false)}
                    className="px-4 py-2 text-slate-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={handleImportSubmit}
                    disabled={!importFile || importing}
                    className="bg-purple-600 hover:bg-purple-700 disabled:opacity-50 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                  >
                    {importing ? (
                      <>
                        <RefreshCw className="w-4 h-4 animate-spin" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <Upload className="w-4 h-4" />
                        Import
                      </>
                    )}
                  </button>
                </div>
              </div>
            ) : (
              <div className="space-y-4">
                <div className="bg-emerald-900/30 border border-emerald-600 rounded-lg p-4">
                  <h4 className="text-emerald-400 font-medium flex items-center gap-2">
                    <CheckCircle className="w-5 h-5" />
                    Import Successful
                  </h4>
                </div>
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400">Session</p>
                    <p className="text-white font-medium">{importResult.session?.name}</p>
                  </div>
                  <div className="bg-slate-700/50 rounded-lg p-3">
                    <p className="text-slate-400">Course</p>
                    <p className="text-white font-medium">{importResult.course?.code}</p>
                  </div>
                </div>
                {importResult.class_groups_created?.length > 0 && (
                  <div className="text-sm text-slate-400">
                    <p>New home classes created: {importResult.class_groups_created.join(', ')}</p>
                  </div>
                )}
                <div className="flex justify-end">
                  <button
                    onClick={() => setShowImportModal(false)}
                    className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2 rounded-lg"
                  >
                    Done
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default CourseManagement;
