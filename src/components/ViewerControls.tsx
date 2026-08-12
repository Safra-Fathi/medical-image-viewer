import {
  ZoomIn,
  ZoomOut,
  RotateCcw,
  Layers,
  Grid2x2,
  Square,
  Move,
  Ruler,
  Camera,
  Maximize2,
} from "lucide-react";

import { useViewerStore } from '../store/viewerStore';
import { useAnalyticsStore } from '../store/analyticsStore';
import { planeMaxIndex } from '../services/sliceExtractor';
import './ViewerControls.css';

export default function ViewerControls() {
  const imageFile = useViewerStore((s) => s.imageFile);
  const maskFile = useViewerStore((s) => s.maskFile);
  const setImageWindowLevel = useViewerStore((s) => s.setImageWindowLevel);
  const setMaskWindowLevel = useViewerStore((s) => s.setMaskWindowLevel);

  const slice = useViewerStore((s) => s.slice);
  const activePlane = useViewerStore((s) => s.activePlane);
  const setSlice = useViewerStore((s) => s.setSlice);

  const mprEnabled = useViewerStore((s) => s.mprEnabled);
  const setMprEnabled = useViewerStore((s) => s.setMprEnabled);

  const zoom = useViewerStore((s) => s.zoom);
  const setZoom = useViewerStore((s) => s.setZoom);
  const resetView = useViewerStore((s) => s.resetView);

  const maskVisible = useViewerStore((s) => s.maskVisible);
  const setMaskVisible = useViewerStore((s) => s.setMaskVisible);
  const maskOpacity = useViewerStore((s) => s.maskOpacity);
  const setMaskOpacity = useViewerStore((s) => s.setMaskOpacity);

  const recordSliceChange = useAnalyticsStore((s) => s.recordSliceChange);
  const recordZoom = useAnalyticsStore((s) => s.recordZoom);

  if (!imageFile) {
    return (
      <div className="controls controls--empty">
        <span>Load an image to begin</span>
      </div>
    );
  }

  const maxIndex = planeMaxIndex(imageFile.volume, activePlane);
  const is3D = imageFile.volume.is3D;

  return (
   <div className="controls">

  {/* Professional Toolbar */}
  <div className="viewer-toolbar">
    <button title="Pan">
      <Move size={16} />
    </button>

    <button title="Measure">
      <Ruler size={16} />
    </button>

    <button title="Screenshot">
      <Camera size={16} />
    </button>

    <button title="Fullscreen">
      <Maximize2 size={16} />
    </button>
  </div>

  {is3D && (
    <section className="controls__section">
      <div className="controls__row controls__row--split">
        <span className="controls__title">Slice — {activePlane}</span>
        <button
          className={`controls__iconbtn ${mprEnabled ? 'controls__iconbtn--on' : ''}`}
          onClick={() => setMprEnabled(!mprEnabled)}
          title="Toggle multi-planar view"
        >
          {mprEnabled ? <Grid2x2 size={14} /> : <Square size={14} />}
          {mprEnabled ? 'MPR' : 'Single'}
        </button>
      </div>
          <input
            type="range"
            min={0}
            max={maxIndex}
            value={slice[activePlane]}
            onChange={(e) => {
              setSlice(activePlane, Number(e.target.value));
              recordSliceChange();
            }}
          />
          <div className="controls__value">
            {slice[activePlane]} / {maxIndex}
          </div>
        </section>
      )}

      <section className="controls__section">
        <div className="controls__row controls__row--split">
          <span className="controls__title">Zoom</span>
          <div className="controls__btngroup">
            <button
              onClick={() => {
                setZoom(zoom - 0.15);
                recordZoom();
              }}
              title="Zoom out"
            >
              <ZoomOut size={14} />
            </button>
            <span className="controls__zoomval">{Math.round(zoom * 100)}%</span>
            <button
              onClick={() => {
                setZoom(zoom + 0.15);
                recordZoom();
              }}
              title="Zoom in"
            >
              <ZoomIn size={14} />
            </button>
            <button onClick={resetView} title="Reset view">
              <RotateCcw size={14} />
            </button>
          </div>
        </div>
      </section>

      <section className="controls__section">
        <span className="controls__title">Image window / level</span>
        <label className="controls__label">
          Level (center)
          <input
            type="range"
            min={imageFile.volume.dataMin}
            max={imageFile.volume.dataMax}
            step={(imageFile.volume.dataMax - imageFile.volume.dataMin) / 500 || 1}
            value={imageFile.windowLevel.center}
            onChange={(e) =>
              setImageWindowLevel({ ...imageFile.windowLevel, center: Number(e.target.value) })
            }
          />
        </label>
        <label className="controls__label">
          Width
          <input
            type="range"
            min={1}
            max={(imageFile.volume.dataMax - imageFile.volume.dataMin) * 2 || 1}
            step={(imageFile.volume.dataMax - imageFile.volume.dataMin) / 500 || 1}
            value={imageFile.windowLevel.width}
            onChange={(e) =>
              setImageWindowLevel({ ...imageFile.windowLevel, width: Number(e.target.value) })
            }
          />
        </label>
      </section>

      {maskFile && (
        <section className="controls__section">
          <div className="controls__row controls__row--split">
            <span className="controls__title">
              <Layers size={12} /> Mask overlay
            </span>
            <button
              className={`controls__iconbtn ${maskVisible ? 'controls__iconbtn--on' : ''}`}
              onClick={() => setMaskVisible(!maskVisible)}
            >
              {maskVisible ? 'Visible' : 'Hidden'}
            </button>
          </div>
          <label className="controls__label">
            Opacity
            <input
              type="range"
              min={0}
              max={1}
              step={0.05}
              value={maskOpacity}
              onChange={(e) => setMaskOpacity(Number(e.target.value))}
            />
          </label>
          <label className="controls__label">
            Mask level
            <input
              type="range"
              min={maskFile.volume.dataMin}
              max={maskFile.volume.dataMax}
              step={(maskFile.volume.dataMax - maskFile.volume.dataMin) / 500 || 1}
              value={maskFile.windowLevel.center}
              onChange={(e) =>
                setMaskWindowLevel({ ...maskFile.windowLevel, center: Number(e.target.value) })
              }
            />
          </label>
        </section>
      )}
    </div>
  );
}
