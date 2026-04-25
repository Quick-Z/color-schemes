"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type {
  ColorFilter,
  GradientScheme,
  GradientStop,
  GradientType,
} from "@/data/gradient-types";

type GradientRecord = GradientScheme & {
  id: number;
  type: GradientType;
  colorTags: ColorFilter[];
};

type SortDirection = "asc" | "desc";

type GradientListResponse = {
  gradients: GradientRecord[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

type GradientFormState = {
  id?: number;
  name: string;
  description: string;
  deg: string;
  type: GradientType;
  gradient: Array<{
    color: string;
    pos: string;
  }>;
};

const fallbackDescription =
  "没想到怎么编，但这组颜色已经先替我把气氛铺好了。";

const typeLabels: Record<GradientType, string> = {
  linear: "线性",
  radial: "径向",
  conic: "锥形",
};
const pageSize = 24;
const colorFilters: Array<{
  key: ColorFilter;
  label: string;
  color: string;
}> = [
  { key: "red", label: "红", color: "#ef4444" },
  { key: "orange", label: "橙", color: "#f97316" },
  { key: "yellow", label: "黄", color: "#eab308" },
  { key: "green", label: "绿", color: "#22c55e" },
  { key: "blue", label: "蓝", color: "#3b82f6" },
  { key: "indigo", label: "靛", color: "#4f46e5" },
  { key: "purple", label: "紫", color: "#a855f7" },
  { key: "black", label: "黑", color: "#18181b" },
  { key: "white", label: "白", color: "#ffffff" },
];

function PencilIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M12 20h9" />
      <path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L7 19l-4 1 1-4Z" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg
      aria-hidden="true"
      className="size-4"
      fill="none"
      stroke="currentColor"
      strokeLinecap="round"
      strokeLinejoin="round"
      strokeWidth="2"
      viewBox="0 0 24 24"
    >
      <path d="M3 6h18" />
      <path d="M8 6V4h8v2" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v5" />
      <path d="M14 11v5" />
    </svg>
  );
}

function formatNumber(value: number) {
  return Number.isInteger(value)
    ? String(value)
    : String(Number(value.toFixed(2)));
}

function formatStops(stops: GradientStop[]) {
  return stops
    .map((stop) => `${stop.color} ${formatNumber(stop.pos)}%`)
    .join(", ");
}

function buildGeneratedGradient(gradient: GradientScheme) {
  const stops = formatStops(gradient.gradient);

  if (gradient.type === "radial") {
    return `radial-gradient(circle at center, ${stops})`;
  }

  if (gradient.type === "conic") {
    return `conic-gradient(from ${formatNumber(gradient.deg)}deg, ${stops})`;
  }

  return `linear-gradient(${formatNumber(gradient.deg)}deg, ${stops})`;
}

function getBackgroundValue(gradient: GradientScheme) {
  return buildGeneratedGradient(gradient);
}

function buildCssCode(gradient: GradientScheme) {
  return `background: ${getBackgroundValue(gradient)};`;
}

function getUniqueColors(gradient: GradientScheme) {
  const sourceColors = gradient.gradient.map((stop) => stop.color);

  return Array.from(new Set(sourceColors));
}

function toHexByte(value: number) {
  return Math.max(0, Math.min(255, Math.round(value)))
    .toString(16)
    .padStart(2, "0")
    .toUpperCase();
}

function getHexColor(color: string) {
  const trimmedColor = color.trim();
  const hexColor = trimmedColor.match(/^#([\da-f]{3,8})$/i);

  if (hexColor) {
    const value = hexColor[1];

    if (value.length === 3 || value.length === 4) {
      return `#${value
        .split("")
        .map((part) => part + part)
        .join("")
        .toUpperCase()}`;
    }

    return `#${value.toUpperCase()}`;
  }

  const rgbColor = trimmedColor.match(/^rgba?\((.+)\)$/i);

  if (rgbColor) {
    const channels = rgbColor[1].split(",").map((part) => part.trim());
    const colorChannels = channels.slice(0, 3).map((channel) => {
      if (channel.endsWith("%")) {
        return (Number.parseFloat(channel) / 100) * 255;
      }

      return Number.parseFloat(channel);
    });

    if (colorChannels.length === 3 && colorChannels.every(Number.isFinite)) {
      const alpha = channels[3] ? Number.parseFloat(channels[3]) : 1;
      const alphaHex =
        Number.isFinite(alpha) && alpha < 1 ? toHexByte(alpha * 255) : "";

      return `#${colorChannels.map(toHexByte).join("")}${alphaHex}`;
    }
  }

  if (trimmedColor.toLowerCase() === "black") {
    return "#000000";
  }

  if (trimmedColor.toLowerCase() === "white") {
    return "#FFFFFF";
  }

  return trimmedColor.toUpperCase();
}

function fallbackCopy(text: string) {
  const textarea = document.createElement("textarea");

  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.opacity = "0";
  document.body.appendChild(textarea);
  textarea.select();
  document.execCommand("copy");
  document.body.removeChild(textarea);
}

function sortGradientRecords(
  gradients: GradientRecord[],
  sortDirection: SortDirection,
) {
  const multiplier = sortDirection === "asc" ? 1 : -1;

  return [...gradients].sort(
    (a, b) => (Number(a.index) - Number(b.index)) * multiplier,
  );
}

async function copyToClipboard(text: string) {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    fallbackCopy(text);
  }
}

function createEmptyForm(): GradientFormState {
  return {
    name: "New Gradient",
    description: "",
    deg: "90",
    type: "linear",
    gradient: [
      { color: "#4facfe", pos: "0" },
      { color: "#00f2fe", pos: "100" },
    ],
  };
}

function createFormFromGradient(gradient: GradientRecord): GradientFormState {
  return {
    id: gradient.id,
    name: gradient.name,
    description: gradient.description ?? "",
    deg: String(gradient.deg),
    type: gradient.type,
    gradient: gradient.gradient.map((stop) => ({
      color: stop.color,
      pos: String(stop.pos),
    })),
  };
}

function gradientMatchesSearch(gradient: GradientRecord, searchTerm: string) {
  return gradient.name.toLowerCase().includes(searchTerm.toLowerCase());
}

function getGradientDescription(gradient: GradientRecord) {
  return gradient.description?.trim() || fallbackDescription;
}

async function readJson<T>(response: Response) {
  const data = (await response.json().catch(() => ({}))) as unknown;

  if (!response.ok) {
    const errorMessage =
      typeof data === "object" &&
      data !== null &&
      "error" in data &&
      typeof data.error === "string"
        ? data.error
        : "请求处理失败。";

    throw new Error(errorMessage);
  }

  return data as T;
}

export default function GradientGallery() {
  const [gradients, setGradients] = useState<GradientRecord[]>([]);
  const [selectedColor, setSelectedColor] = useState<ColorFilter | "all">(
    "all",
  );
  const [searchInput, setSearchInput] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [sortDirection, setSortDirection] = useState<SortDirection>("asc");
  const [total, setTotal] = useState(0);
  const [nextOffset, setNextOffset] = useState(0);
  const [hasMore, setHasMore] = useState(false);
  const [reloadVersion, setReloadVersion] = useState(0);
  const [form, setForm] = useState<GradientFormState | null>(null);
  const [flippedIds, setFlippedIds] = useState<Set<number>>(new Set());
  const [pendingImportFile, setPendingImportFile] = useState<File | null>(null);
  const [pendingDeleteGradient, setPendingDeleteGradient] =
    useState<GradientRecord | null>(null);
  const [copiedIndex, setCopiedIndex] = useState<string | null>(null);
  const [copiedColor, setCopiedColor] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isLoadingMore, setIsLoadingMore] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [isImporting, setIsImporting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notice, setNotice] = useState<string | null>(null);
  const loadMoreRef = useRef<HTMLDivElement | null>(null);
  const importInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    const timeoutId = window.setTimeout(() => {
      setSearchTerm(searchInput.trim());
    }, 300);

    return () => window.clearTimeout(timeoutId);
  }, [searchInput]);

  useEffect(() => {
    if (!notice) {
      return;
    }

    const timeoutId = window.setTimeout(() => {
      setNotice(null);
    }, 2000);

    return () => window.clearTimeout(timeoutId);
  }, [notice]);

  const fetchGradientsPage = useCallback(
    async ({
      offset,
      append,
      signal,
    }: {
      offset: number;
      append: boolean;
      signal?: AbortSignal;
    }) => {
      const searchParams = new URLSearchParams({
        limit: String(pageSize),
        offset: String(offset),
        sort: sortDirection,
      });

      if (selectedColor !== "all") {
        searchParams.set("color", selectedColor);
      }

      if (searchTerm) {
        searchParams.set("search", searchTerm);
      }

      const data = await readJson<GradientListResponse>(
        await fetch(`/api/gradients?${searchParams.toString()}`, {
          signal,
        }),
      );

      setGradients((currentGradients) => {
        if (!append) {
          return data.gradients;
        }

        const knownIds = new Set(currentGradients.map((gradient) => gradient.id));
        const nextGradients = data.gradients.filter(
          (gradient) => !knownIds.has(gradient.id),
        );

        return [...currentGradients, ...nextGradients];
      });
      setTotal(data.total);
      setHasMore(data.hasMore);
      setNextOffset(data.nextOffset);
    },
    [searchTerm, selectedColor, sortDirection],
  );

  useEffect(() => {
    const controller = new AbortController();

    setIsLoading(true);
    setIsLoadingMore(false);
    setError(null);
    setGradients([]);
    setTotal(0);
    setNextOffset(0);
    setHasMore(false);

    fetchGradientsPage({
      offset: 0,
      append: false,
      signal: controller.signal,
    })
      .catch((loadError) => {
        if (!controller.signal.aborted) {
          setError(
            loadError instanceof Error ? loadError.message : "加载失败。",
          );
        }
      })
      .finally(() => {
        if (!controller.signal.aborted) {
          setIsLoading(false);
        }
      });

    return () => controller.abort();
  }, [fetchGradientsPage, reloadVersion]);

  const loadMore = useCallback(async () => {
    if (!hasMore || isLoading || isLoadingMore) {
      return;
    }

    setIsLoadingMore(true);
    setError(null);

    try {
      await fetchGradientsPage({
        offset: nextOffset,
        append: true,
      });
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "加载失败。");
    } finally {
      setIsLoadingMore(false);
    }
  }, [fetchGradientsPage, hasMore, isLoading, isLoadingMore, nextOffset]);

  useEffect(() => {
    const target = loadMoreRef.current;

    if (!target) {
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        if (entries[0]?.isIntersecting) {
          void loadMore();
        }
      },
      { rootMargin: "480px 0px" },
    );

    observer.observe(target);

    return () => observer.disconnect();
  }, [loadMore]);

  async function handleCopy(gradient: GradientRecord) {
    const cssCode = buildCssCode(gradient);

    await copyToClipboard(cssCode);

    setCopiedIndex(gradient.index);
    window.setTimeout(() => {
      setCopiedIndex((currentIndex) =>
        currentIndex === gradient.index ? null : currentIndex,
      );
    }, 1400);
  }

  async function handleCopyColor(color: string) {
    const hexColor = getHexColor(color);

    await copyToClipboard(hexColor);

    setCopiedColor(hexColor);
    window.setTimeout(() => {
      setCopiedColor((currentColor) =>
        currentColor === hexColor ? null : currentColor,
      );
    }, 1200);
  }

  function updateFormStop(
    stopIndex: number,
    key: "color" | "pos",
    value: string,
  ) {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      return {
        ...currentForm,
        gradient: currentForm.gradient.map((stop, index) =>
          index === stopIndex ? { ...stop, [key]: value } : stop,
        ),
      };
    });
  }

  function addFormStop() {
    setForm((currentForm) => {
      if (!currentForm) {
        return currentForm;
      }

      const lastStop = currentForm.gradient.at(-1);
      const lastPosition = Number(lastStop?.pos ?? 90);

      return {
        ...currentForm,
        gradient: [
          ...currentForm.gradient,
          {
            color: "#ffffff",
            pos: String(Number.isFinite(lastPosition) ? lastPosition : 100),
          },
        ],
      };
    });
  }

  function removeFormStop(stopIndex: number) {
    setForm((currentForm) => {
      if (!currentForm || currentForm.gradient.length <= 2) {
        return currentForm;
      }

      return {
        ...currentForm,
        gradient: currentForm.gradient.filter((_, index) => index !== stopIndex),
      };
    });
  }

  async function handleSave(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!form) {
      return;
    }

    setIsSaving(true);
    setError(null);

    const payload = {
      id: form.id,
      name: form.name,
      description: form.description,
      deg: Number(form.deg),
      type: form.type,
      gradient: form.gradient.map((stop) => ({
        color: stop.color,
        pos: Number(stop.pos),
      })),
    };

    try {
      const response = await fetch("/api/gradients", {
        method: form.id ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const data = await readJson<{ gradient: GradientRecord }>(response);
      const matchesSelectedColor =
        selectedColor === "all" ||
        data.gradient.colorTags.includes(selectedColor);
      const matchesSearch = gradientMatchesSearch(data.gradient, searchTerm);
      const shouldShowGradient = matchesSelectedColor && matchesSearch;

      setGradients((currentGradients) => {
        if (form.id) {
          return sortGradientRecords(
            shouldShowGradient
              ? currentGradients.map((gradient) =>
                  gradient.id === data.gradient.id
                    ? data.gradient
                    : gradient,
                )
              : currentGradients.filter(
                  (gradient) => gradient.id !== data.gradient.id,
                ),
            sortDirection,
          );
        }

        return shouldShowGradient
          ? sortGradientRecords([...currentGradients, data.gradient], sortDirection)
          : currentGradients;
      });
      setTotal((currentTotal) => {
        if (!form.id) {
          return currentTotal + (shouldShowGradient ? 1 : 0);
        }

        const wasVisible = gradients.some(
          (gradient) => gradient.id === data.gradient.id,
        );

        if (wasVisible && !shouldShowGradient) {
          return Math.max(0, currentTotal - 1);
        }

        if (!wasVisible && shouldShowGradient) {
          return currentTotal + 1;
        }

        return currentTotal;
      });
      setNextOffset((currentOffset) => {
        if (!form.id) {
          return shouldShowGradient && sortDirection === "desc"
            ? currentOffset + 1
            : currentOffset;
        }

        const wasVisible = gradients.some(
          (gradient) => gradient.id === data.gradient.id,
        );

        return wasVisible && !shouldShowGradient
          ? Math.max(0, currentOffset - 1)
          : currentOffset;
      });
      setForm(null);
    } catch (saveError) {
      setError(saveError instanceof Error ? saveError.message : "保存失败。");
    } finally {
      setIsSaving(false);
    }
  }

  async function confirmDeleteGradient() {
    const gradientToDelete = pendingDeleteGradient;

    if (!gradientToDelete) {
      return;
    }

    setError(null);
    setNotice(null);
    setIsDeleting(true);

    try {
      await readJson<{ ok: true }>(
        await fetch(`/api/gradients?id=${gradientToDelete.id}`, {
          method: "DELETE",
        }),
      );
      setGradients((currentGradients) =>
        currentGradients.filter((item) => item.id !== gradientToDelete.id),
      );
      setFlippedIds((currentIds) => {
        const nextIds = new Set(currentIds);

        nextIds.delete(gradientToDelete.id);

        return nextIds;
      });
      setTotal((currentTotal) => Math.max(0, currentTotal - 1));
      setNextOffset((currentOffset) => Math.max(0, currentOffset - 1));
      setPendingDeleteGradient(null);
    } catch (deleteError) {
      setError(
        deleteError instanceof Error ? deleteError.message : "删除失败。",
      );
    } finally {
      setIsDeleting(false);
    }
  }

  function resetListState() {
    setSearchInput("");
    setSearchTerm("");
    setSelectedColor("all");
    setSortDirection("asc");
    setFlippedIds(new Set());
  }

  function handleExportBackup() {
    window.location.href = "/api/gradients/backup";
  }

  function closeImportDialog() {
    setPendingImportFile(null);
    if (importInputRef.current) {
      importInputRef.current.value = "";
    }
  }

  async function confirmImportBackup() {
    if (!pendingImportFile) {
      return;
    }

    setIsImporting(true);
    setError(null);
    setNotice(null);

    try {
      const response = await fetch("/api/gradients/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: await pendingImportFile.text(),
      });
      const data = await readJson<{ imported: number }>(response);

      resetListState();
      setGradients([]);
      setTotal(0);
      setNextOffset(0);
      setHasMore(false);
      setReloadVersion((currentVersion) => currentVersion + 1);
      setNotice(`导入完成，共导入 ${data.imported} 个配色方案。`);
      closeImportDialog();
    } catch (importError) {
      setError(
        importError instanceof Error ? importError.message : "导入失败。",
      );
    } finally {
      setIsImporting(false);
    }
  }

  function toggleCardFlip(gradientId: number) {
    setFlippedIds((currentIds) => {
      const nextIds = new Set(currentIds);

      if (nextIds.has(gradientId)) {
        nextIds.delete(gradientId);
      } else {
        nextIds.add(gradientId);
      }

      return nextIds;
    });
  }

  return (
    <>
      <div className="flex flex-col gap-4">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm font-semibold text-zinc-500">
            {isLoading
              ? "正在加载"
              : `已加载 ${gradients.length} / ${total} 个配色方案`}
          </p>
          <div className="flex flex-wrap gap-2">
            <button
              className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2"
              onClick={handleExportBackup}
              type="button"
            >
              导出 JSON
            </button>
            <button
              className="h-10 rounded-md border border-zinc-300 bg-white px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 disabled:cursor-wait disabled:opacity-60"
              disabled={isImporting}
              onClick={() => importInputRef.current?.click()}
              type="button"
            >
              {isImporting ? "导入中" : "导入 JSON"}
            </button>
            <input
              accept="application/json,.json"
              className="hidden"
              onChange={(event) => {
                const file = event.target.files?.[0];

                if (file) {
                  setError(null);
                  setNotice(null);
                  setPendingImportFile(file);
                }
              }}
              ref={importInputRef}
              type="file"
            />
            <button
              className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
              onClick={() => setForm(createEmptyForm())}
              type="button"
            >
              新增方案
            </button>
          </div>
        </div>

        <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
          <label className="block">
            <span className="sr-only">搜索配色标题</span>
            <input
              className="h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm font-medium text-zinc-800 outline-none transition placeholder:text-zinc-400 focus:border-zinc-500 focus:ring-2 focus:ring-zinc-200"
              onChange={(event) => setSearchInput(event.target.value)}
              placeholder="搜索配色标题"
              type="search"
              value={searchInput}
            />
          </label>

          <div
            aria-label="排序方式"
            className="grid h-11 grid-cols-2 rounded-md border border-zinc-300 bg-white p-1"
          >
            <button
              className={`rounded px-3 text-sm font-semibold transition ${
                sortDirection === "asc"
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              onClick={() => setSortDirection("asc")}
              type="button"
            >
              正序
            </button>
            <button
              className={`rounded px-3 text-sm font-semibold transition ${
                sortDirection === "desc"
                  ? "bg-zinc-950 text-white"
                  : "text-zinc-600 hover:bg-zinc-100"
              }`}
              onClick={() => setSortDirection("desc")}
              type="button"
            >
              倒序
            </button>
          </div>
        </div>

        <div className="flex flex-wrap gap-2" aria-label="颜色筛选">
          <button
            className={`h-10 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 ${
              selectedColor === "all"
                ? "border-zinc-950 bg-zinc-950 text-white"
                : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
            }`}
            onClick={() => setSelectedColor("all")}
            type="button"
          >
            全部
          </button>
          {colorFilters.map((filter) => (
            <button
              className={`flex h-10 items-center gap-2 rounded-md border px-3 text-sm font-semibold transition focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2 ${
                selectedColor === filter.key
                  ? "border-zinc-950 bg-zinc-950 text-white"
                  : "border-zinc-300 bg-white text-zinc-700 hover:bg-zinc-100"
              }`}
              key={filter.key}
              onClick={() => setSelectedColor(filter.key)}
              type="button"
            >
              <span
                className="size-4 rounded border border-black/15"
                style={{ background: filter.color }}
              />
              {filter.label}
            </button>
          ))}
        </div>
      </div>

      {error ? (
        <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm font-medium text-red-700">
          {error}
        </div>
      ) : null}

      <section
        aria-label="渐变配色方案"
        className="grid w-full grid-cols-[repeat(auto-fit,minmax(260px,1fr))] gap-5"
      >
        {gradients.map((gradient) => {
          const colors = getUniqueColors(gradient);
          const backgroundStyle: CSSProperties = {
            background: getBackgroundValue(gradient),
          };
          const isFlipped = flippedIds.has(gradient.id);

          return (
            <article
              className="overflow-hidden rounded-lg border border-black/10 bg-white shadow-sm transition duration-200 hover:-translate-y-0.5 hover:shadow-xl"
              key={gradient.id}
            >
              <button
                aria-label={`${isFlipped ? "显示配色" : "显示色彩寓意"} ${gradient.name}`}
                className="group h-44 w-full [perspective:1000px]"
                onClick={() => toggleCardFlip(gradient.id)}
                type="button"
              >
                <span
                  className={`relative block h-full w-full transition-transform duration-500 [transform-style:preserve-3d] ${
                    isFlipped ? "[transform:rotateY(180deg)]" : ""
                  }`}
                >
                  <span
                    className="absolute inset-0 block [backface-visibility:hidden]"
                    style={backgroundStyle}
                  />
                  <span
                    className="absolute inset-0 overflow-hidden text-left text-white [backface-visibility:hidden] [transform:rotateY(180deg)]"
                    style={backgroundStyle}
                  >
                    <span className="absolute inset-0 bg-white/15 backdrop-blur-2xl" />
                    <span className="absolute inset-0 bg-gradient-to-br from-black/70 via-black/45 to-black/65" />
                    <span
                      className="relative flex h-full flex-col justify-between p-5"
                      style={{
                        textShadow:
                          "0 1px 2px rgba(0,0,0,0.8), 0 8px 24px rgba(0,0,0,0.45)",
                      }}
                    >
                      <span className="text-xs font-semibold uppercase text-white/75">
                        色彩寓意
                      </span>
                      <span className="text-sm font-semibold leading-6 text-white">
                        {getGradientDescription(gradient)}
                      </span>
                    </span>
                  </span>
                </span>
              </button>
              <div className="space-y-4 p-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-semibold uppercase text-zinc-400">
                      #{gradient.index}
                    </p>
                    <h2 className="mt-1 truncate text-base font-semibold text-zinc-950">
                      {gradient.name}
                    </h2>
                  </div>
                  <span className="shrink-0 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-600">
                    {typeLabels[gradient.type]}
                  </span>
                </div>

                <div className="flex flex-wrap gap-2">
                  {colors.map((color) => {
                    const hexColor = getHexColor(color);

                    return (
                      <button
                        aria-label={`复制颜色 ${hexColor}`}
                        className="group relative grid size-7 place-items-center rounded-md border border-black/10 bg-white p-0.5 shadow-inner transition focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2"
                        key={color}
                        onClick={() => handleCopyColor(color)}
                        title={hexColor}
                        type="button"
                      >
                        <span
                          className="h-full w-full rounded"
                          style={{ background: color }}
                        />
                        <span className="pointer-events-none absolute bottom-full left-1/2 z-20 mb-2 -translate-x-1/2 whitespace-nowrap rounded-md bg-zinc-950 px-2 py-1 text-xs font-semibold text-white opacity-0 shadow-lg transition group-hover:opacity-100 group-focus:opacity-100">
                          {copiedColor === hexColor ? "已复制" : hexColor}
                        </span>
                      </button>
                    );
                  })}
                </div>

                <div className="flex items-center justify-between gap-3">
                  <div className="flex items-center gap-2">
                    <button
                      aria-label={`编辑 ${gradient.name}`}
                      className="grid size-10 place-items-center rounded-md border border-zinc-300 text-zinc-700 transition hover:bg-zinc-100 focus:outline-none focus:ring-2 focus:ring-zinc-300 focus:ring-offset-2"
                      onClick={() => setForm(createFormFromGradient(gradient))}
                      title="编辑"
                      type="button"
                    >
                      <PencilIcon />
                    </button>
                    <button
                      aria-label={`删除 ${gradient.name}`}
                      className="grid size-10 place-items-center rounded-md border border-red-200 text-red-600 transition hover:bg-red-50 focus:outline-none focus:ring-2 focus:ring-red-200 focus:ring-offset-2"
                      onClick={() => setPendingDeleteGradient(gradient)}
                      title="删除"
                      type="button"
                    >
                      <TrashIcon />
                    </button>
                  </div>
                  <button
                    className="h-10 rounded-md bg-zinc-950 px-3.5 text-sm font-semibold text-white transition hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400 focus:ring-offset-2"
                    onClick={() => handleCopy(gradient)}
                    type="button"
                    aria-label={`复制 ${gradient.name} 的 CSS`}
                  >
                    {copiedIndex === gradient.index ? "已复制" : "复制 CSS"}
                  </button>
                </div>
              </div>
            </article>
          );
        })}
      </section>

      <div
        className="flex min-h-12 items-center justify-center text-sm font-medium text-zinc-500"
        ref={loadMoreRef}
      >
        {isLoadingMore
          ? "加载更多中"
          : hasMore
            ? "继续向下滚动"
            : gradients.length
              ? "已加载全部"
              : isLoading
                ? "正在加载"
                : "没有匹配的配色方案"}
      </div>

      {notice ? (
        <div
          aria-live="polite"
          className="fixed right-4 top-4 z-[60] w-[calc(100vw-2rem)] max-w-sm rounded-lg border border-emerald-200 bg-white/95 px-4 py-3 text-sm font-semibold text-emerald-700 shadow-2xl shadow-emerald-950/10 backdrop-blur"
          role="status"
        >
          {notice}
        </div>
      ) : null}

      {pendingImportFile ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            aria-labelledby="import-backup-title"
            aria-modal="true"
            className="w-full max-w-md overflow-hidden rounded-lg bg-white shadow-2xl"
            role="dialog"
          >
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2
                className="text-lg font-semibold text-zinc-950"
                id="import-backup-title"
              >
                导入备份
              </h2>
            </div>
            <div className="space-y-4 p-5">
              <p className="text-sm font-medium leading-6 text-zinc-700">
                导入会用这个文件全量覆盖当前数据库，现有配色方案会被替换，无法在应用内撤销。建议先导出 JSON 备份。
              </p>
              <div className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2">
                <p className="text-xs font-semibold uppercase text-zinc-400">
                  文件
                </p>
                <p className="mt-1 truncate text-sm font-semibold text-zinc-800">
                  {pendingImportFile.name}
                </p>
              </div>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
              <button
                className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"
                disabled={isImporting}
                onClick={closeImportDialog}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isImporting}
                onClick={() => void confirmImportBackup()}
                type="button"
              >
                {isImporting ? "导入中" : "确认导入"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {pendingDeleteGradient ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <div
            aria-labelledby="delete-gradient-title"
            aria-modal="true"
            className="w-full max-w-sm overflow-hidden rounded-lg bg-white shadow-2xl"
            role="dialog"
          >
            <div className="border-b border-zinc-200 px-5 py-4">
              <h2
                className="text-lg font-semibold text-zinc-950"
                id="delete-gradient-title"
              >
                删除配色方案
              </h2>
            </div>
            <div className="space-y-3 p-5">
              <p className="text-sm font-medium leading-6 text-zinc-700">
                确定删除「{pendingDeleteGradient.name}」吗？这条配色方案会从数据库中移除。
              </p>
            </div>
            <div className="flex items-center justify-end gap-3 border-t border-zinc-200 px-5 py-4">
              <button
                className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => setPendingDeleteGradient(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-md bg-red-600 px-4 text-sm font-semibold text-white transition hover:bg-red-500 disabled:cursor-wait disabled:opacity-60"
                disabled={isDeleting}
                onClick={() => void confirmDeleteGradient()}
                type="button"
              >
                {isDeleting ? "删除中" : "确认删除"}
              </button>
            </div>
          </div>
        </div>
      ) : null}

      {form ? (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/45 p-4">
          <form
            className="max-h-[90vh] w-full max-w-2xl overflow-y-auto rounded-lg bg-white shadow-2xl"
            onSubmit={handleSave}
          >
            <div className="sticky top-0 flex items-center justify-between border-b border-zinc-200 bg-white px-5 py-4">
              <h2 className="text-lg font-semibold text-zinc-950">
                {form.id ? "编辑配色方案" : "新增配色方案"}
              </h2>
              <button
                className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                onClick={() => setForm(null)}
                type="button"
              >
                关闭
              </button>
            </div>

            <div className="space-y-5 p-5">
              <label className="block">
                <span className="text-sm font-semibold text-zinc-700">
                  名称
                </span>
                <input
                  className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                  onChange={(event) =>
                    setForm({ ...form, name: event.target.value })
                  }
                  type="text"
                  value={form.name}
                />
              </label>

              <label className="block">
                <span className="text-sm font-semibold text-zinc-700">
                  色彩寓意
                </span>
                <textarea
                  className="mt-2 min-h-28 w-full resize-y rounded-md border border-zinc-300 px-3 py-2 text-sm leading-6 outline-none focus:border-zinc-500"
                  maxLength={200}
                  onChange={(event) =>
                    setForm({ ...form, description: event.target.value })
                  }
                  value={form.description}
                />
              </label>

              <div className="grid gap-4 sm:grid-cols-2">
                <label className="block">
                  <span className="text-sm font-semibold text-zinc-700">
                    渐变类型
                  </span>
                  <select
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 bg-white px-3 text-sm outline-none focus:border-zinc-500"
                    onChange={(event) =>
                      setForm({
                        ...form,
                        type: event.target.value as GradientType,
                      })
                    }
                    value={form.type}
                  >
                    <option value="linear">线性渐变</option>
                    <option value="radial">径向渐变</option>
                    <option value="conic">锥形渐变</option>
                  </select>
                </label>

                <label className="block">
                  <span className="text-sm font-semibold text-zinc-700">
                    渐变角度
                  </span>
                  <input
                    className="mt-2 h-11 w-full rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                    onChange={(event) =>
                      setForm({ ...form, deg: event.target.value })
                    }
                    step="1"
                    type="number"
                    value={form.deg}
                  />
                </label>
              </div>

              <div className="space-y-3">
                <div className="flex items-center justify-between gap-3">
                  <h3 className="text-sm font-semibold text-zinc-700">
                    颜色值
                  </h3>
                  <button
                    className="h-9 rounded-md border border-zinc-300 px-3 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                    onClick={addFormStop}
                    type="button"
                  >
                    添加颜色
                  </button>
                </div>

                {form.gradient.map((stop, stopIndex) => (
                  <div
                    className="grid grid-cols-[32px_minmax(0,1fr)_88px_64px] items-center gap-2"
                    key={`stop-${stopIndex}`}
                  >
                    <span
                      className="size-8 rounded-md border border-black/10"
                      style={{ background: stop.color }}
                    />
                    <input
                      className="h-10 min-w-0 rounded-md border border-zinc-300 px-3 font-mono text-sm outline-none focus:border-zinc-500"
                      onChange={(event) =>
                        updateFormStop(stopIndex, "color", event.target.value)
                      }
                      type="text"
                      value={stop.color}
                    />
                    <input
                      className="h-10 rounded-md border border-zinc-300 px-3 text-sm outline-none focus:border-zinc-500"
                      onChange={(event) =>
                        updateFormStop(stopIndex, "pos", event.target.value)
                      }
                      step="1"
                      type="number"
                      value={stop.pos}
                    />
                    <button
                      className="h-10 rounded-md border border-zinc-300 px-2 text-sm font-semibold text-zinc-600 transition hover:bg-zinc-100 disabled:cursor-not-allowed disabled:opacity-40"
                      disabled={form.gradient.length <= 2}
                      onClick={() => removeFormStop(stopIndex)}
                      type="button"
                    >
                      移除
                    </button>
                  </div>
                ))}
              </div>
            </div>

            <div className="sticky bottom-0 flex items-center justify-end gap-3 border-t border-zinc-200 bg-white px-5 py-4">
              <button
                className="h-10 rounded-md border border-zinc-300 px-4 text-sm font-semibold text-zinc-700 transition hover:bg-zinc-100"
                onClick={() => setForm(null)}
                type="button"
              >
                取消
              </button>
              <button
                className="h-10 rounded-md bg-zinc-950 px-4 text-sm font-semibold text-white transition hover:bg-zinc-700 disabled:cursor-wait disabled:opacity-60"
                disabled={isSaving}
                type="submit"
              >
                {isSaving ? "保存中" : "保存"}
              </button>
            </div>
          </form>
        </div>
      ) : null}
    </>
  );
}
