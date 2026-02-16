"use client";

import { useState, useEffect, useRef } from "react";
import { useForm } from "react-hook-form";
import Image from "next/image";
import { Loader2, Plus, Upload, X, ImageIcon } from "lucide-react";
import { toast } from "sonner";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import type { Product, Category } from "@/lib/types/database";
import {
  createProduct,
  updateProduct,
  createCategory,
  uploadProductImage,
} from "./actions";

interface FormValues {
  name: string;
  sku: string;
  description: string;
  category_id: string;
  unit_price: string;
  cost_price: string;
}

interface ProductFormDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  product?: Product | null;
  categories: Category[];
  onSuccess: () => void;
}

export function ProductFormDialog({
  open,
  onOpenChange,
  product,
  categories,
  onSuccess,
}: ProductFormDialogProps) {
  const [isLoading, setIsLoading] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState("");
  const [isCreatingCategory, setIsCreatingCategory] = useState(false);
  const [showCategoryInput, setShowCategoryInput] = useState(false);
  const [localCategories, setLocalCategories] = useState<Category[]>(categories);
  const [imageFile, setImageFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const isEditing = !!product;

  const {
    register,
    handleSubmit,
    reset,
    setValue,
    formState: { errors },
  } = useForm<FormValues>({
    defaultValues: {
      name: "",
      sku: "",
      description: "",
      category_id: "",
      unit_price: "0",
      cost_price: "0",
    },
  });

  useEffect(() => {
    setLocalCategories(categories);
  }, [categories]);

  useEffect(() => {
    if (open) {
      reset({
        name: product?.name ?? "",
        sku: product?.sku ?? "",
        description: product?.description ?? "",
        category_id: product?.category_id ?? "",
        unit_price: String(product?.unit_price ?? 0),
        cost_price: String(product?.cost_price ?? 0),
      });
      setImageFile(null);
      setImagePreview(product?.image_url ?? null);
      setShowCategoryInput(false);
      setNewCategoryName("");
    }
  }, [open, product, reset]);

  function handleImageSelect(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("이미지 파일만 업로드 가능합니다");
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      toast.error("파일 크기는 5MB 이하여야 합니다");
      return;
    }

    setImageFile(file);
    const reader = new FileReader();
    reader.onload = (ev) => setImagePreview(ev.target?.result as string);
    reader.readAsDataURL(file);
  }

  function removeImage() {
    setImageFile(null);
    setImagePreview(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }

  async function handleCreateCategory() {
    const name = newCategoryName.trim();
    if (!name) return;

    setIsCreatingCategory(true);
    const result = await createCategory(name);
    setIsCreatingCategory(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    if (result.data) {
      setLocalCategories((prev) =>
        [...prev, result.data!].sort((a, b) => a.name.localeCompare(b.name))
      );
      setValue("category_id", result.data.id);
      toast.success(`"${name}" 카테고리가 추가되었습니다`);
    }
    setNewCategoryName("");
    setShowCategoryInput(false);
  }

  async function onSubmit(values: FormValues) {
    setIsLoading(true);

    let imageUrl = product?.image_url;

    // Upload new image via server action
    if (imageFile) {
      const fd = new FormData();
      fd.append("file", imageFile);
      const uploadResult = await uploadProductImage(fd);
      if (uploadResult.error || !uploadResult.url) {
        toast.error(uploadResult.error ?? "이미지 업로드에 실패했습니다");
        setIsLoading(false);
        return;
      }
      imageUrl = uploadResult.url;
    } else if (!imagePreview) {
      imageUrl = undefined;
    }

    const payload = {
      name: values.name,
      sku: values.sku,
      description: values.description || undefined,
      category_id: values.category_id || undefined,
      unit_price: Number(values.unit_price) || 0,
      cost_price: Number(values.cost_price) || 0,
      image_url: imageUrl,
    };

    const result = isEditing
      ? await updateProduct(product.id, payload)
      : await createProduct(payload);

    setIsLoading(false);

    if (result.error) {
      toast.error(result.error);
      return;
    }

    toast.success(isEditing ? "상품이 수정되었습니다" : "상품이 등록되었습니다");
    onOpenChange(false);
    onSuccess();
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>{isEditing ? "상품 수정" : "상품 등록"}</DialogTitle>
          <DialogDescription>
            {isEditing
              ? "상품 정보를 수정하세요"
              : "새 상품 정보를 입력하세요"}
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
          {/* Image Upload */}
          <div className="space-y-2">
            <Label>상품 이미지</Label>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/png,image/jpeg,image/webp"
              onChange={handleImageSelect}
              className="hidden"
            />
            {imagePreview ? (
              <div className="relative inline-block">
                <div className="relative h-32 w-32 overflow-hidden rounded-lg border">
                  <Image
                    src={imagePreview}
                    alt="미리보기"
                    fill
                    className="object-cover"
                    unoptimized={imagePreview.startsWith("data:")}
                  />
                </div>
                <button
                  type="button"
                  onClick={removeImage}
                  className="absolute -right-2 -top-2 rounded-full bg-destructive p-1 text-destructive-foreground shadow-sm hover:bg-destructive/90"
                >
                  <X className="size-3" />
                </button>
              </div>
            ) : (
              <button
                type="button"
                onClick={() => fileInputRef.current?.click()}
                className="flex h-32 w-32 flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed border-muted-foreground/25 text-muted-foreground transition-colors hover:border-muted-foreground/50 hover:text-foreground"
              >
                <ImageIcon className="size-8" />
                <span className="text-xs">이미지 업로드</span>
              </button>
            )}
            {imagePreview && (
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => fileInputRef.current?.click()}
                className="mt-2"
              >
                <Upload className="mr-2 size-3" />
                변경
              </Button>
            )}
          </div>

          {/* Product Name */}
          <div className="space-y-2">
            <Label htmlFor="name">상품명</Label>
            <Input
              id="name"
              placeholder="상품명을 입력하세요"
              disabled={isLoading}
              {...register("name", { required: "상품명을 입력해주세요" })}
            />
            {errors.name && (
              <p className="text-sm text-destructive">{errors.name.message}</p>
            )}
          </div>

          {/* SKU */}
          <div className="space-y-2">
            <Label htmlFor="sku">SKU</Label>
            <Input
              id="sku"
              placeholder="SKU-001"
              disabled={isLoading}
              {...register("sku", { required: "SKU를 입력해주세요" })}
            />
            {errors.sku && (
              <p className="text-sm text-destructive">{errors.sku.message}</p>
            )}
          </div>

          {/* Category with inline creation */}
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>카테고리</Label>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-auto px-2 py-1 text-xs"
                onClick={() => setShowCategoryInput(!showCategoryInput)}
                disabled={isLoading}
              >
                <Plus className="mr-1 size-3" />
                {showCategoryInput ? "취소" : "새 카테고리"}
              </Button>
            </div>

            {showCategoryInput && (
              <div className="flex gap-2">
                <Input
                  placeholder="카테고리명 (예: 젤리, 쌀과자)"
                  value={newCategoryName}
                  onChange={(e) => setNewCategoryName(e.target.value)}
                  disabled={isCreatingCategory}
                  onKeyDown={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      handleCreateCategory();
                    }
                  }}
                />
                <Button
                  type="button"
                  size="sm"
                  onClick={handleCreateCategory}
                  disabled={isCreatingCategory || !newCategoryName.trim()}
                >
                  {isCreatingCategory ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    "추가"
                  )}
                </Button>
              </div>
            )}

            <Select
              defaultValue={product?.category_id ?? ""}
              onValueChange={(val) => setValue("category_id", val)}
              disabled={isLoading}
            >
              <SelectTrigger>
                <SelectValue placeholder="카테고리 선택" />
              </SelectTrigger>
              <SelectContent>
                {localCategories.map((cat) => (
                  <SelectItem key={cat.id} value={cat.id}>
                    {cat.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* Prices - step=10 */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="unit_price">판매가 (₩)</Label>
              <Input
                id="unit_price"
                type="number"
                min={0}
                step={10}
                placeholder="0"
                disabled={isLoading}
                {...register("unit_price")}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cost_price">원가 (₩)</Label>
              <Input
                id="cost_price"
                type="number"
                min={0}
                step={10}
                placeholder="0"
                disabled={isLoading}
                {...register("cost_price")}
              />
            </div>
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label htmlFor="description">설명</Label>
            <Textarea
              id="description"
              placeholder="상품 설명 (선택사항)"
              rows={3}
              disabled={isLoading}
              {...register("description")}
            />
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              취소
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  저장 중...
                </>
              ) : isEditing ? (
                "수정"
              ) : (
                "등록"
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
