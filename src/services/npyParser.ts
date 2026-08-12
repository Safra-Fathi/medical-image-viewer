import type { VolumeData } from '../types';

interface NpyHeader {
  descr: string;
  fortranOrder: boolean;
  shape: number[];
}

function parseHeaderDict(headerStr: string): NpyHeader {
  const descrMatch = headerStr.match(/'descr'\s*:\s*'([^']+)'/);
  const fortranMatch = headerStr.match(/'fortran_order'\s*:\s*(True|False)/);
  const shapeMatch = headerStr.match(/'shape'\s*:\s*\(([^)]*)\)/);

  if (!descrMatch || !shapeMatch) {
    throw new Error('Invalid .npy header: could not locate descr/shape');
  }

  const shape = shapeMatch[1]
    .split(',')
    .map((s) => s.trim())
    .filter((s) => s.length > 0)
    .map((s) => parseInt(s, 10));

  return {
    descr: descrMatch[1],
    fortranOrder: fortranMatch ? fortranMatch[1] === 'True' : false,
    shape,
  };
}

function readTypedArray(
  buffer: ArrayBuffer,
  byteOffset: number,
  descr: string,
  count: number
): Float64Array | Float32Array | Int32Array | Uint8Array | Int16Array | Uint16Array {
  const littleEndian = descr[0] !== '>';
  const typeChar = descr.replace(/^[<>|=]/, '');

  // For multi-byte types with explicit endianness we may need a manual read.
  const needsSwap = descr[0] === '>' && typeChar !== '|u1' && typeChar !== 'u1';

  switch (typeChar) {
    case 'f8': {
      if (!needsSwap) return new Float64Array(buffer, byteOffset, count);
      const out = new Float64Array(count);
      const view = new DataView(buffer, byteOffset);
      for (let i = 0; i < count; i++) out[i] = view.getFloat64(i * 8, littleEndian);
      return out;
    }
    case 'f4': {
      if (!needsSwap) return new Float32Array(buffer, byteOffset, count);
      const out = new Float32Array(count);
      const view = new DataView(buffer, byteOffset);
      for (let i = 0; i < count; i++) out[i] = view.getFloat32(i * 4, littleEndian);
      return out;
    }
    case 'i4': {
      if (!needsSwap) return new Int32Array(buffer, byteOffset, count);
      const out = new Int32Array(count);
      const view = new DataView(buffer, byteOffset);
      for (let i = 0; i < count; i++) out[i] = view.getInt32(i * 4, littleEndian);
      return out;
    }
    case 'i2': {
      if (!needsSwap) return new Int16Array(buffer, byteOffset, count);
      const out = new Int16Array(count);
      const view = new DataView(buffer, byteOffset);
      for (let i = 0; i < count; i++) out[i] = view.getInt16(i * 2, littleEndian);
      return out;
    }
    case 'u2': {
      if (!needsSwap) return new Uint16Array(buffer, byteOffset, count);
      const out = new Uint16Array(count);
      const view = new DataView(buffer, byteOffset);
      for (let i = 0; i < count; i++) out[i] = view.getUint16(i * 2, littleEndian);
      return out;
    }
    case 'u1':
    case 'b1':
      return new Uint8Array(buffer, byteOffset, count);
    default:
      throw new Error(`Unsupported .npy dtype: ${descr}`);
  }
}

export async function parseNpy(file: File): Promise<VolumeData> {
  const buffer = await file.arrayBuffer();
  const view = new DataView(buffer);

  const magic = new Uint8Array(buffer, 0, 6);
  const magicStr = String.fromCharCode(...magic);
  if (magicStr !== '\x93NUMPY') {
    throw new Error('Not a valid .npy file (bad magic number)');
  }

  const majorVersion = view.getUint8(6);
  let headerLen: number;
  let headerOffset: number;

  if (majorVersion === 1) {
    headerLen = view.getUint16(8, true);
    headerOffset = 10;
  } else {
    headerLen = view.getUint32(8, true);
    headerOffset = 12;
  }

  const headerBytes = new Uint8Array(buffer, headerOffset, headerLen);
  const headerStr = new TextDecoder('ascii').decode(headerBytes);
  const header = parseHeaderDict(headerStr);
  const dataOffset = headerOffset + headerLen;

  const shape = header.shape.length > 0 ? header.shape : [1];
  const total = shape.reduce((a, b) => a * b, 1);

  const raw = readTypedArray(buffer, dataOffset, header.descr, total);

  // Normalize shape to [x, y, z]. Numpy default (C order) shape is
  // (..., rows, cols) i.e. (z, y, x) for a 3D volume, (y, x) for 2D.
  let dimX: number, dimY: number, dimZ: number;
  if (shape.length >= 3) {
    dimZ = shape[0];
    dimY = shape[1];
    dimX = shape[2];
  } else if (shape.length === 2) {
    dimZ = 1;
    dimY = shape[0];
    dimX = shape[1];
  } else {
    dimZ = 1;
    dimY = 1;
    dimX = shape[0];
  }

  const data = new Float32Array(total);
  let dataMin = Infinity;
  let dataMax = -Infinity;

  // raw is already in C order (z, y, x) matching our target layout directly
  // when fortran_order is false. If fortran_order is true, we need to
  // transpose from column-major.
  if (!header.fortranOrder) {
    for (let i = 0; i < total; i++) {
      const v = raw[i];
      data[i] = v;
      if (v < dataMin) dataMin = v;
      if (v > dataMax) dataMax = v;
    }
  } else {
    // Fortran order: raw index for (x,y,z) is x + y*dimX + z*dimX*dimY
    // reversed relative to shape traversal; remap into C-order target.
    let idx = 0;
    for (let z = 0; z < dimZ; z++) {
      for (let y = 0; y < dimY; y++) {
        for (let x = 0; x < dimX; x++) {
          const srcIdx = x + y * dimX + z * dimX * dimY;
          const v = raw[srcIdx];
          data[idx++] = v;
          if (v < dataMin) dataMin = v;
          if (v > dataMax) dataMax = v;
        }
      }
    }
  }

  return {
    format: 'npy',
    fileName: file.name,
    dims: [dimX, dimY, dimZ],
    data,
    dataMin,
    dataMax,
    is3D: dimZ > 1,
  };
}
