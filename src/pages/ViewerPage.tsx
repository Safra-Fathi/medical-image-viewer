import { useEffect, useState } from 'react';
import { FileDown } from 'lucide-react';
import { jsPDF } from 'jspdf';
import ReactMarkdown from 'react-markdown';

import FileUpload from '../components/FileUpload';
import Renderer2D from '../components/Renderer2D';
import ViewerControls from '../components/ViewerControls';

import { useViewerStore } from '../store/viewerStore';

import { checkBackendHealth } from '../services/api';

import {
  segmentImage,
  explainAnalysis,
} from '../services/aiService';

import './ViewerPage.css';


// ============================================================
// TYPES
// ============================================================

interface AIResult {
  mask: string;

  tumorPixels: number;

  tumorPercentage: number;

  threshold: number;

  message: string;

  analysisId: number;

  modelName: string;

  modelVersion: string;
}


type ExplanationProvider =
  | 'ollama'
  | 'groq';


export default function ViewerPage() {

  // ============================================================
  // VIEWER STORE
  // ============================================================

  const imageFile =
    useViewerStore(
      (s) => s.imageFile
    );

  const originalImageFile =
    useViewerStore(
      (s) => s.originalImageFile
    );

  const mprEnabled =
    useViewerStore(
      (s) => s.mprEnabled
    );

  const slice =
    useViewerStore(
      (s) => s.slice
    );

  const isLoading =
    useViewerStore(
      (s) => s.isLoading
    );

  const error =
    useViewerStore(
      (s) => s.error
    );


  const showMpr =
    mprEnabled &&
    imageFile?.volume.is3D;


  // ============================================================
  // BACKEND STATUS
  // ============================================================

  const [
    backendStatus,
    setBackendStatus,
  ] = useState<
    | 'checking'
    | 'connected'
    | 'failed'
  >(
    'checking'
  );


  // ============================================================
  // SEGMENTATION STATE
  // ============================================================

  const [
    aiLoading,
    setAiLoading,
  ] = useState(
    false
  );


  const [
    aiResult,
    setAiResult,
  ] = useState<AIResult | null>(
    null
  );


  const [
    aiError,
    setAiError,
  ] = useState<string | null>(
    null
  );


  // ============================================================
  // LLM EXPLANATION STATE
  // ============================================================

  const [
    explanationProvider,
    setExplanationProvider,
  ] = useState<ExplanationProvider>(
    'ollama'
  );


  const [
    explanationLoading,
    setExplanationLoading,
  ] = useState(
    false
  );


  const [
    explanation,
    setExplanation,
  ] = useState<string | null>(
    null
  );


  const [
    explanationError,
    setExplanationError,
  ] = useState<string | null>(
    null
  );


  const [
    explanationDisclaimer,
    setExplanationDisclaimer,
  ] = useState<string | null>(
    null
  );


  const [
    explanationModel,
    setExplanationModel,
  ] = useState<string | null>(
    null
  );


  // ============================================================
  // CHECK BACKEND
  // ============================================================

  useEffect(() => {

    checkBackendHealth()

      .then(
        (data) => {

          console.log(
            'Backend connected:',
            data
          );

          setBackendStatus(
            'connected'
          );
        }
      )

      .catch(
        (backendError) => {

          console.error(
            'Backend connection failed:',
            backendError
          );

          setBackendStatus(
            'failed'
          );
        }
      );

  }, []);


  // ============================================================
  // RUN U-NET SEGMENTATION
  // ============================================================

  const handleAIAnalysis =
    async () => {

      setAiError(
        null
      );

      setAiResult(
        null
      );


      // Remove previous explanation when
      // a new segmentation is started.

      setExplanation(
        null
      );

      setExplanationError(
        null
      );

      setExplanationDisclaimer(
        null
      );

      setExplanationModel(
        null
      );


      if (
        !originalImageFile
      ) {

        setAiError(
          'The original image file is not available for AI analysis.'
        );

        return;
      }


      try {

        setAiLoading(
          true
        );


        console.log(
          'Sending image to AI backend:',
          originalImageFile.name
        );


        const result =
          await segmentImage(
            originalImageFile
          );


        console.log(
          'AI segmentation result:',
          result
        );


        setAiResult({
          mask:
            result.mask,

          tumorPixels:
            result.tumor_pixels,

          tumorPercentage:
            result.tumor_percentage,

          threshold:
            result.threshold,

          message:
            result.message,

          analysisId:
            result.analysis_id,

          modelName:
            result.model_name,

          modelVersion:
            result.model_version,
        });

      } catch (analysisError) {

        console.error(
          'AI segmentation failed:',
          analysisError
        );


        setAiError(
          'AI segmentation failed. Please make sure you are logged in and the backend is running.'
        );

      } finally {

        setAiLoading(
          false
        );

      }
    };


  // ============================================================
  // GENERATE OLLAMA / GROQ EXPLANATION
  // ============================================================

  const handleGenerateExplanation =
    async () => {

      if (
        !aiResult
      ) {

        setExplanationError(
          'Run segmentation before generating an AI explanation.'
        );

        return;
      }


      try {

        setExplanationLoading(
          true
        );

        setExplanationError(
          null
        );

        setExplanation(
          null
        );

        setExplanationDisclaimer(
          null
        );

        setExplanationModel(
          null
        );


        console.log(
          'Generating AI explanation:',
          {
            analysisId:
              aiResult.analysisId,

            provider:
              explanationProvider,
          }
        );


        const result =
          await explainAnalysis(
            aiResult.analysisId,
            explanationProvider,
            'technical'
          );


        console.log(
          'AI explanation result:',
          result
        );


        setExplanation(
          result.explanation
        );


        setExplanationDisclaimer(
          result.disclaimer
        );


        setExplanationModel(
          result.model
        );

      } catch (explanationRequestError) {

        console.error(
          'AI explanation failed:',
          explanationRequestError
        );


        setExplanationError(
          explanationProvider ===
            'ollama'
            ? 'Ollama explanation failed. Make sure Ollama is running and the llama3.2 model is available.'
            : 'Groq explanation failed. Check the Groq API configuration and internet connection.'
        );

      } finally {

        setExplanationLoading(
          false
        );

      }
    };


  // ============================================================
  // PDF TEXT NORMALIZER
  // ============================================================

  const normalizePdfText =
    (
      text: string
    ): string => {

      return text

        // Markdown headings
        .replace(
          /^#{1,6}\s*/gm,
          ''
        )

        // Markdown bold / italic
        .replace(
          /\*\*/g,
          ''
        )

        .replace(
          /__/g,
          ''
        )

        .replace(
          /\*/g,
          ''
        )

        // Inline code
        .replace(
          /`/g,
          ''
        )

        // Unicode comparison operators
        .replace(
          /≥/g,
          '>='
        )

        .replace(
          /≤/g,
          '<='
        )

        // Dashes
        .replace(
          /–/g,
          '-'
        )

        .replace(
          /—/g,
          '-'
        )

        // Bullets
        .replace(
          /•/g,
          '-'
        )

        // Arrows
        .replace(
          /→/g,
          '->'
        )

        .replace(
          /←/g,
          '<-'
        )

        // Smart quotes
        .replace(
          /[“”]/g,
          '"'
        )

        .replace(
          /[‘’]/g,
          "'"
        )

        // Non-breaking spaces
        .replace(
          /\u00A0/g,
          ' '
        )

        // Repeated spaces
        .replace(
          /[ \t]+/g,
          ' '
        )

        // Too many blank lines
        .replace(
          /\n{3,}/g,
          '\n\n'
        )

        .trim();
    };


  // ============================================================
  // DOWNLOAD PDF REPORT
  // ============================================================

  const downloadAnalysisReport =
    () => {

      if (
        !aiResult
      ) {

        alert(
          'Please run AI segmentation before downloading the report.'
        );

        return;
      }


      const doc =
        new jsPDF();


      const pageWidth =
        doc.internal.pageSize.getWidth();

      const pageHeight =
        doc.internal.pageSize.getHeight();


      const leftMargin =
        20;

      const rightMargin =
        20;

      const bottomMargin =
        18;


      const textWidth =
        pageWidth -
        leftMargin -
        rightMargin;


      let y =
        22;


      // ==========================================================
      // PAGE BREAK HELPER
      // ==========================================================

      const ensureSpace =
        (
          neededHeight:
            number
        ) => {

          if (
            y +
              neededHeight >
            pageHeight -
              bottomMargin
          ) {

            doc.addPage();

            y =
              22;
          }
        };


      // ==========================================================
      // WRAPPED TEXT HELPER
      // ==========================================================

      const addWrappedText =
        (
          text:
            string,

          fontSize:
            number = 9,

          lineHeight:
            number = 4.5
        ) => {

          doc.setFontSize(
            fontSize
          );

          doc.setFont(
            'helvetica',
            'normal'
          );


          const normalizedText =
            normalizePdfText(
              text
            );


          const paragraphs =
            normalizedText.split(
              '\n'
            );


          for (
            const paragraph of
              paragraphs
          ) {

            if (
              !paragraph.trim()
            ) {

              y +=
                lineHeight;

              continue;
            }


            const lines =
              doc.splitTextToSize(
                paragraph,
                textWidth
              ) as string[];


            for (
              const line of lines
            ) {

              ensureSpace(
                lineHeight
              );


              doc.text(
                line,
                leftMargin,
                y
              );


              y +=
                lineHeight;
            }
          }
        };


      // ==========================================================
      // HEADER
      // ==========================================================

      doc.setFontSize(
        17
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Medical Image Analysis Report',
        pageWidth / 2,
        y,
        {
          align:
            'center',
        }
      );


      y +=
        7;


      doc.setFontSize(
        9
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `Generated: ${new Date().toLocaleString()}`,
        pageWidth / 2,
        y,
        {
          align:
            'center',
        }
      );


      y +=
        6;


      doc.line(
        leftMargin,
        y,
        pageWidth -
          rightMargin,
        y
      );


      // ==========================================================
      // IMAGE INFORMATION
      // ==========================================================

      y +=
        10;


      ensureSpace(
        25
      );


      doc.setFontSize(
        12.5
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Image Information',
        leftMargin,
        y
      );


      y +=
        8;


      doc.setFontSize(
        10
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `File: ${
          imageFile?.volume.fileName ??
          originalImageFile?.name ??
          'Unknown'
        }`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Dimensions: ${
          imageFile?.volume.dims?.join(
            ' x '
          ) ??
          'Unknown'
        }`,
        leftMargin,
        y
      );


      // ==========================================================
      // AI SEGMENTATION ANALYSIS
      // ==========================================================

      y +=
        13;


      ensureSpace(
        50
      );


      doc.setFontSize(
        12.5
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'AI Segmentation Analysis',
        leftMargin,
        y
      );


      y +=
        8;


      doc.setFontSize(
        10
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      doc.text(
        `Model: ${aiResult.modelName}`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Model Version: ${aiResult.modelVersion}`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Analysis ID: ${aiResult.analysisId}`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Segmentation Threshold: ${aiResult.threshold}`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Model-positive Pixels: ${aiResult.tumorPixels.toLocaleString()}`,
        leftMargin,
        y
      );


      y +=
        6.5;


      doc.text(
        `Segmented Image Area: ${aiResult.tumorPercentage.toFixed(
          2
        )}%`,
        leftMargin,
        y
      );


      // ==========================================================
      // SEGMENTATION RESULT
      // ==========================================================

      y +=
        13;


      ensureSpace(
        20
      );


      doc.setFontSize(
        12.5
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Segmentation Result',
        leftMargin,
        y
      );


      y +=
        8;


      doc.setFontSize(
        10
      );

      doc.setFont(
        'helvetica',
        'normal'
      );


      const regionDetected =
        aiResult.tumorPixels >
        0;


      doc.text(
        `Segmented Region Present: ${
          regionDetected
            ? 'Yes'
            : 'No'
        }`,
        leftMargin,
        y
      );


      // ==========================================================
      // SEGMENTATION MASK
      // ==========================================================

      y +=
        12;


      const maskSize =
        65;


      ensureSpace(
        maskSize +
          15
      );


      doc.setFontSize(
        12.5
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'AI Segmentation Mask',
        leftMargin,
        y
      );


      try {

        doc.addImage(
          aiResult.mask,
          'PNG',
          leftMargin,
          y + 6,
          maskSize,
          maskSize
        );

      } catch (maskError) {

        console.error(
          'Failed to add segmentation mask to PDF:',
          maskError
        );

      }


      y +=
        maskSize +
        16;


      // ==========================================================
      // ANALYSIS MESSAGE
      // ==========================================================

      ensureSpace(
        20
      );


      doc.setFontSize(
        11
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Analysis Message',
        leftMargin,
        y
      );


      y +=
        7;


      const analysisMessage =
        aiResult.message

          ?.replace(
            /tumor segmentation completed\.?/i,
            'Segmentation analysis completed successfully.'
          )

        ||
          'Segmentation analysis completed successfully.';


      addWrappedText(
        analysisMessage,
        9,
        4.5
      );


      // ==========================================================
      // LLM EXPLANATION
      // ==========================================================

      if (
        explanation
      ) {

        y +=
          8;


        ensureSpace(
          25
        );


        doc.setFontSize(
          12
        );

        doc.setFont(
          'helvetica',
          'bold'
        );


        doc.text(
          'AI Explanation',
          leftMargin,
          y
        );


        y +=
          7;


        doc.setFontSize(
          9
        );

        doc.setFont(
          'helvetica',
          'normal'
        );


        doc.text(
          `Provider: ${
            explanationProvider ===
            'ollama'
              ? 'Ollama (Local)'
              : 'Groq (Cloud)'
          }`,
          leftMargin,
          y
        );


        y +=
          5.5;


        if (
          explanationModel
        ) {

          doc.text(
            `Language Model: ${normalizePdfText(
              explanationModel
            )}`,
            leftMargin,
            y
          );


          y +=
            7;
        }


        addWrappedText(
          explanation,
          8.5,
          4.3
        );

      }


      // ==========================================================
      // IMPORTANT NOTICE
      // ==========================================================

      y +=
        10;


      ensureSpace(
        25
      );


      doc.setFontSize(
        10
      );

      doc.setFont(
        'helvetica',
        'bold'
      );


      doc.text(
        'Important Notice',
        leftMargin,
        y
      );


      y +=
        6;


      const defaultDisclaimer =
        'This report is generated by an AI-assisted image segmentation system for research and demonstration purposes only. The segmentation output and language-model explanation are not medical diagnoses and should not be used as substitutes for review by a qualified healthcare professional.';


      addWrappedText(
        explanationDisclaimer ??
          defaultDisclaimer,
        8,
        4
      );


      // ==========================================================
      // FOOTERS
      // ==========================================================

      const pageCount =
        doc.internal.pages.length -
        1;


      for (
        let pageNumber = 1;
        pageNumber <=
        pageCount;
        pageNumber++
      ) {

        doc.setPage(
          pageNumber
        );


        doc.setFontSize(
          7.5
        );

        doc.setFont(
          'helvetica',
          'normal'
        );


        doc.text(
          `MedVision AI - Research Analysis - Page ${pageNumber} of ${pageCount}`,
          pageWidth / 2,
          pageHeight - 10,
          {
            align:
              'center',
          }
        );

      }


      // ==========================================================
      // DOWNLOAD
      // ==========================================================

      const timestamp =
        new Date()
          .toISOString()
          .replace(
            /[:.]/g,
            '-'
          );


      doc.save(
        `medical-analysis-report-${timestamp}.pdf`
      );
    };


  // ============================================================
  // UI
  // ============================================================

  return (

    <div className="viewer">

      {/* ========================================================
          FILE UPLOAD
      ======================================================== */}

      <FileUpload
        label="Load files"
        accentLabel="Upload"
        slot="image"
      />


      {/* ========================================================
          BACKEND STATUS
      ======================================================== */}

      <div className="viewer__status">

        {
          backendStatus ===
            'connected' && (

            <span
              className="
                viewer__backend-status
                viewer__backend-status--connected
              "
            >
              Backend: Connected ✓
            </span>

          )
        }


        {
          backendStatus ===
            'failed' && (

            <span
              className="
                viewer__backend-status
                viewer__backend-status--failed
              "
            >
              Backend: Disconnected ✕
            </span>

          )
        }


        {
          backendStatus ===
            'checking' && (

            <span
              className="viewer__backend-status"
            >
              Backend: Checking...
            </span>

          )
        }

      </div>


      {/* ========================================================
          GENERAL ERROR
      ======================================================== */}

      {
        error && (

          <div className="viewer__error">

            {error}

          </div>

        )
      }


      {/* ========================================================
          FILE LOADING
      ======================================================== */}

      {
        isLoading && (

          <div className="viewer__loading">

            Loading file…

          </div>

        )
      }


      {/* ========================================================
          MAIN VIEWER
      ======================================================== */}

      <div className="viewer__main">

        {/* ======================================================
            VIEWPORT
        ====================================================== */}

        <div className="viewer__viewport">

          {
            showMpr
              ? (

                <div className="viewer__mpr-grid">

                  <Renderer2D
                    plane="axial"
                    sliceIndex={
                      slice.axial
                    }
                    label="Axial"
                  />


                  <Renderer2D
                    plane="sagittal"
                    sliceIndex={
                      slice.sagittal
                    }
                    label="Sagittal"
                  />


                  <Renderer2D
                    plane="coronal"
                    sliceIndex={
                      slice.coronal
                    }
                    label="Coronal"
                  />


                  <div className="viewer__mpr-info">

                    <span className="viewer__mpr-info-title">

                      {
                        imageFile
                          ?.volume
                          .fileName
                      }

                    </span>


                    <span>

                      {
                        imageFile
                          ?.volume
                          .dims
                          .join(
                            ' × '
                          )
                      }

                    </span>

                  </div>

                </div>

              )
              : (

                <Renderer2D
                  plane="axial"
                  sliceIndex={
                    slice.axial
                  }
                  label={
                    imageFile
                      ?.volume
                      .is3D

                      ? 'Axial'

                      : imageFile
                          ?.volume
                          .fileName ??
                        'Viewport'
                  }
                />

              )
          }

        </div>


        {/* ======================================================
            SIDEBAR
        ====================================================== */}

        <aside className="viewer__sidebar">

          {/* ====================================================
              VIEWER CONTROLS
          ==================================================== */}

          <ViewerControls />


          {/* ====================================================
              AI ANALYSIS PANEL
          ==================================================== */}

          <div className="viewer__ai-panel">

            <div className="viewer__ai-title">

              AI ANALYSIS

            </div>


            {/* ==================================================
                RUN SEGMENTATION
            ================================================== */}

            <button
              type="button"
              className="viewer__ai-button"
              onClick={
                handleAIAnalysis
              }
              disabled={
                aiLoading ||
                explanationLoading ||
                backendStatus !==
                  'connected' ||
                !originalImageFile
              }
            >

              {
                aiLoading
                  ? 'Analyzing...'
                  : 'Run Segmentation'
              }

            </button>


            {/* ==================================================
                NO IMAGE MESSAGE
            ================================================== */}

            {
              !originalImageFile && (

                <p className="viewer__ai-hint">

                  Load an MRI image first.

                </p>

              )
            }


            {/* ==================================================
                SEGMENTATION ERROR
            ================================================== */}

            {
              aiError && (

                <div className="viewer__ai-error">

                  {aiError}

                </div>

              )
            }


            {/* ==================================================
                SEGMENTATION RESULT
            ================================================== */}

            {
              aiResult && (

                <div className="viewer__ai-result">

                  <div className="viewer__ai-result-title">

                    Segmentation Complete

                  </div>


                  {/* ============================================
                      MODEL-POSITIVE PIXELS
                  ============================================ */}

                  <div className="viewer__ai-stat">

                    Model-positive pixels:

                    <strong>

                      {
                        aiResult
                          .tumorPixels
                          .toLocaleString()
                      }

                    </strong>

                  </div>


                  {/* ============================================
                      DETECTED REGION
                  ============================================ */}

                  <div className="viewer__ai-stat">

                    Segmented area:

                    <strong>

                      {
                        aiResult
                          .tumorPercentage
                          .toFixed(
                            2
                          )
                      }
                      %

                    </strong>

                  </div>


                  {/* ============================================
                      THRESHOLD
                  ============================================ */}

                  <div className="viewer__ai-stat">

                    Threshold:

                    <strong>

                      {
                        aiResult
                          .threshold
                      }

                    </strong>

                  </div>


                  {/* ============================================
                      ANALYSIS ID
                  ============================================ */}

                  <div className="viewer__ai-stat">

                    Analysis ID:

                    <strong>

                      {
                        aiResult
                          .analysisId
                      }

                    </strong>

                  </div>


                  {/* ============================================
                      SEGMENTATION MASK
                  ============================================ */}

                  <img
                    src={
                      aiResult.mask
                    }
                    alt="AI segmentation mask"
                    className="viewer__ai-mask"
                  />


                  {/* ============================================
                      AI EXPLANATION SECTION
                  ============================================ */}

                  <div
                    style={{
                      marginTop:
                        '16px',

                      paddingTop:
                        '14px',

                      borderTop:
                        '1px solid rgba(255,255,255,0.10)',
                    }}
                  >

                    <div className="viewer__ai-result-title">

                      AI Explanation

                    </div>


                    {/* ==========================================
                        PROVIDER
                    ========================================== */}

                    <label
                      htmlFor="explanation-provider"
                      className="viewer__ai-hint"
                      style={{
                        display:
                          'block',

                        marginBottom:
                          '6px',
                      }}
                    >

                      Explanation provider

                    </label>


                    <select
                      id="explanation-provider"
                      value={
                        explanationProvider
                      }
                      onChange={
                        (
                          event
                        ) => {

                          setExplanationProvider(
                            event.target
                              .value as
                              ExplanationProvider
                          );


                          setExplanation(
                            null
                          );

                          setExplanationError(
                            null
                          );

                          setExplanationDisclaimer(
                            null
                          );

                          setExplanationModel(
                            null
                          );
                        }
                      }
                      disabled={
                        explanationLoading
                      }
                      style={{
                        width:
                          '100%',

                        marginBottom:
                          '10px',

                        padding:
                          '9px',

                        borderRadius:
                          '4px',
                      }}
                    >

                      <option value="ollama">

                        Ollama - Local

                      </option>


                      <option value="groq">

                        Groq - Cloud

                      </option>

                    </select>


                    {/* ==========================================
                        CLOUD NOTICE
                    ========================================== */}

                    {
                      explanationProvider ===
                        'groq' && (

                        <p className="viewer__ai-hint">

                          Groq is a cloud provider.
                          Only approved structured
                          segmentation results are
                          sent by the backend.

                        </p>

                      )
                    }


                    {/* ==========================================
                        GENERATE BUTTON
                    ========================================== */}

                    <button
                      type="button"
                      className="viewer__ai-button"
                      onClick={
                        handleGenerateExplanation
                      }
                      disabled={
                        explanationLoading
                      }
                    >

                      {
                        explanationLoading

                          ? 'Generating Explanation...'

                          : explanationProvider ===
                            'ollama'

                            ? 'Explain with Ollama'

                            : 'Explain with Groq'
                      }

                    </button>


                    {/* ==========================================
                        EXPLANATION ERROR
                    ========================================== */}

                    {
                      explanationError && (

                        <div className="viewer__ai-error">

                          {
                            explanationError
                          }

                        </div>

                      )
                    }


                    {/* ==========================================
                        GENERATED EXPLANATION
                    ========================================== */}

                    {
                      explanation && (

                        <div
                          style={{
                            marginTop:
                              '12px',

                            padding:
                              '12px',

                            border:
                              '1px solid rgba(255,255,255,0.10)',

                            borderRadius:
                              '4px',

                            lineHeight:
                              1.55,

                            overflowWrap:
                              'anywhere',
                          }}
                        >

                          <div
                            style={{
                              marginBottom:
                                '8px',

                              fontSize:
                                '12px',

                              opacity:
                                0.8,
                            }}
                          >

                            {
                              explanationProvider ===
                                'ollama'
                                ? 'Ollama'
                                : 'Groq'
                            }

                            {
                              explanationModel
                                ? ` • ${explanationModel}`
                                : ''
                            }

                          </div>


                          <div className="viewer__explanation-text">

                            <ReactMarkdown>

                              {
                                explanation
                              }

                            </ReactMarkdown>

                          </div>

                        </div>

                      )
                    }


                    {/* ==========================================
                        DISCLAIMER
                    ========================================== */}

                    {
                      explanation &&
                      explanationDisclaimer && (

                        <p
                          className="viewer__ai-hint"
                          style={{
                            marginTop:
                              '10px',
                          }}
                        >

                          {
                            explanationDisclaimer
                          }

                        </p>

                      )
                    }

                  </div>


                  {/* ============================================
                      DOWNLOAD REPORT
                  ============================================ */}

                  <button
                    type="button"
                    className="viewer__download-report"
                    onClick={
                      downloadAnalysisReport
                    }
                  >

                    <FileDown
                      size={
                        17
                      }
                    />

                    Download Analysis Report

                  </button>

                </div>

              )
            }

          </div>

        </aside>

      </div>

    </div>
  );
}