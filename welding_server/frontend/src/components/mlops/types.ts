export interface Model {
  id: string | number
  name: string
  version: string
  accuracy?: number
  precision_score?: number
  recall?: number
  f1_score?: number
  map50?: number
  map50_95?: number
  epochs?: number
  dataset_version?: string
  model_size_bytes?: number
  framework_version?: string
  created_at?: string
  is_deployed?: boolean
  status?: string
  model_file_key?: string
}

export type TabId = 'registry' | 'compare'

export const GITHUB_ACTIONS_URL = 'https://github.com/wilsonintai76/WeldVision-X5/actions'
// Open training notebook directly from GitHub — avoids Colab reset losing the file
export const COLAB_NOTEBOOK_URL = 'https://colab.research.google.com/github/wilsonintai76/WeldVision-X5/blob/main/.github/workflows/training.ipynb'
export const ROBOFLOW_URL = 'https://app.roboflow.com/jwai/weldvision-ribcd'

export interface UploadMetadata {
  map50: string
  map50_95: string
  epochs: string
  datasetVersion: string
  frameworkVersion: string
}
