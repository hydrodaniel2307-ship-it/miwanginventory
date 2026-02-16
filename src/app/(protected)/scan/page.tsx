"use client";

import Image from "next/image";
import { useState, useTransition, useCallback } from "react";
import {
  ArrowDownToLine,
  ArrowUpFromLine,
  ArrowRightLeft,
  Search,
  ArrowLeft,
  Package,
  MapPin,
  CheckCircle2,
  XCircle,
  Loader2,
  Minus,
  Plus,
  RotateCcw,
  Clock,
  ScanLine,
} from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { ScrollArea } from "@/components/ui/scroll-area";
import { QrScanner } from "@/components/scan/qr-scanner";
import {
  lookupBySku,
  processInbound,
  processOutbound,
  processTransfer,
  type ScanResult,
} from "./actions";

type ScanMode = "inbound" | "outbound" | "transfer" | "lookup";
type PageState = "select" | "scanning" | "result" | "done";

type SessionItem = {
  productName: string;
  sku: string;
  action: string;
  quantity?: number;
  time: string;
  success: boolean;
};

const modeConfig: Record<
  ScanMode,
  {
    label: string;
    desc: string;
    icon: typeof ArrowDownToLine;
    iconBg: string;
    iconColor: string;
    badgeVariant: string;
  }
> = {
  inbound: {
    label: "입고",
    desc: "상품을 스캔하여 재고에 추가합니다",
    icon: ArrowDownToLine,
    iconBg: "bg-emerald-500/10",
    iconColor: "text-emerald-600 dark:text-emerald-400",
    badgeVariant:
      "bg-emerald-500/10 text-emerald-700 dark:text-emerald-400 border-emerald-200/50 dark:border-emerald-800/50",
  },
  outbound: {
    label: "출고",
    desc: "상품을 스캔하여 재고에서 차감합니다",
    icon: ArrowUpFromLine,
    iconBg: "bg-blue-500/10",
    iconColor: "text-blue-600 dark:text-blue-400",
    badgeVariant:
      "bg-blue-500/10 text-blue-700 dark:text-blue-400 border-blue-200/50 dark:border-blue-800/50",
  },
  transfer: {
    label: "이동",
    desc: "상품의 보관 위치를 변경합니다",
    icon: ArrowRightLeft,
    iconBg: "bg-orange-500/10",
    iconColor: "text-orange-600 dark:text-orange-400",
    badgeVariant:
      "bg-orange-500/10 text-orange-700 dark:text-orange-400 border-orange-200/50 dark:border-orange-800/50",
  },
  lookup: {
    label: "조회",
    desc: "상품 정보와 재고 현황을 확인합니다",
    icon: Search,
    iconBg: "bg-purple-500/10",
    iconColor: "text-purple-600 dark:text-purple-400",
    badgeVariant:
      "bg-purple-500/10 text-purple-700 dark:text-purple-400 border-purple-200/50 dark:border-purple-800/50",
  },
};

export default function ScanPage() {
  const [mode, setMode] = useState<ScanMode | null>(null);
  const [pageState, setPageState] = useState<PageState>("select");
  const [scanResult, setScanResult] = useState<ScanResult | null>(null);
  const [quantity, setQuantity] = useState(1);
  const [location, setLocation] = useState("");
  const [isPending, startTransition] = useTransition();
  const [manualSku, setManualSku] = useState("");
  const [resultSuccess, setResultSuccess] = useState(false);
  const [resultMessage, setResultMessage] = useState("");
  const [sessionHistory, setSessionHistory] = useState<SessionItem[]>([]);

  function selectMode(m: ScanMode) {
    setMode(m);
    setPageState("scanning");
    setScanResult(null);
    setQuantity(1);
    setLocation("");
  }

  function goBack() {
    if (pageState === "done") {
      setPageState("scanning");
      setScanResult(null);
      setQuantity(1);
      setLocation("");
    } else if (pageState === "result") {
      setPageState("scanning");
      setScanResult(null);
    } else {
      setMode(null);
      setPageState("select");
    }
  }

  const handleScan = useCallback(
    (decodedText: string) => {
      startTransition(async () => {
        const { data, error } = await lookupBySku(decodedText);
        if (error || !data) {
          toast.error(error ?? "상품을 찾을 수 없습니다");
          return;
        }
        setScanResult(data);
        setLocation(data.inventory?.location ?? "");
        setPageState("result");
      });
    },
    [startTransition]
  );

  function handleManualLookup() {
    if (!manualSku.trim()) return;
    handleScan(manualSku.trim());
  }

  function addToHistory(
    productName: string,
    sku: string,
    action: string,
    success: boolean,
    qty?: number
  ) {
    setSessionHistory((prev) => [
      {
        productName,
        sku,
        action,
        quantity: qty,
        time: new Date().toLocaleTimeString("ko-KR", {
          hour: "2-digit",
          minute: "2-digit",
        }),
        success,
      },
      ...prev,
    ]);
  }

  function handleAction() {
    if (!scanResult || !mode) return;

    startTransition(async () => {
      let result: { error: string | null };
      let actionLabel = "";

      switch (mode) {
        case "inbound":
          result = await processInbound(scanResult.product.id, quantity);
          actionLabel = "입고";
          break;
        case "outbound":
          result = await processOutbound(scanResult.product.id, quantity);
          actionLabel = "출고";
          break;
        case "transfer":
          result = await processTransfer(scanResult.product.id, location);
          actionLabel = "이동";
          break;
        default:
          return;
      }

      if (result.error) {
        toast.error(result.error);
        setResultSuccess(false);
        setResultMessage(result.error);
        addToHistory(
          scanResult.product.name,
          scanResult.product.sku,
          actionLabel,
          false,
          mode !== "transfer" ? quantity : undefined
        );
      } else {
        const msg =
          mode === "inbound"
            ? `${quantity}개 입고 완료`
            : mode === "outbound"
              ? `${quantity}개 출고 완료`
              : `위치 변경 완료: ${location}`;
        toast.success(msg);
        setResultSuccess(true);
        setResultMessage(msg);
        addToHistory(
          scanResult.product.name,
          scanResult.product.sku,
          actionLabel,
          true,
          mode !== "transfer" ? quantity : undefined
        );
      }
      setPageState("done");
    });
  }

  // ─── Mode Selection Screen ───
  if (pageState === "select") {
    return (
      <div className="space-y-6">
        {/* Header */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-400"
          style={{ animationFillMode: "both" }}
        >
          <div className="flex items-center gap-2.5">
            <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
              <ScanLine className="size-[18px] text-primary" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight">스캔</h1>
              <p className="text-[13px] text-muted-foreground">
                바코드 스캔으로 재고를 관리하세요
              </p>
            </div>
          </div>
        </div>

        {/* Mode cards */}
        <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
          {(
            Object.entries(modeConfig) as [
              ScanMode,
              (typeof modeConfig)[ScanMode],
            ][]
          ).map(([key, config], i) => {
            const Icon = config.icon;
            return (
              <button
                key={key}
                onClick={() => selectMode(key)}
                className="group relative flex items-center gap-4 rounded-xl border bg-card p-5 text-left transition-all hover:shadow-md hover:-translate-y-0.5 animate-in fade-in slide-in-from-bottom-2 duration-400"
                style={{
                  animationDelay: `${100 + i * 60}ms`,
                  animationFillMode: "both",
                }}
              >
                <div
                  className={`flex size-11 shrink-0 items-center justify-center rounded-lg ${config.iconBg} transition-transform group-hover:scale-110`}
                >
                  <Icon className={`size-5 ${config.iconColor}`} />
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-[14px]">{config.label}</p>
                  <p className="mt-0.5 text-[12px] text-muted-foreground leading-relaxed">
                    {config.desc}
                  </p>
                </div>
              </button>
            );
          })}
        </div>

        {/* Session history */}
        {sessionHistory.length > 0 && (
          <div
            className="animate-in fade-in duration-300"
            style={{ animationFillMode: "both" }}
          >
            <Card>
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="flex items-center gap-2 text-sm">
                    <Clock className="size-4 text-muted-foreground" />
                    이번 세션 기록
                    <Badge variant="secondary" className="text-[11px]">
                      {sessionHistory.length}건
                    </Badge>
                  </CardTitle>
                  <Button
                    variant="ghost"
                    size="sm"
                    className="h-7 text-[11px] text-muted-foreground"
                    onClick={() => setSessionHistory([])}
                  >
                    <RotateCcw className="mr-1 size-3" />
                    초기화
                  </Button>
                </div>
              </CardHeader>
              <CardContent className="pt-0">
                <ScrollArea className="max-h-[200px]">
                  <div className="space-y-2">
                    {sessionHistory.map((item, i) => (
                      <div
                        key={i}
                        className="flex items-center gap-3 rounded-lg bg-muted/50 px-3 py-2"
                      >
                        <div
                          className={`size-1.5 shrink-0 rounded-full ${item.success ? "bg-emerald-500" : "bg-destructive"}`}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[13px] font-medium truncate">
                            {item.productName}
                          </p>
                          <p className="text-[11px] text-muted-foreground">
                            {item.sku} · {item.action}
                            {item.quantity ? ` ${item.quantity}개` : ""}
                          </p>
                        </div>
                        <span className="text-[11px] text-muted-foreground shrink-0">
                          {item.time}
                        </span>
                      </div>
                    ))}
                  </div>
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        )}
      </div>
    );
  }

  const currentMode = mode ? modeConfig[mode] : null;

  // ─── Scanning Screen ───
  if (pageState === "scanning") {
    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={goBack}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2">
              <h1 className="text-lg font-bold">{currentMode?.label} 스캔</h1>
              {currentMode && (
                <Badge
                  variant="outline"
                  className={`text-[11px] ${currentMode.badgeVariant}`}
                >
                  {currentMode.label}
                </Badge>
              )}
            </div>
            <p className="text-[12px] text-muted-foreground">
              {currentMode?.desc}
            </p>
          </div>
        </div>

        {/* Scanner */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-400"
          style={{ animationDelay: "100ms", animationFillMode: "both" }}
        >
          <QrScanner
            onScan={handleScan}
            onError={(err) => toast.error(`스캔 오류: ${err}`)}
          />
        </div>

        {/* Manual SKU input */}
        <div
          className="animate-in fade-in slide-in-from-bottom-2 duration-400"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          <Card>
            <CardContent className="p-4">
              <p className="mb-2 text-[13px] font-medium text-muted-foreground">
                직접 입력
              </p>
              <div className="flex gap-2">
                <div className="relative flex-1">
                  <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                  <Input
                    placeholder="SKU 또는 바코드 번호"
                    value={manualSku}
                    onChange={(e) => setManualSku(e.target.value)}
                    onKeyDown={(e) =>
                      e.key === "Enter" && handleManualLookup()
                    }
                    className="h-10 pl-9 text-[13px]"
                  />
                </div>
                <Button
                  className="h-10 px-4"
                  onClick={handleManualLookup}
                  disabled={isPending}
                >
                  {isPending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "조회"
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Session counter */}
        {sessionHistory.length > 0 && (
          <div className="flex items-center justify-center gap-2 pt-1 animate-in fade-in duration-300">
            <Badge variant="secondary" className="text-[11px] gap-1">
              <Clock className="size-3" />
              이번 세션: {sessionHistory.length}건 처리
            </Badge>
          </div>
        )}
      </div>
    );
  }

  // ─── Result Screen ───
  if (pageState === "result" && scanResult) {
    const afterQuantity =
      mode === "inbound"
        ? (scanResult.inventory?.quantity ?? 0) + quantity
        : mode === "outbound"
          ? (scanResult.inventory?.quantity ?? 0) - quantity
          : null;

    return (
      <div className="space-y-4">
        {/* Header */}
        <div className="flex items-center gap-3 animate-in fade-in duration-300">
          <Button
            variant="ghost"
            size="icon"
            className="size-9 shrink-0"
            onClick={goBack}
          >
            <ArrowLeft className="size-5" />
          </Button>
          <div className="flex items-center gap-2">
            <h1 className="text-lg font-bold">{currentMode?.label}</h1>
            {currentMode && (
              <Badge
                variant="outline"
                className={`text-[11px] ${currentMode.badgeVariant}`}
              >
                {currentMode.label}
              </Badge>
            )}
          </div>
        </div>

        {/* Product Info Card */}
        <Card
          className="animate-in fade-in slide-in-from-bottom-2 duration-400"
          style={{ animationDelay: "50ms", animationFillMode: "both" }}
        >
          <CardContent className="p-4">
            <div className="flex items-start gap-4">
              {scanResult.product.image_url ? (
                <Image
                  src={scanResult.product.image_url}
                  alt={scanResult.product.name}
                  width={64}
                  height={64}
                  unoptimized={scanResult.product.image_url.startsWith("data:")}
                  className="size-16 rounded-lg border object-cover"
                />
              ) : (
                <div className="flex size-16 items-center justify-center rounded-lg border bg-muted">
                  <Package className="size-6 text-muted-foreground" />
                </div>
              )}
              <div className="flex-1 min-w-0">
                <p className="font-semibold text-[15px] truncate">
                  {scanResult.product.name}
                </p>
                <p className="text-[13px] text-muted-foreground mt-0.5">
                  SKU: {scanResult.product.sku}
                </p>
                {scanResult.categoryName && (
                  <Badge variant="secondary" className="mt-1.5 text-[11px]">
                    {scanResult.categoryName}
                  </Badge>
                )}
              </div>
            </div>

            {/* Inventory status */}
            <div className="mt-4 grid grid-cols-2 gap-3 rounded-lg bg-muted/50 p-3">
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  현재 수량
                </p>
                <p className="text-xl font-bold mt-0.5">
                  {scanResult.inventory?.quantity ?? 0}
                  <span className="text-[13px] font-normal text-muted-foreground ml-0.5">
                    개
                  </span>
                </p>
              </div>
              <div>
                <p className="text-[11px] text-muted-foreground font-medium">
                  보관 위치
                </p>
                <p className="flex items-center gap-1 mt-0.5 text-[14px] font-medium">
                  <MapPin className="size-3.5 text-muted-foreground" />
                  {scanResult.inventory?.location ?? "미지정"}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Action Form */}
        {mode !== "lookup" && (
          <Card
            className="animate-in fade-in slide-in-from-bottom-2 duration-400"
            style={{ animationDelay: "150ms", animationFillMode: "both" }}
          >
            <CardHeader className="pb-3">
              <CardTitle className="text-[14px]">
                {mode === "inbound"
                  ? "입고 수량"
                  : mode === "outbound"
                    ? "출고 수량"
                    : "새 위치 입력"}
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              {(mode === "inbound" || mode === "outbound") && (
                <>
                  {/* Quantity stepper */}
                  <div className="flex items-center justify-center gap-3">
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-12 rounded-xl shrink-0"
                      onClick={() => setQuantity((q) => Math.max(1, q - 1))}
                      disabled={quantity <= 1}
                    >
                      <Minus className="size-5" />
                    </Button>
                    <Input
                      type="number"
                      min="1"
                      value={quantity}
                      onChange={(e) =>
                        setQuantity(Math.max(1, parseInt(e.target.value) || 1))
                      }
                      className="h-12 w-24 text-center text-xl font-bold tabular-nums"
                    />
                    <Button
                      variant="outline"
                      size="icon"
                      className="size-12 rounded-xl shrink-0"
                      onClick={() => setQuantity((q) => q + 1)}
                    >
                      <Plus className="size-5" />
                    </Button>
                  </div>

                  {/* Quick quantity buttons */}
                  <div className="flex flex-wrap justify-center gap-1.5">
                    {[1, 5, 10, 25, 50, 100].map((n) => (
                      <Button
                        key={n}
                        variant={quantity === n ? "secondary" : "outline"}
                        size="sm"
                        className="h-8 min-w-[44px] text-[12px]"
                        onClick={() => setQuantity(n)}
                      >
                        {n}
                      </Button>
                    ))}
                  </div>

                  {/* Result preview */}
                  <div className="flex items-center justify-between rounded-lg bg-muted/50 px-4 py-2.5">
                    <span className="text-[13px] text-muted-foreground">
                      {mode === "inbound" ? "입고 후" : "출고 후"} 예상 수량
                    </span>
                    <span
                      className={`text-[15px] font-bold tabular-nums ${
                        afterQuantity !== null && afterQuantity < 0
                          ? "text-destructive"
                          : "text-foreground"
                      }`}
                    >
                      {afterQuantity}개
                    </span>
                  </div>
                </>
              )}

              {mode === "transfer" && (
                <div className="space-y-2">
                  <div className="relative">
                    <MapPin className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-muted-foreground/60" />
                    <Input
                      value={location}
                      onChange={(e) => setLocation(e.target.value)}
                      placeholder="새 위치 (예: A-1-3)"
                      className="h-11 pl-9 text-[14px]"
                    />
                  </div>
                  {scanResult.inventory?.location && (
                    <p className="text-[12px] text-muted-foreground pl-1">
                      현재 위치: {scanResult.inventory.location}
                    </p>
                  )}
                </div>
              )}

              <Button
                className="w-full h-11 text-[13px] font-semibold"
                onClick={handleAction}
                disabled={isPending}
              >
                {isPending ? (
                  <Loader2 className="mr-2 size-4 animate-spin" />
                ) : null}
                {mode === "inbound"
                  ? "입고 처리"
                  : mode === "outbound"
                    ? "출고 처리"
                    : "위치 변경"}
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Lookup mode: back button */}
        {mode === "lookup" && (
          <div
            className="animate-in fade-in duration-400"
            style={{ animationDelay: "150ms", animationFillMode: "both" }}
          >
            <Button variant="outline" className="w-full h-10" onClick={goBack}>
              <Search className="mr-2 size-4" />
              다른 상품 조회
            </Button>
          </div>
        )}
      </div>
    );
  }

  // ─── Done Screen ───
  if (pageState === "done") {
    return (
      <div className="flex flex-col items-center justify-center py-16 text-center">
        <div
          className={`flex size-16 items-center justify-center rounded-full animate-scan-success-pop ${
            resultSuccess ? "bg-emerald-500/10" : "bg-destructive/10"
          }`}
        >
          {resultSuccess ? (
            <CheckCircle2 className="size-8 text-emerald-600 dark:text-emerald-400" />
          ) : (
            <XCircle className="size-8 text-destructive" />
          )}
        </div>
        <h2
          className="mt-4 text-lg font-semibold animate-in fade-in duration-300"
          style={{ animationDelay: "200ms", animationFillMode: "both" }}
        >
          {resultSuccess ? "처리 완료" : "처리 실패"}
        </h2>
        <p
          className="mt-1 text-[13px] text-muted-foreground animate-in fade-in duration-300"
          style={{ animationDelay: "300ms", animationFillMode: "both" }}
        >
          {resultMessage}
        </p>

        <div
          className="mt-8 flex gap-3 animate-in fade-in slide-in-from-bottom-2 duration-400"
          style={{ animationDelay: "400ms", animationFillMode: "both" }}
        >
          <Button variant="outline" className="h-10" onClick={goBack}>
            <ScanLine className="mr-1.5 size-4" />
            계속 스캔
          </Button>
          <Button
            variant="outline"
            className="h-10"
            onClick={() => {
              setMode(null);
              setPageState("select");
              setScanResult(null);
            }}
          >
            모드 선택
          </Button>
        </div>

        {/* Session summary */}
        {sessionHistory.length > 0 && (
          <div
            className="mt-8 w-full max-w-sm text-left animate-in fade-in duration-400"
            style={{ animationDelay: "500ms", animationFillMode: "both" }}
          >
            <p className="text-[12px] font-medium text-muted-foreground mb-2 flex items-center gap-1.5">
              <Clock className="size-3" />
              이번 세션: {sessionHistory.length}건
            </p>
            <div className="space-y-1.5">
              {sessionHistory.slice(0, 3).map((item, i) => (
                <div
                  key={i}
                  className="flex items-center gap-2 rounded-lg bg-muted/50 px-3 py-2"
                >
                  <div
                    className={`size-1.5 shrink-0 rounded-full ${item.success ? "bg-emerald-500" : "bg-destructive"}`}
                  />
                  <span className="text-[12px] truncate flex-1">
                    {item.productName}
                  </span>
                  <span className="text-[11px] text-muted-foreground shrink-0">
                    {item.action}
                    {item.quantity ? ` ${item.quantity}개` : ""}
                  </span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    );
  }

  return null;
}
