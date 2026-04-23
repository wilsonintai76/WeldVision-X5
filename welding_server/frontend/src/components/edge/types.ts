export interface DeviceInfo {
  hostname?: string;
  firmware?: string;
  uptime?: string;
  temperature?: string;
  [key: string]: any;
}

export interface EdgeConfig {
  device_ip: string;
  device_port: string;
  stream_port: string;
  model_path: string;
}

export interface CheckerboardConfig {
  rows: number;
  cols: number;
  square_size: number;
  name: string;
}

export interface CapturedImage {
  id: number;
  left: string | null;
  right: string | null;
  corners_found: boolean;
  timestamp: string;
}

export interface CalibrationResults {
  name: string;
  baseline: number;
  focal_length_left: number;
  focal_length_right: number;
  principal_point_left: { x: number; y: number };
  principal_point_right: { x: number; y: number };
  reprojection_error: number;
  image_width: number;
  image_height: number;
  distortion_left: number[];
  distortion_right: number[];
  rectification_valid: boolean;
}

export interface Calibration {
  id: number;
  name: string;
  baseline: number;
  focal_length: number;
  image_width: number;
  image_height: number;
  reprojection_error: number;
  is_active: boolean;
}
