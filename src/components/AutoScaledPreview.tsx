import React, { useEffect, useState, useRef } from "react";
import { pdf } from "@react-pdf/renderer";
import { Loader2 } from "lucide-react";
import { TemplatePdfDocument } from "../templates/standardATS/pdf";
import { ResumeA4Preview } from "./ResumeA4Preview";
import { cn } from "../lib/utils";

interface AutoScaledPreviewProps {
  data: any;
  templateId: string;
  zoom?: number;
  onBlobGenerated?: (blob: Blob, url: string) => void;
  fullHeight?: boolean;
}

export const AutoScaledPreview = React.memo(function AutoScaledPreview({ 
  data, 
  templateId,
  zoom = 1.0,
  onBlobGenerated,
  fullHeight = false
}: AutoScaledPreviewProps) {
  const [pdfUrl, setPdfUrl] = useState<string>("");
  const [loading, setLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const currentUrlRef = useRef<string>("");
  
  // Track unscaled height of the preview to scale the bounds properly
  const [unscaledHeight, setUnscaledHeight] = useState<number>(1123);
  const innerRef = useRef<HTMLDivElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  // Mouse dragging state for desktop panning
  const [isMouseDown, setIsMouseDown] = useState(false);
  const [startX, setStartX] = useState(0);
  const [startY, setStartY] = useState(0);
  const [scrollLeft, setScrollLeft] = useState(0);
  const [scrollTop, setScrollTop] = useState(0);

  const dataString = JSON.stringify(data);
  const onBlobGeneratedRef = useRef(onBlobGenerated);

  useEffect(() => {
    onBlobGeneratedRef.current = onBlobGenerated;
  }, [onBlobGenerated]);

  useEffect(() => {
    let active = true;
    setLoading(true);
    setError(null);

    const parsedData = dataString ? JSON.parse(dataString) : {};
    const resumeData = parsedData?.structuredData || parsedData || {};

    const generatePdf = async () => {
      try {
        console.log("PDF PREVIEW TEMPLATE:", templateId);
        console.log("PDF RESUME DATA:", resumeData);

        // Generate the PDF Blob
        const docElement = <TemplatePdfDocument data={resumeData} templateId={templateId} />;
        const blob = await pdf(docElement).toBlob();

        if (!active) {
          return;
        }

        console.log("PDF BLOB SIZE:", blob.size);

        // Revoke the old object URL to prevent memory leaks
        if (currentUrlRef.current) {
          URL.revokeObjectURL(currentUrlRef.current);
        }

        const url = URL.createObjectURL(blob);
        currentUrlRef.current = url;

        console.log("PDF PREVIEW URL:", url);

        setPdfUrl(url);
        setLoading(false);

        // Notify parent about the newly generated blob and url
        if (onBlobGeneratedRef.current) {
          onBlobGeneratedRef.current(blob, url);
        }
      } catch (err) {
        console.error("Error generating PDF preview:", err);
        if (active) {
          setError("Ocorreu um erro ao gerar a visualização em PDF. Por favor, tente novamente.");
          setLoading(false);
        }
      }
    };

    generatePdf();

    return () => {
      active = false;
    };
  }, [dataString, templateId]);

  // Clean up object URL when component unmounts
  useEffect(() => {
    return () => {
      if (currentUrlRef.current) {
        URL.revokeObjectURL(currentUrlRef.current);
      }
    };
  }, []);

  // Update unscaled height dynamically when data or template changes
  useEffect(() => {
    const updateHeight = () => {
      if (innerRef.current) {
        setUnscaledHeight(innerRef.current.offsetHeight || 1123);
      }
    };

    updateHeight();

    if (typeof ResizeObserver !== "undefined" && innerRef.current) {
      const observer = new ResizeObserver(updateHeight);
      observer.observe(innerRef.current);
      return () => observer.disconnect();
    }
  }, [dataString, templateId]);

  // Mouse pan handlers (grab to scroll)
  const handleMouseDown = (e: React.MouseEvent) => {
    if (!containerRef.current) return;
    // Only drag with left mouse click
    if (e.button !== 0) return;
    setIsMouseDown(true);
    setStartX(e.pageX - containerRef.current.offsetLeft);
    setStartY(e.pageY - containerRef.current.offsetTop);
    setScrollLeft(containerRef.current.scrollLeft);
    setScrollTop(containerRef.current.scrollTop);
  };

  const handleMouseMove = (e: React.MouseEvent) => {
    if (!isMouseDown || !containerRef.current) return;
    e.preventDefault();
    const x = e.pageX - containerRef.current.offsetLeft;
    const y = e.pageY - containerRef.current.offsetTop;
    const walkX = x - startX;
    const walkY = y - startY;
    containerRef.current.scrollLeft = scrollLeft - walkX;
    containerRef.current.scrollTop = scrollTop - walkY;
  };

  const handleMouseUpOrLeave = () => {
    setIsMouseDown(false);
  };

  const parsedData = dataString ? JSON.parse(dataString) : {};
  const resumeData = parsedData?.structuredData || parsedData || {};

  if (error) {
    return (
      <div className="w-full flex justify-center">
        <div className="w-full max-w-[850px] h-[600px] flex flex-col items-center justify-center border border-dashed border-red-300 dark:border-red-900 rounded-xl bg-red-50/50 dark:bg-red-950/20 p-6 text-center gap-2">
          <span className="text-red-500 font-medium text-sm">{error}</span>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full relative flex flex-col items-center gap-4">
      <div className="w-full flex justify-center">
        <div 
          ref={containerRef}
          onMouseDown={handleMouseDown}
          onMouseMove={handleMouseMove}
          onMouseUp={handleMouseUpOrLeave}
          onMouseLeave={handleMouseUpOrLeave}
          className={cn(
            "w-full max-w-[850px] border border-slate-200 dark:border-neutral-800 rounded-xl shadow-lg bg-slate-100 dark:bg-neutral-900 p-2 sm:p-4 transition-all duration-150",
            fullHeight 
              ? "overflow-auto md:overflow-visible h-[calc(100vh-240px)] min-h-[550px] md:h-auto md:min-h-0 md:cursor-default" 
              : "overflow-auto cursor-grab active:cursor-grabbing touch-pan-x touch-pan-y h-[calc(100vh-240px)] min-h-[550px] scrollbar-thin",
            isMouseDown && !fullHeight && "select-none"
          )}
        >
          {/* Outer scaled boundaries that updates the container scroll-range correctly */}
          <div 
            style={{ 
              width: `${794 * zoom}px`,
              minWidth: `${794 * zoom}px`,
              maxWidth: `${794 * zoom}px`,
              height: `${unscaledHeight * zoom}px`,
              margin: "0 auto",
              position: "relative",
              overflow: "hidden"
            }}
            className="transition-all duration-150"
          >
            {/* Inner element transformed cleanly with scale */}
            <div
              ref={innerRef}
              style={{
                transform: `scale(${zoom})`,
                transformOrigin: "top left",
                width: "794px",
                minWidth: "794px",
                maxWidth: "794px",
                position: "absolute",
                top: 0,
                left: 0
              }}
              className="bg-white text-black shadow-md rounded border border-slate-200"
            >
              <ResumeA4Preview data={resumeData} templateId={templateId} />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
});
