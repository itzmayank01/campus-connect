"use client"

import { useState, useEffect, useRef, use } from "react"
import { useRouter } from "next/navigation"
import { Send, Users, Mic, Video, PhoneOff, Settings, Hash, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { JitsiMeeting } from '@jitsi/react-sdk'

export default function StudyRoomPage(props: { params: Promise<{ id: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [room, setRoom] = useState<any>(null)
  const [messages, setMessages] = useState<any[]>([])
  const [newMessage, setNewMessage] = useState("")
  const [loading, setLoading] = useState(true)
  
  // WebRTC / Media
  const [inVoice, setInVoice] = useState(false)
  const [mediaStream, setMediaStream] = useState<MediaStream | null>(null)
  const videoRef = useRef<HTMLVideoElement>(null)
  const messagesEndRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    fetchRoomAndMessages()
    // Poll for real-time messages and member updates
    const interval = setInterval(() => {
      fetchRoomAndMessages(true)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [params.id])

  useEffect(() => {
    if (videoRef.current && mediaStream) {
      videoRef.current.srcObject = mediaStream
    }
  }, [mediaStream, inVoice])

  useEffect(() => {
    // Scroll to bottom on new message
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" })
  }, [messages])

  const fetchRoomAndMessages = async (isPolling = false) => {
    try {
      const [roomRes, msgsRes] = await Promise.all([
        fetch(`/api/studyrooms/${params.id}`),
        fetch(`/api/studyrooms/${params.id}/messages`)
      ])
      
      const roomData = await roomRes.json()
      if (!roomRes.ok && !isPolling) {
        toast.error(roomData.error || "Room not found")
        router.push("/dashboard/studyrooms")
        return
      }
      if (roomRes.ok) setRoom(roomData.room)
      
      const msgsData = await msgsRes.json()
      if (msgsRes.ok) setMessages(msgsData.messages)
      
    } catch (err) {
      console.error(err)
    } finally {
      if (!isPolling) setLoading(false)
    }
  }

  const sendMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newMessage.trim()) return

    const tempMessage = newMessage
    setNewMessage("")
    
    try {
      await fetch(`/api/studyrooms/${params.id}/messages`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: tempMessage })
      })
      fetchRoomAndMessages(true)
    } catch (err) {
      toast.error("Failed to send message")
      setNewMessage(tempMessage)
    }
  }

  const joinVoice = () => {
    setInVoice(true)
    toast.success("Joined Voice Channel!")
  }

  const leaveVoice = () => {
    setInVoice(false)
    toast.info("Left Voice Channel.")
  }

  if (loading) return (
    <div className="flex h-[80vh] items-center justify-center">
      <Loader2 className="h-10 w-10 animate-spin text-[#5865F2]" />
    </div>
  )

  if (!room) return null

  return (
    <div className="flex h-[85vh] rounded-2xl overflow-hidden border border-[#E2E8F0] shadow-sm bg-white font-sans max-w-[1400px] mx-auto">
      
      {/* LEFT SIDEBAR - Channels & Voice */}
      <div className="w-64 bg-[#2B2D31] flex flex-col shrink-0">
        <div className="h-12 border-b border-[#1E1F22] flex items-center px-4 shadow-sm">
          <h2 className="font-bold text-white truncate">{room.name}</h2>
        </div>
        
        <div className="flex-1 overflow-y-auto p-3 space-y-4">
          <div>
            <div className="text-xs font-semibold text-[#949BA4] uppercase mb-1">Text Channels</div>
            <div className="flex items-center gap-2 px-2 py-1.5 rounded bg-[#404249] text-white cursor-pointer">
              <Hash className="h-4 w-4 text-[#80848E]" />
              <span className="text-sm font-medium">general</span>
            </div>
          </div>

          <div>
            <div className="text-xs font-semibold text-[#949BA4] uppercase mb-1">Voice Channels</div>
            <div 
              onClick={inVoice ? leaveVoice : joinVoice}
              className={`flex items-center justify-between px-2 py-1.5 rounded cursor-pointer transition-colors ${inVoice ? 'bg-[#23A559]/20 text-[#23A559]' : 'text-[#949BA4] hover:bg-[#35373C] hover:text-[#DBDEE1]'}`}
            >
              <div className="flex items-center gap-2">
                <Mic className="h-4 w-4" />
                <span className="text-sm font-medium">Study Lounge</span>
              </div>
              {inVoice && <div className="h-2 w-2 rounded-full bg-[#23A559]"></div>}
            </div>
          </div>
        </div>

        {/* User Connection Bar */}
        <div className="h-14 bg-[#232428] flex items-center px-3 justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="h-8 w-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-xs font-bold">
              Me
            </div>
            <div className="text-xs">
              <div className="text-white font-bold">Student</div>
              <div className="text-[#949BA4]">Online</div>
            </div>
          </div>
          <div className="flex items-center gap-2 text-[#B5BAC1]">
            <Mic className="h-5 w-5 hover:text-white cursor-pointer" onClick={inVoice ? () => {} : joinVoice} />
            <Settings className="h-5 w-5 hover:text-white cursor-pointer" />
          </div>
        </div>
      </div>

      {/* MAIN CHAT AREA */}
      <div className="flex-1 bg-[#313338] flex flex-col min-w-0">
        <div className="h-12 border-b border-[#2B2D31] flex items-center px-4 shadow-sm shrink-0">
          <Hash className="h-6 w-6 text-[#80848E] mr-2" />
          <h2 className="font-bold text-white">general</h2>
          <span className="mx-3 text-[#4E5058]">|</span>
          <p className="text-sm text-[#949BA4] truncate">{room.description || 'Welcome to the study room!'}</p>
        </div>

        {/* Video Area (if in voice) */}
        {inVoice && (
          <div className="h-[65vh] bg-[#000000] border-b border-[#1E1F22] shrink-0 relative flex flex-col">
            <div className="flex-1 w-full h-full">
              <JitsiMeeting
                domain="meet.ffmuc.net"
                roomName={`CampusConnectRoom${room.inviteCode.replace('-', '')}`}
                configOverwrite={{
                  startWithAudioMuted: false,
                  startWithVideoMuted: false,
                  prejoinPageEnabled: true
                }}
                interfaceConfigOverwrite={{
                  DISABLE_JOIN_LEAVE_NOTIFICATIONS: false,
                  SHOW_CHROME_EXTENSION_BANNER: false
                }}
                getIFrameRef={(iframeRef) => {
                  iframeRef.style.height = '100%';
                  iframeRef.style.width = '100%';
                  iframeRef.style.border = 'none';
                }}
              />
            </div>
            <button 
              onClick={leaveVoice}
              className="absolute top-4 left-4 bg-[#DA373C] px-4 py-2 text-sm font-bold text-white rounded-lg hover:bg-[#C9292D] transition-colors shadow-lg z-10 flex items-center gap-2"
            >
              <PhoneOff className="h-4 w-4" /> Disconnect
            </button>
          </div>
        )}

        {/* Chat Messages */}
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {/* Welcome Message */}
          <div className="mt-8 mb-6">
            <div className="h-16 w-16 rounded-full bg-[#404249] flex items-center justify-center mb-4">
              <Hash className="h-10 w-10 text-white" />
            </div>
            <h1 className="text-3xl font-bold text-white mb-2">Welcome to #general!</h1>
            <p className="text-[#949BA4]">This is the start of the <strong className="text-white">#general</strong> channel for {room.name}.</p>
          </div>

          <div className="border-t border-[#3F4147] my-4"></div>

          {messages.map((msg, i) => {
            const showHeader = i === 0 || messages[i-1].userId !== msg.userId || (new Date(msg.createdAt).getTime() - new Date(messages[i-1].createdAt).getTime() > 300000)
            return (
              <div key={msg.id} className={`group flex gap-4 ${showHeader ? 'mt-4' : 'mt-1'}`}>
                {showHeader ? (
                  <div className="h-10 w-10 shrink-0 rounded-full bg-[#5865F2] flex items-center justify-center text-white font-bold cursor-pointer hover:opacity-80">
                    {msg.user.name?.charAt(0) || 'U'}
                  </div>
                ) : (
                  <div className="w-10 shrink-0 flex justify-center items-center opacity-0 group-hover:opacity-100">
                    <span className="text-[10px] text-[#949BA4]">{new Date(msg.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
                  </div>
                )}
                <div className="flex-1 min-w-0">
                  {showHeader && (
                    <div className="flex items-baseline gap-2">
                      <span className="font-medium text-white hover:underline cursor-pointer">{msg.user.name || 'Student'}</span>
                      <span className="text-xs text-[#949BA4]">
                        {new Date(msg.createdAt).toLocaleDateString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' })}
                      </span>
                    </div>
                  )}
                  <p className="text-[#DBDEE1] break-words whitespace-pre-wrap leading-relaxed">{msg.content}</p>
                </div>
              </div>
            )
          })}
          <div ref={messagesEndRef} />
        </div>

        {/* Message Input */}
        <div className="p-4 pt-0 shrink-0">
          <form onSubmit={sendMessage} className="bg-[#383A40] rounded-lg flex items-center px-4 py-2.5">
            <input 
              type="text" 
              placeholder={`Message #general`}
              value={newMessage}
              onChange={e => setNewMessage(e.target.value)}
              className="flex-1 bg-transparent border-none text-[#DBDEE1] placeholder-[#949BA4] focus:ring-0 text-sm"
            />
            <button 
              type="submit" 
              disabled={!newMessage.trim()}
              className="ml-2 text-[#B5BAC1] hover:text-white disabled:opacity-50 disabled:hover:text-[#B5BAC1]"
            >
              <Send className="h-5 w-5" />
            </button>
          </form>
        </div>
      </div>

      {/* RIGHT SIDEBAR - Members list */}
      <div className="w-60 bg-[#2B2D31] flex flex-col shrink-0 border-l border-[#1E1F22]">
        <div className="p-4 pb-2">
          <h3 className="text-xs font-bold text-[#949BA4] uppercase tracking-wider">
            Members — {room.members.length}/5
          </h3>
        </div>
        <div className="flex-1 overflow-y-auto px-2 space-y-1">
          {room.members.map((member: any) => (
            <div key={member.id} className="flex items-center gap-3 p-2 rounded hover:bg-[#35373C] cursor-pointer group transition-colors">
              <div className="relative">
                <div className="h-8 w-8 rounded-full bg-[#5865F2] flex items-center justify-center text-white text-sm font-bold">
                  {member.user.name?.charAt(0) || 'U'}
                </div>
                <div className="absolute -bottom-0.5 -right-0.5 h-3 w-3 bg-[#2B2D31] rounded-full flex items-center justify-center">
                  <div className="h-2 w-2 rounded-full bg-[#23A559]"></div>
                </div>
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-[#DBDEE1] text-sm font-medium truncate group-hover:text-white transition-colors">
                  {member.user.name || 'Student'}
                </div>
                <div className="text-xs text-[#949BA4] truncate">
                  {member.role === 'owner' ? 'Crown' : 'Online'}
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
      
    </div>
  )
}
