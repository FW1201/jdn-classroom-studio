"use client";

import { Suspense } from "react";
import { useParams } from "next/navigation";
import { BoardEditor } from "@/components/board/BoardEditor";

export function BoardClient() {
  const params = useParams<{ id: string }>();
  return (
    <Suspense>
      <BoardEditor boardId={params.id} />
    </Suspense>
  );
}
