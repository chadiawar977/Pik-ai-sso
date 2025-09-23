"use client";
import { useParams } from "next/navigation";
import FingerPainter from "@/components/fingerPainter";

export default function CanvasPage() {
  const params = useParams();
  const canvasId = params.id;

  return <FingerPainter canvasId={canvasId} />;
}
