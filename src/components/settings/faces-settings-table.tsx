"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, RefreshCcw, Save } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import type { WarehouseFace } from "@/lib/types/database";

type FacesApiResponse = {
  data: WarehouseFace[];
  error?: string;
};

type SyncResponse = {
  created: number;
  reactivated: number;
  deactivated: number;
  error?: string;
};

export function FacesSettingsTable() {
  const [faces, setFaces] = useState<WarehouseFace[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [isSyncing, setIsSyncing] = useState(false);
  const [savingFaceNo, setSavingFaceNo] = useState<number | null>(null);

  const loadFaces = useCallback(async () => {
    setIsLoading(true);
    try {
      const response = await fetch("/api/admin/faces", { cache: "no-store" });
      const payload = (await response.json()) as FacesApiResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "선반 설정을 불러오지 못했습니다.");
      }

      setFaces(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "선반 설정을 불러오지 못했습니다."
      );
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadFaces();
  }, [loadFaces]);

  const sortedFaces = useMemo(
    () => [...faces].sort((a, b) => a.face_no - b.face_no),
    [faces]
  );

  function updateField(
    faceNo: number,
    field: "bay_count" | "level_count",
    value: string
  ) {
    const parsed = Number(value);
    setFaces((prev) =>
      prev.map((face) =>
        face.face_no === faceNo
          ? {
              ...face,
              [field]: Number.isFinite(parsed) ? Math.max(1, parsed) : 1,
            }
          : face
      )
    );
  }

  async function saveRow(face: WarehouseFace) {
    setSavingFaceNo(face.face_no);
    try {
      const response = await fetch(`/api/admin/faces/${face.face_no}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          bay_count: face.bay_count,
          level_count: face.level_count,
        }),
      });

      const payload = (await response.json()) as {
        data?: WarehouseFace;
        error?: string;
      };

      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "저장에 실패했습니다.");
      }

      setFaces((prev) =>
        prev.map((item) => (item.face_no === face.face_no ? payload.data! : item))
      );
      toast.success(`선반 ${face.face_no} 설정이 저장되었습니다.`);
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "저장에 실패했습니다.");
    } finally {
      setSavingFaceNo(null);
    }
  }

  async function syncLocations() {
    setIsSyncing(true);
    try {
      const response = await fetch("/api/admin/locations/sync", {
        method: "POST",
      });
      const payload = (await response.json()) as SyncResponse;

      if (!response.ok) {
        throw new Error(payload.error ?? "동기화에 실패했습니다.");
      }

      toast.success(
        `위치 생성 완료: 신규 ${payload.created} / 재활성 ${payload.reactivated} / 비활성 ${payload.deactivated}`
      );
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "위치 생성/갱신에 실패했습니다."
      );
    } finally {
      setIsSyncing(false);
    }
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between">
        <CardTitle className="text-base">선반(면) 설정</CardTitle>
        <Button onClick={syncLocations} disabled={isSyncing || isLoading}>
          {isSyncing ? (
            <Loader2 className="mr-2 size-4 animate-spin" />
          ) : (
            <RefreshCcw className="mr-2 size-4" />
          )}
          위치 생성/갱신
        </Button>
      </CardHeader>
      <CardContent>
        {isLoading ? (
          <div className="py-10 text-center text-sm text-muted-foreground">
            선반 설정을 불러오는 중입니다...
          </div>
        ) : (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>선반</TableHead>
                <TableHead>베이 수</TableHead>
                <TableHead>단 수</TableHead>
                <TableHead className="text-right">저장</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {sortedFaces.map((face) => (
                <TableRow key={face.id}>
                  <TableCell className="font-medium">{face.name}</TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={99}
                      value={face.bay_count}
                      onChange={(event) =>
                        updateField(face.face_no, "bay_count", event.target.value)
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell>
                    <Input
                      type="number"
                      min={1}
                      max={10}
                      value={face.level_count}
                      onChange={(event) =>
                        updateField(face.face_no, "level_count", event.target.value)
                      }
                      className="w-24"
                    />
                  </TableCell>
                  <TableCell className="text-right">
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => saveRow(face)}
                      disabled={savingFaceNo === face.face_no}
                    >
                      {savingFaceNo === face.face_no ? (
                        <Loader2 className="mr-2 size-3.5 animate-spin" />
                      ) : (
                        <Save className="mr-2 size-3.5" />
                      )}
                      저장
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}
