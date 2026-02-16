"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod/v4";
import { toast } from "sonner";
import { Loader2, Plus } from "lucide-react";
import { toCanonicalLocationCode } from "@/lib/location-aliases";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@/components/ui/form";

// Location code format: F01-B03-L2 (Face-Bay-Level)
const LOCATION_CODE_REGEX = /^F\d{2}-B\d{2}-L\d{1,2}$/;

const formSchema = z.object({
  product_id: z.string().min(1, { message: "제품을 선택해 주세요." }),
  location_code: z
    .string()
    .regex(LOCATION_CODE_REGEX, {
      message: "위치 코드 형식이 올바르지 않습니다 (예: F01-B03-L2).",
    })
    .trim(),
  quantity: z
    .number({ message: "숫자를 입력해 주세요." })
    .int({ message: "정수를 입력해 주세요." })
    .min(0, { message: "수량은 0 이상이어야 합니다." }),
  min_quantity: z
    .number({ message: "숫자를 입력해 주세요." })
    .int({ message: "정수를 입력해 주세요." })
    .min(0, { message: "최소 수량은 0 이상이어야 합니다." }),
});

type FormValues = z.infer<typeof formSchema>;

type Product = {
  id: string;
  name: string;
  sku: string;
};

interface AddInventoryDialogProps {
  products: Product[];
  onSuccess?: () => void;
}

export function AddInventoryDialog({
  products,
  onSuccess,
}: AddInventoryDialogProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  const form = useForm<FormValues>({
    resolver: zodResolver(formSchema),
    defaultValues: {
      product_id: "",
      location_code: "",
      quantity: 0,
      min_quantity: 0,
    },
  });

  async function onSubmit(values: FormValues) {
    startTransition(async () => {
      try {
        const payload = {
          ...values,
          location_code: toCanonicalLocationCode(values.location_code).toUpperCase(),
        };

        const res = await fetch("/api/admin/inventory", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });

        const data = await res.json();

        if (!res.ok) {
          toast.error(data.error || "재고 추가에 실패했습니다.");
          return;
        }

        toast.success("재고가 추가되었습니다.");
        form.reset();
        setOpen(false);
        router.refresh(); // Refresh server component data
        onSuccess?.();
      } catch (error) {
        toast.error(
          error instanceof Error ? error.message : "재고 추가 중 오류가 발생했습니다."
        );
      }
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button>
          <Plus className="mr-2 size-4" />
          재고 추가
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>재고 추가</DialogTitle>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="product_id"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>제품</FormLabel>
                  <Select
                    onValueChange={field.onChange}
                    defaultValue={field.value}
                    disabled={isPending}
                  >
                    <FormControl>
                      <SelectTrigger>
                        <SelectValue placeholder="제품을 선택하세요" />
                      </SelectTrigger>
                    </FormControl>
                    <SelectContent>
                      {products.length === 0 ? (
                        <div className="py-6 text-center text-sm text-muted-foreground">
                          등록된 제품이 없습니다
                        </div>
                      ) : (
                        products.map((product) => (
                          <SelectItem key={product.id} value={product.id}>
                            {product.name} ({product.sku})
                          </SelectItem>
                        ))
                      )}
                    </SelectContent>
                  </Select>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="location_code"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>위치 코드</FormLabel>
                  <FormControl>
                    <Input
                      placeholder="F01-B03-L2"
                      {...field}
                      disabled={isPending}
                    />
                  </FormControl>
                  <p className="text-[11px] text-muted-foreground">
                    형식: F(면)-B(베이)-L(레벨) 예: F01-B03-L2
                  </p>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="grid grid-cols-2 gap-3">
              <FormField
                control={form.control}
                name="quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>수량</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="min_quantity"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>최소 수량</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        placeholder="0"
                        {...field}
                        onChange={(e) => field.onChange(e.target.valueAsNumber || 0)}
                        disabled={isPending}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </div>

            <div className="flex justify-end gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpen(false)}
                disabled={isPending}
              >
                취소
              </Button>
              <Button type="submit" disabled={isPending}>
                {isPending && <Loader2 className="mr-2 size-4 animate-spin" />}
                추가
              </Button>
            </div>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
