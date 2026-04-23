import { useState, useEffect, useRef, FC } from 'react';
import {
  BookOpen,
  Plus,
  RefreshCw,
  Users,
  Upload,
  AlertCircle,
  CheckCircle,
  GraduationCap,
  X
} from 'lucide-react';
import coreAPI from '../services/coreAPI';
import { useAuth } from '../context/AuthContext';

// Types
import { Session, Instructor, Course, HomeClass, Student } from './course/types';

// Components
import SessionList from './course/SessionList';
import CourseList from './course/CourseList';
import HomeClassList from './course/HomeClassList';
import StudentList from './course/StudentList';

// Modals
import SessionModal from './course/modals/SessionModal';
import CourseModal from './course/modals/CourseModal';
import HomeClassModal from './course/modals/HomeClassModal';
import StudentModal from './course/modals/StudentModal';
import ImportPDFModal from './course/modals/ImportPDFModal';
import EnrollmentModal from './course/modals/EnrollmentModal';
import EnrolledStudentsModal from './course/modals/EnrolledStudentsModal';
import BulkImportFormatModal from './course/modals/BulkImportFormatModal';

const CourseManagement: FC = () => {
  const { permissions } = useAuth();
  const [activeTab, setActiveTab] = useState('courses');

  // Shared State
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);

  // Data State
  const [sessions, setSessions] = useState<Session[]>([]);
  const [courses, setCourses] = useState<Course[]>([]);
  const [instructors, setInstructors] = useState<Instructor[]>([]);
  const [homeClasses, setHomeClasses] = useState<HomeClass[]>([]);
  const [students, setStudents] = useState<Student[]>([]);
  const [courseStudents, setCourseStudents] = useState<Student[]>([]);
  const [availableStudents, setAvailableStudents] = useState<Student[]>([]);

  // UI State
  const [expandedSessions, setExpandedSessions] = useState<Record<number, boolean>>({});
  const [filterClassId, setFilterClassId] = useState<string | number>('');
  const [enrollClassFilter, setEnrollClassFilter] = useState('');
  const [selectedEnrollIds, setSelectedEnrollIds] = useState(new Set<string>());
  
  // Loading States
  const [studentLoading, setStudentLoading] = useState(false);
  const [enrollLoading, setEnrollLoading] = useState(false);
  const [importing, setImporting] = useState(false);
  const [bulkLoading, setBulkLoading] = useState(false);

  // Modal States
  const [showSessionModal, setShowSessionModal] = useState(false);
  const [showCourseModal, setShowCourseModal] = useState(false);
  const [showClassModal, setShowClassModal] = useState(false);
  const [showStudentModalCRUD, setShowStudentModalCRUD] = useState(false);
  const [showImportModal, setShowImportModal] = useState(false);
  const [showEnrollModal, setShowEnrollModal] = useState(false);
  const [showStudentsModal, setShowStudentsModal] = useState(false);
  const [showBulkModal, setShowBulkModal] = useState(false);

  // Editing Selection State
  const [editingSession, setEditingSession] = useState<Session | null>(null);
  const [editingCourse, setEditingCourse] = useState<Course | null>(null);
  const [editingClass, setEditingClass] = useState<HomeClass | null>(null);
  const [editingStudent, setEditingStudent] = useState<Student | null>(null);
  const [selectedCourse, setSelectedCourse] = useState<Course | null>(null);

  // Form States
  const [sessionForm, setSessionForm] = useState({ name: '', is_active: false, start_date: '', end_date: '' });
  const [courseForm, setCourseForm] = useState({ code: '', name: '', section: '', session: '' as string | number, instructor: '' as string | number, description: '' });
  const [classForm, setClassForm] = useState({ name: '', description: '' });
  const [studentForm, setStudentForm] = useState({ student_id: '', name: '', class_group: '' as string | number });
  
  // File Import State
  const [importFile, setImportFile] = useState<File | null>(null);
  const [importResult, setImportResult] = useState<any>(null);
  const [bulkResult, setBulkResult] = useState<any>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (activeTab === 'students') {
      fetchStudents();
    }
  }, [activeTab, filterClassId]);

  useEffect(() => {
    if (enrollClassFilter) {
      fetchAvailableStudents(enrollClassFilter);
    }
  }, [enrollClassFilter]);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const [sessionsData, coursesData, instructorsData, classesData] = await Promise.all([
        coreAPI.getSessions(),
        coreAPI.getCourses(),
        coreAPI.getInstructors(),
        coreAPI.getClasses()
      ]);
      setSessions(sessionsData);
      setCourses(coursesData);
      setInstructors(Array.isArray(instructorsData) ? instructorsData : (instructorsData.results || []));
      setHomeClasses(classesData);

      const activeSession = sessionsData.find((s: Session) => s.is_active);
      if (activeSession) {
        setExpandedSessions({ [activeSession.id]: true });
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchStudents = async () => {
    setStudentLoading(true);
    try {
      const data = filterClassId
        ? await coreAPI.getStudentsByClass(filterClassId)
        : await coreAPI.getStudents();
      setStudents(Array.isArray(data) ? data : (data.results || []));
    } catch (err: any) {
      setError(err.message);
    } finally {
      setStudentLoading(false);
    }
  };

  const fetchAvailableStudents = async (classId: string | number) => {
    if (!classId || !selectedCourse) {
      setAvailableStudents([]);
      return;
    }
    setEnrollLoading(true);
    try {
      const data = await coreAPI.getStudentsByClass(classId);
      const studentArray = Array.isArray(data) ? data : (data.results || []);
      const enrolledIds = new Set((courseStudents || []).map(s => String(s.id)));
      const available = studentArray.filter((s: Student) => !enrolledIds.has(String(s.id)));
      setAvailableStudents(available);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  // --- Handlers ---
  const toggleSession = (sessionId: number) => {
    setExpandedSessions(prev => ({ ...prev, [sessionId]: !prev[sessionId] }));
  };

  const handleSetActiveSession = async (id: number) => {
    try {
      await coreAPI.setActiveSession(id);
      await loadData();
      setSuccess('Active session updated');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateSession = () => {
    setEditingSession(null);
    setSessionForm({ name: '', is_active: false, start_date: '', end_date: '' });
    setShowSessionModal(true);
  };

  const handleEditSession = (session: Session) => {
    setEditingSession(session);
    setSessionForm({
      name: session.name,
      is_active: session.is_active,
      start_date: session.start_date || '',
      end_date: session.end_date || ''
    });
    setShowSessionModal(true);
  };

  const handleDeleteSession = async (id: number) => {
    if (!confirm('Delete this session? All courses in this session will also be deleted.')) return;
    try {
      await coreAPI.deleteSession(id);
      await loadData();
      setSuccess('Session deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleSessionSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateCourse = (sessionId: string | number | null = null) => {
    setEditingCourse(null);
    setCourseForm({ code: '', name: '', section: 'S1', session: sessionId || '', instructor: '', description: '' });
    setShowCourseModal(true);
  };

  const handleEditCourse = (course: Course) => {
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

  const handleDeleteCourse = async (id: number) => {
    if (!confirm('Delete this course? All enrollments will be removed.')) return;
    try {
      await coreAPI.deleteCourse(id);
      await loadData();
      setSuccess('Course deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCourseSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleViewStudents = async (course: Course) => {
    setSelectedCourse(course);
    try {
      setLoading(true);
      const data = await coreAPI.getCourseStudents(course.id);
      setCourseStudents(Array.isArray(data) ? data : (data.results || []));
      setShowStudentsModal(true);
    } catch (err: any) {
      setError(err.message || "Failed to load enrolled students");
    } finally {
      setLoading(false);
    }
  };

  const handleOpenEnrollment = (course: Course) => {
    setSelectedCourse(course);
    setSelectedEnrollIds(new Set());
    setEnrollClassFilter('');
    setAvailableStudents([]);
    setShowEnrollModal(true);
  };

  const toggleEnrollSelection = (id: string | number) => {
    setSelectedEnrollIds(prev => {
      const next = new Set(prev);
      if (next.has(String(id))) next.delete(String(id));
      else next.add(String(id));
      return next;
    });
  };

  const handleEnrollSubmit = async () => {
    if (selectedEnrollIds.size === 0 || !selectedCourse) return;
    setEnrollLoading(true);
    try {
      const ids = Array.from(selectedEnrollIds);
      await coreAPI.enrollStudents(selectedCourse.id, ids);
      setSuccess(`Enrolled ${ids.length} students`);
      
      const updatedStudents = await coreAPI.getCourseStudents(selectedCourse.id);
      const studentArray = Array.isArray(updatedStudents) ? updatedStudents : (updatedStudents.results || []);
      setCourseStudents(studentArray);
      setShowEnrollModal(false);
      
      setCourses(prev => prev.map(c => 
        c.id === selectedCourse.id ? { ...c, student_count: studentArray.length } : c
      ));
      
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setEnrollLoading(false);
    }
  };

  const handleUnenroll = async (studentId: number) => {
    if (!confirm('Remove this student from the course?') || !selectedCourse) return;
    try {
      await coreAPI.unenrollStudents(selectedCourse.id, [studentId]);
      const updatedStudents = courseStudents.filter(s => s.id !== studentId);
      setCourseStudents(updatedStudents);
      setSuccess('Student removed from course');
      setCourses(prev => prev.map(c => 
        c.id === selectedCourse.id ? { ...c, student_count: updatedStudents.length } : c
      ));
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleCreateClass = () => {
    setEditingClass(null);
    setClassForm({ name: '', description: '' });
    setShowClassModal(true);
  };

  const handleEditClass = (cls: HomeClass) => {
    setEditingClass(cls);
    setClassForm({ name: cls.name, description: cls.description || '' });
    setShowClassModal(true);
  };

  const handleDeleteClass = async (id: number) => {
    if (!confirm('Delete this home class? Students will lose their home class assignment.')) return;
    try {
      await coreAPI.deleteClass(id);
      await loadData();
      setSuccess('Home class deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleClassSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
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
    } catch (err: any) {
      setError(err.message);
    }
  };

  const openStudentModal = (student: Student | null = null) => {
    if (student) {
      setEditingStudent(student);
      setStudentForm({ student_id: student.student_id, name: student.name, class_group: student.class_group || '' });
    } else {
      setEditingStudent(null);
      setStudentForm({ student_id: '', name: '', class_group: filterClassId || '' });
    }
    setShowStudentModalCRUD(true);
  };

  const handleStudentSave = async () => {
    try {
      if (editingStudent) {
        await coreAPI.updateStudent(editingStudent.id, studentForm);
        setSuccess('Student updated');
      } else {
        await coreAPI.createStudent(studentForm);
        setSuccess(`Student "${studentForm.name}" created.`);
      }
      fetchStudents();
      setShowStudentModalCRUD(false);
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteStudent = async (id: number) => {
    if (!confirm('Delete this student? This will also delete their user account.')) return;
    try {
      await coreAPI.deleteStudent(id);
      fetchStudents();
      setSuccess('Student deleted');
      setTimeout(() => setSuccess(null), 3000);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleImportPDF = async () => {
    if (!importFile) return;
    setImporting(true);
    try {
      const result = await coreAPI.importPDF(importFile);
      setImportResult(result);
      await loadData();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setImporting(false);
    }
  };

  const handleBulkImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !filterClassId) return;
    setBulkLoading(true);
    try {
      const result = await coreAPI.bulkImportStudents(file, filterClassId);
      setBulkResult(result);
      fetchStudents();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setBulkLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const getSessionCourses = (sessionId: number) => courses.filter(c => c.session === sessionId);

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
          <h2 className="text-2xl font-bold text-white flex items-center gap-3">
            <BookOpen className="w-7 h-7 text-emerald-400" />
            Course & Student Management
          </h2>
          <p className="text-slate-400 mt-1">Manage academic sessions, courses, classes, and students</p>
        </div>
        <button
          onClick={() => setShowImportModal(true)}
          className="bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg flex items-center gap-2"
        >
          <Upload className="w-5 h-5" />
          Import PDF
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-slate-700">
        {['courses', 'classes', 'students'].map(tab => (
          <button
            key={tab}
            className={`px-6 py-3 font-medium text-sm transition-colors relative capitalize ${activeTab === tab ? 'text-emerald-400' : 'text-slate-400 hover:text-white'}`}
            onClick={() => setActiveTab(tab)}
          >
            {tab}
            {activeTab === tab && <div className="absolute bottom-0 left-0 right-0 h-0.5 bg-emerald-400" />}
          </button>
        ))}
      </div>

      {/* Alerts */}
      {error && (
        <div className="bg-red-900/50 border border-red-500 text-red-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <AlertCircle className="w-5 h-5" />
          {error}
          <button onClick={() => setError(null)} className="ml-auto"><X className="w-4 h-4" /></button>
        </div>
      )}
      {success && (
        <div className="bg-emerald-900/50 border border-emerald-500 text-emerald-200 px-4 py-3 rounded-lg flex items-center gap-2">
          <CheckCircle className="w-5 h-5" />
          {success}
        </div>
      )}

      {/* Tab Content */}
      {activeTab === 'courses' && (
        <SessionList
          sessions={sessions}
          courses={courses}
          expandedSessions={expandedSessions}
          toggleSession={toggleSession}
          handleSetActiveSession={handleSetActiveSession}
          handleCreateCourse={handleCreateCourse}
          handleEditSession={handleEditSession}
          handleDeleteSession={handleDeleteSession}
          handleCreateSession={handleCreateSession}
          renderCourseList={(sessionCourses) => (
            <CourseList
              courses={sessionCourses}
              handleViewStudents={handleViewStudents}
              handleOpenEnrollment={handleOpenEnrollment}
              handleEditCourse={handleEditCourse}
              handleDeleteCourse={handleDeleteCourse}
            />
          )}
        />
      )}

      {activeTab === 'classes' && (
        <HomeClassList
          homeClasses={homeClasses}
          handleCreateClass={handleCreateClass}
          handleEditClass={handleEditClass}
          handleDeleteClass={handleDeleteClass}
        />
      )}

      {activeTab === 'students' && (
        <StudentList
          students={students}
          homeClasses={homeClasses}
          filterClassId={filterClassId}
          setFilterClassId={setFilterClassId}
          studentLoading={studentLoading}
          handleBulkImport={handleBulkImport}
          setShowBulkModal={setShowBulkModal}
          openStudentModal={openStudentModal}
          handleDeleteStudent={handleDeleteStudent}
          bulkResult={bulkResult}
          setBulkResult={setBulkResult}
          fileInputRef={fileInputRef}
        />
      )}

      {/* Modals */}
      <SessionModal
        show={showSessionModal}
        onClose={() => setShowSessionModal(false)}
        editingSession={editingSession}
        sessionForm={sessionForm}
        setSessionForm={setSessionForm}
        onSubmit={handleSessionSubmit}
      />
      <CourseModal
        show={showCourseModal}
        onClose={() => setShowCourseModal(false)}
        editingCourse={editingCourse}
        courseForm={courseForm}
        setCourseForm={setCourseForm}
        onSubmit={handleCourseSubmit}
        sessions={sessions}
        instructors={instructors}
      />
      <HomeClassModal
        show={showClassModal}
        onClose={() => setShowClassModal(false)}
        editingClass={editingClass}
        classForm={classForm}
        setClassForm={setClassForm}
        onSubmit={handleClassSubmit}
      />
      <StudentModal
        show={showStudentModalCRUD}
        onClose={() => setShowStudentModalCRUD(false)}
        editingStudent={editingStudent}
        studentForm={studentForm}
        setStudentForm={setStudentForm}
        onSave={handleStudentSave}
        homeClasses={homeClasses}
      />
      <ImportPDFModal
        show={showImportModal}
        onClose={() => setShowImportModal(false)}
        importFile={importFile}
        setImportFile={setImportFile}
        importing={importing}
        importResult={importResult}
        onSubmit={handleImportPDF}
      />
      <EnrollmentModal
        show={showEnrollModal}
        onClose={() => setShowEnrollModal(false)}
        selectedCourse={selectedCourse}
        homeClasses={homeClasses}
        enrollClassFilter={enrollClassFilter}
        setEnrollClassFilter={setEnrollClassFilter}
        availableStudents={availableStudents}
        enrollLoading={enrollLoading}
        selectedEnrollIds={selectedEnrollIds}
        toggleEnrollSelection={toggleEnrollSelection}
        onEnrollSubmit={handleEnrollSubmit}
      />
      <EnrolledStudentsModal
        show={showStudentsModal}
        onClose={() => setShowStudentsModal(false)}
        selectedCourse={selectedCourse}
        courseStudents={courseStudents}
        handleUnenroll={handleUnenroll}
      />
      <BulkImportFormatModal
        show={showBulkModal}
        onClose={() => setShowBulkModal(false)}
      />
    </div>
  );
};

export default CourseManagement;
