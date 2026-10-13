# FinPilot AI — Frontend Web Application

FinPilot AI is an intelligent personal finance assistant and explainable agent built with **Next.js (App Router)**, **TypeScript**, **Tailwind CSS**, and **Prisma ORM (MongoDB)**.

---

## ✨ Key Features

- **Personal Finance Dashboard**: Overview of monthly income, fixed vs. flexible expenses, cash flow surplus, and savings rates.
- **Explainable Financial Health Score**: 100-point transparent rubric evaluating savings behavior, budget adherence, debt burden, emergency reserves, income stability, and goal progress.
- **Variable & Freelance Income Handling**: Calculates income volatility scores and conservative safe capacity benchmarks.
- **FinPilot Problem Box (Agent)**: Natural-language interaction classified by machine learning models to trigger deterministic goal adjustments.
- **Interactive Sandbox Environment**: Safe simulated accounts and immutable audit logs with approval requirements before state mutations.
- **CSV Statement Importer**: Automatic parsing and ML-predicted categorization of statement items.
- **Smart Budgets & Bills Tracker**: Categorization with overspend alerts and recurring bill management.

---

## 🛠️ Tech Stack

- **Framework**: Next.js 16 (React 19, TypeScript)
- **Styling**: Tailwind CSS
- **Database / ORM**: MongoDB via Prisma ORM
- **CSV Parsing**: PapaParse
- **Visualization**: Recharts & CSS Conic Gauges

---

## 🚀 Getting Started

### 1. Environment Setup

```bash
cp .env.example .env
npm install
```

Configure `DATABASE_URL` and `NEXT_PUBLIC_ML_SERVICE_URL` in `.env`:



### 2. Generate Prisma Client

```bash
npx prisma generate
```

### 3. Run Development Server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000) in your browser.
