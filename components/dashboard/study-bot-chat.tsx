"use client"

import { useState, useRef, useEffect, useCallback, forwardRef, useImperativeHandle } from "react"
import { motion, AnimatePresence } from "framer-motion"
import {
  MessageCircle, X, Send, Loader2, Sparkles, BookOpen,
  HelpCircle, Lightbulb, GraduationCap, ChevronDown, Trash2, Bot
} from "lucide-react"
import Image from "next/image"

interface ChatMessage {
  id: string
  role: "user" | "assistant"
  content: string
  timestamp: Date
}

interface StudyBotChatProps {
  subjectId: string
  subjectName: string
  hasSyllabus?: boolean
}

// Quick action suggestions
const QUICK_ACTIONS = [
  { label: "Important Questions", prompt: "Give me 6-7 most important exam questions for this subject", icon: HelpCircle, color: "from-[#EF4444] to-[#F97316]" },
  { label: "Questions + Answers", prompt: "Give me 6-7 important questions with detailed answers", icon: BookOpen, color: "from-[#8B5CF6] to-[#A78BFA]" },
  { label: "Most Important Topics", prompt: "What are the most important topics for the exam? Categorize them by importance", icon: Sparkles, color: "from-[#3B82F6] to-[#60A5FA]" },
  { label: "Exam Tips", prompt: "Give me exam preparation tips and strategy for this subject", icon: Lightbulb, color: "from-[#10B981] to-[#34D399]" },
]

function formatMarkdown(text: string): string {
  // Simple markdown-to-HTML conversion
  let html = text
    // Bold
    .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
    // Italic
    .replace(/\*(.*?)\*/g, '<em>$1</em>')
    // Headers
    .replace(/^### (.+)$/gm, '<h4 class="text-sm font-bold text-[#1E293B] mt-3 mb-1">$1</h4>')
    .replace(/^## (.+)$/gm, '<h3 class="text-sm font-bold text-[#0F1117] mt-3 mb-1.5">$1</h3>')
    .replace(/^# (.+)$/gm, '<h2 class="text-base font-bold text-[#0F1117] mt-4 mb-2">$1</h2>')
    // Code blocks
    .replace(/`([^`]+)`/g, '<code class="px-1.5 py-0.5 bg-[#F1F5F9] text-[#7C3AED] rounded text-[12px] font-mono">$1</code>')
    // Line breaks
    .replace(/\n/g, '<br/>')

  return html
}

export const StudyBotChat = forwardRef<{ openWithMessage: (msg: string) => void }, StudyBotChatProps>(function StudyBotChat({ subjectId, subjectName, hasSyllabus }, ref) {
  const [isOpen, setIsOpen] = useState(false)
  const [messages, setMessages] = useState<ChatMessage[]>([])
  const [input, setInput] = useState("")
  const [isLoading, setIsLoading] = useState(false)
  const [showScrollDown, setShowScrollDown] = useState(false)
  const messagesEndRef = useRef<HTMLDivElement>(null)
  const chatContainerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)
  const pendingMessageRef = useRef<string | null>(null)

  const scrollToBottom = useCallback(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [])

  useEffect(() => {
    if (isOpen && messages.length > 0) {
      scrollToBottom()
    }
  }, [messages, isOpen, scrollToBottom])

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => {
        inputRef.current?.focus()
        // If there's a pending message from external trigger, send it
        if (pendingMessageRef.current) {
          const msg = pendingMessageRef.current
          pendingMessageRef.current = null
          sendMessage(msg)
        }
      }, 300)
    }
  }, [isOpen])

  const handleScroll = () => {
    if (chatContainerRef.current) {
      const { scrollTop, scrollHeight, clientHeight } = chatContainerRef.current
      setShowScrollDown(scrollHeight - scrollTop - clientHeight > 100)
    }
  }

  // Expose openWithMessage via ref for external triggers
  useImperativeHandle(ref, () => ({
    openWithMessage: (msg: string) => {
      if (!isOpen) {
        pendingMessageRef.current = msg
        setIsOpen(true)
      } else {
        sendMessage(msg)
      }
    }
  }), [isOpen])

  const sendMessage = async (text: string) => {
    if (!text.trim() || isLoading) return

    const userMessage: ChatMessage = {
      id: `user-${Date.now()}`,
      role: "user",
      content: text.trim(),
      timestamp: new Date(),
    }

    setMessages(prev => [...prev, userMessage])
    setInput("")
    setIsLoading(true)

    try {
      const res = await fetch(`/api/subjects/${subjectId}/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          message: text.trim(),
          history: messages.map(m => ({ role: m.role, content: m.content })),
        }),
      })

      const data = await res.json()

      const botMessage: ChatMessage = {
        id: `bot-${Date.now()}`,
        role: "assistant",
        content: data.reply || data.error || "Sorry, something went wrong.",
        timestamp: new Date(),
      }

      setMessages(prev => [...prev, botMessage])
    } catch {
      setMessages(prev => [
        ...prev,
        {
          id: `err-${Date.now()}`,
          role: "assistant",
          content: "⚠️ Network error. Please check your connection and try again.",
          timestamp: new Date(),
        },
      ])
    } finally {
      setIsLoading(false)
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    sendMessage(input)
  }

  const clearChat = () => {
    setMessages([])
  }

  return (
    <>
      {/* Floating Action Button */}
      <AnimatePresence>
        {!isOpen && (
          <motion.button
            initial={{ scale: 0, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            exit={{ scale: 0, opacity: 0 }}
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setIsOpen(true)}
            className="fixed bottom-6 right-6 z-50 w-16 h-16 rounded-full shadow-2xl shadow-[#3B82F6]/40 overflow-hidden border-2 border-white/50 cursor-pointer group"
            title="Chat with StudyBot"
          >
            <div className="absolute inset-0 bg-gradient-to-br from-[#3B82F6] to-[#7C3AED]" />
            <div className="absolute inset-0 flex items-center justify-center">
              <Image
                src="/ai-bot.png"
                alt="StudyBot"
                width={48}
                height={48}
                className="rounded-full object-cover"
              />
            </div>
            {/* Pulse ring */}
            <div className="absolute inset-0 rounded-full border-2 border-[#3B82F6] animate-ping opacity-30" />
            {/* Badge */}
            <div className="absolute -top-1 -right-1 w-5 h-5 bg-[#10B981] rounded-full flex items-center justify-center border-2 border-white">
              <Sparkles className="w-2.5 h-2.5 text-white" />
            </div>
          </motion.button>
        )}
      </AnimatePresence>

      {/* Chat Window */}
      <AnimatePresence>
        {isOpen && (
          <motion.div
            initial={{ opacity: 0, y: 20, scale: 0.95 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 20, scale: 0.95 }}
            transition={{ type: "spring", damping: 25, stiffness: 300 }}
            className="fixed bottom-6 right-6 z-50 w-[420px] max-w-[calc(100vw-32px)] h-[600px] max-h-[calc(100vh-48px)] rounded-3xl bg-white shadow-2xl shadow-black/20 border border-[#E2E8F0] flex flex-col overflow-hidden"
          >
            {/* Header */}
            <div className="relative px-5 py-4 bg-gradient-to-r from-[#1E3A8A] via-[#3B82F6] to-[#7C3AED] text-white shrink-0">
              <div className="absolute inset-0 bg-[url('/ai-bot.png')] bg-no-repeat bg-right bg-contain opacity-[0.06]" />
              <div className="relative flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-xl bg-white/20 backdrop-blur-sm p-0.5 shadow-lg">
                    <Image
                      src="/ai-bot.png"
                      alt="StudyBot"
                      width={40}
                      height={40}
                      className="rounded-[10px] object-cover"
                    />
                  </div>
                  <div>
                    <h3 className="text-base font-bold flex items-center gap-1.5">
                      StudyBot
                      <span className="flex items-center gap-1 text-[9px] font-bold bg-white/20 px-1.5 py-0.5 rounded-full">
                        <Sparkles className="w-2.5 h-2.5" /> AI
                      </span>
                    </h3>
                    <p className="text-[11px] text-white/70 truncate max-w-[180px]">
                      {subjectName}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-1">
                  {messages.length > 0 && (
                    <button
                      onClick={clearChat}
                      className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                      title="Clear chat"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  )}
                  <button
                    onClick={() => setIsOpen(false)}
                    className="p-2 rounded-xl hover:bg-white/10 transition-colors"
                  >
                    <X className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Messages Area */}
            <div
              ref={chatContainerRef}
              onScroll={handleScroll}
              className="flex-1 overflow-y-auto px-4 py-4 space-y-4 bg-gradient-to-b from-[#F8FAFC] to-white"
              style={{ scrollBehavior: "smooth" }}
            >
              {messages.length === 0 ? (
                /* Welcome Screen */
                <div className="flex flex-col items-center justify-center h-full text-center px-4">
                  <motion.div
                    initial={{ scale: 0 }}
                    animate={{ scale: 1 }}
                    transition={{ type: "spring", damping: 15 }}
                    className="w-20 h-20 rounded-2xl bg-gradient-to-br from-[#3B82F6]/10 to-[#7C3AED]/10 flex items-center justify-center mb-4 shadow-sm"
                  >
                    <Image
                      src="/ai-bot.png"
                      alt="StudyBot"
                      width={56}
                      height={56}
                      className="rounded-xl object-cover"
                    />
                  </motion.div>
                  <h4 className="text-base font-bold text-[#1E293B] mb-1">
                    Hi! I'm your StudyBot 👋
                  </h4>
                  <p className="text-xs text-[#64748B] max-w-[260px] mb-6">
                    {hasSyllabus
                      ? "I've analyzed the syllabus for this subject. Ask me anything about important topics, exam questions, or study tips!"
                      : "Ask me about important exam topics, questions, or study tips for this subject."
                    }
                  </p>

                  {/* Quick Actions */}
                  <div className="grid grid-cols-2 gap-2 w-full">
                    {QUICK_ACTIONS.map((action, i) => (
                      <motion.button
                        key={i}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.1 + i * 0.05 }}
                        onClick={() => sendMessage(action.prompt)}
                        className="flex items-center gap-2 rounded-xl p-3 bg-white border border-[#E2E8F0] hover:border-[#3B82F6]/30 hover:shadow-md transition-all text-left group"
                      >
                        <div className={`w-8 h-8 rounded-lg bg-gradient-to-br ${action.color} flex items-center justify-center shrink-0 shadow-sm`}>
                          <action.icon className="w-4 h-4 text-white" />
                        </div>
                        <span className="text-[11px] font-semibold text-[#475569] group-hover:text-[#1E293B] leading-tight">
                          {action.label}
                        </span>
                      </motion.button>
                    ))}
                  </div>
                </div>
              ) : (
                /* Chat Messages */
                <>
                  {messages.map((msg) => (
                    <motion.div
                      key={msg.id}
                      initial={{ opacity: 0, y: 8 }}
                      animate={{ opacity: 1, y: 0 }}
                      className={`flex gap-2.5 ${msg.role === "user" ? "flex-row-reverse" : "flex-row"}`}
                    >
                      {/* Avatar */}
                      {msg.role === "assistant" ? (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shrink-0 shadow-sm">
                          <Image src="/ai-bot.png" alt="Bot" width={24} height={24} className="rounded-md object-cover" />
                        </div>
                      ) : (
                        <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#1E293B] to-[#475569] flex items-center justify-center shrink-0 shadow-sm">
                          <GraduationCap className="w-4 h-4 text-white" />
                        </div>
                      )}

                      {/* Bubble */}
                      <div
                        className={`max-w-[85%] rounded-2xl px-4 py-3 text-[13px] leading-relaxed ${
                          msg.role === "user"
                            ? "bg-gradient-to-br from-[#3B82F6] to-[#2563EB] text-white rounded-tr-md shadow-md shadow-[#3B82F6]/20"
                            : "bg-white border border-[#E2E8F0] text-[#334155] rounded-tl-md shadow-sm"
                        }`}
                      >
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

                  {/* Typing indicator */}
                  {isLoading && (
                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      className="flex gap-2.5"
                    >
                      <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] flex items-center justify-center shrink-0 shadow-sm">
                        <Image src="/ai-bot.png" alt="Bot" width={24} height={24} className="rounded-md object-cover" />
                      </div>
                      <div className="bg-white border border-[#E2E8F0] rounded-2xl rounded-tl-md px-4 py-3 shadow-sm">
                        <div className="flex items-center gap-1.5">
                          <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "0ms" }} />
                          <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "150ms" }} />
                          <div className="w-2 h-2 bg-[#94A3B8] rounded-full animate-bounce" style={{ animationDelay: "300ms" }} />
                        </div>
                      </div>
                    </motion.div>
                  )}
                </>
              )}
              <div ref={messagesEndRef} />
            </div>

            {/* Scroll to bottom button */}
            <AnimatePresence>
              {showScrollDown && (
                <motion.button
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: 10 }}
                  onClick={scrollToBottom}
                  className="absolute bottom-[80px] left-1/2 -translate-x-1/2 w-8 h-8 rounded-full bg-white shadow-lg border border-[#E2E8F0] flex items-center justify-center text-[#64748B] hover:text-[#3B82F6] transition-colors z-10"
                >
                  <ChevronDown className="w-4 h-4" />
                </motion.button>
              )}
            </AnimatePresence>

            {/* Input Area */}
            <div className="px-4 py-3 border-t border-[#F1F5F9] bg-white shrink-0">
              {hasSyllabus && messages.length === 0 && (
                <div className="flex items-center gap-1.5 text-[10px] text-[#10B981] font-medium mb-2 px-1">
                  <div className="w-1.5 h-1.5 rounded-full bg-[#10B981] animate-pulse" />
                  Syllabus loaded — AI answers are syllabus-aware
                </div>
              )}
              <form onSubmit={handleSubmit} className="flex items-center gap-2">
                <input
                  ref={inputRef}
                  type="text"
                  value={input}
                  onChange={(e) => setInput(e.target.value)}
                  placeholder="Ask about important topics, questions..."
                  disabled={isLoading}
                  className="flex-1 bg-[#F8FAFC] rounded-xl px-4 py-2.5 text-[13px] font-medium text-[#1E293B] border border-[#E2E8F0] focus:border-[#3B82F6] focus:ring-2 focus:ring-[#3B82F6]/10 outline-none transition-all placeholder:text-[#94A3B8] disabled:opacity-50"
                />
                <button
                  type="submit"
                  disabled={!input.trim() || isLoading}
                  className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#3B82F6] to-[#7C3AED] text-white flex items-center justify-center shadow-md shadow-[#3B82F6]/20 disabled:opacity-40 disabled:shadow-none hover:shadow-lg transition-all"
                >
                  {isLoading ? (
                    <Loader2 className="w-4 h-4 animate-spin" />
                  ) : (
                    <Send className="w-4 h-4" />
                  )}
                </button>
              </form>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  )
})
