# 🎹 Piano Vinh Quang – Detailed Product Plan (AI-Driven Development)

---

# 1. 🎯 Product Vision

Xây dựng nền tảng:
- Học piano online (structured learning)
- Bán đàn piano (lead + tư vấn)
- Học trực tiếp trên web (interactive lesson)

👉 Mục tiêu: từ demo → MVP có thể bán được

---

# 2. 👤 Target Users

## 2.1 Beginner
- Chưa biết gì về piano
- Muốn học nhanh đệm hát

## 2.2 Hobby learner
- Đã biết cơ bản
- Muốn học bài cụ thể

## 2.3 Buyer
- Muốn mua đàn
- Cần tư vấn

---

# 3. 🧭 User Flow (Core)

## Learning Flow
Homepage → Courses → Course Detail → Buy → Dashboard → Lesson → Continue

## Product Flow
Homepage → Products → Product Detail → CTA → Submit lead

## Auth Flow
Register → Login → Dashboard → My Courses

---

# 4. 🧱 System Architecture

## Frontend
- Static HTML / JS (Vercel)
- Pages:
  - index.html
  - courses.html
  - course-detail.html
  - lesson.html
  - products.html
  - dashboard.html

## Backend
- Express API (Railway)
- MongoDB Atlas

## Data flow
Frontend → API → MongoDB

---

# 5. 🗃️ Database Design

## users
- _id
- email
- passwordHash
- createdAt

## courses
- _id
- title
- description
- price

## lessons
- _id
- courseId
- title
- videoUrl
- sheetUrl

## enrollments
- userId
- courseId

## lesson_progress
- userId
- lessonId
- completed

---

# 6. 🔐 Auth System

## Features
- Register
- Login
- JWT token
- Middleware protect route

## API
POST /api/auth/register  
POST /api/auth/login  
GET /api/me  

---

# 7. 🎓 Learning System

## Lesson Structure
- Video player
- Sheet (MusicXML)
- Piano widget

## Features
- Next / Prev lesson
- Progress tracking
- Resume

---

# 8. 💰 Monetization

## Phase 1
- Fake payment (manual unlock)

## Phase 2
- Real payment (Momo / Stripe)

## Flow
Course Detail → Buy → Payment → Enrollment

---

# 9. 🔒 Resource Protection

## Current issue
- File public → leak

## Solution
- Backend generate URL
- Signed URL (future)

---

# 10. 🚀 Roadmap (AI Execution)

---

## Phase 1: Core Backend (3–5 ngày)

- Auth API
- User model
- JWT middleware

👉 Prompt AI:
"Build Express auth system with JWT, MongoDB user model"

---

## Phase 2: Enrollment (2 ngày)

- Enrollment API
- Check quyền học

👉 Prompt:
"Create enrollment system linking users and courses"

---

## Phase 3: Lesson real (2–3 ngày)

- Load lesson theo DB
- Không hardcode

👉 Prompt:
"Refactor lesson page to load dynamic lesson data from API"

---

## Phase 4: Resource protection (2 ngày)

- API cấp resource

---

## Phase 5: Payment (mock) (2 ngày)

- Button mua
- Unlock course

---

# 11. 📊 Progress Tracking

## Status
- Demo: DONE
- MVP thật: IN PROGRESS

---

# 12. ⚠️ Risks

- Lộ học liệu
- Auth yếu
- Không có payment

---

# 13. 🎯 7-Day Execution Plan

Day 1:
- Auth backend

Day 2:
- Login UI connect API

Day 3:
- DB schema

Day 4:
- Enrollment

Day 5:
- Lesson dynamic

Day 6:
- Protect resource

Day 7:
- Test full flow

---

# 14. 🧠 Development Principle

- Flow > UI
- Backend control > frontend fake
- Simple > complex

---

# 15. 🔚 Final Goal

👉 Có thể:
- Đăng ký
- Mua khóa học
- Học thật

👉 Khi đạt:
→ MVP hoàn chỉnh
