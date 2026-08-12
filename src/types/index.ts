

export type ViewPlane = 'axial' | 'sagittal' | 'coronal';
export type FileFormat =
  | 'nifti'
  | 'npy'
  | 'dicom'
  | 'tiff'
  | 'image'
  | 'unknown';

/**
 * Normalized volume representation used throughout the app, regardless of
 * source format. Data is always laid out as a flat Float32Array with index
 * = z * (dimX * dimY) + y * dimX + x, so every renderer can treat every
 * format identically once it has been parsed.
 */
export interface VolumeData {
  format: FileFormat;
  fileName: string;
  dims: [number, number, number]; // [x, y, z]
  data: Float32Array;
  dataMin: number;
  dataMax: number;
  is3D: boolean;
}

export interface WindowLevel {
  center: number;
  width: number;
}

export interface LoadedFile {
  volume: VolumeData;
  windowLevel: WindowLevel;
}
