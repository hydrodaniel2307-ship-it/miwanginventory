import { ProductsSettingsManager } from "@/components/settings/products-settings-manager";

export default function SettingsProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">제품 설정</h1>
        <p className="mt-1 text-muted-foreground">
          SKU, 제품명, 박스당입수, 활성 상태를 관리합니다.
        </p>
      </div>

      <ProductsSettingsManager />
    </div>
  );
}
