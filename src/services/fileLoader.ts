import type {
  FileFormat,
  LoadedFile,
  VolumeData,
} from '../types';

import { parseNifti } from './niftiParser';
import { parseNpy } from './npyParser';
import { parseDicom } from './dicomParser';
import { parseStandardImage } from './imageParser';
import { parseTiff } from './tiffParser';

export function detectFormat(
  fileName: string
): FileFormat {
  const lower =
    fileName.toLowerCase();

  if (
    lower.endsWith('.nii') ||
    lower.endsWith('.nii.gz')
  ) {
    return 'nifti';
  }

  if (lower.endsWith('.npy')) {
    return 'npy';
  }

  if (
    lower.endsWith('.dcm') ||
    lower.endsWith('.dicom')
  ) {
    return 'dicom';
  }

  if (
    lower.endsWith('.tif') ||
    lower.endsWith('.tiff')
  ) {
    return 'tiff';
  }

  if (
    lower.endsWith('.png') ||
    lower.endsWith('.jpg') ||
    lower.endsWith('.jpeg')
  ) {
    return 'image';
  }

  return 'unknown';
}

function defaultWindowLevel(
  volume: VolumeData
) {
  const range =
    volume.dataMax -
    volume.dataMin;

  return {
    center:
      volume.dataMin +
      range / 2,

    width:
      range > 0 ? range : 1,
  };
}

export async function loadFile(
  file: File
): Promise<LoadedFile> {
  const format =
    detectFormat(file.name);

  let volume: VolumeData;

  switch (format) {
    case 'nifti':
      volume =
        await parseNifti(file);
      break;

    case 'npy':
      volume =
        await parseNpy(file);
      break;

    case 'dicom':
      volume =
        await parseDicom(file);
      break;

    case 'tiff':
      volume =
        await parseTiff(file);
      break;

    case 'image':
      volume =
        await parseStandardImage(file);
      break;

    default:
      throw new Error(
        `Unsupported file type for "${file.name}". Supported: .nii, .nii.gz, .npy, .dcm, .dicom, .tif, .tiff, .png, .jpg, .jpeg`
      );
  }

  return {
    volume,

    windowLevel:
      defaultWindowLevel(volume),
  };
}