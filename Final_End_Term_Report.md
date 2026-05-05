# Final Project End-Term Report

## 1. Introduction

### 1.1. History
Traditionally, academic resources such as lecture notes, previous year question papers, reference books, and tutorial materials are distributed through informal channels such as messaging groups, email threads, and shared drives. These approaches lack structure, searchability, and scalability. Recognizing this gap, Campus Connect was conceptualized as a next-generation, AI-powered academic resource-sharing platform designed specifically to bridge the gap between students and faculty.

### 1.2. Requirement Analysis
The system requires a centralized digital platform that allows students to upload, manage, and access academic resources in a structured and organized manner. Key requirements include user authentication, semester-wise organization of subjects and resources, cloud storage for study materials, advanced AI integration for syllabus extraction and summarization, and a robust backend to handle high traffic and data volume.

### 1.3. Main Objective
The primary objective of Campus Connect is to design and implement a centralized digital platform that allows students to upload, manage, and access academic resources. The platform integrates modern web technologies, cloud storage, and real-time systems to ensure efficient resource sharing and academic collaboration.

### 1.4. Sub Objectives
- To develop a centralized academic resource platform.
- To provide semester-wise organization of study materials.
- To integrate Artificial Intelligence (Gemini) for smart syllabus extraction and exam prediction.
- To implement authentication and secure user management.
- To deploy the system using cloud infrastructure for scalability.

### 1.5. Pert Chart Legend
*(Note: A PERT chart illustrates the project timeline. Standard legend includes:)*
- **Nodes (Circles/Rectangles)**: Project Milestones (e.g., Requirement Gathering, Frontend Dev, Database Design, AI Integration).
- **Arrows**: Direction of workflow and dependencies.
- **Critical Path**: Highlighted path showing the longest sequence of dependent tasks (e.g., Auth -> Database -> File Uploads -> AI Processing).

---

## 2. System Analysis

### 2.1. Existing System
The existing approach involves students relying on fragmented WhatsApp groups, scattered Google Drive links, and informal peer-to-peer sharing. There is no quality control, and valuable study materials are often lost year-over-year. Finding relevant past year question papers (PYQs) or summarized notes right before an exam is a significant pain point.

### 2.2. Motivations
The motivation behind Campus Connect is to eliminate the "Resource Hunting" phase for students, allowing them to spend 100% of their time studying rather than searching. Additionally, it aims to provide faculty with a platform to verify content and guide students with structured learning resources.

### 2.3. Proposed System
The proposed system is an AI-powered academic resource management platform. By combining a modern, hyper-responsive UI with advanced Machine Learning endpoints, the platform ensures that study materials are not just stored, but actually understood and actively recommended to users based on their unique study behaviors. 

### 2.4. Modules

#### 2.4.1. User Management and Authentication
Manages student, faculty, and admin roles using Supabase Auth, securing endpoints and personalizing dashboard access based on roles.

#### 2.4.2. Resource Management & Cloud Storage
Handles uploading, downloading, and categorizing study materials, utilizing AWS S3 for multipart file uploads.

#### 2.4.3. AI Processing and Smart Feeds
Utilizes Gemini AI for syllabus extraction, document summarization, and smart topic tagging, feeding directly into a personalized recommendation algorithm.

---

## 3. Design

### 3.1. Modelling in Web Applications

#### 3.1.1. Behaviour-based System Design
The system reacts to user inputs dynamically. If a user searches for "Compiler Design" multiple times, the backend records this behavior, and the frontend Dashboard dynamically transforms to push personalized Compiler Design resources to their home screen.

#### 3.1.2. Use Case model for Requirement Analysis
- **Students**: Login/Register, Upload Resources, Download Notes, View Dashboard, Search Material, Bookmark Items.
- **Faculty**: Login/Register, Verify Resources, Upload Official Material, View Analytics.

#### 3.1.3. The design model
A modern Client-Server architecture utilizing Server-Side Rendering (SSR) via Next.js for rapid content delivery, paired with a serverless backend interacting with a relational database (PostgreSQL).

#### 3.1.4. Object and Class Design
The database schema defines strict models:
- **User**: (id, role, email, impactScore)
- **Subject**: (id, name, code, semesterId)
- **Resource**: (id, fileUrl, qualityScore, aiTags)

#### 3.1.5. State Transition
From an upload perspective:
`Idle` -> `File Selected` -> `Uploading to AWS S3` -> `Text Extraction` -> `AI Processing (Pending)` -> `AI Processing (Ready)` -> `Published`

#### 3.1.6. Activity Diagram
User Logs in -> System fetches personalized Feed -> User searches query -> System filters stop-words and hits DB -> Results displayed ranked by Quality Score.

---

## 4. Campus Connect Framework

### 4.1. Campus Connect Overview
Campus Connect operates on a modern, decoupled tech stack designed for speed, security, and AI execution.

### 4.2. Next.js & Supabase – The Brain
Next.js acts as the orchestrator for both UI and server routes, while Supabase handles identity and row-level security.

#### 4.2.1. Technical Specifications
- **Framework**: Next.js 14 (App Router)
- **Database**: PostgreSQL (via Prisma ORM)
- **Language**: TypeScript

#### 4.2.2. Features
Glassmorphism UI, Skeleton loaders, OAuth integrations, Server-side caching.

#### 4.2.3. Architecture-Database organization
Strictly typed relational schema managing Many-to-Many relationships between Users (Bookmarks, Likes), Subjects, and Resources.

### 4.3. Programming the Application
#### 4.3.1. Quick Start Guide
1. Clone the repository.
2. Run `npm install` to gather dependencies.
3. Setup `.env.local` with Supabase, Prisma, AWS, and Gemini keys.
4. Run `npm run dev` to launch the local Next.js server.

### 4.4. AWS S3 Storage
Handles secure, scalable object storage for large PDF and ZIP files uploaded by students, keeping the main database lightweight.

### 4.5. Gemini AI Integration
The Google Generative AI (Gemini Pro) is integrated to provide contextual LLM queries, summarizing files on the fly and extracting important topics.

### 4.6. Analytics Engine
Tracks user interactions (downloads, likes, ratings) and stores them in Daily Activity logs to calculate impact scores and streaks.

---

## 5. Implementation

### 5.1. Data Flow & Execution
Data flows from the React Client to Next.js API Routes, which validates requests via Supabase Auth, executes Prisma queries against PostgreSQL, and formats the response.

### 5.2. Scenarios
The system handles various edge cases, such as handling large file timeouts, verifying faculty uploads automatically, and providing fallback UIs when AI endpoints fail.

### 5.3. Algorithms

#### 5.3.1. Scenario 1 - Smart Syllabus Extraction
1. Extract raw text from PDF.
2. Feed content to Gemini API with strict structured JSON prompts.
3. Categorize topics by High/Medium/Low exam probability.

#### 5.3.2. Scenario 2 - AI Document Summarization
Reads lengthy PDFs chunk-by-chunk and generates crisp, bullet-point summaries, caching the result in the database to save future API calls.

#### 5.3.3. Scenario 3 - Trending Feed Ranking
Ranks resources automatically using: `Quality Score = (Likes × 3) + (Downloads × 2) + (Rating × 5)`.

---

## 6. Output screens

*(Please insert actual screenshots of the application below this section before submission)*
- **Screen 1**: Registration and Login Portal
- **Screen 2**: Main Student Dashboard with Smart Feed
- **Screen 3**: Resource Upload Interface
- **Screen 4**: AI Syllabus Extractor Result View
- **Screen 5**: Faculty Verification Dashboard

---

## 7. Limitations and Future Enhancements

**Limitations:**
- Cold Start Latency for AI serverless endpoints.
- High reliance on initial user adoption to generate accurate smart feeds.

**Future Enhancements:**
- Developing a cross-platform mobile app using React Native.
- Advanced gamification with tangible rewards for Leaderboard leaders.
- Real-time collaborative notes editing capabilities.

---

## 8. Conclusion
Campus Connect successfully digitalizes and streamlines the academic resource sharing ecosystem. By strictly following software engineering principles and integrating sophisticated AI tools, cloud storage, and an intuitive interface, the platform not only preserves institutional knowledge but actively assists students in understanding it.

---

## Appendix A: Technology Stack Components and Features
- **Next.js**: React framework for production.
- **Tailwind CSS**: Utility-first CSS framework.
- **Prisma**: Next-generation Node.js and TypeScript ORM.
- **AWS S3**: Simple Storage Service for file hosting.

## Appendix B: Database Relational Rules
- Foreign keys cascade on delete for study tools linked to resources.
- Unique constraints on user IDs per resource for Likes/Ratings.

## Appendix C: Deployment Rules
- Vercel handles CI/CD serverless deployment.
- Environment variables must be securely injected at build time.

---

## References
1. AWS Architecture Documentation – https://aws.amazon.com/architecture
2. Supabase Documentation – https://supabase.com/docs
3. PostgreSQL Official Documentation – https://www.postgresql.org/docs
4. Next.js Framework Documentation – https://nextjs.org/docs
5. Prisma ORM Documentation – https://www.prisma.io/docs
6. Google AI Studio (Gemini) Documentation - https://ai.google.dev/docs
