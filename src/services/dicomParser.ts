import dicomParser from 'dicom-parser';
import type { VolumeData } from '../types';

export async function parseDicom(file: File): Promise<VolumeData> {
  const buffer = await file.arrayBuffer();
  const byteArray = new Uint8Array(buffer);

  const dataSet = dicomParser.parseDicom(byteArray);

  const rows = dataSet.uint16('x00280010');
  const columns = dataSet.uint16('x00280011');
  const bitsAllocated = dataSet.uint16('x00280100') ?? 16;
  const pixelRepresentation = dataSet.uint16('x00280103') ?? 0; // 0 = unsigned
  const rescaleSlope = dataSet.floatString('x00281053') ?? 1;
  const rescaleIntercept = dataSet.floatString('x00281052') ?? 0;

  if (!rows || !columns) {
    throw new Error('DICOM file is missing Rows/Columns — cannot render');
  }

  const pixelDataElement = dataSet.elements.x7fe00010;
  if (!pixelDataElement) {
    throw new Error('DICOM file has no PixelData element');
  }

  const total = rows * columns;
  const data = new Float32Array(total);
  let dataMin = Infinity;
  let dataMax = -Infinity;

  const readPixel = (i: number): number => {
    if (bitsAllocated === 8) {
      return byteArray[pixelDataElement.dataOffset + i];
    }
    if (pixelRepresentation === 1) {
      return dataSet.int16('x7fe00010', i) ?? 0;
    }
    return dataSet.uint16('x7fe00010', i) ?? 0;
  };

  for (let i = 0; i < total; i++) {
    const raw = readPixel(i);
    const v = raw * rescaleSlope + rescaleIntercept;
    data[i] = v;
    if (v < dataMin) dataMin = v;
    if (v > dataMax) dataMax = v;
  }

  return {
    format: 'dicom',
    fileName: file.name,
    dims: [columns, rows, 1],
    data,
    dataMin,
    dataMax,
    is3D: false,
  };
}
