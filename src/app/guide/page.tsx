import type { Metadata } from "next";
import { AppShell } from "@/components/layout/AppShell";
import { GuideView } from "@/components/guide/GuideView";

export const metadata: Metadata = {
  title: "使用說明｜JDN 課堂工作站",
  description: "五個步驟走完一堂課：名單、點名分組、教學黑板、互動視覺化、成果收集牆。",
};

export default function GuidePage() {
  return (
    <AppShell>
      <GuideView />
    </AppShell>
  );
}
