import axios from 'axios';

const API_URL = 'http://127.0.0.1:8000';

export interface SegmentationResult {
  success: boolean;
  mask: string;
  tumor_pixels: number;
  tumor_percentage: number;
  threshold: number;
  message: string;
}

export async function segmentImage(
  file: File
): Promise<SegmentationResult> {
  const formData = new FormData();

  formData.append('file', file);

  const response =
    await axios.post<SegmentationResult>(
      `${API_URL}/api/segment`,
      formData,
      {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      }
    );

  return response.data;
}