/**
 * @file MindMapViewer.tsx
 * @description Renders mind map markdown as a beautiful hierarchical tree view.
 */

"use client";

import { useState } from "react";

interface MindMapViewerProps {
  markdown: string;
  title: string;
  nodeCount: number;
  depth: number;
}

interface TreeNode {
  label: string;
  level: number;
  children: TreeNode[];
}

function parseMarkdownToTree(md: string): TreeNode {
  const lines = md.split("\n").filter((l) => l.trim());
  const root: TreeNode = { label: "Root", level: 0, children: [] };
  const stack: TreeNode[] = [root];

  for (const line of lines) {
    const headingMatch = line.match(/^(#{1,6})\s+(.+)/);
    const bulletMatch = line.match(/^(\s*)-\s+(.+)/);

    let level: number;
    let label: string;

    if (headingMatch) {
      level = headingMatch[1].length;
      label = headingMatch[2].trim();
    } else if (bulletMatch) {
      const indent = bulletMatch[1].length;
      level = 5 + Math.floor(indent / 2);
      label = bulletMatch[2].trim();
    } else {
      continue;
    }

    const node: TreeNode = { label, level, children: [] };

    while (stack.length > 1 && stack[stack.length - 1].level >= level) {
      stack.pop();
    }

    stack[stack.length - 1].children.push(node);
    stack.push(node);
  }

  return root.children[0] || root;
}

const LEVEL_COLORS = [
  "bg-indigo-500 text-white",
  "bg-blue-500 text-white",
  "bg-emerald-500 text-white",
  "bg-amber-500 text-white",
  "bg-pink-500 text-white",
  "bg-violet-500 text-white",
];

function TreeNodeView({ node, depth = 0 }: { node: TreeNode; depth?: number }) {
  const [expanded, setExpanded] = useState(depth < 3);
  const hasChildren = node.children.length > 0;
  const colorClass = LEVEL_COLORS[depth % LEVEL_COLORS.length];

  return (
    <div className={depth > 0 ? "ml-4 sm:ml-6" : ""}>
      <button
        onClick={() => hasChildren && setExpanded(!expanded)}
        className={`flex items-start gap-2 py-1.5 w-full text-left group ${hasChildren ? "cursor-pointer" : "cursor-default"}`}
      >
        {hasChildren && (
          <span className="text-[#94A3B8] mt-0.5 text-xs shrink-0 transition-transform duration-200" style={{ transform: expanded ? "rotate(90deg)" : "rotate(0)" }}>▶</span>
        )}
        {!hasChildren && <span className="text-[#D1D5DB] mt-0.5 text-xs shrink-0">•</span>}
        <span className={`inline-block px-2.5 py-1 rounded-lg text-xs font-medium ${depth === 0 ? colorClass + " text-sm" : depth <= 2 ? colorClass : "bg-[#F1F5F9] text-[#334155]"}`}>
          {node.label}
        </span>
      </button>
      {expanded && hasChildren && (
        <div className="border-l-2 border-[#E2E8F0] ml-2">
          {node.children.map((child, i) => (
            <TreeNodeView key={i} node={child} depth={depth + 1} />
          ))}
        </div>
      )}
    </div>
  );
}

export function MindMapViewer({ markdown, title, nodeCount, depth }: MindMapViewerProps) {
  const tree = parseMarkdownToTree(markdown);

  return (
    <div className="p-5 max-w-3xl mx-auto">
      <div className="flex items-center gap-3 mb-4">
        <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
          <span className="bg-[#F1F5F9] px-2 py-0.5 rounded">{nodeCount} nodes</span>
          <span className="bg-[#F1F5F9] px-2 py-0.5 rounded">{depth} levels deep</span>
        </div>
      </div>
      <div className="rounded-2xl border border-[#E2E8F0] bg-white p-5">
        <TreeNodeView node={tree} />
      </div>
    </div>
  );
}
