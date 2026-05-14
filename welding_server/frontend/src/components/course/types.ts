export interface Session {
  id: number;
  name: string;
  is_active: boolean;
  start_date?: string;
  end_date?: string;
  course_count?: number;
}

export interface Instructor {
  id: number;
  username: string;
  name?: string;
  first_name?: string;
  last_name?: string;
  email: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
  section: string;
  session: number;
  instructor?: number;
  instructor_name?: string;
  description?: string;
  student_count?: number;
}

export interface HomeClass {
  id: number;
  name: string;
  description?: string;
  student_count?: number;
}

export interface Student {
  id: number;
  student_id: string;
  name: string;
  class_group?: number;
  class_group_name?: string;
  username?: string;
  first_name?: string;
  last_name?: string;
}
