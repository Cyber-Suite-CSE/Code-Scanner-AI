import { NextRequest, NextResponse } from "next/server";
import { getJobData } from "@/lib/job-store";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<NextResponse> {
  const { id } = await params;

  const job = getJobData(id);

  if (!job) {
    return NextResponse.json(
      { success: false, error: "Job not found" },
      { status: 404 }
    );
  }

  return NextResponse.json({
    success: true,
    job,
  });
}
