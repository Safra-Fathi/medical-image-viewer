import type { VolumeData, ViewPlane } from '../types';

export interface SliceInfo {
  width: number;
  height: number;
  /** Row-major (y then x) grayscale intensity values for this 2D slice */
  values: Float32Array;
}

/**
 * Extracts a single 2D slice from a normalized volume for the given plane
 * and slice index. Volume data is laid out as
 * index = z * (dimX*dimY) + y * dimX + x.
 */
export function extractSlice(volume: VolumeData, plane: ViewPlane, index: number): SliceInfo {
  const [dimX, dimY, dimZ] = volume.dims;
  const d = volume.data;

  if (plane === 'axial') {
    const z = Math.min(Math.max(index, 0), dimZ - 1);
    const width = dimX;
    const height = dimY;
    const values = new Float32Array(width * height);
    const base = z * dimX * dimY;
    for (let y = 0; y < dimY; y++) {
      for (let x = 0; x < dimX; x++) {
        values[y * width + x] = d[base + y * dimX + x];
      }
    }
    return { width, height, values };
  }

  if (plane === 'coronal') {
    const y = Math.min(Math.max(index, 0), dimY - 1);
    const width = dimX;
    const height = dimZ;
    const values = new Float32Array(width * height);
    for (let z = 0; z < dimZ; z++) {
      const base = z * dimX * dimY + y * dimX;
      for (let x = 0; x < dimX; x++) {
        values[z * width + x] = d[base + x];
      }
    }
    return { width, height, values };
  }

  // sagittal
  const x = Math.min(Math.max(index, 0), dimX - 1);
  const width = dimY;
  const height = dimZ;
  const values = new Float32Array(width * height);
  for (let z = 0; z < dimZ; z++) {
    for (let y = 0; y < dimY; y++) {
      values[z * width + y] = d[z * dimX * dimY + y * dimX + x];
    }
  }
  return { width, height, values };
}

export function planeMaxIndex(volume: VolumeData, plane: ViewPlane): number {
  const [dimX, dimY, dimZ] = volume.dims;
  if (plane === 'axial') return dimZ - 1;
  if (plane === 'coronal') return dimY - 1;
  return dimX - 1;
}
