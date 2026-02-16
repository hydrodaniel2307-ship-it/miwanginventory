"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import { Loader2, Plus, Save, Search } from "lucide-react";
import { toast } from "sonner";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";

type AdminProduct = {
  id: string;
  name: string;
  sku: string;
  units_per_box: number;
  active: boolean;
  created_at: string;
  updated_at: string;
};

type ProductListResponse = {
  data: AdminProduct[];
  error?: string;
};

export function ProductsSettingsManager() {
  const [products, setProducts] = useState<AdminProduct[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [creating, setCreating] = useState(false);
  const [savingId, setSavingId] = useState<string | null>(null);
  const [newProduct, setNewProduct] = useState({
    name: "",
    sku: "",
    units_per_box: 1,
    active: true,
  });

  const loadProducts = useCallback(async () => {
    setIsLoading(true);
    try {
      const params = new URLSearchParams();
      if (search.trim()) params.set("q", search.trim());

      const response = await fetch(`/api/admin/products?${params.toString()}`, {
        cache: "no-store",
      });
      const payload = (await response.json()) as ProductListResponse;
      if (!response.ok) {
        throw new Error(payload.error ?? "제품 목록을 불러오지 못했습니다.");
      }
      setProducts(payload.data ?? []);
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "제품 목록을 불러오지 못했습니다."
      );
      setProducts([]);
    } finally {
      setIsLoading(false);
    }
  }, [search]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadProducts();
    }, 200);
    return () => clearTimeout(timer);
  }, [loadProducts]);

  const sortedProducts = useMemo(
    () => [...products].sort((a, b) => a.name.localeCompare(b.name, "ko-KR")),
    [products]
  );

  async function createProduct() {
    if (!newProduct.name.trim() || !newProduct.sku.trim()) {
      toast.error("제품명과 SKU를 입력해 주세요.");
      return;
    }

    setCreating(true);
    try {
      const response = await fetch("/api/admin/products", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(newProduct),
      });

      const payload = (await response.json()) as { data?: AdminProduct; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "제품 생성에 실패했습니다.");
      }

      setProducts((prev) => [payload.data!, ...prev]);
      setNewProduct({
        name: "",
        sku: "",
        units_per_box: 1,
        active: true,
      });
      toast.success("제품이 등록되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "제품 생성에 실패했습니다.");
    } finally {
      setCreating(false);
    }
  }

  async function saveRow(product: AdminProduct) {
    setSavingId(product.id);
    try {
      const response = await fetch(`/api/admin/products/${product.id}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: product.name,
          sku: product.sku,
          units_per_box: product.units_per_box,
          active: product.active,
        }),
      });

      const payload = (await response.json()) as { data?: AdminProduct; error?: string };
      if (!response.ok || !payload.data) {
        throw new Error(payload.error ?? "제품 수정에 실패했습니다.");
      }

      setProducts((prev) =>
        prev.map((row) => (row.id === payload.data!.id ? payload.data! : row))
      );
      toast.success("제품 정보가 저장되었습니다.");
    } catch (error) {
      toast.error(error instanceof Error ? error.message : "제품 수정에 실패했습니다.");
    } finally {
      setSavingId(null);
    }
  }

  function updateProductField(
    id: string,
    field: keyof Pick<AdminProduct, "name" | "sku" | "units_per_box" | "active">,
    value: string | boolean
  ) {
    setProducts((prev) =>
      prev.map((product) =>
        product.id === id
          ? {
              ...product,
              [field]:
                field === "units_per_box" && typeof value === "string"
                  ? Math.max(1, Number(value) || 1)
                  : value,
            }
          : product
      )
    );
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">빠른 추가</CardTitle>
        </CardHeader>
        <CardContent className="grid gap-3 md:grid-cols-5">
          <div className="space-y-1 md:col-span-2">
            <Label>제품명</Label>
            <Input
              value={newProduct.name}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, name: event.target.value }))
              }
              placeholder="제품명"
            />
          </div>
          <div className="space-y-1">
            <Label>SKU</Label>
            <Input
              value={newProduct.sku}
              onChange={(event) =>
                setNewProduct((prev) => ({ ...prev, sku: event.target.value }))
              }
              placeholder="SKU-001"
            />
          </div>
          <div className="space-y-1">
            <Label>박스당입수</Label>
            <Input
              type="number"
              min={1}
              value={newProduct.units_per_box}
              onChange={(event) =>
                setNewProduct((prev) => ({
                  ...prev,
                  units_per_box: Math.max(1, Number(event.target.value) || 1),
                }))
              }
            />
          </div>
          <div className="flex items-end gap-3">
            <div className="flex items-center gap-2 pb-2">
              <Checkbox
                checked={newProduct.active}
                onCheckedChange={(checked) =>
                  setNewProduct((prev) => ({ ...prev, active: checked === true }))
                }
                id="new-product-active"
              />
              <Label htmlFor="new-product-active">활성</Label>
            </div>
            <Button onClick={createProduct} disabled={creating}>
              {creating ? (
                <Loader2 className="mr-2 size-4 animate-spin" />
              ) : (
                <Plus className="mr-2 size-4" />
              )}
              추가
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <div className="relative max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <Input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="SKU/제품명 검색"
              className="pl-9"
            />
          </div>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="py-10 text-center text-sm text-muted-foreground">
              제품 목록을 불러오는 중입니다...
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>SKU</TableHead>
                  <TableHead>제품명</TableHead>
                  <TableHead>박스당입수</TableHead>
                  <TableHead>활성</TableHead>
                  <TableHead className="text-right">저장</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {sortedProducts.map((product) => (
                  <TableRow key={product.id}>
                    <TableCell>
                      <Input
                        value={product.sku}
                        onChange={(event) =>
                          updateProductField(product.id, "sku", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <Input
                        value={product.name}
                        onChange={(event) =>
                          updateProductField(product.id, "name", event.target.value)
                        }
                      />
                    </TableCell>
                    <TableCell className="w-28">
                      <Input
                        type="number"
                        min={1}
                        value={product.units_per_box}
                        onChange={(event) =>
                          updateProductField(
                            product.id,
                            "units_per_box",
                            event.target.value
                          )
                        }
                      />
                    </TableCell>
                    <TableCell>
                      <button
                        type="button"
                        className="inline-flex items-center gap-2"
                        onClick={() =>
                          updateProductField(product.id, "active", !product.active)
                        }
                      >
                        <Checkbox checked={product.active} />
                        <Badge variant={product.active ? "default" : "secondary"}>
                          {product.active ? "활성" : "비활성"}
                        </Badge>
                      </button>
                    </TableCell>
                    <TableCell className="text-right">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => saveRow(product)}
                        disabled={savingId === product.id}
                      >
                        {savingId === product.id ? (
                          <Loader2 className="mr-2 size-3.5 animate-spin" />
                        ) : (
                          <Save className="mr-2 size-3.5" />
                        )}
                        저장
                      </Button>
                    </TableCell>
                  </TableRow>
                ))}
                {sortedProducts.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="h-20 text-center text-muted-foreground">
                      조건에 맞는 제품이 없습니다.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
