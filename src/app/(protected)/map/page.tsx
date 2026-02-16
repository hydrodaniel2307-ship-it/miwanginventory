import { Map } from "lucide-react";
import { WarehouseMapView } from "@/components/map/warehouse-map-view";

export default function MapPage() {
  return (
    <div className="space-y-6">
      <div className="flex items-center gap-2.5">
        <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10">
          <Map className="size-[18px] text-primary" />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight">창고 맵</h1>
          <p className="text-[13px] text-muted-foreground">
            3D 뷰에서 셀을 클릭하여 상세 정보를 확인하고 수정하세요
          </p>
        </div>
      </div>

      <WarehouseMapView />
    </div>
  );
}
