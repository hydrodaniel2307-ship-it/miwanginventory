"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/admin";
import type { Product, Category } from "@/lib/types/database";

export async function uploadProductImage(formData: FormData) {
  const file = formData.get("file") as File;
  if (!file) return { url: null, error: "파일이 없습니다" };

  const supabase = createClient();
  const bytes = await file.arrayBuffer();
  const buffer = Buffer.from(bytes);
  const ext = file.name.split(".").pop() ?? "png";
  const fileName = `${crypto.randomUUID()}.${ext}`;

  // Try Supabase Storage upload
  const { error } = await supabase.storage
    .from("product-images")
    .upload(fileName, buffer, {
      contentType: file.type,
      cacheControl: "3600",
    });

  if (!error) {
    const { data } = supabase.storage
      .from("product-images")
      .getPublicUrl(fileName);
    return { url: data.publicUrl, error: null };
  }

  // Fallback: base64 data URL (Storage 버킷 없어도 작동)
  const base64 = buffer.toString("base64");
  const dataUrl = `data:${file.type};base64,${base64}`;
  return { url: dataUrl, error: null };
}

export async function getProducts(): Promise<Product[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function getProductsWithCategory() {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("products")
    .select("*, category:categories(*)")
    .order("created_at", { ascending: false });

  if (error) throw new Error(error.message);
  return (data ?? []) as (Product & { category: Category | null })[];
}

export async function getCategories(): Promise<Category[]> {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .select("*")
    .order("name");

  if (error) throw new Error(error.message);
  return data ?? [];
}

export async function createCategory(name: string) {
  const supabase = createClient();
  const { data, error } = await supabase
    .from("categories")
    .insert({ name: name.trim() })
    .select()
    .single();

  if (error) {
    if (error.code === "23505") {
      return { data: null, error: "이미 존재하는 카테고리입니다" };
    }
    return { data: null, error: error.message };
  }

  revalidatePath("/products");
  return { data: data as Category, error: null };
}

export async function createProduct(formData: {
  name: string;
  sku: string;
  description?: string;
  category_id?: string;
  unit_price: number;
  cost_price: number;
  image_url?: string;
}) {
  const supabase = createClient();
  const { error } = await supabase.from("products").insert({
    name: formData.name,
    sku: formData.sku,
    description: formData.description || null,
    category_id: formData.category_id || null,
    unit_price: formData.unit_price,
    cost_price: formData.cost_price,
    image_url: formData.image_url || null,
  });

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 존재하는 SKU입니다" };
    }
    return { error: error.message };
  }

  revalidatePath("/products");
  return { error: null };
}

export async function updateProduct(
  id: string,
  formData: {
    name: string;
    sku: string;
    description?: string;
    category_id?: string;
    unit_price: number;
    cost_price: number;
    image_url?: string;
  }
) {
  const supabase = createClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: formData.name,
      sku: formData.sku,
      description: formData.description || null,
      category_id: formData.category_id || null,
      unit_price: formData.unit_price,
      cost_price: formData.cost_price,
      image_url: formData.image_url || null,
    })
    .eq("id", id);

  if (error) {
    if (error.code === "23505") {
      return { error: "이미 존재하는 SKU입니다" };
    }
    return { error: error.message };
  }

  revalidatePath("/products");
  return { error: null };
}

export async function deleteProduct(id: string) {
  const supabase = createClient();
  const { error } = await supabase.from("products").delete().eq("id", id);

  if (error) return { error: error.message };

  revalidatePath("/products");
  return { error: null };
}
