"use client"

import { useState, useEffect } from "react"
import { Users, Plus, Hash, ArrowRight, Loader2, Copy, Check, Trash2 } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"

export default function StudyroomsDashboard() {
  const router = useRouter()
  const [rooms, setRooms] = useState<any[]>([])
  const [loading, setLoading] = useState(true)
  
  const [createName, setCreateName] = useState("")
  const [createDesc, setCreateDesc] = useState("")
  const [isCreating, setIsCreating] = useState(false)

  const [joinCode, setJoinCode] = useState("")
  const [isJoining, setIsJoining] = useState(false)

  const [copiedCode, setCopiedCode] = useState("")

  useEffect(() => {
    fetchRooms()
  }, [])

  const fetchRooms = async () => {
    try {
      const res = await fetch("/api/studyrooms")
      const data = await res.json()
      if (data.rooms) setRooms(data.rooms)
    } catch (err) {
      console.error(err)
    } finally {
      setLoading(false)
    }
  }

  const handleCreateRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!createName) return
    setIsCreating(true)
    try {
      const res = await fetch("/api/studyrooms", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ name: createName, description: createDesc })
      })
      const data = await res.json()
      if (res.ok && data.room) {
        toast.success("Room created successfully!")
        router.push(`/dashboard/studyrooms/${data.room.id}`)
      } else {
        toast.error(data.error || "Failed to create room")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsCreating(false)
    }
  }

  const handleJoinRoom = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!joinCode) return
    setIsJoining(true)
    try {
      const res = await fetch("/api/studyrooms/join", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ inviteCode: joinCode })
      })
      const data = await res.json()
      if (res.ok && data.room) {
        toast.success("Successfully joined the room!")
        router.push(`/dashboard/studyrooms/${data.room.id}`)
      } else {
        toast.error(data.error || "Failed to join room")
      }
    } catch {
      toast.error("An error occurred")
    } finally {
      setIsJoining(false)
    }
  }

  const copyToClipboard = (code: string) => {
    const inviteLink = `${window.location.origin}/dashboard/studyrooms/join/${code}`
    navigator.clipboard.writeText(inviteLink)
    setCopiedCode(code)
    setTimeout(() => setCopiedCode(""), 2000)
    toast.success("Direct Join Link copied!")
  }

  const handleLeaveRoom = async (roomId: string) => {
    if (!confirm("Are you sure you want to leave/delete this room?")) return
    try {
      const res = await fetch(`/api/studyrooms/${roomId}`, { method: "DELETE" })
      if (res.ok) {
        toast.success("Room removed")
        fetchRooms()
      } else {
        toast.error("Failed to remove room")
      }
    } catch {
      toast.error("An error occurred")
    }
  }

  return (
    <div className="max-w-[1400px] mx-auto space-y-6">
      <div className="rounded-2xl bg-[#5865F2] p-8 text-white shadow-md">
        <div className="flex items-center gap-3 mb-2">
          <Users className="h-8 w-8 text-white/90" />
          <h1 className="text-3xl font-bold font-display">Studyrooms</h1>
        </div>
        <p className="text-white/80 max-w-2xl text-sm leading-relaxed">
          Create small, focused study groups of up to 5 people. Chat in real-time, share resources, and hop into voice channels.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        
        {/* Left Column - Create & Join */}
        <div className="space-y-6 md:col-span-1">
          {/* Create Room */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#0F1117] flex items-center gap-2 mb-4">
              <Plus className="h-5 w-5 text-[#5865F2]" />
              Create a Room
            </h2>
            <form onSubmit={handleCreateRoom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Room Name</label>
                <input 
                  type="text" 
                  className="w-full bg-[#F3F4F6] border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#5865F2]"
                  placeholder="e.g. Late Night DSA" 
                  value={createName}
                  onChange={(e) => setCreateName(e.target.value)}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isCreating}
                className="w-full bg-[#5865F2] hover:bg-[#4752C4] text-white rounded-lg p-3 text-sm font-semibold transition-colors flex justify-center items-center"
              >
                {isCreating ? <Loader2 className="h-5 w-5 animate-spin" /> : "Create Room"}
              </button>
            </form>
          </div>

          {/* Join Room */}
          <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-6">
            <h2 className="text-lg font-bold text-[#0F1117] flex items-center gap-2 mb-4">
              <Hash className="h-5 w-5 text-[#10B981]" />
              Join a Room
            </h2>
            <form onSubmit={handleJoinRoom} className="space-y-4">
              <div>
                <label className="text-xs font-semibold text-[#64748B] uppercase tracking-wider mb-1 block">Invite Code</label>
                <input 
                  type="text" 
                  className="w-full bg-[#F3F4F6] border-none rounded-lg p-3 text-sm focus:ring-2 focus:ring-[#10B981] font-mono"
                  placeholder="e.g. ABC-1234" 
                  value={joinCode}
                  onChange={(e) => setJoinCode(e.target.value.toUpperCase())}
                  required
                />
              </div>
              <button 
                type="submit" 
                disabled={isJoining}
                className="w-full bg-[#10B981] hover:bg-[#059669] text-white rounded-lg p-3 text-sm font-semibold transition-colors flex justify-center items-center"
              >
                {isJoining ? <Loader2 className="h-5 w-5 animate-spin" /> : "Join Room"}
              </button>
            </form>
          </div>
        </div>

        {/* Right Column - My Rooms */}
        <div className="bg-white rounded-2xl border border-[rgba(0,0,0,0.06)] shadow-sm p-6 md:col-span-2 flex flex-col">
          <h2 className="text-lg font-bold text-[#0F1117] mb-4">My Rooms</h2>
          
          {loading ? (
            <div className="flex-1 flex items-center justify-center">
              <Loader2 className="h-8 w-8 animate-spin text-[#64748B]" />
            </div>
          ) : rooms.length === 0 ? (
            <div className="flex-1 flex flex-col items-center justify-center text-center p-8 bg-[#F8FAFC] rounded-xl border border-dashed border-[#CBD5E1]">
              <Users className="h-10 w-10 text-[#94A3B8] mb-3" />
              <p className="text-[#475569] font-medium">You haven't joined any rooms yet.</p>
              <p className="text-sm text-[#64748B] mt-1">Create a room or ask a friend for an invite code!</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {rooms.map(room => (
                <div key={room.id} className="border border-[#E2E8F0] rounded-xl p-4 hover:border-[#5865F2] hover:shadow-md transition-all group">
                  <div className="flex justify-between items-start mb-2">
                    <h3 className="font-bold text-[#0F1117] truncate pr-2" title={room.name}>{room.name}</h3>
                    <span className="bg-[#F1F5F9] text-[#475569] text-[10px] font-bold px-2 py-1 rounded-full shrink-0">
                      {room._count.members}/5 Users
                    </span>
                  </div>
                  <p className="text-xs text-[#64748B] mb-4 line-clamp-2 min-h-[32px]">
                    {room.description || "No description provided."}
                  </p>
                  
                  <div className="flex items-center gap-2 mt-auto">
                    <button 
                      onClick={() => router.push(`/dashboard/studyrooms/${room.id}`)}
                      className="flex-1 bg-[#F8FAFC] hover:bg-[#5865F2] hover:text-white text-[#475569] border border-[#E2E8F0] text-xs font-semibold py-2 rounded-lg transition-colors flex justify-center items-center gap-1"
                    >
                      Enter Room <ArrowRight className="h-3 w-3" />
                    </button>
                    <button 
                      onClick={() => copyToClipboard(room.inviteCode)}
                      className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#5865F2] hover:border-[#5865F2] transition-colors"
                      title="Copy Direct Join Link"
                    >
                      {copiedCode === room.inviteCode ? <Check className="h-4 w-4 text-[#10B981]" /> : <Copy className="h-4 w-4" />}
                    </button>
                    <button 
                      onClick={() => handleLeaveRoom(room.id)}
                      className="p-2 border border-[#E2E8F0] rounded-lg text-[#64748B] hover:text-[#EF4444] hover:border-[#EF4444] transition-colors"
                      title="Leave / Delete Room"
                    >
                      <Trash2 className="h-4 w-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

      </div>
    </div>
  )
}
