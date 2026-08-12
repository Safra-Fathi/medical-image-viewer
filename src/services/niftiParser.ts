import * as nifti from 'nifti-reader-js';
import type { VolumeData } from '../types';

function toTypedArray(
  imageBuffer: ArrayBuffer,
  datatypeCode: number
): Float64Array | Float32Array | Int32Array | Uint32Array | Int16Array | Uint16Array | Int8Array | Uint8Array {
  switch (datatypeCode) {
    case nifti.NIFTI1.TYPE_UINT8:
      return new Uint8Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT8:
      return new Int8Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT16:
      return new Int16Array(imageBuffer);
    case nifti.NIFTI1.TYPE_UINT16:
      return new Uint16Array(imageBuffer);
    case nifti.NIFTI1.TYPE_INT32:
      return new Int32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_UINT32:
      return new Uint32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_FLOAT32:
      return new Float32Array(imageBuffer);
    case nifti.NIFTI1.TYPE_FLOAT64:
      return new Float64Array(imageBuffer);
    default:
      throw new Error(`Unsupported NIfTI datatype code: ${datatypeCode}`);
  }
}

export async function parseNifti(file: File): Promise<VolumeData> {
  let buffer = await file.arrayBuffer();

  if (nifti.isCompressed(buffer)) {
    buffer = nifti.decompress(buffer);
  }

  if (!nifti.isNIFTI(buffer)) {
    throw new Error('File is not a valid NIfTI image');
  }

  const header = nifti.readHeader(buffer);
  if (!header) {
    throw new Error('Could not read NIfTI header');
  }

  const imageBuffer = nifti.readImage(header, buffer);
  const raw = toTypedArray(imageBuffer, header.datatypeCode);

  const dimX = header.dims[1] || 1;
  const dimY = header.dims[2] || 1;
  const dimZ = header.dims[3] || 1;
  const total = dimX * dimY * dimZ;

  // NIfTI voxel data is stored in column-major (Fortran) order: the fastest
  // varying index is x, i.e. raw[x + y*dimX + z*dimX*dimY]. That already
  // matches our target C-order layout (index = z*dimX*dimY + y*dimX + x)
  // since both traverse x fastest, y next, z slowest — so a direct copy
  // preserves voxel positions correctly.
  const data = new Float32Array(total);
  let dataMin = Infinity;
  let dataMax = -Infinity;
  for (let i = 0; i < total; i++) {
    const v = raw[i];
    data[i] = v;
    if (v < dataMin) dataMin = v;
    if (v > dataMax) dataMax = v;
  }

  return {
    format: 'nifti',
    fileName: file.name,
    dims: [dimX, dimY, dimZ],
    data,
    dataMin,
    dataMax,
    is3D: dimZ > 1,
  };
}
