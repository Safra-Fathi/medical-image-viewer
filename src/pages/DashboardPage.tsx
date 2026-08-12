import { Files, ScanEye, ZoomIn, LogIn, Layers, Clock, RotateCcw } from 'lucide-react';
import { useAnalyticsStore } from '../store/analyticsStore';
import { useAuthStore } from '../store/authStore';
import type { FileFormat } from '../types';
import './DashboardPage.css';

const FORMAT_LABELS: Record<FileFormat, string> = {
  nifti: 'NIfTI (.nii)',
  npy: 'NumPy (.npy)',
  dicom: 'DICOM (.dcm)',
  image: 'Image (.png/.jpg)',
  unknown: 'Unknown',
};

function formatDate(ts: number | null): string {
  if (!ts) return '—';
  return new Date(ts).toLocaleString(undefined, {
    dateStyle: 'medium',
    timeStyle: 'short',
  });
}

export default function DashboardPage() {
  const stats = useAnalyticsStore();
  const user = useAuthStore((s) => s.user);

  const maxFormatCount = Math.max(1, ...Object.values(stats.formatCounts));
  const formatEntries = (Object.entries(stats.formatCounts) as [FileFormat, number][])
    .filter(([, count]) => count > 0)
    .sort((a, b) => b[1] - a[1]);

  return (
    <div className="dashboard">
      <div className="dashboard__intro">
        <div>
          <span className="dashboard__eyebrow">Usage</span>
          <h1>Usage dashboard</h1>
          <p>
            Activity for <strong>{user?.name}</strong> — tracked locally in your browser, no
            server involved.
          </p>
        </div>
        <div className="dashboard__live">
          <span className="dashboard__live-dot" />
          Tracking active
        </div>
      </div>

      <span className="dashboard__section-label">Session activity</span>
      <div className="dashboard__grid">
        <div className="stat-card">
          <div className="stat-card__icon"><LogIn size={16} /></div>
          <div className="stat-card__value">{stats.totalSessions}</div>
          <div className="stat-card__label">Total sessions</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon"><Clock size={16} /></div>
          <div className="stat-card__value stat-card__value--sm">{formatDate(stats.lastLoginAt)}</div>
          <div className="stat-card__label">Last login</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon"><Clock size={16} /></div>
          <div className="stat-card__value stat-card__value--sm">{formatDate(stats.firstUsedAt)}</div>
          <div className="stat-card__label">Tracking since</div>
        </div>
      </div>

      <span className="dashboard__section-label">Viewer usage</span>
      <div className="dashboard__grid">
        <div className="stat-card">
          <div className="stat-card__icon"><Files size={16} /></div>
          <div className="stat-card__value">{stats.filesLoaded}</div>
          <div className="stat-card__label">Files loaded</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon"><Layers size={16} /></div>
          <div className="stat-card__value">{stats.masksLoaded}</div>
          <div className="stat-card__label">Masks loaded</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon"><ScanEye size={16} /></div>
          <div className="stat-card__value">{stats.sliceNavigations}</div>
          <div className="stat-card__label">Slice navigations</div>
        </div>

        <div className="stat-card">
          <div className="stat-card__icon"><ZoomIn size={16} /></div>
          <div className="stat-card__value">{stats.zoomInteractions}</div>
          <div className="stat-card__label">Zoom interactions</div>
        </div>
      </div>

      <div className="dashboard__panel">
        <span className="dashboard__panel-title">Files by format</span>
        {formatEntries.length === 0 ? (
          <div className="dashboard__empty">No files loaded yet — head to the Viewer to get started.</div>
        ) : (
          <div className="dashboard__bars">
            {formatEntries.map(([format, count]) => (
              <div className="dashboard__bar-row" key={format}>
                <span className="dashboard__bar-label">{FORMAT_LABELS[format]}</span>
                <div className="dashboard__bar-track">
                  <div
                    className="dashboard__bar-fill"
                    style={{ width: `${(count / maxFormatCount) * 100}%` }}
                  />
                </div>
                <span className="dashboard__bar-count">{count}</span>
              </div>
            ))}
          </div>
        )}
      </div>

      <div className="dashboard__footer">
        <span>Stats are stored only in this browser and are never sent anywhere.</span>
        <button className="dashboard__reset" onClick={() => stats.resetStats()}>
          <RotateCcw size={12} /> Reset stats
        </button>
      </div>
    </div>
  );
}