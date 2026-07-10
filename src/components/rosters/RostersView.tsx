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
import { Dialog } from "@/components/ui/Dialog";

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
  const [newName, setNewName] = useState("");
  const [newNumber, setNewNumber] = useState("");
  const [newTags, setNewTags] = useState("");
  const csvRef = useRef<HTMLInputElement>(null);

  function addStudent() {
    const name = newName.trim();
    if (!name) return;
    updateItem("rosters", roster.id, {
      students: [
        ...roster.students,
        {
          id: nanoid(8),
          name,
          number: newNumber.trim() || undefined,
          tags: newTags.trim() ? newTags.split(/[;；、,\s]+/).filter(Boolean) : undefined,
        },
      ],
    });
    setNewName("");
    setNewNumber("");
    setNewTags("");
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
              className="h-11 flex-1 rounded-sm border border-control bg-surface-raised px-3 text-base"
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
                className="flex size-11 cursor-pointer items-center justify-center rounded-full text-text-muted hover:bg-hover hover:text-danger"
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
      <div className="flex flex-col gap-3 border-t border-border pt-4">
        <p className="text-sm font-semibold">新增學生</p>
        <form
          className="grid min-w-0 gap-3 sm:grid-cols-[7rem_minmax(10rem,1fr)_minmax(10rem,1fr)_auto] sm:items-end"
          onSubmit={(e) => { e.preventDefault(); addStudent(); }}
        >
          <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
            座號（選填）
            <input
              inputMode="numeric"
              value={newNumber}
              onChange={(e) => setNewNumber(e.target.value)}
              placeholder="01"
              className="h-11 min-w-0 rounded-sm border border-control bg-surface-raised px-3 text-base placeholder:text-text-muted"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
            姓名 <span className="text-danger">*</span>
            <input
              required
              value={newName}
              onChange={(e) => setNewName(e.target.value)}
              placeholder="王小明"
              className="h-11 min-w-0 rounded-sm border border-control bg-surface-raised px-3 text-base placeholder:text-text-muted"
            />
          </label>
          <label className="flex flex-col gap-1 text-xs font-medium text-text-muted">
            標籤（選填）
            <input
              value={newTags}
              onChange={(e) => setNewTags(e.target.value)}
              placeholder="第一組、組長"
              className="h-11 min-w-0 rounded-sm border border-control bg-surface-raised px-3 text-base placeholder:text-text-muted"
            />
          </label>
          <Button variant="surface" size="sm" type="submit">
            <UserPlus className="size-4" aria-hidden />
            新增
          </Button>
        </form>
        <Button className="w-fit" variant="ghost" size="sm" onClick={() => csvRef.current?.click()}>
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
  const [createOpen, setCreateOpen] = useState(false);
  const [className, setClassName] = useState("");

  function createRoster() {
    const name = className.trim();
    if (!name) return;
    createItem("rosters", { name, students: [] });
    setClassName("");
    setCreateOpen(false);
  }

  return (
    <>
      <PageHeader
        title="學生名單"
        desc="集中管理班級與學生資料，支援座號、姓名、標籤及 CSV 匯入。"
        actions={
          <Button variant="primary" onClick={() => setCreateOpen(true)}>
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
            <Button variant="primary" onClick={() => setCreateOpen(true)}>
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
      {createOpen && (
        <Dialog title="新增班級" description="先建立班級，再逐一新增學生或匯入 CSV。" onClose={() => setCreateOpen(false)} maxWidth="max-w-md">
          <form className="flex flex-col gap-4" onSubmit={(e) => { e.preventDefault(); createRoster(); }}>
            <label className="flex flex-col gap-1.5 text-sm font-medium">
              班級名稱 <span className="text-danger">*</span>
              <input
                autoFocus
                required
                value={className}
                onChange={(e) => setClassName(e.target.value)}
                placeholder={`例：七年一班`}
                className="h-11 rounded-sm border border-control bg-surface px-3 text-base placeholder:text-text-muted"
              />
            </label>
            <div className="flex justify-end gap-2">
              <Button type="button" variant="ghost" onClick={() => setCreateOpen(false)}>取消</Button>
              <Button type="submit" variant="primary" disabled={!className.trim()}>建立班級</Button>
            </div>
          </form>
        </Dialog>
      )}
    </>
  );
}
