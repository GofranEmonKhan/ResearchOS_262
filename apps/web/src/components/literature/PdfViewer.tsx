import React, { useState, useRef } from 'react';
import { Document, Page, pdfjs } from 'react-pdf';
import 'react-pdf/dist/Page/AnnotationLayer.css';
import 'react-pdf/dist/Page/TextLayer.css';
import { Paper, PaperAnnotation, AnnotationRect } from '@researchos/shared-types';
import { HighlightPopover } from './HighlightPopover.js';
import {
  ZoomIn,
  ZoomOut,
  ChevronLeft,
  ChevronRight,
  Loader2,
  AlertTriangle,
  RotateCw,
  StickyNote,
} from 'lucide-react';

// Configure pdfjs worker from unpkg
pdfjs.GlobalWorkerOptions.workerSrc = `https://unpkg.com/pdfjs-dist@${pdfjs.version}/build/pdf.worker.min.mjs`;

interface PdfViewerProps {
  paper: Paper;
  pdfUrl: string;
  annotations: PaperAnnotation[];
  currentPage: number;
  onPageChange: (page: number) => void;
  onAnnotationCreated: () => void;
}

export const PdfViewer: React.FC<PdfViewerProps> = ({
  paper,
  pdfUrl,
  annotations,
  currentPage,
  onPageChange,
  onAnnotationCreated,
}) => {
  const [numPages, setNumPages] = useState<number | null>(null);
  const [scale, setScale] = useState<number>(1.2);
  const [rotation, setRotation] = useState<number>(0);
  const [error, setError] = useState<string | null>(null);

  // Popover State
  const [popoverState, setPopoverState] = useState<{
    isOpen: boolean;
    page: number;
    text: string;
    rects: AnnotationRect[];
    position: { top: number; left: number };
  } | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const pageContainerRef = useRef<HTMLDivElement>(null);

  const onDocumentLoadSuccess = ({ numPages }: { numPages: number }) => {
    setNumPages(numPages);
  };

  const onDocumentLoadError = (err: Error) => {
    console.error('PDF loading error:', err);
    setError(err.message || 'Failed to load PDF document');
  };

  // Zoom controls
  const handleZoomIn = () => setScale((prev) => Math.min(prev + 0.15, 2.5));
  const handleZoomOut = () => setScale((prev) => Math.max(prev - 0.15, 0.6));
  const handleResetZoom = () => setScale(1.2);
  const handleRotate = () => setRotation((prev) => (prev + 90) % 360);

  // Handle Text Selection for Scale-Invariant Annotations
  const handleMouseUp = () => {
    const selection = window.getSelection();
    if (!selection || selection.isCollapsed) {
      return;
    }

    const text = selection.toString().trim();
    if (!text) return;

    if (selection.rangeCount === 0) return;
    const range = selection.getRangeAt(0);

    let clientRects = Array.from(range.getClientRects()).filter(
      (r) => r.width > 0 && r.height > 0
    );

    if (clientRects.length === 0) {
      const bRect = range.getBoundingClientRect();
      if (bRect && bRect.width > 0 && bRect.height > 0) {
        clientRects = [bRect];
      }
    }

    if (clientRects.length === 0) return;

    // Find the rendered page element that contains the selection
    const pageElem = pageContainerRef.current;
    if (!pageElem) return;

    const pageRect = pageElem.getBoundingClientRect();

    // Calculate scale-invariant normalized percentage coordinates [0.0–1.0]
    const rects: AnnotationRect[] = clientRects.map((r) => ({
      x: Math.max(0, Math.min(1, (r.left - pageRect.left) / pageRect.width)),
      y: Math.max(0, Math.min(1, (r.top - pageRect.top) / pageRect.height)),
      width: Math.max(0, Math.min(1, r.width / pageRect.width)),
      height: Math.max(0, Math.min(1, r.height / pageRect.height)),
    }));

    // Floating popover position relative to the page container
    const firstRect = clientRects[0];
    const top = firstRect.top - pageRect.top;
    const left = firstRect.left - pageRect.left + firstRect.width / 2;

    setPopoverState({
      isOpen: true,
      page: currentPage,
      text,
      rects,
      position: { top, left },
    });
  };

  // Page annotations
  const pageAnnotations = annotations.filter((ann) => ann.page === currentPage);

  return (
    <div
      ref={containerRef}
      className="flex-1 h-full flex flex-col bg-[#050508] relative overflow-hidden"
    >
      {/* Top Floating Control Bar */}
      <div className="h-12 px-6 bg-surface-1/90 backdrop-blur-xl border-b border-white/[0.08] flex items-center justify-between text-xs text-slate-300 z-30 select-none">
        {/* Page Navigation */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
            title="Previous Page"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>

          <span className="font-mono text-xs text-slate-200">
            Page <span className="text-violet-400 font-bold">{currentPage}</span> of{' '}
            <span className="text-slate-400">{numPages || '...'}</span>
          </span>

          <button
            onClick={() => onPageChange(Math.min(currentPage + 1, numPages || 1))}
            disabled={!numPages || currentPage >= numPages}
            className="p-1.5 rounded-lg hover:bg-white/[0.08] text-slate-300 hover:text-white disabled:opacity-30 transition-colors"
            title="Next Page"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        {/* Zoom & Rotation Controls */}
        <div className="flex items-center gap-1.5 bg-surface-2/80 px-2 py-1 rounded-xl border border-white/[0.06]">
          <button
            onClick={handleZoomOut}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Zoom Out"
          >
            <ZoomOut className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleResetZoom}
            className="px-2 py-0.5 text-[11px] font-mono font-semibold text-violet-300 hover:text-white transition-colors"
            title="Reset Zoom"
          >
            {Math.round(scale * 100)}%
          </button>
          <button
            onClick={handleZoomIn}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Zoom In"
          >
            <ZoomIn className="w-3.5 h-3.5" />
          </button>
          <div className="w-[1px] h-3.5 bg-white/10 mx-1" />
          <button
            onClick={handleRotate}
            className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-white/[0.08] transition-colors"
            title="Rotate Page"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Main Document Canvas Viewport */}
      <div
        className="flex-1 overflow-y-auto overflow-x-auto p-8 flex justify-center items-start"
        onMouseUp={handleMouseUp}
      >
        {error ? (
          <div className="py-24 text-center space-y-3">
            <AlertTriangle className="w-8 h-8 text-amber-400 mx-auto" />
            <p className="text-xs text-red-300 max-w-sm">{error}</p>
          </div>
        ) : (
          <Document
            file={pdfUrl}
            onLoadSuccess={onDocumentLoadSuccess}
            onLoadError={onDocumentLoadError}
            loading={
              <div className="py-24 flex flex-col items-center justify-center text-slate-400 space-y-2">
                <Loader2 className="w-8 h-8 text-violet-400 animate-spin" />
                <span className="text-xs">Loading PDF document...</span>
              </div>
            }
          >
            <div
              ref={pageContainerRef}
              className="relative shadow-2xl shadow-black/90 rounded-sm bg-white text-black select-text"
            >
              <Page
                pageNumber={currentPage}
                scale={scale}
                rotate={rotation}
                renderTextLayer={true}
                renderAnnotationLayer={true}
              />

              {/* SCALE-INVARIANT HIGHLIGHT OVERLAY LAYER */}
              <div className="absolute inset-0 pointer-events-none z-20">
                {pageAnnotations.map((ann) => {
                  const rects = ann.positionData?.rects || [];
                  const highlightColorHex = ann.positionData?.color || (
                    ann.linkedSidebarField ? '#A855F7' : '#FACC15'
                  );
                  return (
                    <React.Fragment key={ann.id}>
                      {rects.map((r, i) => (
                        <div
                          key={`${ann.id}-${i}`}
                          title={
                            ann.stickyNote
                              ? `Note: ${ann.stickyNote} (by ${ann.user?.fullName || 'collaborator'})`
                              : `Highlight by ${ann.user?.fullName || 'collaborator'}`
                          }
                          className="absolute pointer-events-auto cursor-pointer rounded-xs transition-opacity hover:opacity-80"
                          style={{
                            left: `${r.x * 100}%`,
                            top: `${r.y * 100}%`,
                            width: `${r.width * 100}%`,
                            height: `${r.height * 100}%`,
                            backgroundColor: highlightColorHex.startsWith('#')
                              ? `${highlightColorHex}59`
                              : highlightColorHex,
                            mixBlendMode: 'multiply',
                          }}
                        />
                      ))}

                      {/* Sticky note marker on margin */}
                      {ann.stickyNote && rects.length > 0 && (
                        <div
                          className="absolute -right-3 pointer-events-auto cursor-pointer z-30"
                          style={{ top: `${rects[0].y * 100}%` }}
                          title={`Note: ${ann.stickyNote}`}
                        >
                          <div
                            className="w-5 h-5 rounded-full text-black flex items-center justify-center shadow-lg border border-white"
                            style={{ backgroundColor: highlightColorHex }}
                          >
                            <StickyNote className="w-3 h-3" />
                          </div>
                        </div>
                      )}
                    </React.Fragment>
                  );
                })}
              </div>

              {/* Floating Selection Popover */}
              {popoverState && popoverState.isOpen && (
                <HighlightPopover
                  paperId={paper.id}
                  pageNumber={currentPage}
                  highlightedText={popoverState.text}
                  rects={popoverState.rects}
                  position={popoverState.position}
                  onClose={() => {
                    setPopoverState(null);
                    window.getSelection()?.removeAllRanges();
                  }}
                  onAnnotationCreated={() => {
                    setPopoverState(null);
                    window.getSelection()?.removeAllRanges();
                    onAnnotationCreated();
                  }}
                />
              )}
            </div>
          </Document>
        )}
      </div>
    </div>
  );
};
