import type { VolumeData } from '../types';

export async function parseStandardImage(file: File): Promise<VolumeData> {
  const url = URL.createObjectURL(file);
  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const el = new Image();
      el.onload = () => resolve(el);
      el.onerror = () => reject(new Error('Could not decode image file'));
      el.src = url;
    });

    const canvas = document.createElement('canvas');
    canvas.width = img.width;
    canvas.height = img.height;
    const ctx = canvas.getContext('2d');
    if (!ctx) throw new Error('Canvas 2D context unavailable');
    ctx.drawImage(img, 0, 0);
    const { data: rgba } = ctx.getImageData(0, 0, img.width, img.height);

    const total = img.width * img.height;
    const data = new Float32Array(total);
    let dataMin = Infinity;
    let dataMax = -Infinity;

    for (let i = 0; i < total; i++) {
      const r = rgba[i * 4];
      const g = rgba[i * 4 + 1];
      const b = rgba[i * 4 + 2];
      // Standard luminance weighting
      const v = 0.299 * r + 0.587 * g + 0.114 * b;
      data[i] = v;
      if (v < dataMin) dataMin = v;
      if (v > dataMax) dataMax = v;
    }

    return {
      format: 'image',
      fileName: file.name,
      dims: [img.width, img.height, 1],
      data,
      dataMin,
      dataMax,
      is3D: false,
    };
  } finally {
    URL.revokeObjectURL(url);
  }
}
