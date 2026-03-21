import "dotenv/config"
import { PrismaClient } from "../lib/generated/prisma"
import { Pool } from "pg"
import { PrismaPg } from "@prisma/adapter-pg"

async function main() {
  console.log("🌱 Seeding UPES B.Tech CSE 2023-2027 curriculum...\n")

  const pool = new Pool({ connectionString: process.env.DATABASE_URL })
  // @ts-expect-error type mismatch between @types/pg and @prisma/adapter-pg
  const adapter = new PrismaPg(pool)
  const prisma = new PrismaClient({ adapter })

  try {
    console.log("逐步 - 1: Cleaning existing data...")
    // Clean existing data (order matters for foreign keys)
    await prisma.bookmark.deleteMany()
    console.log("逐步 - 1.1: Bookmarks cleaned")
    await prisma.note.deleteMany()
    console.log("逐步 - 1.2: Notes cleaned")
    await prisma.subject.deleteMany()
    console.log("逐步 - 1.3: Subjects cleaned")
    await prisma.specialization.deleteMany()
    console.log("逐步 - 1.4: Specializations cleaned")
    await prisma.semester.deleteMany()
    console.log("逐步 - 1.5: Semesters cleaned")
    console.log("🗑️  Cleaned existing data")

    console.log("逐步 - 2: Creating semesters...")
  await prisma.semester.createMany({
    data: Array.from({ length: 8 }, (_, i) => ({
      number: i + 1,
      year: i < 2 ? "1st Year" : i < 4 ? "2nd Year" : i < 6 ? "3rd Year" : "4th Year",
      credits: [22, 23, 23, 22, 25, 21, 18, 8][i],
    })),
  })
  const semesters = await prisma.semester.findMany({ orderBy: { number: "asc" } })
  console.log(`✅ Created ${semesters.length} semesters`)

  // ─── Create Specializations (batch) ───
  await prisma.specialization.createMany({
    data: [
      { name: "Artificial Intelligence and Machine Learning", code: "AIML" },
      { name: "DevOps", code: "DEVOPS" },
      { name: "Cloud Computing and Virtualization Technology", code: "CCVT" },
      { name: "Full Stack Development", code: "FSD" },
      { name: "Cyber Security and Digital Forensics", code: "CSDF" },
      { name: "Big Data", code: "BD" },
      { name: "Data Science", code: "DS" },
      { name: "Internet of Things", code: "IOT" },
      { name: "Graphics and Gaming", code: "GG" },
    ],
  })
  const specializations = await prisma.specialization.findMany()
  const specMap: Record<string, string> = {}
  specializations.forEach((s) => (specMap[s.code] = s.id))
  console.log(`✅ Created ${specializations.length} specializations`)

  // Helper to get semester ID
  const semId = (n: number) => semesters[n - 1].id

  // ─── All Subjects Data ───
  type SubjectInput = {
    name: string; code: string; credits: number;
    lectureHours: number; tutorialHours: number; practicalHours: number;
    category: string; isLab: boolean; semesterId: string; specializationId?: string;
  }

  const subjects: SubjectInput[] = [
    // ═══ SEMESTER 1 (22 credits) ═══
    { name: "Linux Lab", code: "CSEG1126", credits: 2, lectureHours: 0, tutorialHours: 0, practicalHours: 4, category: "MC", isLab: true, semesterId: semId(1) },
    { name: "Programming in C", code: "CSEG1025", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(1) },
    { name: "Programming in C Lab", code: "CSEG1125", credits: 2, lectureHours: 0, tutorialHours: 0, practicalHours: 4, category: "MC", isLab: true, semesterId: semId(1) },
    { name: "Problem Solving", code: "CSEG1027", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "ENGG", isLab: false, semesterId: semId(1) },
    { name: "Environment Sustainability & Climate Change", code: "SSEN0101", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(1) },
    { name: "Living Conversations", code: "SLLS0101", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(1) },
    { name: "Advanced Engineering Mathematics - 1", code: "MATH1059", credits: 4, lectureHours: 3, tutorialHours: 1, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(1) },
    { name: "Physics for Computer Engineers", code: "PHYS1032", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(1) },
    { name: "Physics Lab for Computer Engineers", code: "PHYS1132", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "SCI", isLab: true, semesterId: semId(1) },

    // ═══ SEMESTER 2 (23 credits) ═══
    { name: "Computer Organization and Architecture", code: "CSEG1032", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ENGG", isLab: false, semesterId: semId(2) },
    { name: "Data Structures and Algorithms", code: "CSEG1033", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(2) },
    { name: "Data Structures and Algorithms Lab", code: "CSEG1034", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "MC", isLab: true, semesterId: semId(2) },
    { name: "Python Programming", code: "CSEG1035", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(2) },
    { name: "Python Programming Lab", code: "CSEG1135", credits: 2, lectureHours: 0, tutorialHours: 0, practicalHours: 4, category: "MC", isLab: true, semesterId: semId(2) },
    { name: "Digital Electronics", code: "ECEG1012", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ENGG", isLab: false, semesterId: semId(2) },
    { name: "Critical Thinking and Writing", code: "SLSG0102", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(2) },
    { name: "Environment Sustainability and Climate Change (Living Lab)", code: "SSEN0102", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(2) },
    { name: "Advanced Engineering Mathematics - 2", code: "MATH1065", credits: 4, lectureHours: 3, tutorialHours: 1, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(2) },

    // ═══ SEMESTER 3 (23 credits) ═══
    { name: "Elements of AIML", code: "CSAI2015", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(3) },
    { name: "Elements of AIML Lab", code: "CSAI2115", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "MC", isLab: true, semesterId: semId(3) },
    { name: "Database Management Systems", code: "CSEG2046", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(3) },
    { name: "Database Management Systems Lab", code: "CSEG2146", credits: 2, lectureHours: 0, tutorialHours: 0, practicalHours: 4, category: "MC", isLab: true, semesterId: semId(3) },
    { name: "Design and Analysis of Algorithms", code: "CSEG2021", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(3) },
    { name: "Design and Analysis of Algorithms Lab", code: "CSEG2121", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "MC", isLab: true, semesterId: semId(3) },
    { name: "Discrete Mathematical Structures", code: "CSEG2006", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(3) },
    { name: "Operating Systems", code: "CSEG2060", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(3) },
    { name: "Exploratory Course 1", code: "EC01", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "EC", isLab: false, semesterId: semId(3) },
    { name: "Design Thinking", code: "SLLS0201", credits: 2, lectureHours: 1, tutorialHours: 1, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(3) },

    // ═══ SEMESTER 4 (22 credits) ═══
    { name: "Data Communication and Networks", code: "CSEG2065", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(4) },
    { name: "Data Communication and Networks Lab", code: "CSEG2165", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "MC", isLab: true, semesterId: semId(4) },
    { name: "Object Oriented Programming", code: "CSEG2020", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(4) },
    { name: "Object Oriented Programming Lab", code: "CSEG2120", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "MC", isLab: true, semesterId: semId(4) },
    { name: "Software Engineering", code: "CSEG2064", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(4) },
    { name: "Exploratory Course 2", code: "EC02", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "EC", isLab: false, semesterId: semId(4) },
    { name: "Linear Algebra", code: "MATH2059", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(4) },
    { name: "EDGE - Soft Skills", code: "EMPL002", credits: 0, lectureHours: 1, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(4) },
    { name: "Program Elective 1", code: "PE01", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4) },
    { name: "Program Elective 1 Lab", code: "PE01L", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4) },

    // ═══ SEMESTER 5 (25 credits) ═══
    { name: "Cryptography and Network Security", code: "CSEG3040", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(5) },
    { name: "Formal Languages and Automata Theory", code: "CSEG3055", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(5) },
    { name: "Object Oriented Analysis and Design", code: "CSEG3002", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(5) },
    { name: "Exploratory Course 3", code: "EC03", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "EC", isLab: false, semesterId: semId(5) },
    { name: "Start your Startup", code: "SLSG0205", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(5) },
    { name: "Research Methodology in CS", code: "CSEG3060", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(5) },
    { name: "Probability, Entropy, and MC Simulation", code: "CSEG3056", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(5) },
    { name: "EDGE - Advance Communication", code: "EMPL003", credits: 0, lectureHours: 1, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(5) },
    { name: "Program Elective 2", code: "PE02", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5) },
    { name: "Program Elective 2 Lab", code: "PE02L", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5) },

    // ═══ SEMESTER 6 (21 credits) ═══
    { name: "Exploratory Course 4", code: "EC04", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "EC", isLab: false, semesterId: semId(6) },
    { name: "Leadership and Teamwork", code: "SLLS0103", credits: 2, lectureHours: 2, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(6) },
    { name: "Compiler Design", code: "CSEG3015", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(6) },
    { name: "Statistics and Data Analysis", code: "CSEG3057", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "SCI", isLab: false, semesterId: semId(6) },
    { name: "Minor Project", code: "PROJ3154", credits: 5, lectureHours: 0, tutorialHours: 0, practicalHours: 0, category: "PRJ", isLab: false, semesterId: semId(6) },
    { name: "EDGE - Advance Communication II", code: "EMPL004", credits: 0, lectureHours: 1, tutorialHours: 0, practicalHours: 0, category: "LSC", isLab: false, semesterId: semId(6) },
    { name: "Program Elective 3", code: "PE03", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6) },
    { name: "Program Elective 3 Lab", code: "PE03L", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6) },

    // ═══ SEMESTER 7 (18 credits) ═══
    { name: "Capstone Project - Phase 1", code: "PROJ4145", credits: 5, lectureHours: 0, tutorialHours: 0, practicalHours: 0, category: "PRJ", isLab: false, semesterId: semId(7) },
    { name: "Summer Internship", code: "SIIB4102", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 0, category: "PRJ", isLab: false, semesterId: semId(7) },
    { name: "Exploratory Course 5", code: "EC05", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "EC", isLab: false, semesterId: semId(7) },
    { name: "Program Elective 4", code: "PE04", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7) },
    { name: "Program Elective 4 Lab", code: "PE04L", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7) },
    { name: "Program Elective 5", code: "PE05", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7) },
    { name: "Program Elective 5 Lab", code: "PE05L", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7) },

    // ═══ SEMESTER 8 (8 credits) ═══
    { name: "Capstone Project - Phase 2", code: "PROJ4146", credits: 5, lectureHours: 0, tutorialHours: 0, practicalHours: 0, category: "PRJ", isLab: false, semesterId: semId(8) },
    { name: "IT Ethical Practices", code: "CSEG4038", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "MC", isLab: false, semesterId: semId(8) },

    // ═══ SPECIALIZATION: CCVT ═══
    { name: "Cloud Computing Fundamentals", code: "CSVT2010P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["CCVT"] },
    { name: "Cloud Computing Fundamentals Lab", code: "CSVT2109P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["CCVT"] },
    { name: "Cloud Computing Architecture and Deployment Models", code: "CSVT3029P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["CCVT"] },
    { name: "Cloud Computing Architecture and Deployment Models Lab", code: "CSVT3129P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["CCVT"] },
    { name: "Containerization and DevOps", code: "CSDV3018P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["CCVT"] },
    { name: "Containerization and DevOps Lab", code: "CSDV3118P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["CCVT"] },
    { name: "Cloud Application Development", code: "CSVT4018P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["CCVT"] },
    { name: "Cloud Application Development Lab", code: "CSVT4118P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["CCVT"] },
    { name: "Cloud Computing Security and Management", code: "CSVT4019P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["CCVT"] },
    { name: "Cloud Computing Security and Management Lab", code: "CSVT4119P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["CCVT"] },

    // ═══ SPECIALIZATION: AIML ═══
    { name: "Applied Machine Learning", code: "CSAI2016P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["AIML"] },
    { name: "Applied Machine Learning Lab", code: "CSAI2116P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["AIML"] },
    { name: "Deep Learning", code: "CSAI3025P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["AIML"] },
    { name: "Deep Learning Lab", code: "CSAI3125P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["AIML"] },
    { name: "Pattern and Visual Recognition", code: "CSAI3026P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["AIML"] },
    { name: "Pattern and Visual Recognition Lab", code: "CSAI3126P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["AIML"] },
    { name: "Computational Linguistics and NLP", code: "CSEG4034P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["AIML"] },
    { name: "Computational Linguistics and NLP Lab", code: "CSEG4134P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["AIML"] },
    { name: "Algorithm for Intelligent Systems and Robotics", code: "CSAI4013P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["AIML"] },
    { name: "Algorithm for Intelligent Systems and Robotics Lab", code: "CSAI4113P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["AIML"] },

    // ═══ SPECIALIZATION: DevOps ═══
    { name: "DevOps Fundamentals and SCM", code: "CSDV2009P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["DEVOPS"] },
    { name: "DevOps Fundamentals and SCM Lab", code: "CSDV2109P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["DEVOPS"] },
    { name: "DevSecOps: Integrating Security into DevOps", code: "CSDV3022P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["DEVOPS"] },
    { name: "DevSecOps Lab", code: "CSDV3122P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["DEVOPS"] },
    { name: "Container Orchestration and Security", code: "CSDV3019P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["DEVOPS"] },
    { name: "Container Orchestration and Security Lab", code: "CSDV3119P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["DEVOPS"] },
    { name: "CICD Pipeline and Security", code: "CSDV4009P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["DEVOPS"] },
    { name: "CICD Pipeline and Security Lab", code: "CSDV4109P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["DEVOPS"] },
    { name: "System Provisioning and Monitoring", code: "CSDV4010P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["DEVOPS"] },
    { name: "System Provisioning and Monitoring Lab", code: "CSDV4110P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["DEVOPS"] },

    // ═══ SPECIALIZATION: Full Stack Development ═══
    { name: "Frontend Development", code: "CSFS2003P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["FSD"] },
    { name: "Frontend Development Lab", code: "CSFS2101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["FSD"] },
    { name: "Backend Development", code: "CSFS3005P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["FSD"] },
    { name: "Backend Development Lab", code: "CSFS3101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["FSD"] },
    { name: "Microservices and Spring-Boot", code: "CSFS3007P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["FSD"] },
    { name: "Microservices and Spring-Boot Lab", code: "CSFS3107P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["FSD"] },
    { name: "Cloud Computing and Security (FSD)", code: "CSVT4020P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["FSD"] },
    { name: "Cloud Computing and Security Lab (FSD)", code: "CSVT4120P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["FSD"] },
    { name: "Container Orchestration and Security (FSD)", code: "CSDV4012P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["FSD"] },
    { name: "Container Orchestration and Security Lab (FSD)", code: "CSDV4112P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["FSD"] },

    // ═══ SPECIALIZATION: Cyber Security ═══
    { name: "Information Technology and Cyber Security", code: "CSSF2014P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["CSDF"] },
    { name: "Information Technology and Cyber Security Lab", code: "CSSF2114P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["CSDF"] },
    { name: "Ethical Hacking & Penetration Testing", code: "CSSF3026P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["CSDF"] },
    { name: "Ethical Hacking & Penetration Testing Lab", code: "CSSF3110P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["CSDF"] },
    { name: "Network Security", code: "CSSF3027P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["CSDF"] },
    { name: "Network Security Lab", code: "CSSF3127P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["CSDF"] },
    { name: "Digital Forensics", code: "CSSF4015P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["CSDF"] },
    { name: "Digital Forensics Lab", code: "CSSF4115P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["CSDF"] },
    { name: "OS, Application & Cloud Security", code: "CSSF4017P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["CSDF"] },
    { name: "OS, Application & Cloud Security Lab", code: "CSSF4117P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["CSDF"] },

    // ═══ SPECIALIZATION: Big Data ═══
    { name: "Big Data Overview and Ingestion", code: "CSBD2010P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["BD"] },
    { name: "Big Data Overview and Ingestion Lab", code: "CSBD2110P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["BD"] },
    { name: "Big Data Storage and Analysis", code: "CSBD3015P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["BD"] },
    { name: "Big Data Storage and Analysis Lab", code: "CSBD3115P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["BD"] },
    { name: "Big Data Processing - Disk based and In-Memory", code: "CSBD3016P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["BD"] },
    { name: "Big Data Processing Lab", code: "CSBD3116P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["BD"] },
    { name: "Stream Processing", code: "CSBD4008P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["BD"] },
    { name: "Stream Processing Lab", code: "CSBD4101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["BD"] },
    { name: "Big Data Search and Security", code: "CSBD4009P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["BD"] },
    { name: "Big Data Search and Security Lab", code: "CSBD4109P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["BD"] },

    // ═══ SPECIALIZATION: Data Science ═══
    { name: "Fundamentals of Data Science", code: "CSDS2001P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(4), specializationId: specMap["DS"] },
    { name: "Fundamentals of Data Science Lab", code: "CSDS2101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(4), specializationId: specMap["DS"] },
    { name: "Data Visualization and Interpretation", code: "CSDS3001P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(5), specializationId: specMap["DS"] },
    { name: "Data Visualization and Interpretation Lab", code: "CSDS3101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(5), specializationId: specMap["DS"] },
    { name: "Machine Learning and Deep Learning", code: "CSDS3002P", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(6), specializationId: specMap["DS"] },
    { name: "Machine Learning and Deep Learning Lab", code: "CSDS3102P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(6), specializationId: specMap["DS"] },
    { name: "Computational Linguistics and NLP (DS)", code: "CSEG4034PD", credits: 4, lectureHours: 4, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["DS"] },
    { name: "Computational Linguistics and NLP Lab (DS)", code: "CSEG4134PD", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["DS"] },
    { name: "Generative Artificial Intelligence", code: "CSDS4001P", credits: 3, lectureHours: 3, tutorialHours: 0, practicalHours: 0, category: "ME", isLab: false, semesterId: semId(7), specializationId: specMap["DS"] },
    { name: "Generative Artificial Intelligence Lab", code: "CSDS4101P", credits: 1, lectureHours: 0, tutorialHours: 0, practicalHours: 2, category: "ME", isLab: true, semesterId: semId(7), specializationId: specMap["DS"] },
  ]

  // Batch insert all subjects at once
  const result = await prisma.subject.createMany({ data: subjects })
  console.log(`✅ Created ${result.count} subjects (core + specializations)`)

  console.log(`\n🎉 Seeding complete!`)
  console.log(`   📚 ${semesters.length} semesters`)
  console.log(`   🎯 ${specializations.length} specializations`)
  console.log(`   📖 ${result.count} subjects total`)
    console.log("\n✅ Seeding completed successfully!")
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
    console.error("❌ Seeding failed:", e)
    process.exit(1)
  })
