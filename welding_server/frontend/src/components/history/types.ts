export interface AssessmentEntry {
    id: string | number;
    original_id?: number;
    student_name: string;
    student_id: string;
    timestamp: string;
    final_score: number;
    image_heatmap_url: string | null;
    has_3d_data: boolean;
    assessment?: number;
    evaluation_id?: number;
    type: 'scan' | 'manual';
    rubric_name?: string;
    passed?: boolean;
    grade_band?: string;        // A/B/C/D/F from Likert rubric
    rejected?: boolean;
    rejection_reason?: string;
    rubric_id?: number | null;  // which rubric scored this assessment
}
