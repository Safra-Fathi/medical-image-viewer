import { useCallback, useRef, useState } from 'react';
import {
  UploadCloud,
  FileImage,
  X,
} from 'lucide-react';

import { loadFile } from '../services/fileLoader';
import { useViewerStore } from '../store/viewerStore';
import { useAnalyticsStore } from '../store/analyticsStore';

import './FileUpload.css';

interface FileUploadProps {
  slot: 'image';
  label: string;
  accentLabel: string;
}

export default function FileUpload({
  slot,
  label,
  accentLabel,
}: FileUploadProps) {
  const [isDragging, setIsDragging] =
    useState(false);

  const inputRef =
    useRef<HTMLInputElement>(null);

  // ==========================================
  // VIEWER STORE
  // ==========================================

  const imageFile = useViewerStore(
    (s) => s.imageFile
  );

  const maskFile = useViewerStore(
    (s) => s.maskFile
  );

  const setImageFile = useViewerStore(
    (s) => s.setImageFile
  );

  const setMaskFile = useViewerStore(
    (s) => s.setMaskFile
  );

  // IMPORTANT:
  // Save the original browser File for AI analysis
  const setOriginalImageFile =
    useViewerStore(
      (s) => s.setOriginalImageFile
    );

  const initSlicesForVolume =
    useViewerStore(
      (s) => s.initSlicesForVolume
    );

  const setLoading = useViewerStore(
    (s) => s.setLoading
  );

  const setError = useViewerStore(
    (s) => s.setError
  );

  // ==========================================
  // ANALYTICS
  // ==========================================

  const recordFileLoad =
    useAnalyticsStore(
      (s) => s.recordFileLoad
    );

  const loaded =
    slot === 'image'
      ? imageFile
      : maskFile;

  // ==========================================
  // HANDLE FILE
  // ==========================================

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setLoading(true);

      try {
        console.log(
          'Loading file:',
          file.name
        );

        // ======================================
        // SAVE ORIGINAL FILE
        // ======================================

        if (slot === 'image') {
          setOriginalImageFile(file);
        }

        // ======================================
        // PARSE FILE FOR VIEWER
        // ======================================

        const result =
          await loadFile(file);

        // ======================================
        // STORE PARSED FILE
        // ======================================

        if (slot === 'image') {
          setImageFile(result);

          initSlicesForVolume(
            result.volume.dims
          );
        } else {
          setMaskFile(result);
        }

        // ======================================
        // ANALYTICS
        // ======================================

        recordFileLoad(
          result.volume.format,
          slot
        );

        console.log(
          'File loaded successfully:',
          result.volume
        );
      } catch (err) {
        console.error(
          'Failed to load file:',
          err
        );

        // If parsing fails, don't leave the
        // original file available for AI.
        if (slot === 'image') {
          setOriginalImageFile(null);
        }

        setError(
          err instanceof Error
            ? err.message
            : 'Failed to load file'
        );
      } finally {
        setLoading(false);
      }
    },
    [
      slot,
      setImageFile,
      setMaskFile,
      setOriginalImageFile,
      initSlicesForVolume,
      setLoading,
      setError,
      recordFileLoad,
    ]
  );

  // ==========================================
  // DRAG & DROP
  // ==========================================

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();

      setIsDragging(false);

      const file =
        e.dataTransfer.files?.[0];

      if (file) {
        handleFile(file);
      }
    },
    [handleFile]
  );

  // ==========================================
  // FILE SELECT
  // ==========================================

  const onSelect = useCallback(
    (
      e: React.ChangeEvent<HTMLInputElement>
    ) => {
      const file =
        e.target.files?.[0];

      if (file) {
        handleFile(file);
      }

      // Allows selecting the same file again
      e.target.value = '';
    },
    [handleFile]
  );

  // ==========================================
  // CLEAR FILE
  // ==========================================

  const clear = useCallback(
    (e: React.MouseEvent) => {
      e.stopPropagation();

      if (slot === 'image') {
        setImageFile(null);

        // Also remove original file used
        // by the AI service
        setOriginalImageFile(null);
      } else {
        setMaskFile(null);
      }
    },
    [
      slot,
      setImageFile,
      setMaskFile,
      setOriginalImageFile,
    ]
  );

  // ==========================================
  // UI
  // ==========================================

  return (
    <div
      className={`file-drop file-drop--${slot} ${
        isDragging
          ? 'file-drop--dragging'
          : ''
      } ${
        loaded
          ? 'file-drop--loaded'
          : ''
      }`}
      onDragOver={(e) => {
        e.preventDefault();
        setIsDragging(true);
      }}
      onDragLeave={() =>
        setIsDragging(false)
      }
      onDrop={onDrop}
      onClick={() =>
        inputRef.current?.click()
      }
      role="button"
      tabIndex={0}
    >

      {/* ======================================
          FILE INPUT
      ====================================== */}

      <input
        ref={inputRef}
        type="file"
        accept=".nii,.nii.gz,.gz,.npy,.dcm,.dicom,.tif,.tiff,.png,.jpg,.jpeg"
        onChange={onSelect}
        hidden
      />

      {/* ======================================
          BADGE
      ====================================== */}

      <span className="file-drop__badge">
        {accentLabel}
      </span>

      {/* ======================================
          LOADED FILE
      ====================================== */}

      {loaded ? (
        <>
          <FileImage
            size={22}
            strokeWidth={1.5}
          />

          <div className="file-drop__meta">

            <span className="file-drop__name">
              {loaded.volume.fileName}
            </span>

            <span className="file-drop__dims">
              {loaded.volume.dims.join(
                ' × '
              )}{' '}
              ·{' '}
              {loaded.volume.format.toUpperCase()}
            </span>

          </div>

          <button
            type="button"
            className="file-drop__clear"
            onClick={clear}
            aria-label={`Remove ${label}`}
          >
            <X size={14} />
          </button>
        </>
      ) : (
        <>
          <UploadCloud
            size={22}
            strokeWidth={1.5}
          />

          <div className="file-drop__meta">

            <span className="file-drop__name">
              {label}
            </span>

            <span className="file-drop__dims">
              Drop file or click to browse
            </span>

          </div>
        </>
      )}

    </div>
  );
}