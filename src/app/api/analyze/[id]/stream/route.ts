import { NextRequest } from "next/server";
import { getJob, subscribeToJob, JobEvent } from "@/lib/job-store";

export const dynamic = "force-dynamic";

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
): Promise<Response> {
  const { id } = await params;

  const job = getJob(id);

  if (!job) {
    return new Response(
      JSON.stringify({ error: "Job not found" }),
      { status: 404, headers: { "Content-Type": "application/json" } }
    );
  }

  // Create a readable stream for SSE
  const stream = new ReadableStream({
    start(controller) {
      const encoder = new TextEncoder();

      // Helper to send SSE event
      const sendEvent = (event: JobEvent) => {
        const data = `data: ${JSON.stringify(event)}\n\n`;
        controller.enqueue(encoder.encode(data));
      };

      // Send initial state
      sendEvent({
        type: "status",
        timestamp: Date.now(),
        data: job.status,
      });

      // Send existing logs
      for (const log of job.logs) {
        sendEvent({
          type: "log",
          timestamp: log.timestamp,
          data: log,
        });
      }

      // Send current progress
      sendEvent({
        type: "progress",
        timestamp: Date.now(),
        data: job.progress,
      });

      // If job is already completed, send result and close
      if (job.status === "completed" && job.result) {
        sendEvent({
          type: "result",
          timestamp: Date.now(),
          data: job.result,
        });
        controller.close();
        return;
      }

      if (job.status === "failed" && job.error) {
        sendEvent({
          type: "error",
          timestamp: Date.now(),
          data: job.error,
        });
        controller.close();
        return;
      }

      // Subscribe to new events
      const unsubscribe = subscribeToJob(id, (event) => {
        try {
          sendEvent(event);

          // Close stream when job completes
          if (
            event.type === "status" &&
            (event.data === "completed" || event.data === "failed")
          ) {
            setTimeout(() => {
              unsubscribe();
              controller.close();
            }, 100);
          }
        } catch {
          // Stream might be closed
          unsubscribe();
        }
      });

      // Handle client disconnect
      request.signal.addEventListener("abort", () => {
        unsubscribe();
        controller.close();
      });
    },
  });

  return new Response(stream, {
    headers: {
      "Content-Type": "text/event-stream",
      "Cache-Control": "no-cache",
      Connection: "keep-alive",
    },
  });
}
