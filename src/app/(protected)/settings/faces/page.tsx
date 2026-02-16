import { FacesSettingsTable } from "@/components/settings/faces-settings-table";

export default function FacesSettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">선반 설정</h1>
        <p className="mt-1 text-muted-foreground">
          선반 1~11의 베이/단 수를 조정하고 위치 코드를 생성합니다.
        </p>
      </div>

      <FacesSettingsTable />
    </div>
  );
}
