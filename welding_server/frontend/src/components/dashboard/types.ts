export interface Student {
  id: number;
  student_id: string;
  name: string;
}

export interface Course {
  id: number;
  code: string;
  name: string;
}

export interface Criterion {
  id: number;
  name: string;
  weight: number;
  description?: string;
  score_1_description?: string;
  score_2_description?: string;
  score_3_description?: string;
  score_4_description?: string;
  score_5_description?: string;
  likert_1?: string;
  likert_2?: string;
  likert_3?: string;
  likert_4?: string;
  likert_5?: string;
}

export interface Rubric {
  id: number;
  name: string;
  is_active: boolean;
  passing_score: number;
  criteria: Criterion[];
}

export interface Metrics {
  height: number;     // reinforcement_height_mm (geometric)
  width: number;      // bead_width_mm (geometric)
  toeAngle: number;   // toe_angle_deg (geometric, AWS D11.2 min 135°)
  undercut: number;   // undercut_depth_mm (geometric)
  score: number;
  defects: {
    porosity: number;       // AI: gas pinholes / pockets
    undercut: number;       // AI: undercut presence (0 or 1)
    spatter: number;        // AI: metal droplets
    cracks: number;         // AI: hairline cracks
    lackOfFusion: number;   // AI: incomplete bond (0 or 1)
  };
}

export interface EvaluationResult {
  id: number | null;
  student: Student;
  rubric: string;
  rubricId: number;
  timestamp: string;
  metrics: Metrics;
  criterionScores: Record<number, number>;
  avgScore: string;
  passed: boolean;
}
