import {
  exportGradientBackup,
  importGradientBackup,
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

export async function GET() {
  try {
    const backup = exportGradientBackup();
    const filename = `color-schemes-backup-${backup.exportedAt.slice(0, 10)}.json`;

    return new Response(JSON.stringify(backup, null, 2), {
      headers: {
        "Content-Disposition": `attachment; filename="${filename}"`,
        "Content-Type": "application/json; charset=utf-8",
      },
    });
  } catch (error) {
    return errorResponse(error, 500);
  }
}

export async function POST(request: Request) {
  try {
    const backup = importGradientBackup(await request.json());

    return Response.json({
      imported: backup.gradients.length,
      exportedAt: backup.exportedAt,
    });
  } catch (error) {
    return errorResponse(error);
  }
}
