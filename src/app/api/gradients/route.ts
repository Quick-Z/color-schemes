import {
  createGradient,
  deleteGradient,
  listGradients,
  parseColorFilter,
  updateGradient,
} from "@/lib/gradients-db";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function errorResponse(error: unknown, status = 400) {
  return Response.json(
    {
      error: error instanceof Error ? error.message : "请求处理失败。",
    },
    { status },
  );
}

function parseId(value: string | null) {
  const id = Number(value);

  if (!Number.isInteger(id) || id <= 0) {
    throw new Error("配色方案 ID 不正确。");
  }

  return id;
}

function parseSort(value: string | null) {
  return value === "desc" ? "desc" : "asc";
}

function parseLimit(value: string | null) {
  const limit = Number(value);

  if (!Number.isInteger(limit) || limit <= 0) {
    return 24;
  }

  return Math.min(limit, 60);
}

function parseOffset(value: string | null) {
  const offset = Number(value);

  return Number.isInteger(offset) && offset > 0 ? offset : 0;
}

export async function GET(request: Request) {
  try {
    const searchParams = new URL(request.url).searchParams;
    const color = parseColorFilter(searchParams.get("color"));
    const search = searchParams.get("search")?.trim() ?? "";
    const sort = parseSort(searchParams.get("sort"));
    const limit = parseLimit(searchParams.get("limit"));
    const offset = parseOffset(searchParams.get("offset"));

    return Response.json(
      listGradients({
        color,
        search,
        sort,
        limit,
        offset,
      }),
    );
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const gradient = createGradient(await request.json());

    return Response.json({ gradient }, { status: 201 });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function PUT(request: Request) {
  try {
    const body = await request.json();
    const gradient = updateGradient(parseId(String(body.id ?? "")), body);

    return Response.json({ gradient });
  } catch (error) {
    return errorResponse(error);
  }
}

export async function DELETE(request: Request) {
  try {
    const id = parseId(new URL(request.url).searchParams.get("id"));

    deleteGradient(id);

    return Response.json({ ok: true });
  } catch (error) {
    return errorResponse(error);
  }
}
