import fs from "node:fs";
import path from "node:path";
import type { DatabaseSync } from "node:sqlite";
import parsedGradients from "@/data/gradients-parsed.json";
import {
  gradientExtras,
  gradientTypeOverrides,
} from "@/data/gradient-overrides";
import type {
  ColorFilter,
  GradientScheme,
  GradientStop,
  GradientType,
} from "@/data/gradient-types";

type StoredGradient = GradientScheme & { id: number };

type RawGradient = Omit<GradientScheme, "index" | "type"> & {
  index: string | number;
};

type GradientRow = {
  id: number;
  name: string;
  favorite: number;
  display_index: string;
  deg: number;
  type: string;
  css_background: string | null;
  blend_mode: string | null;
};

type StopRow = {
  color: string;
  position: number;
};

type TagRow = {
  color_key: ColorFilter;
};

type CountRow = {
  count: number;
};

type MaxIndexRow = {
  maxIndex: number | null;
};

type GradientInput = {
  name?: unknown;
  favorite?: unknown;
  deg?: unknown;
  type?: unknown;
  gradient?: unknown;
};

type SortDirection = "asc" | "desc";

type ListGradientOptions = {
  color?: ColorFilter;
  search?: string;
  sort?: SortDirection;
  limit?: number;
  offset?: number;
};

type ListGradientResult = {
  gradients: StoredGradient[];
  total: number;
  hasMore: boolean;
  nextOffset: number;
};

const databaseDir = path.join(process.cwd(), "data");
const databasePath = path.join(databaseDir, "gradients.sqlite");
const colorPattern =
  /^(?:#[\da-f]{3,8}|rgba?\([\d.,%\s]+\)|hsla?\([\d.,%\s]+\)|[a-z]+)$/i;
const gradientTypes: GradientType[] = ["linear", "radial", "conic"];
const colorFilters: ColorFilter[] = [
  "red",
  "orange",
  "yellow",
  "green",
  "blue",
  "indigo",
  "purple",
  "black",
  "white",
];
const defaultPageSize = 24;
const maxPageSize = 60;
const namedColors: Record<string, [number, number, number]> = {
  black: [0, 0, 0],
  white: [255, 255, 255],
  red: [255, 0, 0],
  orange: [255, 165, 0],
  yellow: [255, 255, 0],
  green: [0, 128, 0],
  blue: [0, 0, 255],
  indigo: [75, 0, 130],
  purple: [128, 0, 128],
};
const nodeProcess = process as typeof process & {
  getBuiltinModule?: (id: string) => unknown;
};
const sqliteModule =
  nodeProcess.getBuiltinModule?.("node:sqlite") ??
  nodeProcess.getBuiltinModule?.("sqlite");

if (!sqliteModule) {
  throw new Error("当前 Node.js 版本不支持内置 SQLite。");
}

const { DatabaseSync: SQLiteDatabaseSync } = sqliteModule as {
  DatabaseSync: new (path: string) => DatabaseSync;
};

let database: DatabaseSync | undefined;

function normalizeIndex(index: string | number) {
  return String(index).padStart(3, "0");
}

function isColorFilter(value: unknown): value is ColorFilter {
  return colorFilters.includes(value as ColorFilter);
}

function parseColor(value: string): [number, number, number] | null {
  const color = value.trim().toLowerCase();

  if (namedColors[color]) {
    return namedColors[color];
  }

  if (color.startsWith("#")) {
    const hex = color.slice(1);
    const normalizedHex =
      hex.length === 3 || hex.length === 4
        ? hex
            .slice(0, 3)
            .split("")
            .map((part) => part + part)
            .join("")
        : hex.slice(0, 6);

    if (normalizedHex.length !== 6) {
      return null;
    }

    const red = Number.parseInt(normalizedHex.slice(0, 2), 16);
    const green = Number.parseInt(normalizedHex.slice(2, 4), 16);
    const blue = Number.parseInt(normalizedHex.slice(4, 6), 16);

    return [red, green, blue].every(Number.isFinite)
      ? [red, green, blue]
      : null;
  }

  const rgbMatch = color.match(/^rgba?\((.+)\)$/);

  if (rgbMatch) {
    const parts = rgbMatch[1].split(",").map((part) => part.trim());
    const channels = parts.slice(0, 3).map((part) => {
      if (part.endsWith("%")) {
        return Math.round((Number.parseFloat(part) / 100) * 255);
      }

      return Number.parseFloat(part);
    });

    if (channels.length === 3 && channels.every(Number.isFinite)) {
      return channels.map((channel) =>
        Math.max(0, Math.min(255, Math.round(channel))),
      ) as [number, number, number];
    }
  }

  return null;
}

function rgbToHsl([red, green, blue]: [number, number, number]) {
  const r = red / 255;
  const g = green / 255;
  const b = blue / 255;
  const max = Math.max(r, g, b);
  const min = Math.min(r, g, b);
  const lightness = (max + min) / 2;
  const delta = max - min;

  if (delta === 0) {
    return { hue: 0, saturation: 0, lightness };
  }

  const saturation =
    lightness > 0.5 ? delta / (2 - max - min) : delta / (max + min);
  let hue = 0;

  if (max === r) {
    hue = (g - b) / delta + (g < b ? 6 : 0);
  } else if (max === g) {
    hue = (b - r) / delta + 2;
  } else {
    hue = (r - g) / delta + 4;
  }

  return { hue: hue * 60, saturation, lightness };
}

function classifyColor(color: string): ColorFilter[] {
  const rgb = parseColor(color);

  if (!rgb) {
    return [];
  }

  const { hue, saturation, lightness } = rgbToHsl(rgb);
  const tags = new Set<ColorFilter>();

  if (lightness <= 0.18 || (saturation <= 0.16 && lightness <= 0.42)) {
    tags.add("black");
  }

  if (lightness >= 0.88 || (saturation <= 0.16 && lightness >= 0.72)) {
    tags.add("white");
  }

  if (saturation >= 0.12 && lightness > 0.12 && lightness < 0.94) {
    if (hue < 15 || hue >= 345) {
      tags.add("red");
    } else if (hue < 45) {
      tags.add("orange");
    } else if (hue < 75) {
      tags.add("yellow");
    } else if (hue < 165) {
      tags.add("green");
    } else if (hue < 225) {
      tags.add("blue");
    } else if (hue < 260) {
      tags.add("indigo");
    } else {
      tags.add("purple");
    }
  }

  return [...tags];
}

function getColorTags(stops: GradientStop[]): ColorFilter[] {
  const tags = new Set<ColorFilter>();

  for (const stop of stops) {
    for (const tag of classifyColor(stop.color)) {
      tags.add(tag);
    }
  }

  return colorFilters.filter((filter) => tags.has(filter));
}

function getDefaultGradients(): GradientScheme[] {
  const normalizedParsed = (parsedGradients as RawGradient[]).map(
    (gradient) => {
      const index = normalizeIndex(gradient.index);

      return {
          ...gradient,
          index,
          type: "linear" as const,
          ...gradientTypeOverrides[index],
        };
    },
  );

  return [...normalizedParsed, ...gradientExtras].sort(
    (a, b) => Number(a.index) - Number(b.index),
  );
}

function getDatabase() {
  if (database) {
    return database;
  }

  fs.mkdirSync(databaseDir, { recursive: true });
  database = new SQLiteDatabaseSync(databasePath);
  database.exec("PRAGMA foreign_keys = ON;");
  initializeDatabase(database);

  return database;
}

function initializeDatabase(db: DatabaseSync) {
  db.exec(`
    CREATE TABLE IF NOT EXISTS gradients (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      favorite INTEGER NOT NULL DEFAULT 0,
      display_index TEXT NOT NULL UNIQUE,
      deg REAL NOT NULL DEFAULT 0,
      type TEXT NOT NULL DEFAULT 'linear',
      css_background TEXT,
      blend_mode TEXT,
      created_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP,
      updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS gradient_stops (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      gradient_id INTEGER NOT NULL,
      color TEXT NOT NULL,
      position REAL NOT NULL,
      sort_order INTEGER NOT NULL,
      FOREIGN KEY (gradient_id) REFERENCES gradients(id) ON DELETE CASCADE
    );

    CREATE TABLE IF NOT EXISTS gradient_color_tags (
      gradient_id INTEGER NOT NULL,
      color_key TEXT NOT NULL,
      PRIMARY KEY (gradient_id, color_key),
      FOREIGN KEY (gradient_id) REFERENCES gradients(id) ON DELETE CASCADE
    );
  `);
  db.exec(`
    UPDATE gradients
    SET
      type = 'linear',
      updated_at = CURRENT_TIMESTAMP
    WHERE type NOT IN ('linear', 'radial', 'conic');

    UPDATE gradients
    SET
      css_background = NULL,
      blend_mode = NULL,
      updated_at = CURRENT_TIMESTAMP
    WHERE css_background IS NOT NULL
      OR blend_mode IS NOT NULL;

    UPDATE gradients
    SET
      type = 'radial',
      updated_at = CURRENT_TIMESTAMP
    WHERE (display_index = '027' AND name = 'Arielles Smile')
      OR (display_index = '111' AND name = 'Elegance');
  `);

  const row = db.prepare("SELECT COUNT(*) AS count FROM gradients").get() as
    | CountRow
    | undefined;

  if (!row?.count) {
    seedDatabase(db);
  } else {
    refreshAllColorTags(db);
  }
}

function seedDatabase(db: DatabaseSync) {
  const insertGradient = db.prepare(`
    INSERT INTO gradients (
      name,
      favorite,
      display_index,
      deg,
      type,
      css_background,
      blend_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  const insertStop = db.prepare(`
    INSERT INTO gradient_stops (
      gradient_id,
      color,
      position,
      sort_order
    ) VALUES (?, ?, ?, ?)
  `);

  db.exec("BEGIN");

  try {
    for (const gradient of getDefaultGradients()) {
      const result = insertGradient.run(
        gradient.name,
        gradient.favorite ? 1 : 0,
        gradient.index,
        gradient.deg,
        gradient.type ?? "linear",
        null,
        null,
      );
      const gradientId = Number(result.lastInsertRowid);

      gradient.gradient.forEach((stop, stopIndex) => {
        insertStop.run(gradientId, stop.color, stop.pos, stopIndex);
      });
      replaceColorTags(db, gradientId, gradient.gradient);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function normalizeStops(stops: unknown): GradientStop[] {
  if (!Array.isArray(stops)) {
    throw new Error("请至少保留 2 个颜色值。");
  }

  const normalizedStops = stops.map((stop, index) => {
    if (!stop || typeof stop !== "object") {
      throw new Error("颜色值格式不正确。");
    }

    const color = String((stop as { color?: unknown }).color ?? "").trim();
    const pos = Number((stop as { pos?: unknown }).pos);

    if (!color || color.length > 80 || !colorPattern.test(color)) {
      throw new Error(`第 ${index + 1} 个颜色值不正确。`);
    }

    if (!Number.isFinite(pos)) {
      throw new Error(`第 ${index + 1} 个颜色位置不正确。`);
    }

    return { color, pos };
  });

  if (normalizedStops.length < 2) {
    throw new Error("每个配色方案至少保留 2 个颜色值。");
  }

  return normalizedStops;
}

function normalizeText(value: unknown, fallback: string, maxLength: number) {
  const text = typeof value === "string" ? value.trim() : "";

  return text.slice(0, maxLength) || fallback;
}

function normalizeType(value: unknown): GradientType {
  return gradientTypes.includes(value as GradientType)
    ? (value as GradientType)
    : "linear";
}

function normalizeSearch(value: unknown) {
  return typeof value === "string" ? value.trim().slice(0, 80) : "";
}

function normalizeSort(value: unknown): SortDirection {
  return value === "desc" ? "desc" : "asc";
}

function normalizeLimit(value: unknown) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return defaultPageSize;
  }

  return Math.min(limit, maxPageSize);
}

function normalizeOffset(value: unknown) {
  const offset = Number(value);

  return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

function escapeLikeSearch(value: string) {
  return value.replace(/[\\%_]/g, (character) => `\\${character}`);
}

function normalizeGradientInput(input: GradientInput) {
  const type = normalizeType(input.type);

  return {
    name: normalizeText(input.name, "Untitled Gradient", 80),
    favorite: input.favorite ? 1 : 0,
    deg: Number.isFinite(Number(input.deg)) ? Number(input.deg) : 0,
    type,
    gradient: normalizeStops(input.gradient),
  };
}

function insertStops(db: DatabaseSync, gradientId: number, stops: GradientStop[]) {
  const insertStop = db.prepare(`
    INSERT INTO gradient_stops (
      gradient_id,
      color,
      position,
      sort_order
    ) VALUES (?, ?, ?, ?)
  `);

  stops.forEach((stop, index) => {
    insertStop.run(gradientId, stop.color, stop.pos, index);
  });
}

function replaceColorTags(
  db: DatabaseSync,
  gradientId: number,
  stops: GradientStop[],
) {
  const insertTag = db.prepare(`
    INSERT OR IGNORE INTO gradient_color_tags (
      gradient_id,
      color_key
    ) VALUES (?, ?)
  `);

  db.prepare("DELETE FROM gradient_color_tags WHERE gradient_id = ?").run(
    gradientId,
  );

  getColorTags(stops).forEach((tag) => {
    insertTag.run(gradientId, tag);
  });
}

function refreshAllColorTags(db: DatabaseSync) {
  const gradients = db
    .prepare("SELECT id FROM gradients")
    .all() as Array<{ id: number }>;
  const stops = db.prepare(`
    SELECT
      color,
      position
    FROM gradient_stops
    WHERE gradient_id = ?
    ORDER BY sort_order, id
  `);

  db.exec("BEGIN");

  try {
    for (const gradient of gradients) {
      const gradientStops = (stops.all(gradient.id) as StopRow[]).map(
        (stop) => ({
          color: stop.color,
          pos: stop.position,
        }),
      );

      replaceColorTags(db, gradient.id, gradientStops);
    }

    db.exec("COMMIT");
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

function getNextIndex(db: DatabaseSync) {
  const row = db
    .prepare("SELECT MAX(CAST(display_index AS INTEGER)) AS maxIndex FROM gradients")
    .get() as MaxIndexRow | undefined;
  const nextIndex = (row?.maxIndex ?? 0) + 1;

  return normalizeIndex(nextIndex);
}

function hydrateGradient(
  row: GradientRow,
  stops: StopRow[],
  colorTags: ColorFilter[],
): StoredGradient {
  return {
    id: row.id,
    name: row.name,
    favorite: Boolean(row.favorite),
    index: row.display_index,
    deg: row.deg,
    group: [],
    gradient: stops.map((stop) => ({
      color: stop.color,
      pos: stop.position,
    })),
    type: normalizeType(row.type),
    colorTags,
  };
}

export function listGradients(
  options: ListGradientOptions = {},
): ListGradientResult {
  const db = getDatabase();
  const color = options.color;
  const search = normalizeSearch(options.search);
  const sort = normalizeSort(options.sort);
  const limit = normalizeLimit(options.limit);
  const offset = normalizeOffset(options.offset);
  const whereParts: string[] = [];
  const whereParams: unknown[] = [];

  if (color) {
    whereParts.push(`EXISTS (
        SELECT 1
        FROM gradient_color_tags
        WHERE gradient_color_tags.gradient_id = gradients.id
          AND gradient_color_tags.color_key = ?
      )`);
    whereParams.push(color);
  }

  if (search) {
    whereParts.push("LOWER(name) LIKE LOWER(?) ESCAPE '\\'");
    whereParams.push(`%${escapeLikeSearch(search)}%`);
  }

  const whereClause = whereParts.length
    ? `WHERE ${whereParts.join(" AND ")}`
    : "";
  const orderDirection = sort === "desc" ? "DESC" : "ASC";
  const totalRow = db
    .prepare(`SELECT COUNT(*) AS count FROM gradients ${whereClause}`)
    .get(...whereParams) as CountRow | undefined;
  const total = totalRow?.count ?? 0;
  const gradients = db
    .prepare(
      `SELECT
        id,
        name,
        favorite,
        display_index,
        deg,
        type,
        css_background,
        blend_mode
      FROM gradients
      ${whereClause}
      ORDER BY CAST(display_index AS INTEGER) ${orderDirection}, id ${orderDirection}
      LIMIT ?
      OFFSET ?`,
    )
    .all(...whereParams, limit, offset) as GradientRow[];
  const stops = db
    .prepare(
      `SELECT
        color,
        position
      FROM gradient_stops
      WHERE gradient_id = ?
      ORDER BY sort_order, id`,
    );
  const tags = db.prepare(`
    SELECT color_key
    FROM gradient_color_tags
    WHERE gradient_id = ?
    ORDER BY color_key
  `);

  return {
    gradients: gradients.map((gradient) =>
      hydrateGradient(
        gradient,
        stops.all(gradient.id) as StopRow[],
        (tags.all(gradient.id) as TagRow[]).map((tag) => tag.color_key),
      ),
    ),
    total,
    hasMore: offset + gradients.length < total,
    nextOffset: offset + gradients.length,
  };
}

export function createGradient(input: GradientInput): StoredGradient {
  const db = getDatabase();
  const gradient = normalizeGradientInput(input);
  const insertGradient = db.prepare(`
    INSERT INTO gradients (
      name,
      favorite,
      display_index,
      deg,
      type,
      css_background,
      blend_mode
    ) VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  db.exec("BEGIN");

  try {
    const displayIndex = getNextIndex(db);
    const result = insertGradient.run(
      gradient.name,
      gradient.favorite,
      displayIndex,
      gradient.deg,
      gradient.type,
      null,
      null,
    );
    const gradientId = Number(result.lastInsertRowid);

    insertStops(db, gradientId, gradient.gradient);
    replaceColorTags(db, gradientId, gradient.gradient);
    db.exec("COMMIT");

    return getGradient(gradientId);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function updateGradient(
  gradientId: number,
  input: GradientInput,
): StoredGradient {
  const db = getDatabase();
  const gradient = normalizeGradientInput(input);
  const current = db
    .prepare("SELECT id FROM gradients WHERE id = ?")
    .get(gradientId);

  if (!current) {
    throw new Error("没有找到这个配色方案。");
  }

  db.exec("BEGIN");

  try {
    db.prepare(
      `UPDATE gradients
      SET
        name = ?,
        favorite = ?,
        deg = ?,
        type = ?,
        css_background = ?,
        blend_mode = ?,
        updated_at = CURRENT_TIMESTAMP
      WHERE id = ?`,
    ).run(
      gradient.name,
      gradient.favorite,
      gradient.deg,
      gradient.type,
      null,
      null,
      gradientId,
    );
    db.prepare("DELETE FROM gradient_stops WHERE gradient_id = ?").run(
      gradientId,
    );
    insertStops(db, gradientId, gradient.gradient);
    replaceColorTags(db, gradientId, gradient.gradient);
    db.exec("COMMIT");

    return getGradient(gradientId);
  } catch (error) {
    db.exec("ROLLBACK");
    throw error;
  }
}

export function deleteGradient(gradientId: number) {
  const db = getDatabase();
  const result = db
    .prepare("DELETE FROM gradients WHERE id = ?")
    .run(gradientId);

  if (!result.changes) {
    throw new Error("没有找到这个配色方案。");
  }
}

export function getGradient(gradientId: number): StoredGradient {
  const db = getDatabase();
  const row = db
    .prepare(
      `SELECT
        id,
        name,
        favorite,
        display_index,
        deg,
        type,
        css_background,
        blend_mode
      FROM gradients
      WHERE id = ?`,
    )
    .get(gradientId) as GradientRow | undefined;

  if (!row) {
    throw new Error("没有找到这个配色方案。");
  }

  const stops = db
    .prepare(
      `SELECT
        color,
        position
      FROM gradient_stops
      WHERE gradient_id = ?
      ORDER BY sort_order, id`,
    )
    .all(gradientId) as StopRow[];
  const tags = db
    .prepare(
      `SELECT color_key
      FROM gradient_color_tags
      WHERE gradient_id = ?
      ORDER BY color_key`,
    )
    .all(gradientId) as TagRow[];

  return hydrateGradient(
    row,
    stops,
    tags.map((tag) => tag.color_key),
  );
}

export function parseColorFilter(value: string | null): ColorFilter | undefined {
  if (!value) {
    return undefined;
  }

  if (!isColorFilter(value)) {
    throw new Error("颜色筛选项不正确。");
  }

  return value;
}
