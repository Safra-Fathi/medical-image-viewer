import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';

import FileUpload from '../components/FileUpload';
import Renderer2D from '../components/Renderer2D';
import ViewerControls from '../components/ViewerControls';

import { useViewerStore } from '../store/viewerStore';
import { checkBackendHealth } from '../services/api';
import { segmentImage } from '../services/aiService';

import './ViewerPage.css';

interface AIResult {
  mask: string;
  tumorPixels: number;
  tumorPercentage: number;
  threshold: number;
  message: string;
}

export default function ViewerPage() {
  // ==========================================
  // VIEWER STORE
  // ==========================================

  const imageFile = useViewerStore((s) => s.imageFile);
  const originalImageFile = useViewerStore(
    (s) => s.originalImageFile
  );
  const mprEnabled = useViewerStore((s) => s.mprEnabled);
  const slice = useViewerStore((s) => s.slice);
  const isLoading = useViewerStore((s) => s.isLoading);
  const error = useViewerStore((s) => s.error);

  const showMpr =
    mprEnabled && imageFile?.volume.is3D;

  // ==========================================
  // BACKEND STATUS
  // ==========================================

  const [backendStatus, setBackendStatus] = useState<
    'checking' | 'connected' | 'failed'
  >('checking');

  // ==========================================
  // AI STATE
  // ==========================================

  const [aiLoading, setAiLoading] =
    useState(false);

  const [aiResult, setAiResult] =
    useState<AIResult | null>(null);

  const [aiError, setAiError] =
    useState<string | null>(null);

  // ==========================================
  // CHECK BACKEND
  // ==========================================

  useEffect(() => {
    checkBackendHealth()
      .then((data) => {
        console.log('Backend connected:', data);

        setBackendStatus('connected');
      })
      .catch((error) => {
        console.error(
          'Backend connection failed:',
          error
        );

        setBackendStatus('failed');
      });
  }, []);

  // ==========================================
  // AI SEGMENTATION
  // ==========================================

  const handleAIAnalysis = async () => {
    setAiError(null);
    setAiResult(null);

    if (!originalImageFile) {
      setAiError(
        'The original image file is not available for AI analysis.'
      );

      return;
    }

    try {
      setAiLoading(true);

      console.log(
        'Sending image to AI backend:',
        originalImageFile.name
      );

      const result =
        await segmentImage(originalImageFile);

      console.log(
        'AI segmentation result:',
        result
      );

      setAiResult({
        mask: result.mask,
        tumorPixels: result.tumor_pixels,
        tumorPercentage: result.tumor_percentage,
        threshold: result.threshold,
        message: result.message,
      });
    } catch (error) {
      console.error(
        'AI segmentation failed:',
        error
      );

      setAiError(
        'AI segmentation failed. Please check that the backend is running.'
      );
    } finally {
      setAiLoading(false);
    }
  };

  // ==========================================
  // DOWNLOAD PDF REPORT
  // ==========================================

  const downloadAnalysisReport = () => {
    if (!aiResult) {
      alert(
        'Please run AI segmentation before downloading the report.'
      );

      return;
    }

    const doc = new jsPDF();

    const pageWidth =
      doc.internal.pageSize.getWidth();

    const pageHeight =
      doc.internal.pageSize.getHeight();

    // ========================================
    // HEADER
    // ========================================

    doc.setFontSize(20);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Medical Image Analysis Report',
      pageWidth / 2,
      25,
      {
        align: 'center',
      }
    );

    doc.setFontSize(10);

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      `Generated: ${new Date().toLocaleString()}`,
      pageWidth / 2,
      34,
      {
        align: 'center',
      }
    );

    doc.line(
      20,
      42,
      pageWidth - 20,
      42
    );

    // ========================================
    // IMAGE INFORMATION
    // ========================================

    doc.setFontSize(15);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Image Information',
      20,
      55
    );

    doc.setFontSize(11);

    doc.setFont(
      'helvetica',
      'normal'
    );

    let y = 67;

    doc.text(
      `File: ${
        imageFile?.volume.fileName ??
        originalImageFile?.name ??
        'Unknown'
      }`,
      20,
      y
    );

    y += 9;

    doc.text(
      `Dimensions: ${
        imageFile?.volume.dims?.join(' × ') ??
        'Unknown'
      }`,
      20,
      y
    );

    // ========================================
    // AI ANALYSIS
    // ========================================

    y += 20;

    doc.setFontSize(15);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'AI Analysis',
      20,
      y
    );

    y += 12;

    doc.setFontSize(11);

    doc.setFont(
      'helvetica',
      'normal'
    );

    doc.text(
      'Model: U-Net Brain Tumor Segmentation',
      20,
      y
    );

    y += 9;

    doc.text(
      `Segmentation Threshold: ${aiResult.threshold}`,
      20,
      y
    );

    y += 9;

    doc.text(
      `Tumor Pixels: ${aiResult.tumorPixels.toLocaleString()}`,
      20,
      y
    );

    y += 9;

    doc.text(
      `Tumor Area: ${aiResult.tumorPercentage.toFixed(2)}%`,
      20,
      y
    );

    // ========================================
    // RESULT
    // ========================================

    y += 20;

    doc.setFontSize(15);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Segmentation Result',
      20,
      y
    );

    y += 12;

    doc.setFontSize(12);

    doc.setFont(
      'helvetica',
      'normal'
    );

    const tumorDetected =
      aiResult.tumorPixels > 0;

    doc.text(
      `Tumor Region Detected: ${
        tumorDetected ? 'Yes' : 'No'
      }`,
      20,
      y
    );

    // ========================================
    // SEGMENTATION MASK
    // ========================================

    y += 18;

    doc.setFontSize(15);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'AI Segmentation Mask',
      20,
      y
    );

    try {
      doc.addImage(
        aiResult.mask,
        'PNG',
        20,
        y + 8,
        100,
        100
      );
    } catch (error) {
      console.error(
        'Failed to add segmentation mask to PDF:',
        error
      );
    }

    // ========================================
    // ANALYSIS MESSAGE
    // ========================================

    y += 125;

    doc.setFontSize(13);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Analysis Message',
      20,
      y
    );

    y += 9;

    doc.setFontSize(10);

    doc.setFont(
      'helvetica',
      'normal'
    );

    const message =
      aiResult.message ||
      'Analysis completed successfully.';

    const messageLines =
      doc.splitTextToSize(
        message,
        pageWidth - 40
      );

    doc.text(
      messageLines,
      20,
      y
    );

    // ========================================
    // DISCLAIMER
    // ========================================

    y +=
      messageLines.length * 6 +
      15;

    doc.setFontSize(12);

    doc.setFont(
      'helvetica',
      'bold'
    );

    doc.text(
      'Important Notice',
      20,
      y
    );

    y += 8;

    doc.setFontSize(9);

    doc.setFont(
      'helvetica',
      'normal'
    );

    const disclaimer =
      'This report is generated by an AI-assisted image segmentation system for demonstration and research purposes. It is not a medical diagnosis and should not be used as a substitute for assessment by a qualified healthcare professional.';

    const disclaimerLines =
      doc.splitTextToSize(
        disclaimer,
        pageWidth - 40
      );

    doc.text(
      disclaimerLines,
      20,
      y
    );

    // ========================================
    // FOOTER
    // ========================================

    doc.setFontSize(8);

    doc.text(
      'Medical Image Viewer - AI Analysis',
      pageWidth / 2,
      pageHeight - 12,
      {
        align: 'center',
      }
    );

    // ========================================
    // DOWNLOAD
    // ========================================

    const timestamp =
      new Date()
        .toISOString()
        .replace(/[:.]/g, '-');

    doc.save(
      `medical-analysis-report-${timestamp}.pdf`
    );
  };

  // ==========================================
  // UI
  // ==========================================

  return (
    <div className="viewer">

      {/* ======================================
          FILE UPLOAD
      ====================================== */}

      <FileUpload
        label="Load files"
        accentLabel="Upload"
        slot="image"
      />

      {/* ======================================
          BACKEND STATUS
      ====================================== */}

      <div className="viewer__status">

        {backendStatus === 'connected' && (
          <span className="viewer__backend-status viewer__backend-status--connected">
            Backend: Connected ✓
          </span>
        )}

        {backendStatus === 'failed' && (
          <span className="viewer__backend-status viewer__backend-status--failed">
            Backend: Disconnected ✕
          </span>
        )}

        {backendStatus === 'checking' && (
          <span className="viewer__backend-status">
            Backend: Checking...
          </span>
        )}

      </div>

      {/* ======================================
          GENERAL ERROR
      ====================================== */}

      {error && (
        <div className="viewer__error">
          {error}
        </div>
      )}

      {/* ======================================
          LOADING
      ====================================== */}

      {isLoading && (
        <div className="viewer__loading">
          Loading file…
        </div>
      )}

      {/* ======================================
          MAIN VIEWER
      ====================================== */}

      <div className="viewer__main">

        {/* ====================================
            VIEWPORT
        ==================================== */}

        <div className="viewer__viewport">

          {showMpr ? (

            <div className="viewer__mpr-grid">

              <Renderer2D
                plane="axial"
                sliceIndex={slice.axial}
                label="Axial"
              />

              <Renderer2D
                plane="sagittal"
                sliceIndex={slice.sagittal}
                label="Sagittal"
              />

              <Renderer2D
                plane="coronal"
                sliceIndex={slice.coronal}
                label="Coronal"
              />

              <div className="viewer__mpr-info">

                <span className="viewer__mpr-info-title">
                  {imageFile?.volume.fileName}
                </span>

                <span>
                  {imageFile?.volume.dims.join(
                    ' × '
                  )}
                </span>

              </div>

            </div>

          ) : (

            <Renderer2D
              plane="axial"
              sliceIndex={slice.axial}
              label={
                imageFile?.volume.is3D
                  ? 'Axial'
                  : imageFile?.volume.fileName ??
                    'Viewport'
              }
            />

          )}

        </div>

        {/* ====================================
            SIDEBAR
        ==================================== */}

        <aside className="viewer__sidebar">

          {/* ==================================
              VIEWER CONTROLS
          ================================== */}

          <ViewerControls />

          {/* ==================================
              AI PANEL
          ================================== */}

          <div className="viewer__ai-panel">

            <div className="viewer__ai-title">
              AI ANALYSIS
            </div>

            {/* ================================
                AI BUTTON
            ================================= */}

            <button
              type="button"
              className="viewer__ai-button"
              onClick={handleAIAnalysis}
              disabled={
                aiLoading ||
                backendStatus !== 'connected' ||
                !originalImageFile
              }
            >
              {aiLoading
                ? 'Analyzing...'
                : 'Run Tumor Segmentation'}
            </button>

            {/* ================================
                NO IMAGE MESSAGE
            ================================= */}

            {!originalImageFile && (
              <p className="viewer__ai-hint">
                Load an MRI image first.
              </p>
            )}

            {/* ================================
                AI ERROR
            ================================= */}

            {aiError && (
              <div className="viewer__ai-error">
                {aiError}
              </div>
            )}

            {/* ================================
                AI RESULT
            ================================= */}

            {aiResult && (

              <div className="viewer__ai-result">

                <div className="viewer__ai-result-title">
                  Segmentation Complete
                </div>

                {/* Tumor pixels */}

                <div className="viewer__ai-stat">

                  Tumor pixels:

                  <strong>
                    {aiResult.tumorPixels.toLocaleString()}
                  </strong>

                </div>

                {/* Tumor percentage */}

                <div className="viewer__ai-stat">

                  Detected region:

                  <strong>
                    {aiResult.tumorPercentage.toFixed(2)}%
                  </strong>

                </div>

                {/* Threshold */}

                <div className="viewer__ai-stat">

                  Threshold:

                  <strong>
                    {aiResult.threshold}
                  </strong>

                </div>

                {/* Mask */}

                <img
                  src={aiResult.mask}
                  alt="AI tumor segmentation mask"
                  className="viewer__ai-mask"
                />

                {/* ==========================
                    DOWNLOAD REPORT BUTTON
                =========================== */}

                <button
                  type="button"
                  className="viewer__download-report"
                  onClick={
                    downloadAnalysisReport
                  }
                >
                  <FileDown size={17} />

                  Download Analysis Report
                </button>

              </div>

            )}

          </div>

        </aside>

      </div>

    </div>
  );
}