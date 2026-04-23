import React from 'react'
import { Calendar, ChevronUp, ChevronDown, Plus, Edit, Trash2 } from 'lucide-react'
import { Session } from './types'

interface SessionListProps {
  sessions: Session[];
  courses: Course[];
  expandedSessions: Record<number, boolean>;
  toggleSession: (id: number) => void;
  handleSetActiveSession: (id: number) => void;
  handleCreateCourse: (sessionId: number) => void;
  handleEditSession: (session: Session) => void;
  handleDeleteSession: (id: number) => void;
  handleCreateSession: () => void;
  renderCourseList: (courses: Course[]) => React.ReactNode;
}

const SessionList: React.FC<SessionListProps> = ({
  sessions,
  courses,
  expandedSessions,
  toggleSession,
  handleSetActiveSession,
  handleCreateCourse,
  handleEditSession,
  handleDeleteSession,
  handleCreateSession,
  renderCourseList
}) => {
  const getSessionCourses = (sessionId: number) => courses.filter(c => c.session === sessionId);
  return (
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
              {expandedSessions[session.id] && renderCourseList(getSessionCourses(session.id))}
            </div>
          ))}
        </div>
      )}
    </div>
  )
}

export default SessionList
