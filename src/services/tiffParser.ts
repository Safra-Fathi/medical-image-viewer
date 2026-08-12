import type { VolumeData } from '../types';
import * as UTIF from 'utif';

export async function parseTiff(
  file: File
): Promise<VolumeData> {
  const buffer = await file.arrayBuffer();

  const ifds = UTIF.decode(buffer);

  if (!ifds || ifds.length === 0) {
    throw new Error(
      `Could not decode TIFF file "${file.name}".`
    );
  }

  /*
   * TIFF files can contain multiple pages.
   *
   * For the current viewer we treat the TIFF pages
   * as slices of a 3D volume.
   */

  const firstPage = ifds[0];

  const width =
    firstPage.t256?.[0] ?? 0;

  const height =
    firstPage.t257?.[0] ?? 0;

  if (width <= 0 || height <= 0) {
    throw new Error(
      `Invalid TIFF dimensions for "${file.name}".`
    );
  }

  const pageCount = ifds.length;

  const volumeSize =
    width * height * pageCount;

  const data =
    new Float32Array(volumeSize);

  let globalMin = Infinity;
  let globalMax = -Infinity;

  for (
    let z = 0;
    z < pageCount;
    z++
  ) {
    const page = ifds[z];

    UTIF.decodeImage(
      buffer,
      page
    );

    const rgba =
      UTIF.toRGBA8(page);

    const sliceOffset =
      z * width * height;

    /*
     * Convert RGBA pixels to grayscale.
     *
     * MRI TIFF images are normally grayscale,
     * but converting RGB/RGBA to luminance also
     * allows ordinary TIFF images to load.
     */

    for (
      let i = 0;
      i < width * height;
      i++
    ) {
      const r =
        rgba[i * 4];

      const g =
        rgba[i * 4 + 1];

      const b =
        rgba[i * 4 + 2];

      const gray =
        0.299 * r +
        0.587 * g +
        0.114 * b;

      data[
        sliceOffset + i
      ] = gray;

      if (gray < globalMin) {
        globalMin = gray;
      }

      if (gray > globalMax) {
        globalMax = gray;
      }
    }
  }

  if (!Number.isFinite(globalMin)) {
    globalMin = 0;
  }

  if (!Number.isFinite(globalMax)) {
    globalMax = 0;
  }

  return {
    format: 'tiff',

    fileName: file.name,

    dims: [
      width,
      height,
      pageCount,
    ],

    data,

    dataMin: globalMin,

    dataMax: globalMax,

    is3D: pageCount > 1,
  };
}