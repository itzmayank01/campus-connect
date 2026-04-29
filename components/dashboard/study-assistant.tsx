"use client"

import { useState, useRef, useEffect, useCallback } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  Send, Loader2, Sparkles, BookOpen, HelpCircle, Lightbulb,
  GraduationCap, ChevronDown, Trash2, FileText, Upload,
  CheckCircle, Brain, Target, RefreshCw, MessageSquare, X, Zap
} from "lucide-react"
import Image from "next/image"
import { toast } from "sonner"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface StudyMaterial {
  id: string
  originalFilename: string
  createdAt: string
  uploader?: { name: string | null; email: string }
}

interface TopicData {
  units?: { unit_number: number; unit_name: string; topics: string[]; importance: string; exam_weightage: string }[]
  most_important_overall?: string[]
  has_syllabus?: boolean
  error?: string
}

interface StudyAssistantProps {
  subjectId: string
  subjectName: string
  subjectCode: string
  studyMaterials: StudyMaterial[]
  onUploadMaterial: () => void
}

const SUGGESTIONS = [
  { label: "Most Important Topics", prompt: "List all the most important topics from the syllabus categorized by priority (High 🔴, Medium 🟡, Low 🟢). Be thorough.", icon: Target, gradient: "from-[#EF4444] to-[#F97316]" },
  { label: "6-7 Likely Questions", prompt: "Generate 6-7 most likely exam questions with marks distribution. Focus on high-weightage topics from the syllabus.", icon: HelpCircle, gradient: "from-[#7C3AED] to-[#A78BFA]" },
  { label: "Questions + Answers", prompt: "Generate 6-7 important exam questions with detailed answers for each. Cover all major units.", icon: BookOpen, gradient: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "Exam Strategy", prompt: "Give me a complete exam preparation strategy for this subject. Include time allocation, important topics to focus, and tips.", icon: Lightbulb, gradient: "from-[#10B981] to-[#34D399]" },
]

function formatMarkdown(text: string): string {
  let html = text
    .replace(/\*\*(.*?)\*\*/g, '<strong class="text-[#1E293B]">$1</strong>')
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    .replace(/^### (.+)$/gm, '<h4 class="text-[13px] font-bold text-[#1E293B] mt-4 mb-1.5">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-[14px] font-bold text-[#0F1117] mt-4 mb-2">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-[15px] font-bold text-[#0F1117] mt-5 mb-2">$1</h2>')
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-[#F1F5F9] text-[#7C3AED] rounded text-[11px] font-mono">$1</code>')
    .replace(/\n/g, '<br/>')
  return html
}

export function StudyAssistant({ subjectId, subjectName, subjectCode, studyMaterials, onUploadMaterial }: StudyAssistantProps) {
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [topics, setTopics] = useState<TopicData | null>(null)
  const [topicsLoading, setTopicsLoading] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<string>("")
  const [showMaterialDropdown, setShowMaterialDropdown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLTextAreaElement>(null)
  const dropdownRef = useRef<HTMLDivElement>(null)

  // Auto-select first material
  useEffect(() => {
    if (studyMaterials.length > 0 && !selectedMaterial) {
      setSelectedMaterial(studyMaterials[0].id)
    }
  }, [studyMaterials])

  // Fetch topics when material selected
  useEffect(() => {
    if (selectedMaterial) {
      fetchTopics()
    }
  }, [selectedMaterial])

  // Close dropdown on outside click
  useEffect(() => {
    const handler = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setShowMaterialDropdown(false)
      }
    }
    document.addEventListener("mousedown", handler)
    return () => document.removeEventListener("mousedown", handler)
  }, [])

  const scrollToBottom = useCallback(() => {
    setTimeout(() => messagesEndRef.current?.scrollIntoView({ behavior: "smooth" }), 100)
  }, [])

  useEffect(() => {
    if (messages.length > 0) scrollToBottom()
  }, [messages, scrollToBottom])

  const fetchTopics = async (force = false) => {
    setTopicsLoading(true)
    try {
      const url = force ? `/api/subjects/${subjectId}/topics?refresh=true` : `/api/subjects/${subjectId}/topics`
      const res = await fetch(url)
      const data = await res.json()
      setTopics(data)
    } catch {} finally {
      setTopicsLoading(false)
    }
  }

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return
    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`, role: "user", content: text.trim(), timestamp: new Date()
    }
    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)
    // Auto-resize textarea back
    if (inputRef.current) inputRef.current.style.height = "44px"

    try {
      const res = await fetch(`/api/subjects/${subjectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
          resourceId: selectedMaterial || undefined
        }),
      })
      const data = await res.json()
      setMessages(prev => [...prev, {
        id: `bot-${Date.now()}`, role: "assistant",
        content: data.reply || data.error || "Sorry, something went wrong.",
        timestamp: new Date()
      }])
    } catch {
      setMessages(prev => [...prev, {
        id: `err-${Date.now()}`, role: "assistant",
        content: "⚠️ Network error. Please try again.", timestamp: new Date()
      }])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      sendMessage(input)
    }
  }

  const handleTextareaInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setInput(e.target.value)
    // Auto-resize
    e.target.style.height = "44px"
    e.target.style.height = Math.min(e.target.scrollHeight, 120) + "px"
  }

  const selectedMaterialName = studyMaterials.find(s => s.id === selectedMaterial)?.originalFilename || ""
  const hasMaterial = studyMaterials.length > 0

  return (
    <div className="rounded-2xl bg-white border border-[#E2E8F0] shadow-[0_2px_12px_rgba(0,0,0,0.06)] overflow-hidden mb-6">
      {/* Header */}
      <div className="relative px-6 py-4 bg-gradient-to-r from-[#1E293B] via-[#334155] to-[#1E293B] text-white">
        <div className="absolute inset-0 bg-[url('/ai-bot.png')] bg-no-repeat bg-right bg-contain opacity-[0.04]" />
        <div className="relative flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-12 h-12 rounded-2xl bg-white/10 backdrop-blur-sm p-0.5 shadow-lg border border-white/20">
              <Image src="/ai-bot.png" alt="StudyBot" width={44} height={44} className="rounded-[14px] object-cover" />
            </div>
            <div>
              <h3 className="text-base font-bold flex items-center gap-2">
                AI Study Assistant
                <span className="flex items-center gap-1 text-[9px] font-bold bg-white/15 px-2 py-0.5 rounded-full">
                  <Sparkles className="w-2.5 h-2.5" /> POWERED BY AI
                </span>
              </h3>
              <p className="text-[11px] text-white/60 mt-0.5">
                {subjectName} • {subjectCode}
              </p>
            </div>
          </div>
          {messages.length > 0 && (
            <button onClick={() => setMessages([])} className="p-2 rounded-xl hover:bg-white/10 transition-colors text-white/60 hover:text-white" title="Clear chat">
              <Trash2 className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      {/* Material Selector Bar */}
      <div className="px-6 py-3 bg-gradient-to-r from-[#F8FAFC] to-[#F1F5F9] border-b border-[#E2E8F0] flex items-center gap-3 flex-wrap">
        <div className="flex items-center gap-2 text-[12px] font-semibold text-[#475569]">
          <FileText className="h-4 w-4 text-[#3B82F6]" />
          Context:
        </div>

        {hasMaterial ? (
          <div className="relative" ref={dropdownRef}>
            <button
              onClick={() => setShowMaterialDropdown(!showMaterialDropdown)}
              className="flex items-center gap-2 rounded-lg bg-white border border-[#D1D5DB] px-3 py-1.5 text-[12px] font-medium text-[#1E293B] hover:border-[#3B82F6] transition-all shadow-sm max-w-[300px]"
            >
              <CheckCircle className="h-3.5 w-3.5 text-[#10B981] shrink-0" />
              <span className="truncate">{selectedMaterialName || "Select study material..."}</span>
              <ChevronDown className="h-3.5 w-3.5 text-[#94A3B8] shrink-0" />
            </button>
            <AnimatePresence>
              {showMaterialDropdown && (
                <motion.div
                  initial={{ opacity: 0, y: -4 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -4 }}
                  className="absolute top-full left-0 mt-1 w-[340px] bg-white rounded-xl border border-[#E2E8F0] shadow-xl z-30 overflow-hidden"
                >
                  <div className="p-2 border-b border-[#F1F5F9]">
                    <p className="text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider px-2">Uploaded Study Materials</p>
                  </div>
                  <div className="max-h-[200px] overflow-y-auto">
                    {studyMaterials.map(s => (
                      <button
                        key={s.id}
                        onClick={() => { setSelectedMaterial(s.id); setShowMaterialDropdown(false); }}
                        className={`w-full flex items-center gap-3 px-3 py-2.5 text-left hover:bg-[#F8FAFC] transition-colors ${selectedMaterial === s.id ? "bg-[#EFF6FF]" : ""}`}
                      >
                        <FileText className={`h-4 w-4 shrink-0 ${selectedMaterial === s.id ? "text-[#3B82F6]" : "text-[#94A3B8]"}`} />
                        <div className="flex-1 min-w-0">
                          <p className="text-[12px] font-medium text-[#1E293B] truncate">{s.originalFilename}</p>
                          <p className="text-[10px] text-[#94A3B8]">by {s.uploader?.name || s.uploader?.email} • {new Date(s.createdAt).toLocaleDateString()}</p>
                        </div>
                        {selectedMaterial === s.id && <CheckCircle className="h-4 w-4 text-[#3B82F6] shrink-0" />}
                      </button>
                    ))}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        ) : (
          <span className="text-[12px] text-[#94A3B8]">No study material uploaded yet</span>
        )}

        <button
          onClick={onUploadMaterial}
          className="ml-auto flex items-center gap-1.5 rounded-lg bg-[#3B82F6] text-white px-3 py-1.5 text-[11px] font-semibold hover:bg-[#2563EB] transition-all shadow-sm"
        >
          <Upload className="h-3.5 w-3.5" />
          Upload Material
        </button>
      </div>

      {/* Important Topics Strip (from syllabus) */}
      {topics?.most_important_overall && topics.most_important_overall.length > 0 && (
        <div className="px-6 py-3 bg-[#FEFCE8]/50 border-b border-[#FDE68A]/30">
          <div className="flex items-center gap-2 mb-2">
            <Target className="h-3.5 w-3.5 text-[#D97706]" />
            <span className="text-[11px] font-bold text-[#92400E]">🎯 KEY TOPICS FROM THIS DOCUMENT</span>
            <span className="text-[9px] text-[#D97706]/60">— click any topic to ask AI</span>
            {!topicsLoading && (
              <button onClick={() => fetchTopics(true)} className="ml-auto text-[10px] text-[#D97706] hover:text-[#92400E] flex items-center gap-1 transition-colors">
                <RefreshCw className="h-3 w-3" /> Refresh
              </button>
            )}
          </div>
          <div className="flex flex-wrap gap-1.5">
            {topics.most_important_overall.map((topic, i) => (
              <button
                key={i}
                onClick={() => sendMessage(`Generate 6-7 most important exam questions about "${topic}". Include marks and expected question types.`)}
                disabled={isLoading}
                className="group rounded-full bg-white border border-[#FDE68A] text-[#92400E] px-3 py-1 text-[11px] font-medium shadow-sm hover:bg-[#D97706] hover:text-white hover:border-[#D97706] hover:shadow-md transition-all cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                {topic}
                <Zap className="h-2.5 w-2.5 opacity-0 group-hover:opacity-100 transition-opacity" />
              </button>
            ))}
          </div>
        </div>
      )}

      {topicsLoading && (
        <div className="px-6 py-3 bg-[#FEFCE8]/30 border-b border-[#FDE68A]/20 flex items-center gap-2">
          <Loader2 className="h-3.5 w-3.5 text-[#D97706] animate-spin" />
          <span className="text-[11px] text-[#92400E]">Extracting important topics from this document...</span>
        </div>
      )}

      {/* Chat Area */}
      <div
        ref={chatContainerRef}
        className="h-[460px] overflow-y-auto px-6 py-5 space-y-5 bg-gradient-to-b from-[#FAFBFF] to-white"
        style={{ scrollBehavior: "smooth" }}
      >
        {messages.length === 0 ? (
          /* Welcome Screen */
          <div className="flex flex-col items-center justify-center h-full text-center">
            <motion.div
              initial={{ scale: 0 }} animate={{ scale: 1 }}
              transition={{ type: "spring", damping: 15 }}
              className="w-24 h-24 rounded-3xl bg-gradient-to-br from-[#3B82F6]/10 to-[#7C3AED]/10 flex items-center justify-center mb-5 shadow-sm border border-[#E2E8F0]"
            >
              <Image src="/ai-bot.png" alt="StudyBot" width={64} height={64} className="rounded-2xl object-cover" />
            </motion.div>

            {hasMaterial ? (
              <>
                <h4 className="text-lg font-bold text-[#1E293B] mb-1">
                  Ask me anything about {subjectName} 👋
                </h4>
                <p className="text-[13px] text-[#64748B] max-w-md mb-8 leading-relaxed">
                  I&apos;ve analyzed the selected document. Ask me about important topics, generate exam questions, get answers — just like ChatGPT!
                </p>
                {/* Suggestion Cards */}
                <div className="grid grid-cols-2 gap-3 w-full max-w-lg">
                  {SUGGESTIONS.map((s, i) => (
                    <motion.button
                      key={i}
                      initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.1 + i * 0.07 }}
                      onClick={() => sendMessage(s.prompt)}
                      className="flex items-start gap-3 rounded-2xl p-4 bg-white border border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-lg transition-all text-left group"
                    >
                      <div className={`w-9 h-9 rounded-xl bg-gradient-to-br ${s.gradient} flex items-center justify-center shrink-0 shadow-sm group-hover:shadow-md transition-shadow`}>
                        <s.icon className="w-4 h-4 text-white" />
                      </div>
                      <div>
                        <span className="text-[12px] font-bold text-[#334155] group-hover:text-[#1E293B] leading-tight block">
                          {s.label}
                        </span>
                        <span className="text-[10px] text-[#94A3B8] mt-0.5 block leading-snug">
                          {s.prompt.slice(0, 50)}...
                        </span>
                      </div>
                    </motion.button>
                  ))}
                </div>
              </>
            ) : (
              /* No Material — Upload Required */
              <>
                <h4 className="text-lg font-bold text-[#1E293B] mb-2">
                  Upload Study Material to Get Started 📄
                </h4>
                <p className="text-[13px] text-[#64748B] max-w-md mb-6 leading-relaxed">
                  I need some study material to generate accurate topics, exam questions, and study guides.
                  Upload Notes, a Syllabus, or a Question Paper — or select one already uploaded by someone else.
                </p>
                <div className="flex flex-col items-center gap-3">
                  <button
                    onClick={onUploadMaterial}
                    className="flex items-center gap-2 rounded-2xl bg-gradient-to-r from-[#3B82F6] to-[#7C3AED] text-white font-bold px-8 py-3.5 text-sm shadow-xl shadow-[#3B82F6]/25 hover:shadow-2xl hover:scale-[1.02] transition-all"
                  >
                    <Upload className="h-5 w-5" />
                    Upload Study Material
                  </button>
                  <p className="text-[10px] text-[#94A3B8]">Supports PDF and DOCX • Up to 20MB</p>
                </div>
                <div className="mt-8 p-4 rounded-2xl bg-[#F8FAFC] border border-[#E2E8F0] max-w-md">
                  <p className="text-[12px] text-[#475569] font-semibold mb-2">✨ What I can do with your materials:</p>
                  <ul className="text-[11px] text-[#64748B] space-y-1.5 text-left">
                    <li className="flex items-center gap-2"><Target className="h-3.5 w-3.5 text-[#EF4444] shrink-0" /> Extract most important topics by unit</li>
                    <li className="flex items-center gap-2"><HelpCircle className="h-3.5 w-3.5 text-[#7C3AED] shrink-0" /> Generate 6-7 most likely exam questions</li>
                    <li className="flex items-center gap-2"><BookOpen className="h-3.5 w-3.5 text-[#3B82F6] shrink-0" /> Provide detailed answers for each question</li>
                    <li className="flex items-center gap-2"><Lightbulb className="h-3.5 w-3.5 text-[#10B981] shrink-0" /> Create exam preparation strategy</li>
                  </ul>
                </div>
              </>
            )}
          </div>
        ) : (
          /* Messages */
          <>
            {messages.map((msg) => (
              <motion.div
                key={msg.id}
                initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
              >
                {msg.role === "assistant" ? (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shrink-0 shadow-md mt-1">
                    <Image src="/ai-bot.png" alt="Bot" width={26} height={26} className="rounded-lg object-cover" />
                  </div>
                ) : (
                  <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#1E293B] to-[#475569] flex items-center justify-center shrink-0 shadow-md mt-1">
                    <GraduationCap className="w-4.5 h-4.5 text-white" />
                  </div>
                )}
                <div className={`max-w-[80%] rounded-2xl px-5 py-3.5 text-[13px] leading-relaxed ${
                  msg.role === "user"
                    ? "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-tr-md shadow-lg shadow-[#3B82F6]/15"
                    : "bg-white border border-[#E2E8F0] text-[#334155] rounded-tl-md shadow-sm"
                }`}>
                  {msg.role === "assistant" ? (
                    <div
                      className="prose prose-sm max-w-none [&_h2]:text-[14px] [&_h3]:text-[13px] [&_h4]:text-[12px] [&_strong]:text-[#1E293B] [&_br]:block [&_br]:content-[''] [&_br]:mt-1"
                      dangerouslySetInnerHTML={{ __html: formatMarkdown(msg.content) }}
                    />
                  ) : (
                    <p>{msg.content}</p>
                  )}
                </div>
              </motion.div>
            ))}

            {isLoading && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="flex gap-3">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shrink-0 shadow-md">
                  <Image src="/ai-bot.png" alt="Bot" width={26} height={26} className="rounded-lg object-cover" />
                </div>
                <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-md px-5 py-4 shadow-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex gap-1">
                      <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                      <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                      <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                    </div>
                    <span className="text-[11px] text-[#94A3B8] ml-1">Thinking...</span>
                  </div>
                </div>
              </motion.div>
            )}

            {!isLoading && messages.length > 0 && messages[messages.length - 1].role === "assistant" && (
              <motion.div initial={{ opacity: 0, y: 6 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="flex flex-wrap gap-2 pl-12">
                <button onClick={() => sendMessage("Give me more questions on this topic")} className="text-[11px] font-medium text-[#7C3AED] bg-[#7C3AED]/5 border border-[#7C3AED]/15 px-3 py-1.5 rounded-full hover:bg-[#7C3AED]/10 transition-all">
                  More questions →
                </button>
                <button onClick={() => sendMessage("Now provide detailed answers for the above questions")} className="text-[11px] font-medium text-[#10B981] bg-[#10B981]/5 border border-[#10B981]/15 px-3 py-1.5 rounded-full hover:bg-[#10B981]/10 transition-all">
                  Show answers →
                </button>
                <button onClick={() => sendMessage("Which topics should I focus on the most for the exam?")} className="text-[11px] font-medium text-[#F59E0B] bg-[#F59E0B]/5 border border-[#F59E0B]/15 px-3 py-1.5 rounded-full hover:bg-[#F59E0B]/10 transition-all">
                  Key focus areas →
                </button>
              </motion.div>
            )}
          </>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="px-6 py-4 border-t border-[#E2E8F0] bg-white">
        {!hasMaterial ? (
          <div className="flex items-center justify-center gap-2 text-[12px] text-[#94A3B8] py-2">
            <FileText className="h-4 w-4" />
            Upload a study material to start chatting with AI
          </div>
        ) : (
          <>
            {messages.length === 0 && (
              <div className="flex items-center gap-1.5 text-[10px] text-[#10B981] font-medium mb-2.5 px-1">
                <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                Document loaded — AI responses are based on the selected material
              </div>
            )}
            <form onSubmit={handleSubmit} className="flex items-end gap-3">
              <div className="flex-1 relative">
                <textarea
                  ref={inputRef}
                  value={input}
                  onChange={handleTextareaInput}
                  onKeyDown={handleKeyDown}
                  placeholder="Ask about topics, generate questions, get exam tips..."
                  disabled={isLoading}
                  rows={1}
                  className="w-full bg-[#F8FAFC] rounded-2xl px-5 py-3 text-[13px] font-medium text-[#1E293B] border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 outline-none transition-all placeholder:text-[#94A3B8] disabled:opacity-50 resize-none min-h-[44px] max-h-[120px]"
                  style={{ height: "44px" }}
                />
              </div>
              <button
                type="submit"
                disabled={!input.trim() || isLoading}
                className="w-11 h-11 rounded-2xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] text-white flex items-center justify-center shadow-lg shadow-[#3B82F6]/20 disabled:opacity-40 disabled:shadow-none hover:shadow-xl transition-all shrink-0"
              >
                {isLoading ? <Loader2 className="w-4.5 h-4.5 animate-spin" /> : <Send className="w-4.5 h-4.5" />}
              </button>
            </form>
            <p className="text-[9px] text-[#CBD5E1] text-center mt-2">
              AI can make mistakes. Verify important information with your faculty.
            </p>
          </>
        )}
      </div>
    </div>
  )
}
