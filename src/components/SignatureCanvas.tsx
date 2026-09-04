import React, { useRef, useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Eraser, Check } from "lucide-react";

interface SignatureCanvasProps {
  onSave?: (signatureDataUrl: string) => void;
  onClear?: () => void;
  initialImage?: string;
  readOnly?: boolean;
}

export function SignatureCanvas({
  onSave,
  onClear,
  initialImage,
  readOnly = false,
}: SignatureCanvasProps) {
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const [isDrawing, setIsDrawing] = useState(false);
  const [hasDrawn, setHasDrawn] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;

    // Set canvas dimensions
    canvas.width = canvas.parentElement?.clientWidth || 400;
    canvas.height = 160;

    // Clear canvas background to transparent
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    if (initialImage) {
      const img = new Image();
      img.onload = () => {
        ctx.drawImage(img, 0, 0, canvas.width, canvas.height);
        setHasDrawn(true);
      };
      img.src = initialImage;
    }
  }, [initialImage]);

  const getCoordinates = (e: React.MouseEvent | React.TouchEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    if ("touches" in e) {
      const touch = e.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top,
      };
    }
    return {
      x: (e as React.MouseEvent).clientX - rect.left,
      y: (e as React.MouseEvent).clientY - rect.top,
    };
  };

  const startDrawing = (e: React.MouseEvent | React.TouchEvent) => {
    if (readOnly) return;
    setIsDrawing(true);
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.beginPath();
    ctx.moveTo(x, y);
    ctx.lineWidth = 2.5;
    ctx.lineCap = "round";
    ctx.strokeStyle = "#1e3a8a"; // Dark blue signature ink
  };

  const draw = (e: React.MouseEvent | React.TouchEvent) => {
    if (!isDrawing || readOnly) return;
    e.preventDefault();
    const { x, y } = getCoordinates(e);
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.lineTo(x, y);
    ctx.stroke();
    setHasDrawn(true);
  };

  const stopDrawing = () => {
    setIsDrawing(false);
  };

  const handleClear = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    setHasDrawn(false);
    if (onClear) onClear();
  };

  const handleSave = () => {
    const canvas = canvasRef.current;
    if (!canvas || !hasDrawn) return;
    const dataUrl = canvas.toDataURL("image/png");
    if (onSave) onSave(dataUrl);
  };

  return (
    <div className="space-y-2 w-full">
      <div className="relative border-2 border-dashed border-muted-foreground/30 rounded-lg bg-background p-1 overflow-hidden">
        <canvas
          ref={canvasRef}
          onMouseDown={startDrawing}
          onMouseMove={draw}
          onMouseUp={stopDrawing}
          onMouseLeave={stopDrawing}
          onTouchStart={startDrawing}
          onTouchMove={draw}
          onTouchEnd={stopDrawing}
          className={`w-full h-40 touch-none ${readOnly ? "cursor-default" : "cursor-crosshair"}`}
        />
        {!hasDrawn && !readOnly && (
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none text-xs text-muted-foreground">
            Firma aquí con el ratón o pantalla táctil
          </div>
        )}
      </div>

      {!readOnly && (
        <div className="flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClear}>
            <Eraser className="mr-1 size-3.5" /> Borrar
          </Button>
          {onSave && (
            <Button type="button" size="sm" onClick={handleSave} disabled={!hasDrawn}>
              <Check className="mr-1 size-3.5" /> Aplicar Firma
            </Button>
          )}
        </div>
      )}
    </div>
  );
}
