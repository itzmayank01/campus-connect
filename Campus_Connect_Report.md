# Campus Connect - Project Evolution & Feature Documentation

## 1. Executive Summary
**Campus Connect** is a next-generation, AI-powered academic resource-sharing platform designed specifically to bridge the gap between students and faculty. By combining a modern, hyper-responsive UI with advanced Machine Learning endpoints, the platform ensures that study materials, notes, past year questions (PYQs), and syllabi are not just stored, but actually understood and actively recommended to users based on their unique study behaviors.

## 2. Core Features Developed Till Now

### 🤖 Advanced AI Integration (Powered by Gemini)
- **Smart Syllabus Extraction**: Automatically reads uploaded Syllabus PDFs, bypassing basic OCR to interpret and render the **Most Important Topics** structurally categorized by high/medium/low probability.
- **Exam Predictor (PYQ Engine)**: Scans past question papers against the current syllabus to dynamically generate *Likely Exam Questions* for any subject, drastically reducing exam prep time.
- **AI Document Summarization**: Instantly generates crisp, bullet-point summaries of lengthy PDFs and ZIP files directly within the browser, saving students hours of reading.

### 🎯 Personalized "Smart" Feeds & Global Search
- **Search-Driven Recommendations**: The system continuously tracks what subjects a student is searching for. If a student searches for "Compiler Design" multiple times, the Dashboard dynamically transforms to push personalized Compiler Design resources immediately to their home screen.
- **Stop-Word Filtered Search**: The Global Search engine actively filters out conjunctions (e.g., "and", "or", "the") to provide extremely strict, highly relevant multi-word exact matches rather than flooding the user with unrelated garbage data.

### 📈 Live Trending & Engagement Algorithms
- **Live Polling Dashboard**: The "Trending Now" panel pulses with live updates, securely polling the database every 60 seconds without needing a manual page refresh.
- **Algorithmic Ranking**: Resources are automatically ranked using a dual-weight algorithm (`Likes × 3 + Downloads × 2`), ensuring genuinely helpful content naturally rises to the top over time.

### 🛡️ Faculty Verification & Quality Control
- **Faculty Dashboards**: Professors have isolated permission tiers allowing them to securely review, moderate, and "Verify" uploads.
- **Trust Badges**: Resources vetted by faculty receive distinct gold trust badges, signaling absolute cryptographic reliability to panicking students before an exam.
- **Granular Rating System**: Users can leave 5-star ratings and upvotes, directly influencing a resource's overall "Quality Score" within the ecosystem.

### 🎨 State-of-the-Art UX/UI
- **Glassmorphism & Micro-animations**: Built using Tailwind CSS and Framer Motion, interactions feature subtle hover states, color-coded contextual tags, and skeleton shimmer loaders to conceal network latency.
- **Seamless Media Consumption**: Built-in YouTube iframe wrappers mean students never have to leave the platform to watch linked tutorial playlists.

---

## 3. Technical Architecture

- **Frontend Framework**: Next.js 14 (React) utilizing the App Router and Server Components for instant page loads.
- **Database Layer**: PostgreSQL managed robustly via Prisma ORM for strictly typed relationships.
- **Authentication**: Supabase Auth (Magic Links, OAuth, Role-Based Access Control).
- **Storage**: AWS S3 seamlessly processing multipart buffered chunk uploads.
- **Artificial Intelligence**: Google Generative AI (Gemini Pro) driving contextual LLM queries wrapped in 7-day serverless caches.
- **Deployment**: Vercel Serverless Functions with dynamically optimized execution timeouts.

---

## 4. How This Empowers the Campus

**For Students:**
1. **Eliminates "Resource Hunting"**: Between the Smart Feed recommendations and the PYQ predictors, students spend 100% of their time *studying* rather than *searching*.
2. **Breaks Down Complexity**: Long, dense academic PDFs are instantly summarized by the AI, highlighting only what is strictly necessary to pass.
3. **Guarantees Quality**: Upvote algorithms and Faculty Verification badges completely eliminate the anxiety of "Is this the right document?"

**For Faculty & The Institution:**
1. **Centralized Knowledge Base**: Prevents the loss of valuable study material year-over-year in fragmented WhatsApp groups.
2. **Direct Student Intervention**: Professors can instantly endorse the best materials or flag outdated information, steering the classroom anonymously from the dashboard.
