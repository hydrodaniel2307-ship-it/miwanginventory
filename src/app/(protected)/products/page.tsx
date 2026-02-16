"use client";

import { useState, useEffect, useCallback } from "react";
import Image from "next/image";
import {
  Plus,
  Search,
  Pencil,
  Trash2,
  Package,
  ImageIcon,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";

import type { Product, Category } from "@/lib/types/database";
import { getProductsWithCategory, getCategories } from "./actions";
import { ProductFormDialog } from "./product-form-dialog";
import { DeleteProductDialog } from "./delete-product-dialog";

type ProductWithCategory = Product & { category: Category | null };

export default function ProductsPage() {
  const [products, setProducts] = useState<ProductWithCategory[]>([]);
  const [categories, setCategories] = useState<Category[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");

  // Dialog states
  const [formOpen, setFormOpen] = useState(false);
  const [deleteOpen, setDeleteOpen] = useState(false);
  const [editingProduct, setEditingProduct] =
    useState<ProductWithCategory | null>(null);
  const [deletingProduct, setDeletingProduct] =
    useState<ProductWithCategory | null>(null);

  const fetchData = useCallback(async () => {
    setIsLoading(true);
    try {
      const [productsData, categoriesData] = await Promise.all([
        getProductsWithCategory(),
        getCategories(),
      ]);
      setProducts(productsData);
      setCategories(categoriesData);
    } catch {
      // Data will be empty on error
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  const filteredProducts = products.filter(
    (p) =>
      p.name.toLowerCase().includes(search.toLowerCase()) ||
      p.sku.toLowerCase().includes(search.toLowerCase()) ||
      (p.category?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  function handleEdit(product: ProductWithCategory) {
    setEditingProduct(product);
    setFormOpen(true);
  }

  function handleDelete(product: ProductWithCategory) {
    setDeletingProduct(product);
    setDeleteOpen(true);
  }

  function handleAddNew() {
    setEditingProduct(null);
    setFormOpen(true);
  }

  const formatPrice = (price: number) =>
    new Intl.NumberFormat("ko-KR", {
      style: "currency",
      currency: "KRW",
      maximumFractionDigits: 0,
    }).format(price);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
            <Package className="size-[18px] text-primary" />
          </div>
          <div>
            <h1 className="text-xl font-bold tracking-tight">상품 관리</h1>
            <p className="text-[13px] text-muted-foreground">
              상품을 등록하고 관리하세요
            </p>
          </div>
        </div>
        <Button onClick={handleAddNew} className="shrink-0">
          <Plus className="mr-2 size-4" />
          상품 등록
        </Button>
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          placeholder="상품명, SKU, 카테고리 검색..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-9"
        />
      </div>

      {/* Product Cards */}
      {isLoading ? (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {Array.from({ length: 8 }).map((_, i) => (
            <Card key={i}>
              <Skeleton className="aspect-square w-full rounded-t-lg rounded-b-none" />
              <CardContent className="space-y-2 p-4">
                <Skeleton className="h-5 w-3/4" />
                <Skeleton className="h-4 w-1/2" />
                <Skeleton className="h-4 w-full" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-lg border border-dashed py-16 text-center">
          <Package className="mb-4 size-12 text-muted-foreground" />
          <h3 className="text-lg font-semibold">
            {search ? "검색 결과가 없습니다" : "등록된 상품이 없습니다"}
          </h3>
          <p className="mt-1 text-sm text-muted-foreground">
            {search
              ? "다른 검색어로 시도해보세요"
              : "첫 번째 상품을 등록해보세요"}
          </p>
          {!search && (
            <Button onClick={handleAddNew} className="mt-4">
              <Plus className="mr-2 size-4" />
              상품 등록
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {filteredProducts.map((product) => (
            <Card
              key={product.id}
              className="group overflow-hidden transition-shadow hover:shadow-md"
            >
              {/* Image */}
              <div className="relative aspect-square w-full bg-muted">
                {product.image_url ? (
                  <Image
                    src={product.image_url}
                    alt={product.name}
                    fill
                    className="object-cover"
                    sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 25vw"
                  />
                ) : (
                  <div className="flex h-full w-full items-center justify-center">
                    <ImageIcon className="size-12 text-muted-foreground/40" />
                  </div>
                )}

                {/* Hover overlay with actions */}
                <div className="absolute inset-0 flex items-center justify-center gap-2 bg-black/0 opacity-0 transition-all group-hover:bg-black/40 group-hover:opacity-100">
                  <Button
                    size="sm"
                    variant="secondary"
                    onClick={() => handleEdit(product)}
                  >
                    <Pencil className="mr-1 size-3" />
                    수정
                  </Button>
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => handleDelete(product)}
                  >
                    <Trash2 className="mr-1 size-3" />
                    삭제
                  </Button>
                </div>

                {/* Category badge */}
                {product.category && (
                  <div className="absolute left-2 top-2">
                    <Badge variant="secondary" className="bg-background/80 backdrop-blur-sm">
                      {product.category.name}
                    </Badge>
                  </div>
                )}
              </div>

              {/* Info */}
              <CardContent className="p-4">
                <h3 className="truncate font-semibold">{product.name}</h3>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {product.sku}
                </p>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-sm font-medium">
                      {formatPrice(product.unit_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">판매가</p>
                  </div>
                  <div className="text-right">
                    <p className="text-sm font-medium text-muted-foreground">
                      {formatPrice(product.cost_price)}
                    </p>
                    <p className="text-xs text-muted-foreground">원가</p>
                  </div>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Dialogs */}
      <ProductFormDialog
        open={formOpen}
        onOpenChange={(open) => {
          setFormOpen(open);
          if (!open) setEditingProduct(null);
        }}
        product={editingProduct}
        categories={categories}
        onSuccess={fetchData}
      />

      <DeleteProductDialog
        open={deleteOpen}
        onOpenChange={(open) => {
          setDeleteOpen(open);
          if (!open) setDeletingProduct(null);
        }}
        product={deletingProduct}
        onSuccess={fetchData}
      />
    </div>
  );
}
