import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

/**
 * Additive migration: inserts ONLY subjects that don't already exist.
 * Compares by unique `code` field — safe to run multiple times.
 */
async function main() {
  console.log("🔍 Adding missing subjects from the UPES Programme Handbook...\n")

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  // @ts-expect-error type mismatch between @types/pg and @prisma/adapter-pg
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    // ─── Fetch existing semesters & specializations ─────────────────────────
    const semesters = await prisma.semester.findMany({ orderBy: { number: "asc" } })
    const specializations = await prisma.specialization.findMany()

    if (semesters.length === 0) {
      console.error("❌ No semesters found. Run the main seed first: npx tsx prisma/seed.ts")
      process.exit(1)
    }

    const semId = (n: number) => semesters[n - 1].id
    const specMap: Record<string, string> = {}
    specializations.forEach((s) => (specMap[s.code] = s.id))

    // ─── Check if IoT and GG specializations exist, create if missing ───────
    if (!specMap["IOT"]) {
      const iot = await prisma.specialization.create({
        data: { name: "Internet of Things", code: "IOT" },
      })
      specMap["IOT"] = iot.id
      console.log("✅ Created missing specialization: Internet of Things (IOT)")
    }

    if (!specMap["GG"]) {
      const gg = await prisma.specialization.create({
        data: { name: "Graphics and Gaming", code: "GG" },
      })
      specMap["GG"] = gg.id
      console.log("✅ Created missing specialization: Graphics and Gaming (GG)")
    }

    // ─── All subjects that SHOULD exist (from the Programme Handbook) ────────
    type SubjectInput = {
      name: string; code: string; credits: number;
      lectureHours: number; tutorialHours: number; practicalHours: number;
      category: string; isLab: boolean; semesterId: string; specializationId?: string;
    }

    const allSubjects: SubjectInput[] = [
      // ═══ MISSING CORE SUBJECT ═══
      // Semester 4: Indian Constitution (listed in Programme Structure Sem IV)
      { name: "Indian Constitution", code: "SLLS2004", credits: 0, lectureHours: 0, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(4) },

      // ═══ SPECIALIZATION: Internet of Things (IoT) — Track 8 ═══
      { name: "Introduction to IoT, Sensors and Microcontrollers", code: "CSGG2110P_IOT", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["IOT"] },
      { name: "Introduction to IoT, Sensors and Microcontrollers Lab", code: "CSIS2112P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["IOT"] },
      { name: "IoT Network Architecture and Communication Protocols", code: "CSIS3019P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["IOT"] },
      { name: "IoT Network Architecture and Communication Protocols Lab", code: "CSIS3119P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["IOT"] },
      { name: "Industrial IoT and ARM based Embedded Programming", code: "CSIS3020P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["IOT"] },
      { name: "Industrial IoT and ARM based Embedded Programming Lab", code: "CSIS3120P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["IOT"] },
      { name: "Single Board Computers and IoT Applications Development", code: "CSIS4011P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["IOT"] },
      { name: "Single Board Computers and IoT Applications Development Lab", code: "CSIS4111P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["IOT"] },
      { name: "Data Analytics for IoT", code: "CSIS4012P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["IOT"] },
      { name: "Data Analytics for IoT Lab", code: "CSIS4012PL", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["IOT"] },

      // ═══ SPECIALIZATION: Graphics & Gaming — Track 9 ═══
      { name: "Introduction to Graphics and Animation", code: "CSGG2011P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["GG"] },
      { name: "Introduction to Interactive Design and 3D Animation Lab", code: "CSGG2110P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["GG"] },
      { name: "Game Programming", code: "CSGG3019P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["GG"] },
      { name: "Game Programming Lab", code: "CSGG3113P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["GG"] },
      { name: "Computer Graphics", code: "CSGG3020P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["GG"] },
      { name: "Computer Graphics Lab", code: "CSGG3120P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["GG"] },
      { name: "Augmented and Virtual Reality Development", code: "CSGG4012P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["GG"] },
      { name: "Augmented and Virtual Reality Development Lab", code: "CSGG4112P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["GG"] },
      { name: "Web Programming for Interactive 3D Graphics", code: "CSGG4013P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["GG"] },
      { name: "Web Programming for Interactive 3D Graphics Lab", code: "CSGG4113P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["GG"] },
    ]

    // ─── Check existing subject codes ───────────────────────────────────────
    const existingSubjects = await prisma.subject.findMany({ select: { code: true } })
    const existingCodes = new Set(existingSubjects.map((s) => s.code))

    const toInsert = allSubjects.filter((s) => !existingCodes.has(s.code))

    if (toInsert.length === 0) {
      console.log("✅ All subjects from the handbook are already in the database. Nothing to add.")
    } else {
      console.log(`📝 Found ${toInsert.length} missing subjects. Inserting...\n`)

      for (const subject of toInsert) {
        await prisma.subject.create({ data: subject })
        console.log(`   ✅ ${subject.code} — ${subject.name}`)
      }

      console.log(`\n🎉 Successfully added ${toInsert.length} new subjects!`)
    }

    // ─── Summary ────────────────────────────────────────────────────────────
    const totalSubjects = await prisma.subject.count()
    const totalSpecs = await prisma.specialization.count()
    console.log(`\n📊 Database now has:`)
    console.log(`   📚 ${semesters.length} semesters`)
    console.log(`   🎯 ${totalSpecs} specializations`)
    console.log(`   📖 ${totalSubjects} subjects total`)

  } catch (e) {
    throw e
  } finally {
    // @ts-ignore
    if (typeof prisma !== 'undefined') await prisma.$disconnect()
    // @ts-ignore
    if (typeof pool !== 'undefined') await pool.end()
  }
}

main()
  .catch((e) => {
    console.error("❌ Failed:", e)
    process.exit(1)
  })
