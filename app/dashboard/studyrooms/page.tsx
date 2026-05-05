import { Users } from "lucide-react"

export default function StudyroomsPage() {
  return (
    <div className="max-w-[1400px] mx-auto p-8 text-center h-[70vh] flex flex-col items-center justify-center">
      <div className="bg-[#4F8EF7]/10 p-4 rounded-full mb-6">
        <Users className="h-12 w-12 text-[#4F8EF7]" />
      </div>
      <h1 className="text-4xl font-bold font-display text-[#0F1117] mb-4">Studyrooms</h1>
      <p className="text-lg text-[#64748B] max-w-lg mb-8">
        Your Discord-like study spaces are currently being built! Soon you'll be able to create voice channels, chat in real-time, and study together in groups of up to 5.
      </p>
      
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4 max-w-2xl text-left">
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <h3 className="font-bold text-[#0F1117] mb-2">Invite Codes</h3>
          <p className="text-sm text-[#64748B]">Share a unique code like <code>XYZ-123</code> to instantly let classmates join your room.</p>
        </div>
        <div className="bg-white p-6 rounded-2xl border border-[#E2E8F0] shadow-sm">
          <h3 className="font-bold text-[#0F1117] mb-2">Direct Links</h3>
          <p className="text-sm text-[#64748B]">Send a direct link (e.g. <code>campus-connect.com/r/XYZ-123</code>) to hop right into voice chat.</p>
        </div>
      </div>
    </div>
  )
}
