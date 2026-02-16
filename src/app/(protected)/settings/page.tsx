import Link from "next/link";
import { Boxes, MapPin, Package2, Settings } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Card, CardContent } from "@/components/ui/card";
import { ReportsSection } from "@/components/reports/reports-section";

export default function SettingsPage() {
  return (
    <div className="space-y-8">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Settings className="size-[18px] text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">설정</h1>
          <p className="text-[13px] text-muted-foreground">
            위치 시스템과 운영 기준값을 관리합니다
          </p>
        </div>
      </div>

      <section className="grid gap-3 md:grid-cols-3">
        <Link href="/settings/faces">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Boxes className="size-4 text-primary" />
                <h2 className="font-semibold">선반 설정</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                선반 1~11의 베이/단 수를 조정합니다.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/locations">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <MapPin className="size-4 text-primary" />
                <h2 className="font-semibold">위치 조회</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                위치 코드 검색과 상세/QR 정보를 확인합니다.
              </p>
            </CardContent>
          </Card>
        </Link>

        <Link href="/settings/products">
          <Card className="h-full transition-colors hover:bg-muted/40">
            <CardContent className="p-4">
              <div className="flex items-center gap-2">
                <Package2 className="size-4 text-primary" />
                <h2 className="font-semibold">제품 설정</h2>
              </div>
              <p className="mt-2 text-sm text-muted-foreground">
                SKU/박스당입수/활성 상태를 빠르게 관리합니다.
              </p>
            </CardContent>
          </Card>
        </Link>
      </section>

      <Separator />

      <section className="space-y-4">
        <div>
          <h2 className="text-lg font-semibold">보고서</h2>
          <p className="text-sm text-muted-foreground">
            재고 관련 보고서를 생성하고 CSV로 내보낼 수 있습니다.
          </p>
        </div>
        <ReportsSection />
      </section>
    </div>
  );
}
