import axios from 'axios';

import { useAuthStore } from '../store/authStore';

const API_URL = 'http://127.0.0.1:8000';

export interface SegmentationResult {
  success: boolean;

  mask: string;

  tumor_pixels: number;
  tumor_percentage: number;

  threshold: number;

  model_name: string;
  model_version: string;

  processing_time_ms: number;

  message: string;

  analysis_id: number;
  study_id: number | null;
}

export interface ExplanationResult {
  success: boolean;

  provider: 'ollama' | 'groq';

  model: string;

  explanation: string;

  disclaimer: string;
}


// ============================================================
// AUTH TOKEN
// ============================================================

function getAuthToken(): string {
  const token =
    useAuthStore.getState().token;

  if (!token) {
    throw new Error(
      'Authentication is required to run AI analysis.'
    );
  }

  return token;
}


// ============================================================
// SEGMENT IMAGE
// ============================================================

export async function segmentImage(
  file: File
): Promise<SegmentationResult> {

  const token = getAuthToken();

  const formData = new FormData();

  formData.append(
    'file',
    file
  );

  const response =
    await axios.post<SegmentationResult>(
      `${API_URL}/api/segment`,
      formData,
      {
        headers: {
          Authorization:
            `Bearer ${token}`,
        },
      }
    );

  return response.data;
}


// ============================================================
// EXPLAIN ANALYSIS
// ============================================================

export async function explainAnalysis(
  analysisId: number,
  provider: 'ollama' | 'groq' = 'ollama',
  style:
    | 'technical'
    | 'simple'
    | 'report' = 'technical'
): Promise<ExplanationResult> {

  const token = getAuthToken();

  const response =
    await axios.post<ExplanationResult>(
      `${API_URL}/api/explain`,
      {
        analysis_id:
          analysisId,

        provider,

        style,
      },
      {
        headers: {
          Authorization:
            `Bearer ${token}`,

          'Content-Type':
            'application/json',
        },
      }
    );

  return response.data;
}