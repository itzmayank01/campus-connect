/**
 * @file page.tsx
 * @description Resource detail page — shows file preview and the StudyLab panel.
 * Users navigate here from Study Materials to view a resource and generate study tools.
 */

"use client";

import { useState, useEffect, use } from "react";
import { useSearchParams } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, FileText, Download, Star, Eye, Clock, User, Loader2 } from "lucide-react";
import { StudyLabEntry } from "@/components/StudyLabEntry";
import { BookmarkButton } from "@/components/BookmarkButton";

interface ResourceDetail {
  id: string;
  originalFilename: string;
  mimeType: string;
  fileSize: number;
  downloadCount: number;
  averageRating: number;
  ratingCount: number;
  isVerified: boolean;
  createdAt: string;
  s3Key: string | null;
  resourceType: string;
  description: string | null;
  uploader: { name: string | null; email: string } | null;
  subject: { name: string; code: string } | null;
}

function formatSize(bytes: number) {
  if (bytes === 0) return "—";
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function formatDate(d: string) {
  return new Date(d).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" });
}

export default function ResourceDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = use(params);
  const searchParams = useSearchParams();
  const openLab = searchParams.get("openLab") === "true";
  const [resource, setResource] = useState<ResourceDetail | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [previewType, setPreviewType] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      try {
        const res = await fetch(`/api/resources/${id}/preview`);
        const data = await res.json();
        if (!res.ok) throw new Error(data.error);
        setResource(data.resource);
        setPreviewUrl(data.previewUrl);
        setPreviewType(data.type);
      } catch (e: unknown) {
        setError(e instanceof Error ? e.message : "Failed to load resource");
      } finally {
        setLoading(false);
      }
    }
    load();
  }, [id]);

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <Loader2 className="w-8 h-8 animate-spin text-[#4F8EF7]" />
      </div>
    );
  }

  if (error || !resource) {
    return (
      <div className="text-center py-20">
        <FileText className="w-12 h-12 text-[#E2E8F0] mx-auto mb-3" />
        <p className="text-sm font-semibold text-[#334155]">Resource not found</p>
        <p className="text-xs text-[#94A3B8] mt-1">{error}</p>
        <Link href="/dashboard/study-materials" className="text-xs text-[#4F8EF7] mt-4 inline-block hover:underline">← Back to Study Materials</Link>
      </div>
    );
  }

  const canUseStudyLab = resource.s3Key && (resource.mimeType.includes("pdf") || resource.mimeType.includes("word") || resource.mimeType.includes("openxmlformats") || resource.mimeType.includes("text"));

  return (
    <div className="max-w-[900px] mx-auto space-y-5">
      {/* Back link */}
      <Link href="/dashboard/study-materials" className="inline-flex items-center gap-1.5 text-xs text-[#64748B] hover:text-[#4F8EF7] transition-colors no-underline">
        <ArrowLeft className="w-3.5 h-3.5" /> Back to Study Materials
      </Link>

      {/* Resource header */}
      <div className="rounded-2xl bg-white border border-[#F1F5F9] p-5 shadow-[0_1px_3px_rgba(0,0,0,0.06)]">
        <div className="flex items-start gap-4">
          <div className="w-12 h-12 rounded-xl bg-[#F1F3F9] flex items-center justify-center shrink-0">
            <FileText className="w-6 h-6 text-[#6B7280]" />
          </div>
          <div className="flex-1 min-w-0">
            <h1 className="text-lg font-bold text-[#0F1117] leading-tight">{resource.originalFilename}</h1>
            <div className="flex flex-wrap items-center gap-2 mt-1.5">
              {resource.subject && (
                <span className="text-[11px] text-[#4F8EF7] font-medium bg-[#4F8EF7]/5 px-2 py-0.5 rounded-md">{resource.subject.code} — {resource.subject.name}</span>
              )}
              {resource.isVerified && (
                <span className="text-[10px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded-md font-medium flex items-center gap-0.5">✓ Verified</span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-3 mt-2 text-[11px] text-[#94A3B8]">
              {resource.uploader && <span className="flex items-center gap-1"><User className="w-3 h-3" />{resource.uploader.name || resource.uploader.email}</span>}
              <span className="flex items-center gap-1"><Clock className="w-3 h-3" />{formatDate(resource.createdAt)}</span>
              <span className="flex items-center gap-1"><Eye className="w-3 h-3" />{resource.downloadCount} downloads</span>
              {resource.fileSize > 0 && <span>{formatSize(resource.fileSize)}</span>}
              {resource.averageRating > 0 && <span className="flex items-center gap-1"><Star className="w-3 h-3 text-amber-400 fill-amber-400" />{resource.averageRating.toFixed(1)} ({resource.ratingCount})</span>}
            </div>
            {resource.description && <p className="text-xs text-[#64748B] mt-2">{resource.description}</p>}
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <BookmarkButton resourceId={resource.id} />
            <a href={`/api/resources/${resource.id}/download`} className="flex items-center gap-1.5 rounded-xl px-4 py-2.5 text-xs font-medium text-white bg-[#059669] hover:bg-[#047857] transition-colors shrink-0 no-underline">
              <Download className="w-4 h-4" /> Download
            </a>
          </div>
        </div>
      </div>

      {/* File preview */}
      {previewUrl && previewType === "pdf" && (
        <div className="rounded-2xl border border-[#F1F5F9] overflow-hidden bg-white">
          <iframe src={previewUrl} className="w-full h-[500px]" title="PDF Preview" />
        </div>
      )}

      {previewUrl && previewType === "youtube" && (
        <div className="rounded-2xl border border-[#F1F5F9] overflow-hidden bg-black aspect-video">
          <iframe src={previewUrl} className="w-full h-full" allowFullScreen title="Video" />
        </div>
      )}

      {/* StudyLab 2.0 — Documents (9 tools) + Videos (3 tools) */}
      {canUseStudyLab ? (
        <StudyLabEntry
          preselectedResourceId={resource.id}
          preselectedResourceTitle={resource.originalFilename}
          defaultOpen={openLab}
        />
      ) : (
        <StudyLabEntry defaultOpen={openLab} />
      )}
    </div>
  );
}
