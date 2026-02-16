"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Html5Qrcode } from "html5-qrcode";
import { Camera, CameraOff, Upload, Zap, ZapOff } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QrScannerProps {
  onScan: (decodedText: string) => void;
  onError?: (error: string) => void;
}

export function QrScanner({ onScan, onError }: QrScannerProps) {
  const scannerRef = useRef<Html5Qrcode | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [permissionDenied, setPermissionDenied] = useState(false);
  const [torchOn, setTorchOn] = useState(false);
  const [hasTorch, setHasTorch] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      stopScanner();
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const stopScanner = useCallback(async () => {
    try {
      if (scannerRef.current?.isScanning) {
        await scannerRef.current.stop();
      }
      scannerRef.current?.clear();
    } catch {
      // ignore cleanup errors
    }
    scannerRef.current = null;
    if (mountedRef.current) {
      setIsScanning(false);
      setTorchOn(false);
      setHasTorch(false);
    }
  }, []);

  async function startScanner() {
    try {
      const scanner = new Html5Qrcode("qr-reader");
      scannerRef.current = scanner;

      await scanner.start(
        { facingMode: "environment" },
        {
          fps: 10,
          qrbox: { width: 250, height: 250 },
          aspectRatio: 1.0,
        },
        (decodedText) => {
          // Vibrate on successful scan if available
          if (navigator.vibrate) navigator.vibrate(100);
          onScan(decodedText);
          stopScanner();
        },
        () => {
          // ignore scan failures (no QR in frame)
        }
      );

      if (mountedRef.current) {
        setIsScanning(true);
        setPermissionDenied(false);

        // Check torch availability
        try {
          const caps = scanner.getRunningTrackCameraCapabilities();
          if (caps.torchFeature().isSupported()) {
            setHasTorch(true);
          }
        } catch {
          // torch check not critical
        }
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      if (
        message.includes("Permission") ||
        message.includes("NotAllowedError")
      ) {
        setPermissionDenied(true);
      }
      onError?.(message);
    }
  }

  async function toggleTorch() {
    if (!scannerRef.current) return;
    try {
      const caps = scannerRef.current.getRunningTrackCameraCapabilities();
      const newState = !torchOn;
      await caps.torchFeature().apply(newState);
      setTorchOn(newState);
    } catch {
      // ignore torch errors
    }
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const scanner = new Html5Qrcode("qr-reader-file");
      const result = await scanner.scanFile(file, true);
      if (navigator.vibrate) navigator.vibrate(100);
      onScan(result);
      scanner.clear();
    } catch {
      onError?.("QR 코드를 인식할 수 없습니다");
    }

    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  }

  if (permissionDenied) {
    return (
      <div className="flex flex-col items-center justify-center gap-4 rounded-xl border border-dashed p-8 text-center">
        <div className="flex size-14 items-center justify-center rounded-full bg-destructive/10">
          <CameraOff className="size-6 text-destructive" />
        </div>
        <div>
          <p className="font-medium">카메라 권한이 필요합니다</p>
          <p className="mt-1 text-sm text-muted-foreground">
            브라우저 설정에서 카메라 접근을 허용해 주세요
          </p>
        </div>
        <div className="flex gap-2">
          <Button variant="outline" onClick={startScanner}>
            다시 시도
          </Button>
          <Button
            variant="outline"
            onClick={() => fileInputRef.current?.click()}
          >
            <Upload className="mr-2 size-4" />
            이미지 업로드
          </Button>
        </div>
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileUpload}
        />
        <div id="qr-reader-file" className="hidden" />
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center gap-4">
      {/* Scanner viewport */}
      <div className="relative w-full overflow-hidden rounded-xl border bg-black">
        <div id="qr-reader" className="w-full" />

        {/* Scanning frame overlay */}
        {isScanning && (
          <div className="pointer-events-none absolute inset-0 flex items-center justify-center">
            {/* Dimmed edges */}
            <div className="absolute inset-0 bg-black/40" />
            {/* Clear center window */}
            <div className="relative size-[250px]">
              <div className="absolute inset-0 bg-transparent" style={{
                boxShadow: "0 0 0 9999px rgba(0,0,0,0.4)"
              }} />
              {/* Corner brackets */}
              <div className="animate-corner-pulse">
                {/* Top-left */}
                <div className="absolute -top-px -left-px h-8 w-8 border-t-2 border-l-2 border-primary rounded-tl-sm" />
                {/* Top-right */}
                <div className="absolute -top-px -right-px h-8 w-8 border-t-2 border-r-2 border-primary rounded-tr-sm" />
                {/* Bottom-left */}
                <div className="absolute -bottom-px -left-px h-8 w-8 border-b-2 border-l-2 border-primary rounded-bl-sm" />
                {/* Bottom-right */}
                <div className="absolute -bottom-px -right-px h-8 w-8 border-b-2 border-r-2 border-primary rounded-br-sm" />
              </div>
              {/* Scanning line */}
              <div className="absolute left-2 right-2 h-0.5 bg-gradient-to-r from-transparent via-primary to-transparent animate-scan-line" />
            </div>
          </div>
        )}

        {/* Camera off placeholder */}
        {!isScanning && (
          <div className="flex aspect-square w-full items-center justify-center bg-muted/50">
            <div className="flex flex-col items-center gap-3 text-center">
              <div className="flex size-14 items-center justify-center rounded-full bg-primary/10">
                <Camera className="size-6 text-primary" />
              </div>
              <div>
                <p className="text-sm font-medium">바코드 스캔 준비</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  카메라를 시작하여 바코드를 스캔하세요
                </p>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        {isScanning ? (
          <>
            <Button variant="destructive" size="sm" onClick={stopScanner}>
              <CameraOff className="mr-1.5 size-4" />
              중지
            </Button>
            {hasTorch && (
              <Button
                variant={torchOn ? "secondary" : "outline"}
                size="sm"
                onClick={toggleTorch}
              >
                {torchOn ? (
                  <ZapOff className="mr-1.5 size-4" />
                ) : (
                  <Zap className="mr-1.5 size-4" />
                )}
                플래시
              </Button>
            )}
          </>
        ) : (
          <Button size="sm" onClick={startScanner}>
            <Camera className="mr-1.5 size-4" />
            카메라 스캔
          </Button>
        )}
        <Button
          variant="outline"
          size="sm"
          onClick={() => fileInputRef.current?.click()}
        >
          <Upload className="mr-1.5 size-4" />
          이미지
        </Button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileUpload}
      />
      <div id="qr-reader-file" className="hidden" />
    </div>
  );
}
