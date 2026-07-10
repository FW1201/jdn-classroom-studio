"use client";

import { useRef, useState } from "react";
import Papa from "papaparse";
import { nanoid } from "nanoid";
import {
  Users,
  Plus,
  Upload,
  Trash2,
  Pencil,
  X,
  Check,
  UserPlus,
} from "lucide-react";
import { Card, EmptyState, Tag } from "@/components/ui/Card";
import { Button, IconButton } from "@/components/ui/Button";
import { PageHeader } from "@/components/ui/PageHeader";
import { useCollection, useHydrated } from "@/lib/hooks";
import { createItem, deleteItem, updateItem } from "@/lib/storage";
import type { Roster, Student } from "@/lib/types";

/* ---------- CSV 匯入：欄位「座號,姓名,標籤」（表頭可有可無）---------- */

function parseStudentsCsv(text: string): Student[] {
  const result = Papa.parse<string[]>(text.trim(), { skipEmptyLines: true });
  const rows = result.data;
  if (!rows.length) return [];
  // 偵測表頭（第一列包含「姓名」或 name）
  const first = rows[0].join(",");
  const body = /姓名|name/i.test(first) ? rows.slice(1) : rows;
  const students: Student[] = [];
  for (const cols of body) {
    // 支援「座號,姓名,標籤」或「姓名」單欄
    const [a, b, c] = cols.map((s) => (s ?? "").trim());
    const hasNumber = /^\d+$/.test(a) && Boolean(b);
    const name = hasNumber ? b : a;
    if (!name) continue;
    const tagsRaw = hasNumber ? c : b;
    students.push({
      id: nanoid(8),
      name,
      number: hasNumber ? a : undefined,
      tags: tagsRaw ? tagsRaw.split(/[;；、\s]+/).filter(Boolean) : undefined,
    });
  }
  return students;
}

/* ---------- 單一班級卡 ---------- */

function RosterCard({ roster }: { roster: Roster }) {
  const [editing, setEditing] = useState(false);
  const [nameDraft, setNameDraft] = useState(roster.name);
  const [newStudent, setNewStudent] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  function addStudent() {
    const name = newStudent.trim();
    if (!name) return;
    updateItem("rosters", roster.id, {
      students: [...roster.students, { id: nanoid(8), name }],
    });
    setNewStudent("");
  }

  function removeStudent(sid: string) {
    updateItem("rosters", roster.id, {
      students: roster.students.filter((s) => s.id !== sid),
    });
  }

  function importCsv(file: File) {
    file.text().then((text) => {
      const students = parseStudentsCsv(text);
      if (!students.length) {
        alert("沒有讀到任何學生：請確認格式為「座號,姓名,標籤」或每行一個姓名。");
        return;
      }
      updateItem("rosters", roster.id, {
        students: [...roster.students, ...students],
      });
    });
  }

  return (
    <Card className="flex flex-col gap-4 p-5">
      <div className="flex items-center justify-between gap-2">
        {editing ? (
          <form
            className="flex flex-1 items-center gap-2"
            onSubmit={(e) => {
              e.preventDefault();
              const name = nameDraft.trim();
              if (name) updateItem("rosters", roster.id, { name });
              setEditing(false);
            }}
          >
            <input
              autoFocus
              value={nameDraft}
              onChange={(e) => setNameDraft(e.target.value)}
              aria-label="班級名稱"
              className="h-10 flex-1 rounded-sm border border-border bg-surface-raised px-3 text-base"
            />
            <IconButton label="儲存班級名稱" type="submit">
              <Check className="size-4.5" />
            </IconButton>
          </form>
        ) : (
          <>
            <h2 className="flex items-center gap-2 text-lg font-bold">
              <Users className="size-5 text-roster" aria-hidden />
              {roster.name}
              <span className="text-sm font-normal text-text-muted">
                {roster.students.length} 人
              </span>
            </h2>
            <div className="flex gap-1.5">
              <IconButton label="編輯班級名稱" onClick={() => { setNameDraft(roster.name); setEditing(true); }}>
                <Pencil className="size-4" />
              </IconButton>
              <IconButton
                label="刪除班級"
                onClick={() => {
                  if (confirm(`確定刪除「${roster.name}」？此動作無法復原。`))
                    deleteItem("rosters", roster.id);
                }}
              >
                <Trash2 className="size-4 text-danger" />
              </IconButton>
            </div>
          </>
        )}
      </div>

      {/* 學生列表 */}
      {roster.students.length > 0 ? (
        <ul className="flex flex-wrap gap-2">
          {roster.students.map((s) => (
            <li
              key={s.id}
              className="group flex items-center gap-1.5 rounded-full border border-border bg-surface-raised py-1 pl-3 pr-1"
            >
              {s.number && (
                <span className="text-xs tabular-nums text-text-muted">{s.number}</span>
              )}
              <span className="text-sm">{s.name}</span>
              {s.tags?.map((t) => (
                <Tag key={t} color="var(--roster)">{t}</Tag>
              ))}
              <button
                aria-label={`移除 ${s.name}`}
                onClick={() => removeStudent(s.id)}
                className="flex size-6 cursor-pointer items-center justify-center rounded-full text-text-faint hover:bg-hover hover:text-danger"
              >
                <X className="size-3.5" />
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="text-sm text-text-muted">
          尚無學生——用下方輸入框逐一新增，或匯入 CSV。
        </p>
      )}

      {/* 新增學生 + CSV 匯入 */}
      <div className="flex flex-wrap items-center gap-2 border-t border-border pt-3">
        <form
          className="flex min-w-0 flex-1 items-center gap-2"
          onSubmit={(e) => { e.preventDefault(); addStudent(); }}
        >
          <input
            value={newStudent}
            onChange={(e) => setNewStudent(e.target.value)}
            placeholder="輸入姓名後按 Enter"
            aria-label="新增學生姓名"
            className="h-10 min-w-0 flex-1 rounded-sm border border-border bg-surface-raised px-3 text-sm placeholder:text-text-faint"
          />
          <Button variant="surface" size="sm" type="submit">
            <UserPlus className="size-4" aria-hidden />
            新增
          </Button>
        </form>
        <Button variant="ghost" size="sm" onClick={() => csvRef.current?.click()}>
          <Upload className="size-4" aria-hidden />
          匯入 CSV
        </Button>
        <input
          ref={csvRef}
          type="file"
          accept=".csv,text/csv"
          className="hidden"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) importCsv(f);
            e.target.value = "";
          }}
        />
      </div>
    </Card>
  );
}

/* ---------- 頁面 ---------- */

export function RostersView() {
  const rosters = useCollection("rosters");
  const hydrated = useHydrated();

  function createRoster() {
    const name = prompt("班級名稱？", `新班級 ${rosters.length + 1}`);
    if (name?.trim()) createItem("rosters", { name: name.trim(), students: [] });
  }

  return (
    <>
      <PageHeader
        title="學生名單"
        desc="班級與學生建檔、CSV 匯入（格式：座號,姓名,標籤）。名單供黑板與成果牆使用。"
        actions={
          <Button variant="primary" onClick={createRoster}>
            <Plus className="size-4.5" aria-hidden />
            新增班級
          </Button>
        }
      />
      {hydrated && rosters.length === 0 ? (
        <EmptyState
          icon={<Users />}
          title="還沒有任何班級"
          hint="建立第一個班級後，就能逐一輸入學生或整批匯入 CSV。"
          action={
            <Button variant="primary" onClick={createRoster}>
              <Plus className="size-4.5" aria-hidden />
              新增班級
            </Button>
          }
        />
      ) : (
        <div className="flex flex-col gap-4">
          {rosters.map((r) => (
            <RosterCard key={r.id} roster={r} />
          ))}
        </div>
      )}
    </>
  );
}
