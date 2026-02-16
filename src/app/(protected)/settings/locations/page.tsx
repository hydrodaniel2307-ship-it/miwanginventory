import { LocationsBrowser } from "@/components/settings/locations-browser";

export default function LocationsSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">위치 조회</h1>
        <p className="mt-1 text-muted-foreground">
          위치 코드, 선반, 베이, 단 정보를 조회하고 상세를 확인합니다.
        </p>
      </div>

      <LocationsBrowser />
    </div>
  );
}
