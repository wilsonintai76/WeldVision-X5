export interface Criterion {
  id?: number;
  name: string;
  category: 'geometric' | 'visual' | 'technique' | 'safety';
  weight: number;
  order: number;
  score_1_label: string;
  score_1_description: string;
  score_2_label: string;
  score_2_description: string;
  score_3_label: string;
  score_3_description: string;
  score_4_label: string;
  score_4_description: string;
  score_5_label: string;
  score_5_description: string;
  [key: string]: any;
}

export interface Rubric {
  id: number;
  name: string;
  description: string;
  rubric_type: string;
  passing_score: number;
  is_active: boolean;
  criteria_count?: number;
  criteria?: Criterion[];
}

export interface RubricForm {
  name: string;
  description: string;
  rubric_type: string;
  passing_score: number;
}
