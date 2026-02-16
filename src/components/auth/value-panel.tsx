import Image from "next/image";
import { BarChart3, ScanLine, Bell } from "lucide-react";

const features = [
  {
    icon: BarChart3,
    title: "실시간 재고 & 로트 추적",
    desc: "모든 SKU의 입출고와 재고 수준을 실시간으로 파악",
  },
  {
    icon: ScanLine,
    title: "바코드 기반 입출고",
    desc: "모바일 스캔으로 현장에서 즉시 처리",
  },
  {
    icon: Bell,
    title: "알림 & 리포트 자동화",
    desc: "재고 부족 알림과 운영 리포트를 자동 생성",
  },
];

export function ValuePanel() {
  return (
    <>
      {/* Background with gradient animation */}
      <div className="absolute inset-0 bg-gradient-to-br from-[#1a1a1a] via-[#1e1e1e] to-[#242424] animate-gradient-shift" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,oklch(0.55_0.22_25_/_0.06),transparent_60%)]" />

      {/* Content */}
      <div className="relative flex h-full flex-col justify-between p-10 xl:p-14 text-white">
        {/* Top — branding */}
        <div className="flex items-center gap-3 animate-in fade-in duration-500 delay-300">
          <Image
            src="/miwang-logo.png"
            alt="미왕"
            width={32}
            height={32}
            className="rounded-lg"
          />
          <span className="text-[13px] font-medium tracking-wide text-zinc-500 uppercase">
            미왕 Warehouse
          </span>
        </div>

        {/* Center — headline + features */}
        <div className="space-y-10">
          <div className="max-w-sm animate-in fade-in slide-in-from-bottom-2 duration-500 delay-400">
            <h2 className="text-[28px] font-bold tracking-tight leading-[1.25]">
              스마트 창고 운영,
              <br />
              지금 시작하세요.
            </h2>
            <p className="mt-3 text-[15px] text-zinc-400 leading-relaxed">
              데이터 기반의 창고 관리로 운영 효율을 극대화합니다.
            </p>
          </div>

          <div className="space-y-4">
            {features.map((f, i) => (
              <div
                key={f.title}
                className="flex items-start gap-3.5 animate-in fade-in slide-in-from-left-3 duration-500"
                style={{ animationDelay: `${500 + i * 100}ms`, animationFillMode: "both" }}
              >
                <div className="flex size-9 shrink-0 items-center justify-center rounded-lg bg-white/[0.06] ring-1 ring-white/[0.06]">
                  <f.icon className="size-[18px] text-zinc-400" />
                </div>
                <div className="pt-0.5">
                  <p className="text-[13px] font-medium text-zinc-200">
                    {f.title}
                  </p>
                  <p className="mt-0.5 text-[13px] text-zinc-500 leading-relaxed">
                    {f.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom — testimonial */}
        <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] px-5 py-4 animate-in fade-in slide-in-from-bottom-2 duration-500 delay-700"
          style={{ animationFillMode: "both" }}
        >
          <blockquote className="text-[13px] text-zinc-400 leading-relaxed italic">
            &ldquo;MiWang 도입 후 재고 관리 시간이 70% 절감되었습니다.
            직관적인 인터페이스 덕분에 팀원 교육도 하루 만에
            끝났습니다.&rdquo;
          </blockquote>
          <p className="mt-2.5 text-[11px] text-zinc-600 font-medium">
            — 중소 물류센터 운영팀
          </p>
        </div>
      </div>
    </>
  );
}
