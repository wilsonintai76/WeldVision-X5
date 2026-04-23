import React from 'react'
import { Users, UserPlus, FileEdit, Trash2 } from 'lucide-react'
import { Course } from './types'

interface CourseListProps {
  courses: Course[];
  handleViewStudents: (course: Course) => void;
  handleOpenEnrollment: (course: Course) => void;
  handleEditCourse: (course: Course) => void;
  handleDeleteCourse: (id: number) => void;
}

const CourseList: React.FC<CourseListProps> = ({
  courses,
  handleViewStudents,
  handleOpenEnrollment,
  handleEditCourse,
  handleDeleteCourse
}) => {
  if (courses.length === 0) {
    return (
      <div className="p-6 text-center text-slate-400">
        No courses in this session
      </div>
    )
  }

  return (
    <div className="border-t border-slate-700">
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
          {courses.map(course => (
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
                <div className="flex justify-end gap-2">
                  <button
                    onClick={() => handleOpenEnrollment(course)}
                    className="p-1.5 text-emerald-400 hover:text-emerald-300 hover:bg-emerald-500/10 rounded transition-colors"
                    title="Enroll Students"
                  >
                    <UserPlus className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleEditCourse(course)}
                    className="p-1.5 text-blue-400 hover:text-blue-300 hover:bg-blue-500/10 rounded transition-colors"
                    title="Edit Course"
                  >
                    <FileEdit className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDeleteCourse(course.id)}
                    className="p-1.5 text-red-400 hover:text-red-300 hover:bg-red-500/10 rounded transition-colors"
                    title="Delete Course"
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
  )
}

export default CourseList
