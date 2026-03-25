/**
 * @file MindMapViewer.tsx
 * @description Renders an interactive mind map from markdown using markmap-lib.
 * Features: zoom (scroll), pan (drag), click to collapse/expand, export SVG, search.
 * Library: markmap-lib + markmap-view (MIT, free, no CDN cost)
 */

"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { Download, Maximize2, Minimize2, RefreshCw } from "lucide-react";

interface MindMapViewerProps {
  markdown: string;
  title: string;
  nodeCount: number;
  depth: number;
}

export function MindMapViewer({ markdown, title, nodeCount, depth }: MindMapViewerProps) {
  const svgRef       = useRef<SVGSVGElement>(null);
  const mmRef        = useRef<any>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [isFullscreen, setIsFullscreen] = useState(false);
  const [searchQuery,  setSearchQuery]  = useState("");
  const [isLoaded,     setIsLoaded]     = useState(false);
  const [loadError,    setLoadError]    = useState<string | null>(null);

  // ── Initialise markmap ──────────────────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current) return;

    let cancelled = false;

    async function initMarkmap() {
      try {
        // Dynamic import — markmap requires browser environment (no SSR)
        const { Transformer }              = await import("markmap-lib");
        const { Markmap, loadCSS, loadJS } = await import("markmap-view");

        if (cancelled) return;

        const transformer = new Transformer();
        const { root, features } = transformer.transform(markdown);

        // Load required assets for markmap features (e.g. KaTeX, Prism)
        const { styles, scripts } = transformer.getUsedAssets(features);
        if (styles)  loadCSS(styles);
        if (scripts) await loadJS(scripts, { getMarkmap: () => ({ Markmap }) });

        if (cancelled) return;

        // Destroy previous instance if re-rendering
        if (mmRef.current) {
          mmRef.current.destroy();
          mmRef.current = null;
        }

        // Create the mind map
        mmRef.current = Markmap.create(svgRef.current!, {
          duration:           500,
          maxWidth:           280,
          zoom:               true,
          pan:                true,
          initialExpandLevel: 2,    // show root + main themes expanded by default
        }, root);

        // Fit to container after layout is complete
        setTimeout(() => {
          if (!cancelled && mmRef.current) {
            mmRef.current.fit();
          }
        }, 200);

        if (!cancelled) setIsLoaded(true);

      } catch (err) {
        if (!cancelled) {
          console.error("[MindMapViewer] markmap init error:", err);
          setLoadError(
            err instanceof Error ? err.message : "Failed to render mind map"
          );
        }
      }
    }

    initMarkmap();

    return () => { cancelled = true; };
  }, [markdown]);

  // ── Search: dim non-matching nodes ─────────────────────────────────────
  useEffect(() => {
    if (!svgRef.current || !isLoaded) return;

    const nodeGroups = svgRef.current.querySelectorAll("g.markmap-node");

    nodeGroups.forEach((nodeGroup) => {
      const textEl   = nodeGroup.querySelector("text");
      const circleEl = nodeGroup.querySelector("circle");
      const foreignEl = nodeGroup.querySelector("foreignObject");
      const nodeText = textEl?.textContent?.toLowerCase() ?? 
                       foreignEl?.textContent?.toLowerCase() ?? "";

      const matches = !searchQuery || nodeText.includes(searchQuery.toLowerCase());
      const opacity = matches ? "1" : "0.15";

      if (textEl)    (textEl   as unknown as SVGElement).style.opacity = opacity;
      if (circleEl)  (circleEl as unknown as SVGElement).style.opacity = opacity;
      if (foreignEl) (foreignEl as unknown as SVGElement).style.opacity = opacity;
    });
  }, [searchQuery, isLoaded]);

  // ── Export as SVG ──────────────────────────────────────────────────────
  const handleExport = useCallback(() => {
    if (!svgRef.current) return;

    const clone = svgRef.current.cloneNode(true) as SVGSVGElement;
    clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");

    // Add white background for export
    const bg = document.createElementNS("http://www.w3.org/2000/svg", "rect");
    bg.setAttribute("width",  "100%");
    bg.setAttribute("height", "100%");
    bg.setAttribute("fill",   "white");
    clone.insertBefore(bg, clone.firstChild);

    const svgString = new XMLSerializer().serializeToString(clone);
    const blob = new Blob([svgString], { type: "image/svg+xml" });
    const url  = URL.createObjectURL(blob);

    const a        = document.createElement("a");
    a.href         = url;
    a.download     = `${title.replace(/\s+/g, "-").toLowerCase()}-mindmap.svg`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  }, [title]);

  // ── Fit to screen ──────────────────────────────────────────────────────
  const handleFit = useCallback(() => {
    mmRef.current?.fit();
  }, []);

  // ── Toggle fullscreen ──────────────────────────────────────────────────
  const handleFullscreen = useCallback(async () => {
    if (!containerRef.current) return;
    try {
      if (!isFullscreen) {
        await containerRef.current.requestFullscreen();
        setIsFullscreen(true);
      } else {
        await document.exitFullscreen();
        setIsFullscreen(false);
      }
    } catch {
      // Fullscreen API not available — toggle CSS expansion instead
      setIsFullscreen((prev) => !prev);
    }
  }, [isFullscreen]);

  // Listen for fullscreen change events (e.g. user presses Escape)
  useEffect(() => {
    const onFsChange = () => {
      if (!document.fullscreenElement) setIsFullscreen(false);
    };
    document.addEventListener("fullscreenchange", onFsChange);
    return () => document.removeEventListener("fullscreenchange", onFsChange);
  }, []);

  // ── Error state ─────────────────────────────────────────────────────────
  if (loadError) {
    return (
      <div className="flex flex-col items-center justify-center h-full p-8 text-center">
        <div className="w-14 h-14 rounded-full bg-red-50 flex items-center justify-center mb-4">
          <span className="text-red-400 text-2xl">⚠</span>
        </div>
        <p className="text-sm font-semibold text-[#0F1117] mb-2">
          Could not render mind map
        </p>
        <p className="text-xs text-[#64748B] max-w-xs leading-relaxed">{loadError}</p>
        <p className="text-xs text-[#94A3B8] mt-3">
          Try refreshing. The raw markdown is available in your browser console.
        </p>
      </div>
    );
  }

  // ── Render ──────────────────────────────────────────────────────────────
  return (
    <div
      ref={containerRef}
      className="flex flex-col bg-white"
      style={{ height: isFullscreen ? "100vh" : "calc(100vh - 120px)", minHeight: "500px" }}
    >
      {/* ── Toolbar ──────────────────────────────────────────────────── */}
      <div className="flex items-center justify-between px-4 py-3 border-b border-[#F1F5F9] bg-[#FAFAFA] shrink-0 gap-3 flex-wrap">

        {/* Title + stats */}
        <div className="flex items-center gap-2 min-w-0">
          <span className="text-sm font-semibold text-[#0F1117] truncate max-w-[180px]">
            {title}
          </span>
          <span className="text-xs text-[#94A3B8] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full whitespace-nowrap">
            {nodeCount} nodes
          </span>
          <span className="text-xs text-[#94A3B8] bg-white border border-[#E2E8F0] px-2 py-0.5 rounded-full whitespace-nowrap hidden sm:block">
            {depth} levels
          </span>
        </div>

        {/* Controls */}
        <div className="flex items-center gap-1.5 shrink-0 flex-wrap">
          {/* Search */}
          <input
            type="text"
            placeholder="Search nodes…"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="text-xs border border-[#E2E8F0] rounded-lg px-3 py-1.5 w-28 sm:w-36
                       focus:outline-none focus:ring-2 focus:ring-indigo-300 focus:border-indigo-400
                       bg-white placeholder-[#CBD5E1]"
          />

          {/* Fit */}
          <button
            onClick={handleFit}
            title="Fit to view"
            className="text-xs text-[#64748B] hover:text-[#0F1117] border border-[#E2E8F0]
                       rounded-lg px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] transition-colors
                       flex items-center gap-1.5"
          >
            <RefreshCw className="w-3 h-3" />
            <span className="hidden sm:block">Fit</span>
          </button>

          {/* Export */}
          <button
            onClick={handleExport}
            title="Export as SVG"
            className="text-xs text-[#64748B] hover:text-[#0F1117] border border-[#E2E8F0]
                       rounded-lg px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] transition-colors
                       flex items-center gap-1.5"
          >
            <Download className="w-3 h-3" />
            <span className="hidden sm:block">Export</span>
          </button>

          {/* Fullscreen */}
          <button
            onClick={handleFullscreen}
            title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
            className="text-xs text-[#64748B] hover:text-[#0F1117] border border-[#E2E8F0]
                       rounded-lg px-2.5 py-1.5 bg-white hover:bg-[#F8FAFC] transition-colors
                       flex items-center gap-1.5"
          >
            {isFullscreen
              ? <Minimize2 className="w-3 h-3" />
              : <Maximize2 className="w-3 h-3" />
            }
          </button>
        </div>
      </div>

      {/* ── SVG canvas ───────────────────────────────────────────────── */}
      <div className="flex-1 relative overflow-hidden">

        {/* Loading overlay */}
        {!isLoaded && (
          <div className="absolute inset-0 flex flex-col items-center justify-center bg-white z-10">
            <div className="relative w-12 h-12 mb-4">
              <div className="absolute inset-0 rounded-full bg-indigo-100 animate-ping opacity-30" />
              <div className="relative w-full h-full rounded-full bg-indigo-50 flex items-center justify-center">
                <div className="w-5 h-5 rounded-full bg-indigo-400 animate-pulse" />
              </div>
            </div>
            <p className="text-sm text-[#64748B]">Rendering mind map…</p>
          </div>
        )}

        {/* markmap renders INTO this SVG element */}
        <svg
          ref={svgRef}
          className="w-full h-full"
          style={{ background: "white" }}
        />

        {/* Interaction hints (only shown when loaded, fades out via opacity) */}
        {isLoaded && (
          <div
            className="absolute bottom-4 right-4 text-right pointer-events-none select-none"
            style={{ opacity: searchQuery ? 0 : 1, transition: "opacity 0.3s" }}
          >
            <p className="text-xs text-[#CBD5E1]">Scroll to zoom</p>
            <p className="text-xs text-[#CBD5E1]">Drag to pan</p>
            <p className="text-xs text-[#CBD5E1]">Click node to collapse</p>
          </div>
        )}
      </div>
    </div>
  );
}
