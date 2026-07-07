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
export const KAGGLE_URL = 'https://www.kaggle.com'
export const CVAT_URL = 'https://cvat.weldvision-x5.com'

export interface UploadMetadata {
  map50: string
  map50_95: string
  epochs: string
  datasetVersion: string
  frameworkVersion: string
}
