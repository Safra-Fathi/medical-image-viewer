
import { create } from 'zustand';
import type { LoadedFile, ViewPlane, WindowLevel } from '../types';

interface SliceState {
  axial: number;
  sagittal: number;
  coronal: number;
}

interface ViewerState {
  imageFile: LoadedFile | null;
  maskFile: LoadedFile | null;

  // Original browser File used for AI analysis
  originalImageFile: File | null;

  slice: SliceState;
  activePlane: ViewPlane;
  mprEnabled: boolean;

  zoom: number;
  pan: { x: number; y: number };

  maskVisible: boolean;
  maskOpacity: number;

  isLoading: boolean;
  error: string | null;

  setImageFile: (f: LoadedFile | null) => void;
  setMaskFile: (f: LoadedFile | null) => void;
  setOriginalImageFile: (file: File | null) => void;

  initSlicesForVolume: (dims: [number, number, number]) => void;
  setSlice: (plane: ViewPlane, value: number) => void;
  setActivePlane: (p: ViewPlane) => void;
  setMprEnabled: (v: boolean) => void;

  setZoom: (z: number) => void;
  setPan: (p: { x: number; y: number }) => void;

  setImageWindowLevel: (wl: WindowLevel) => void;
  setMaskWindowLevel: (wl: WindowLevel) => void;

  setMaskVisible: (v: boolean) => void;
  setMaskOpacity: (v: number) => void;

  setLoading: (v: boolean) => void;
  setError: (e: string | null) => void;

  resetView: () => void;
  clearAll: () => void;
}

export const useViewerStore = create<ViewerState>((set) => ({
  imageFile: null,
  maskFile: null,

  // Original uploaded browser file
  originalImageFile: null,

  slice: {
    axial: 0,
    sagittal: 0,
    coronal: 0,
  },

  activePlane: 'axial',
  mprEnabled: false,

  zoom: 1,
  pan: {
    x: 0,
    y: 0,
  },

  maskVisible: true,
  maskOpacity: 0.5,

  isLoading: false,
  error: null,

  setImageFile: (f) =>
    set({
      imageFile: f,
    }),

  setMaskFile: (f) =>
    set({
      maskFile: f,
    }),

  setOriginalImageFile: (file) =>
    set({
      originalImageFile: file,
    }),

  initSlicesForVolume: (dims) =>
    set({
      slice: {
        axial: Math.floor((dims[2] - 1) / 2),
        sagittal: Math.floor((dims[0] - 1) / 2),
        coronal: Math.floor((dims[1] - 1) / 2),
      },
    }),

  setSlice: (plane, value) =>
    set((state) => ({
      slice: {
        ...state.slice,
        [plane]: value,
      },
    })),

  setActivePlane: (p) =>
    set({
      activePlane: p,
    }),

  setMprEnabled: (v) =>
    set({
      mprEnabled: v,
    }),

  setZoom: (z) =>
    set({
      zoom: Math.min(Math.max(z, 0.2), 10),
    }),

  setPan: (p) =>
    set({
      pan: p,
    }),

  setImageWindowLevel: (wl) =>
    set((state) =>
      state.imageFile
        ? {
            imageFile: {
              ...state.imageFile,
              windowLevel: wl,
            },
          }
        : {}
    ),

  setMaskWindowLevel: (wl) =>
    set((state) =>
      state.maskFile
        ? {
            maskFile: {
              ...state.maskFile,
              windowLevel: wl,
            },
          }
        : {}
    ),

  setMaskVisible: (v) =>
    set({
      maskVisible: v,
    }),

  setMaskOpacity: (v) =>
    set({
      maskOpacity: v,
    }),

  setLoading: (v) =>
    set({
      isLoading: v,
    }),

  setError: (e) =>
    set({
      error: e,
    }),

  resetView: () =>
    set({
      zoom: 1,
      pan: {
        x: 0,
        y: 0,
      },
    }),

  clearAll: () =>
    set({
      imageFile: null,
      maskFile: null,
      originalImageFile: null,

      slice: {
        axial: 0,
        sagittal: 0,
        coronal: 0,
      },

      zoom: 1,

      pan: {
        x: 0,
        y: 0,
      },

      error: null,
    }),
}));

