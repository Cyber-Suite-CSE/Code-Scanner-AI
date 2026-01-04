import { NextRequest, NextResponse } from "next/server";
import { getJob, cancelJob } from "@/lib/job-store";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const job = getJob(id);
  if (!job) {
    return NextResponse.json(
      { error: "Job not found" },
      { status: 404 }
    );
  }

  const cancelled = cancelJob(id);
  
  if (!cancelled) {
    return NextResponse.json(
      { error: "Job cannot be cancelled (not running)" },
      { status: 400 }
    );
  }

  return NextResponse.json({ success: true, status: "cancelled" });
}
