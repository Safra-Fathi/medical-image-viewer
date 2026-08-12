import { create } from 'zustand';

export interface Point {
  x: number;
  y: number;
}

export interface DistanceMeasurement {
  id: string;
  plane: 'axial' | 'sagittal' | 'coronal';
  start: Point;
  end: Point;
  distance: number;
}

export type ToolType =
  | 'pan'
  | 'distance'
  | 'angle'
  | 'annotation';

interface MeasurementState {
  activeTool: ToolType;

  measurements: DistanceMeasurement[];

  drawingStart: Point | null;

  setActiveTool: (tool: ToolType) => void;

  startMeasurement: (point: Point) => void;

  finishMeasurement: (
    plane: 'axial' | 'sagittal' | 'coronal',
    end: Point
  ) => void;

  clearDrawing: () => void;

  removeMeasurement: (id: string) => void;

  clearMeasurements: () => void;
}

export const useMeasurementStore = create<MeasurementState>((set, get) => ({

  activeTool: 'pan',

  measurements: [],

  drawingStart: null,

  setActiveTool: (tool) =>
    set({
      activeTool: tool,
      drawingStart: null,
    }),

  startMeasurement: (point) =>
    set({
      drawingStart: point,
    }),

  finishMeasurement: (plane, end) => {

    const start = get().drawingStart;

    if (!start) return;

    const dx = end.x - start.x;
    const dy = end.y - start.y;

    const distance = Math.sqrt(dx * dx + dy * dy);

    const measurement: DistanceMeasurement = {
      id: crypto.randomUUID(),
      plane,
      start,
      end,
      distance,
    };

    set((state) => ({
      measurements: [...state.measurements, measurement],
      drawingStart: null,
    }));
  },

  clearDrawing: () =>
    set({
      drawingStart: null,
    }),

  removeMeasurement: (id) =>
    set((state) => ({
      measurements: state.measurements.filter(
        (m) => m.id !== id
      ),
    })),

  clearMeasurements: () =>
    set({
      measurements: [],
    }),

}));