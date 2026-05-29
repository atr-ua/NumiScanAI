/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useEffect } from "react";
import { Camera, Upload, AlertCircle, RefreshCw, Sparkles, StopCircle, X } from "lucide-react";

interface CoinUploadProps {
  onRecognize: (obverse: string, reverse?: string) => Promise<void>;
  isRecognizing: boolean;
  recognitionError: string | null;
}

type Slot = "obverse" | "reverse";

export default function CoinUpload({ onRecognize, isRecognizing, recognitionError }: CoinUploadProps) {
  const [obverseImage, setObverseImage] = useState<string | null>(null);
  const [reverseImage, setReverseImage] = useState<string | null>(null);
  const [cameraTarget, setCameraTarget] = useState<Slot | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const [dragActive, setDragActive] = useState<Slot | null>(null);

  const videoRef = useRef<HTMLVideoElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);
  const obverseInputRef = useRef<HTMLInputElement | null>(null);
  const reverseInputRef = useRef<HTMLInputElement | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  useEffect(() => {
    if (cameraTarget) {
      startCamera();
    } else {
      stopCamera();
    }
    return () => { stopCamera(); };
  }, [cameraTarget]);

  const startCamera = async () => {
    setCameraError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: "environment", width: { ideal: 640 }, height: { ideal: 640 } }
      });
      streamRef.current = stream;
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        videoRef.current.play();
      }
    } catch (err: any) {
      setCameraError("Не вдалося отримати доступ до камери.");
      setCameraTarget(null);
    }
  };

  const stopCamera = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
    if (videoRef.current) videoRef.current.srcObject = null;
  };

  const captureFrame = () => {
    if (!videoRef.current || !canvasRef.current || !cameraTarget) return;
    const video = videoRef.current;
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    if (!ctx) return;
    const size = Math.min(video.videoWidth, video.videoHeight);
    canvas.width = size;
    canvas.height = size;
    const sx = (video.videoWidth - size) / 2;
    const sy = (video.videoHeight - size) / 2;
    ctx.drawImage(video, sx, sy, size, size, 0, 0, size, size);
    const dataUrl = canvas.toDataURL("image/jpeg", 0.95);
    if (cameraTarget === "obverse") setObverseImage(dataUrl);
    else setReverseImage(dataUrl);
    setCameraTarget(null);
  };

  const processFile = (file: File, slot: Slot) => {
    if (!file.type.startsWith("image/")) return;
    const reader = new FileReader();
    reader.onloadend = () => {
      if (slot === "obverse") setObverseImage(reader.result as string);
      else setReverseImage(reader.result as string);
      setCameraError(null);
    };
    reader.readAsDataURL(file);
  };

  const handleDrag = (e: React.DragEvent, slot: Slot) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") setDragActive(slot);
    else if (e.type === "dragleave") setDragActive(null);
  };

  const handleDrop = (e: React.DragEvent, slot: Slot) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(null);
    if (e.dataTransfer.files?.[0]) processFile(e.dataTransfer.files[0], slot);
  };

  const handleRecognizeClick = () => {
    if (obverseImage) onRecognize(obverseImage, reverseImage ?? undefined);
    else if (reverseImage) onRecognize(reverseImage);
  };

  const hasAny = !!(obverseImage || reverseImage);

  const SlotCard = ({ slot, image, label }: { slot: Slot; image: string | null; label: string }) => {
    const inputRef = slot === "obverse" ? obverseInputRef : reverseInputRef;
    const setImage = slot === "obverse" ? setObverseImage : setReverseImage;
    const isActive = dragActive === slot;

    return (
      <div className="flex flex-col gap-2">
        <span className="text-[10px] font-mono text-white/40 uppercase tracking-widest">{label}</span>
        {image ? (
          <div className="relative h-44 rounded-xl overflow-hidden border border-white/10 bg-black flex items-center justify-center group">
            <img src={image} alt={label} className="h-full object-contain max-w-full" />
            <button
              type="button"
              onClick={() => setImage(null)}
              className="absolute top-2 right-2 p-1 bg-black/80 border border-white/10 text-white/70 hover:text-white rounded-lg transition-all cursor-pointer"
            >
              <X className="h-3.5 w-3.5" />
            </button>
          </div>
        ) : (
          <div
            onDragEnter={(e) => handleDrag(e, slot)}
            onDragLeave={(e) => handleDrag(e, slot)}
            onDragOver={(e) => handleDrag(e, slot)}
            onDrop={(e) => handleDrop(e, slot)}
            onClick={() => inputRef.current?.click()}
            className={`h-44 rounded-xl border-2 border-dashed flex flex-col items-center justify-center gap-3 cursor-pointer transition-all text-center p-4 ${
              isActive
                ? "border-[#D4AF37] bg-white/5 text-[#D4AF37]"
                : "border-white/10 hover:border-white/20 text-white/40 hover:bg-white/5"
            }`}
          >
            <Upload className="h-6 w-6 text-[#D4AF37]/60" />
            <p className="text-[10px] text-white/40 leading-relaxed">Перетягніть або<br/>натисніть для вибору</p>
            <button
              type="button"
              onClick={(e) => { e.stopPropagation(); setCameraTarget(slot); }}
              className="flex items-center gap-1.5 px-3 py-1.5 bg-white/5 hover:bg-white/10 border border-white/10 text-white/60 hover:text-white text-[10px] font-mono rounded-lg transition-all cursor-pointer"
            >
              <Camera className="h-3 w-3" /> Камера
            </button>
          </div>
        )}
        <input
          type="file"
          ref={inputRef}
          accept="image/*"
          className="hidden"
          onChange={(e) => { if (e.target.files?.[0]) processFile(e.target.files[0], slot); }}
        />
      </div>
    );
  };

  return (
    <div className="bg-[#121214] border border-white/5 rounded-3xl p-6 flex flex-col gap-6" id="coin-upload-panel">
      <div>
        <h2 className="text-lg font-semibold text-white font-sans tracking-tight flex items-center gap-2">
          Завантаження та Знімок
        </h2>
        <p className="text-xs text-white/40 mt-0.5">
          Додайте аверс і/або реверс для точнішого визначення
        </p>
      </div>

      <canvas ref={canvasRef} className="hidden" />

      {/* Camera overlay */}
      {cameraTarget && (
        <div className="relative h-80 w-full bg-black rounded-2xl overflow-hidden border border-white/10">
          <video ref={videoRef} playsInline muted className="h-full w-full object-cover" />
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <div className="border-[3px] border-dashed border-[#D4AF37]/80 w-52 h-52 rounded-full animate-pulse flex items-center justify-center">
              <div className="border border-[#D4AF37]/30 w-[95%] h-[95%] rounded-full" />
            </div>
            <div className="absolute bottom-6 bg-black/80 border border-white/10 text-[#D4AF37] text-[10px] px-3 py-1 font-mono rounded-full uppercase tracking-widest">
              {cameraTarget === "obverse" ? "Аверс" : "Реверс"} — помістіть монету по центру
            </div>
          </div>
          <div className="absolute bottom-4 left-0 right-0 px-4 flex justify-between items-center pointer-events-auto">
            <button
              type="button"
              onClick={() => { setCameraTarget(null); setCameraError(null); }}
              className="bg-white/5 hover:bg-white/10 text-white/80 px-4 py-2 text-xs rounded-xl border border-white/10 flex items-center gap-1.5 transition-all cursor-pointer"
            >
              <StopCircle className="h-4 w-4" /> Скасувати
            </button>
            <button
              type="button"
              onClick={captureFrame}
              className="bg-[#D4AF37] hover:bg-[#c4a030] text-[#0A0A0B] font-bold px-5 py-2.5 rounded-2xl flex items-center gap-2 shadow-lg shadow-[#D4AF37]/20 hover:scale-[1.02] transition-transform cursor-pointer"
            >
              <Camera className="h-5 w-5" /> Зробити знімок
            </button>
          </div>
        </div>
      )}

      {/* Two-slot workspace */}
      {!cameraTarget && (
        <div className="grid grid-cols-2 gap-4">
          <SlotCard slot="obverse" image={obverseImage} label="Аверс (лицьова сторона)" />
          <SlotCard slot="reverse" image={reverseImage} label="Реверс (зворотна сторона)" />
        </div>
      )}

      {/* Recognize button */}
      {!cameraTarget && (
        <button
          type="button"
          onClick={handleRecognizeClick}
          disabled={!hasAny || isRecognizing}
          className="w-full bg-[#D4AF37] hover:bg-[#c4a030] active:scale-[99%] text-[#0A0A0B] font-bold shadow-lg shadow-[#D4AF37]/20 disabled:scale-100 px-6 py-3.5 rounded-2xl text-sm flex items-center justify-center gap-2 transition-transform disabled:opacity-40 disabled:cursor-not-allowed cursor-pointer"
        >
          {isRecognizing ? (
            <><RefreshCw className="h-5 w-5 animate-spin" /> ШІ аналізує деталі монети…</>
          ) : (
            <><Sparkles className="h-5 w-5 fill-[#0A0A0B]" />
              {obverseImage && reverseImage
                ? "Сканувати обидві сторони (AI)"
                : "Сканувати за допомогою AI (Gemini)"}
            </>
          )}
        </button>
      )}

      {/* Errors */}
      {(cameraError || recognitionError) && (
        <div className="p-4 bg-red-500/10 border border-red-500/20 rounded-2xl text-red-400 text-xs flex gap-3 items-start animate-fade-in">
          <AlertCircle className="h-5 w-5 shrink-0 mt-0.5" />
          <div>
            <span className="font-semibold block mb-0.5">Помилка виконання</span>
            <span className="leading-relaxed">{cameraError || recognitionError}</span>
          </div>
        </div>
      )}

      <div className="border border-[#D4AF37]/10 bg-[#D4AF37]/5 p-4 rounded-xl flex items-start gap-3">
        <Sparkles className="h-5 w-5 text-[#D4AF37] shrink-0 mt-0.5" />
        <div className="text-xs">
          <p className="font-semibold text-white/80">Як працює розпізнавання?</p>
          <p className="text-white/50 leading-relaxed mt-1">
            Фото передається до моделі <strong>Gemini</strong>. Надання двох сторін значно підвищує точність — ШІ бачить герб, номінал, рік та метал одночасно.
          </p>
        </div>
      </div>
    </div>
  );
}
