"use client"

import { useState, useEffect, useRef } from "react"
import { useRouter } from "next/navigation"
import { ChevronLeft, Camera, Lock, Check } from "lucide-react"

export default function ProfilePage() {
  const router = useRouter()
  
  // States
  const [loaded, setLoaded] = useState(false)
  const [saving, setSaving] = useState(false)
  const [saveSuccess, setSaveSuccess] = useState(false)
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null)
  const [copySuccess, setCopySuccess] = useState(false)
  
  const [usernameStatus, setUsernameStatus] = useState<"idle" | "checking" | "available" | "taken">("idle")
  const fileInputRef = useRef<HTMLInputElement>(null)

  const [user, setUser] = useState<{
    id: string
    userIdDisplay: string
    fullName: string
    username: string
    email: string
    avatarUrl: string | null
    semester: number | string
    branch: string
    bio: string
    createdAt: string
    role: string
  }>({
    id: "", userIdDisplay: "", fullName: "", username: "", email: "",
    avatarUrl: null, semester: "", branch: "", bio: "", createdAt: "", role: "student"
  })

  // Original state to check if changed
  const [originalUser, setOriginalUser] = useState(user)

  // Fetch initial profile data via a global auth endpoint or by calling an existing /api/user mapping
  useEffect(() => {
    // Assuming we have a way to fetch the current user's full structure securely.
    // For now we will construct a small unified endpoint OR just do it from the existing standard endpoint, 
    // or just fetch /api/leaderboard?period=all and extract it, or create a specific /api/users/me endpoint.
    // Wait, let's create a quick /api/users/me route in a second. We'll call it here.
    fetch('/api/users/me')
      .then(r => r.json())
      .then(data => {
        if (data.user) {
          const u = {
            id: data.user.id,
            userIdDisplay: data.user.user_id_display || "CC-PENDING",
            fullName: data.user.full_name || "",
            username: data.user.username || "",
            email: data.user.email,
            avatarUrl: data.user.avatar_url || null,
            semester: data.user.semester || "",
            branch: data.user.branch || "",
            bio: data.user.bio || "",
            createdAt: data.user.created_at,
            role: data.user.role || "student"
          }
          setUser(u)
          setOriginalUser(u)
        }
        setLoaded(true)
      })
      .catch((e) => {
        console.error("Failed loading user", e)
        setLoaded(true)
      })
  }, [])

  // Check username logic
  useEffect(() => {
    if (user.username === originalUser.username) {
      setUsernameStatus("idle")
      return
    }
    const timer = setTimeout(async () => {
      setUsernameStatus("checking")
      const valid = /^[a-zA-Z0-9_]{3,20}$/.test(user.username)
      if (!valid) {
        setUsernameStatus("idle")
        return
      }
      const res = await fetch(`/api/users/check-username?username=${user.username}`)
      if (res.ok) {
        const data = await res.json()
        setUsernameStatus(data.available ? "available" : "taken")
      } else {
        setUsernameStatus("idle")
      }
    }, 500)
    return () => clearTimeout(timer)
  }, [user.username, originalUser.username])

  const hasChanges = JSON.stringify(user) !== JSON.stringify(originalUser)
  const isUsernameValid = /^[a-zA-Z0-9_]{3,20}$/.test(user.username) || user.username === originalUser.username

  const handleAvatarUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (file.size > 52428800) {
      alert("Image must be under 50MB")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }
    
    if (!['image/jpeg', 'image/png', 'image/webp', 'image/gif'].includes(file.type)) {
      alert("Only JPG, PNG, WebP, GIF allowed")
      if (fileInputRef.current) fileInputRef.current.value = ""
      return
    }

    const reader = new FileReader()
    reader.onload = (ev) => {
      setAvatarPreview(ev.target?.result as string)
    }
    reader.readAsDataURL(file)

    const formData = new FormData()
    formData.append("file", file)
    
    try {
      const res = await fetch("/api/users/avatar", {
        method: "POST",
        body: formData,
      })
      const data = await res.json()
      if (data.success) {
        // Only update local user state so `hasChanges` triggers TRUE natively
        setUser(prev => ({ ...prev, avatarUrl: data.avatar_url }))
        window.dispatchEvent(new Event('avatar-updated'))
      } else {
        alert(data.error)
        setAvatarPreview(null)
      }
    } catch (e) {
      alert("Failed to upload avatar")
      setAvatarPreview(null)
    }
  }

  const handleSave = async () => {
    if (!hasChanges || saving) return
    if (!isUsernameValid) {
      alert("Please fix username errors")
      return
    }

    setSaving(true)
    try {
      const res = await fetch("/api/users/profile", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          full_name: user.fullName,
          username: user.username,
          semester: user.semester,
          branch: user.branch,
          bio: user.bio,
        })
      })

      const data = await res.json()
      if (data.success) {
        setSaveSuccess(true)
        setOriginalUser(user)
        // trigger nav update globally
        window.dispatchEvent(new Event('profile-updated'))
        setTimeout(() => setSaveSuccess(false), 2000)
      } else {
        alert(data.errors ? Object.values(data.errors)[0] : "Failed to update")
      }
    } catch (e) {
      alert("An error occurred saving")
    } finally {
      setSaving(false)
    }
  }

  const handleCopyId = () => {
    navigator.clipboard.writeText(user.userIdDisplay)
    setCopySuccess(true)
    setTimeout(() => setCopySuccess(false), 2000)
  }

  const getAvatarColor = (id: string) => {
    if (!id) return "#94A3B8"
    const colors = ['#EF4444', '#F97316', '#EAB308', '#22C55E', '#3B82F6', '#8B5CF6', '#EC4899', '#14B8A6']
    return colors[id.charCodeAt(0) % colors.length]
  }

  const initials = user.fullName.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2) || "U"
  const memberSinceStr = user.createdAt ? new Date(user.createdAt).toLocaleDateString('en-US', { month: 'long', year: 'numeric' }) : "Loading..."

  if (!loaded) return <div style={{ padding: 40, textAlign: "center", color: "#64748B" }}>Loading profile...</div>

  return (
    <div style={{ maxWidth: 1000, margin: "0 auto", paddingBottom: 60, fontFamily: "system-ui, -apple-system, sans-serif" }}>
      {/* Breadcrumb */}
      <button 
        onClick={() => router.push("/dashboard")}
        style={{ background: "none", border: "none", cursor: "pointer", display: "flex", alignItems: "center", gap: 6, fontSize: 13, color: "#64748B", marginBottom: 20 }}
      >
        <ChevronLeft size={14} /> Back to Dashboard
      </button>

      <h1 style={{ fontSize: 24, fontWeight: 700, color: "#1E293B", marginBottom: 24 }}>My Profile</h1>

      <div style={{ display: "grid", gridTemplateColumns: "minmax(300px, 4fr) minmax(400px, 6fr)", gap: 24, alignItems: "start" }}>

        {/* ─── LEFT CARD (IDENTITY) ─── */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "32px 24px", textAlign: "center" }}>
          
          {/* Avatar Section */}
          <div style={{ position: "relative", width: 100, height: 100, margin: "0 auto 16px" }}>
            <div style={{
              width: 100, height: 100, borderRadius: "50%", border: "3px solid #E2E8F0", boxShadow: "0 2px 8px rgba(0,0,0,0.1)",
              overflow: "hidden", display: "flex", alignItems: "center", justifyContent: "center", 
              background: avatarPreview || user.avatarUrl ? "transparent" : getAvatarColor(user.id),
              color: "#fff", fontSize: 36, fontWeight: 700
            }}>
              {avatarPreview || user.avatarUrl ? (
                <img src={(avatarPreview || user.avatarUrl) as string} alt="Avatar" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              ) : initials}
            </div>

            <button 
              onClick={() => fileInputRef.current?.click()}
              style={{
                position: "absolute", bottom: 2, right: 2, width: 32, height: 32, borderRadius: "50%",
                background: "#4F8EF7", border: "2px solid #fff", display: "flex", alignItems: "center", justifyContent: "center",
                cursor: "pointer", boxShadow: "0 2px 4px rgba(0,0,0,0.1)", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => { e.currentTarget.style.background = "#3B82F6"; e.currentTarget.style.transform = "scale(1.05)" }}
              onMouseLeave={(e) => { e.currentTarget.style.background = "#4F8EF7"; e.currentTarget.style.transform = "scale(1)" }}
            >
              <Camera size={14} color="#fff" />
            </button>
            <input type="file" ref={fileInputRef} style={{ display: "none" }} accept="image/jpeg,image/png,image/webp,image/gif" onChange={handleAvatarUpload} />
          </div>

          <div style={{ fontSize: 18, fontWeight: 600, color: "#1E293B", marginBottom: 2 }}>{user.fullName || "Unnamed User"}</div>
          <div style={{ fontSize: 13, color: "#94A3B8" }}>{user.email}</div>

          <div style={{ height: 1, background: "#F1F5F9", margin: "20px 0" }} />

          {/* User ID Section */}
          <div style={{ textAlign: "left" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8", marginBottom: 4 }}>User ID</div>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4 }}>
              <span style={{ fontFamily: "'JetBrains Mono', monospace", fontSize: 16, fontWeight: 700, color: "#1E293B" }}>{user.userIdDisplay}</span>
              <Lock size={14} color="#CBD5E1" />
            </div>
            <div style={{ fontSize: 10, color: "#CBD5E1", fontStyle: "italic", marginBottom: 12 }}>This ID is permanent and cannot be changed</div>
            
            <button
              onClick={handleCopyId}
              style={{
                background: copySuccess ? "#F0FDF4" : "#fff",
                border: `1px solid ${copySuccess ? "#BBF7D0" : "#E2E8F0"}`,
                color: copySuccess ? "#166534" : "#64748B",
                borderRadius: 6, padding: "4px 12px", fontSize: 11, fontWeight: 600,
                cursor: "pointer", display: "flex", alignItems: "center", gap: 4, transition: "all 0.2s"
              }}
            >
              {copySuccess ? <><Check size={12} /> Copied!</> : "Copy ID"}
            </button>
          </div>

          <div style={{ height: 1, background: "#F1F5F9", margin: "20px 0" }} />

          {/* Meta Info */}
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8" }}>Member Since</div>
            <div style={{ fontSize: 13, color: "#64748B", fontWeight: 500 }}>{memberSinceStr}</div>
          </div>
          
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <div style={{ fontSize: 10, textTransform: "uppercase", letterSpacing: "0.05em", color: "#94A3B8" }}>Account Type</div>
            <div style={{
              background: user.role === "faculty" ? "#FAF5FF" : "#EFF6FF",
              color: user.role === "faculty" ? "#7E22CE" : "#1E40AF",
              border: `1px solid ${user.role === "faculty" ? "#E9D5FF" : "#BFDBFE"}`,
              borderRadius: 999, padding: "3px 10px", fontSize: 11, fontWeight: 600, textTransform: "capitalize"
            }}>
              {user.role}
            </div>
          </div>

        </div>


        {/* ─── RIGHT CARD (FORM) ─── */}
        <div style={{ background: "#fff", border: "1px solid #E2E8F0", borderRadius: 16, padding: "32px" }}>
          <div style={{ marginBottom: 24 }}>
            <h2 style={{ fontSize: 16, fontWeight: 600, color: "#1E293B", margin: "0 0 4px" }}>Profile Information</h2>
            <p style={{ fontSize: 13, color: "#94A3B8", margin: 0 }}>Update your personal details below. Modifications appear live across the platform.</p>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
            {/* Full Name */}
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Full Name</div>
              <input 
                type="text" value={user.fullName} onChange={(e) => setUser({...user, fullName: e.target.value})}
                placeholder="Enter your full name" maxLength={100}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", color: "#1E293B" }}
              />
            </label>

            {/* Username */}
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Username</div>
              <div style={{ position: "relative" }}>
                <span style={{ position: "absolute", left: 14, top: 10, color: "#94A3B8", fontSize: 14 }}>@</span>
                <input 
                  type="text" value={user.username} onChange={(e) => setUser({...user, username: e.target.value})}
                  placeholder="your_username" maxLength={20}
                  style={{
                    width: "100%", padding: "10px 14px 10px 32px", borderRadius: 8, fontSize: 14, outline: "none", color: "#1E293B",
                    border: `1px solid ${!isUsernameValid || usernameStatus === 'taken' ? '#EF4444' : usernameStatus === 'available' ? '#22C55E' : '#E2E8F0'}`
                  }}
                />
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginTop: 6 }}>
                <span style={{ fontSize: 11, color: "#94A3B8" }}>3-20 characters, letters, numbers, underscore only</span>
                {usernameStatus === "taken" && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>Username taken</span>}
                {usernameStatus === "available" && <span style={{ fontSize: 11, color: "#22C55E", fontWeight: 600 }}>✓ Available</span>}
                {!isUsernameValid && user.username.length > 0 && <span style={{ fontSize: 11, color: "#EF4444", fontWeight: 600 }}>Invalid format</span>}
              </div>
            </label>

            {/* Email */}
            <label style={{ display: "block" }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Email Address</div>
              <input 
                type="email" value={user.email} readOnly disabled
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, background: "#F8FAFC", color: "#64748B", cursor: "not-allowed" }}
              />
              <div style={{ fontSize: 10, color: "#CBD5E1", marginTop: 6 }}>Email cannot be changed. Contact admin if needed.</div>
            </label>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }}>
              {/* Semester */}
              <label style={{ display: "block" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Current Semester</div>
                <select 
                  value={user.semester} onChange={(e) => setUser({...user, semester: e.target.value})}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", color: "#1E293B", background: "#fff" }}
                >
                  <option value="">Select Semester</option>
                  {[1,2,3,4,5,6,7,8].map(s => <option key={s} value={s}>Semester {s}</option>)}
                </select>
              </label>

              {/* Branch */}
              <label style={{ display: "block" }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 6 }}>Branch / Department</div>
                <select 
                  value={user.branch} onChange={(e) => setUser({...user, branch: e.target.value})}
                  style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", color: "#1E293B", background: "#fff" }}
                >
                  <option value="">Select Branch</option>
                  {[
                    "Computer Science Engineering (CSE)", "Computer Science - AI & ML (CSE-AIML)", "Computer Science - IoT (CSE-IoT)",
                    "Electronics & Communication (ECE)", "Mechanical Engineering (ME)", "Civil Engineering (CE)",
                    "Electrical Engineering (EE)", "Chemical Engineering (CHE)"
                  ].map(b => <option key={b} value={b}>{b}</option>)}
                </select>
              </label>
            </div>

            {/* Bio */}
            <label style={{ display: "block" }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                <div style={{ fontSize: 13, fontWeight: 600, color: "#475569" }}>About Me (optional)</div>
                <div style={{ fontSize: 11, color: "#94A3B8" }}>{user.bio?.length || 0}/200</div>
              </div>
              <textarea 
                value={user.bio} onChange={(e) => setUser({...user, bio: e.target.value})}
                placeholder="Tell others about yourself..." maxLength={200} rows={3}
                style={{ width: "100%", padding: "10px 14px", border: "1px solid #E2E8F0", borderRadius: 8, fontSize: 14, outline: "none", color: "#1E293B", fontFamily: "inherit", resize: "none" }}
              />
            </label>
          </div>

          <div style={{ display: "flex", justifyContent: "flex-end", gap: 12, marginTop: 32 }}>
            <button
              onClick={() => setUser(originalUser)}
              style={{
                background: "transparent", border: "1px solid #E2E8F0", color: "#64748B",
                padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14, cursor: "pointer", transition: "all 0.2s"
              }}
              onMouseEnter={(e) => e.currentTarget.style.background = "#F8FAFC"}
              onMouseLeave={(e) => e.currentTarget.style.background = "transparent"}
            >
              Cancel
            </button>
            <button
              onClick={handleSave}
              disabled={!hasChanges || saving || usernameStatus === "taken" || !isUsernameValid}
              style={{
                background: saveSuccess ? "#22C55E" : "#4F8EF7", border: "none", color: "#fff",
                padding: "10px 24px", borderRadius: 8, fontWeight: 600, fontSize: 14,
                cursor: (!hasChanges || saving || usernameStatus === "taken" || !isUsernameValid) ? "not-allowed" : "pointer",
                opacity: (!hasChanges || saving || usernameStatus === "taken" || !isUsernameValid) ? 0.6 : 1, transition: "all 0.2s",
                display: "flex", alignItems: "center", gap: 8
              }}
            >
              {saving ? "Saving..." : saveSuccess ? <><Check size={16} /> Saved!</> : "Save Changes"}
            </button>
          </div>
          
        </div>

      </div>
    </div>
  )
}
