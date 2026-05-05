"use client"

import { useEffect, useState, use } from "react"
import { useRouter } from "next/navigation"
import { Loader2, Users } from "lucide-react"
import { toast } from "sonner"

export default function DirectJoinPage(props: { params: Promise<{ code: string }> }) {
  const params = use(props.params)
  const router = useRouter()
  const [error, setError] = useState("")

  useEffect(() => {
    const joinRoom = async () => {
      try {
        const res = await fetch("/api/studyrooms/join", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ inviteCode: params.code })
        })
        const data = await res.json()
        if (res.ok && data.room) {
          toast.success("Successfully joined the room!")
          router.push(`/dashboard/studyrooms/${data.room.id}`)
        } else {
          setError(data.error || "Failed to join room. It may be full or deleted.")
        }
      } catch {
        setError("An error occurred while joining.")
      }
    }
    joinRoom()
  }, [params.code, router])

  return (
    <div className="max-w-[1400px] mx-auto flex h-[70vh] flex-col items-center justify-center text-center px-4">
      {error ? (
        <div className="bg-red-50 text-red-600 p-8 rounded-2xl max-w-md border border-red-100 shadow-sm">
          <div className="mx-auto bg-red-100 w-16 h-16 rounded-full flex items-center justify-center mb-4">
            <Users className="h-8 w-8 text-red-600" />
          </div>
          <h2 className="text-xl font-bold mb-2">Could Not Join Room</h2>
          <p className="text-red-600/80 mb-6">{error}</p>
          <button 
            onClick={() => router.push("/dashboard/studyrooms")}
            className="w-full bg-red-600 text-white px-4 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Back to Studyrooms
          </button>
        </div>
      ) : (
        <div className="flex flex-col items-center">
          <Loader2 className="h-12 w-12 animate-spin text-[#5865F2] mb-6" />
          <h2 className="text-3xl font-bold text-[#0F1117] font-display">Joining Studyroom...</h2>
          <p className="text-[#64748B] mt-3 text-lg max-w-md">Verifying invite code and connecting you to the secure study session.</p>
        </div>
      )}
    </div>
  )
}
