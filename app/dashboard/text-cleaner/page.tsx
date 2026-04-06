"use client"

import { useState } from "react"
import { Eraser, Copy, CheckCircle2, Scissors, AlignLeft, ArrowRight, Sparkles } from "lucide-react"

export default function TextCleanerPage() {
  const [inputText, setInputText] = useState("")
  const [outputText, setOutputText] = useState("")
  const [copied, setCopied] = useState(false)

  // Actions
  const handleRemoveExtraWhitespace = () => {
    // Replaces multiple spaces with a single space and trims
    const cleaned = inputText.replace(/\s+/g, ' ').trim()
    setOutputText(cleaned)
  }

  const handleRemoveAllSpaces = () => {
    // Removes every single space
    const cleaned = inputText.replace(/\s/g, '')
    setOutputText(cleaned)
  }

  const handleRemoveLineBreaks = () => {
    // Removes line breaks / newlines but preserves single spaces
    const cleaned = inputText.replace(/(\r\n|\n|\r)/gm, " ").replace(/\s+/g, ' ').trim()
    setOutputText(cleaned)
  }

  const handleCopy = () => {
    if (!outputText) return
    navigator.clipboard.writeText(outputText)
    setCopied(true)
    setTimeout(() => setCopied(false), 2000)
  }

  return (
    <div className="space-y-8 max-w-[1400px] mx-auto pb-12">
      {/* Hero Header */}
      <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-[#0F172A] via-[#1E293B] to-[#334155] p-8 md:p-10 shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-gradient-to-bl from-blue-400/10 to-transparent rounded-full blur-3xl" />
        <div className="absolute bottom-0 left-0 w-60 h-60 bg-gradient-to-tr from-emerald-400/10 to-transparent rounded-full blur-3xl" />
        <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-white/10 backdrop-blur-sm border border-white/10">
                <Eraser className="h-6 w-6 text-emerald-400" />
              </div>
              <div>
                <div className="flex items-center gap-2">
                  <h1 className="text-2xl md:text-3xl font-bold text-white tracking-tight">
                    Smart Text Cleanser
                  </h1>
                  <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-400/30 px-2.5 py-0.5 text-[10px] font-bold text-emerald-300 uppercase tracking-wider">
                    <Sparkles className="h-3 w-3" />
                    Utility
                  </span>
                </div>
                <p className="text-sm text-slate-300 mt-1">
                  Instantly remove unwanted whitespaces, line breaks, and formatting from copied text.
                </p>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Main Workspace */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        
        {/* Input Column */}
        <div className="flex flex-col space-y-3">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <AlignLeft className="h-4 w-4 text-slate-400" />
              Raw Input
            </h2>
            <button 
              onClick={() => setInputText("")}
              className="text-xs text-slate-500 hover:text-red-500 transition-colors"
            >
              Clear
            </button>
          </div>
          <textarea
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="Paste your messy text here..."
            className="w-full h-[400px] rounded-2xl border border-slate-200 bg-white p-5 text-sm text-slate-700 shadow-sm focus:border-emerald-500 focus:ring-4 focus:ring-emerald-500/10 resize-none transition-all"
          />
        </div>




        {/* Output Column */}
        <div className="flex flex-col space-y-3 relative">
          
          {/* Desktop Center Actions */}
          <div className="hidden lg:flex absolute left-0 top-1/2 -translate-x-1/2 -translate-y-1/2 z-10 flex-col gap-2 bg-white p-2 rounded-2xl shadow-xl border border-slate-100">
            <ActionBtn icon={Scissors} onClick={handleRemoveExtraWhitespace} tooltip="Remove Extra Whitespace" />
            <ActionBtn icon={Eraser} onClick={handleRemoveAllSpaces} tooltip="Remove ALL Spaces" />
            <ActionBtn icon={AlignLeft} onClick={handleRemoveLineBreaks} tooltip="Remove Line Breaks" />
          </div>

          <div className="flex items-center justify-between">
            <h2 className="text-sm font-bold text-slate-700 flex items-center gap-2">
              <ArrowRight className="h-4 w-4 text-emerald-500" />
              Cleaned Output
            </h2>
            <button
              onClick={handleCopy}
              className={`flex items-center gap-1.5 text-xs px-3 py-1.5 rounded-lg transition-all ${
                copied 
                  ? "bg-emerald-100 text-emerald-700 font-bold" 
                  : "bg-slate-100 text-slate-600 hover:bg-slate-200 font-medium"
              }`}
            >
              {copied ? <CheckCircle2 className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied!" : "Copy Text"}
            </button>
          </div>
          <div className="relative group h-[400px]">
            <textarea
              readOnly
              value={outputText}
              placeholder="Your cleaned text will appear here..."
              className="w-full h-full rounded-2xl border-2 border-emerald-100 bg-emerald-50/30 p-5 text-sm text-slate-800 shadow-inner resize-none focus:outline-none"
            />
          </div>
        </div>
      </div>

      {/* Mobile Action Controls */}
      <div className="lg:hidden grid grid-cols-1 sm:grid-cols-3 gap-3">
        <button onClick={handleRemoveExtraWhitespace} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Scissors className="h-4 w-4 text-emerald-500" /> Fix Whitespace
        </button>
        <button onClick={handleRemoveAllSpaces} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <Eraser className="h-4 w-4 text-emerald-500" /> Remove All Spaces
        </button>
        <button onClick={handleRemoveLineBreaks} className="flex items-center justify-center gap-2 py-3 rounded-xl bg-white border border-slate-200 shadow-sm text-sm font-semibold text-slate-700 hover:bg-slate-50">
          <AlignLeft className="h-4 w-4 text-emerald-500" /> Remove Breaks
        </button>
      </div>

    </div>
  )
}

function ActionBtn({ icon: Icon, onClick, tooltip }: { icon: any, onClick: () => void, tooltip: string }) {
  return (
    <button
      onClick={onClick}
      title={tooltip}
      className="flex h-12 w-12 items-center justify-center rounded-xl bg-slate-50 text-slate-500 hover:bg-emerald-500 hover:text-white transition-all shadow-sm border border-slate-100 hover:scale-105"
    >
      <Icon className="h-5 w-5" />
    </button>
  )
}
