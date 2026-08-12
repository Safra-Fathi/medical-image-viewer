
import { useMeasurementStore } from "../store/measurementStore";
import type { ViewPlane } from "../types";
import "./MeasurementOverlay.css";

interface Props {
  plane: ViewPlane;
  zoom: number;
  pan: {
    x: number;
    y: number;
  };
}

export default function MeasurementOverlay({
  plane,
  zoom,
  pan,
}: Props) {

  const measurements = useMeasurementStore(
    (s) => s.measurements
  );

  const current = measurements.filter(
    (m) => m.plane === plane
  );

  return (
    <svg
      className="measurement-overlay"
      style={{
        position: "absolute",
        inset: 0,
        overflow: "visible",
        pointerEvents: "none",
        transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
        transformOrigin: "top left",
      }}
    >
      {current.map((m) => {

        const mx = (m.start.x + m.end.x) / 2;
        const my = (m.start.y + m.end.y) / 2;

        return (
          <g key={m.id}>

            <line
              x1={m.start.x}
              y1={m.start.y}
              x2={m.end.x}
              y2={m.end.y}
              stroke="#00e5ff"
              strokeWidth={2 / zoom}
            />

            <circle
              cx={m.start.x}
              cy={m.start.y}
              r={4 / zoom}
              fill="#00e5ff"
            />

            <circle
              cx={m.end.x}
              cy={m.end.y}
              r={4 / zoom}
              fill="#00e5ff"
            />

            <rect
              x={mx - 28 / zoom}
              y={my - 14 / zoom}
              width={56 / zoom}
              height={18 / zoom}
              rx={4 / zoom}
              fill="black"
              opacity={0.75}
            />

            <text
              x={mx}
              y={my}
              fill="white"
              textAnchor="middle"
              dominantBaseline="middle"
              fontSize={11 / zoom}
            >
              {m.distance.toFixed(1)} px
            </text>

          </g>
        );

      })}
    </svg>
  );
}