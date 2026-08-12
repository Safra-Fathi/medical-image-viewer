import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { FileFormat } from '../types';

interface AnalyticsState {
  totalSessions: number;
  lastLoginAt: number | null;
  filesLoaded: number;
  formatCounts: Record<FileFormat, number>;
  masksLoaded: number;
  sliceNavigations: number;
  zoomInteractions: number;
  firstUsedAt: number | null;

  recordLogin: () => void;
  recordFileLoad: (format: FileFormat, kind: 'image' | 'mask') => void;
  recordSliceChange: () => void;
  recordZoom: () => void;
  resetStats: () => void;
}

const emptyFormatCounts: Record<FileFormat, number> = {
  nifti: 0,
  npy: 0,
  dicom: 0,
  image: 0,
  unknown: 0,
};

export const useAnalyticsStore = create<AnalyticsState>()(
  persist(
    (set) => ({
      totalSessions: 0,
      lastLoginAt: null,
      filesLoaded: 0,
      formatCounts: { ...emptyFormatCounts },
      masksLoaded: 0,
      sliceNavigations: 0,
      zoomInteractions: 0,
      firstUsedAt: null,

      recordLogin: () =>
        set((s) => ({
          totalSessions: s.totalSessions + 1,
          lastLoginAt: Date.now(),
          firstUsedAt: s.firstUsedAt ?? Date.now(),
        })),

      recordFileLoad: (format, kind) =>
        set((s) => ({
          filesLoaded: s.filesLoaded + 1,
          formatCounts: { ...s.formatCounts, [format]: (s.formatCounts[format] ?? 0) + 1 },
          masksLoaded: kind === 'mask' ? s.masksLoaded + 1 : s.masksLoaded,
        })),

      recordSliceChange: () => set((s) => ({ sliceNavigations: s.sliceNavigations + 1 })),
      recordZoom: () => set((s) => ({ zoomInteractions: s.zoomInteractions + 1 })),

      resetStats: () =>
        set({
          totalSessions: 0,
          lastLoginAt: null,
          filesLoaded: 0,
          formatCounts: { ...emptyFormatCounts },
          masksLoaded: 0,
          sliceNavigations: 0,
          zoomInteractions: 0,
          firstUsedAt: null,
        }),
    }),
    { name: 'mv-analytics' }
  )
);
