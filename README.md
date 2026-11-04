# FinSight AI 💳
### AI-Powered Financial Customer Insights & Recommendation Platform

**FinSight AI** is an intelligent financial analytics and customer insights platform that combines Artificial Intelligence, Machine Learning, Retrieval-Augmented Generation (RAG), and interactive financial dashboards to transform financial data into meaningful insights.

The platform provides personalized financial assistance, transaction analytics, fraud intelligence, customer insights, and role-based financial monitoring through a centralized application.

---

## 🚀 Project Overview

FinSight AI aims to make financial data more accessible, understandable, and actionable through AI-powered analytics and intelligent assistance.

The platform integrates financial data with AI-driven capabilities to help administrators, financial analysts, customers, and risk professionals make better-informed decisions.

### 🎯 Key Objectives

- Provide intelligent financial data analysis.
- Deliver interactive, role-based dashboards.
- Improve fraud detection and risk monitoring.
- Enable AI-powered financial assistance.
- Implement secure document-based question answering using RAG.
- Generate meaningful financial insights and recommendations.
- Provide real-time access to financial information through Supabase.

---

## ✨ Key Features

### 1. Role-Based Dashboards

FinSight AI provides four dedicated dashboards:

**Platform Command Center — Admin**
- Platform-wide financial monitoring.
- User management and role assignment.
- System-level analytics.
- Financial transaction monitoring.
- Centralized platform oversight.

**Financial Analytics Workbench — Business Analyst**
- Financial performance analytics.
- Transaction trends and distributions.
- Customer behavior insights.
- Category-wise spending analysis.
- Interactive charts with cross-filtering.

**My Financial Overview — Customer**
- Personalized financial information.
- Account and transaction overview.
- Financial activity monitoring.
- AI-powered financial assistance.

**Risk & Fraud Command Center — Risk Analyst**
- Fraud risk analysis.
- Live risk alert investigation queue.
- Fraud operations monitoring.
- Risk intelligence analytics.
- Transaction risk investigation.

### 2. AI-Powered Financial Assistant — Fin AI

Fin AI is an intelligent financial assistant powered by Google's Gemini models.

Capabilities include:
- Natural language conversations.
- Financial question answering.
- Context-aware responses.
- AI-powered financial assistance.
- Document-based information retrieval.
- Integrated chatbot and dedicated AI assistant interface.

### 3. Retrieval-Augmented Generation (RAG)

FinSight AI incorporates a RAG architecture to retrieve relevant information from uploaded financial documents before generating AI responses.

**RAG capabilities:**
- Document uploading and processing.
- Text extraction and chunking.
- Vector embeddings.
- Semantic similarity search.
- Context-aware AI responses.
- Document citations and source references.
- Role-based document access.
- Secure retrieval using authenticated user roles.

**RAG Technology Stack:**
- Gemini Embedding API.
- PostgreSQL with pgvector.
- Supabase Storage.
- Supabase PostgreSQL.
- Gemini AI for response generation.

### 4. Financial Analytics

- Transaction volume analysis.
- Payment status monitoring.
- Customer analytics.
- Account distribution analysis.
- Financial performance indicators.
- Interactive visualizations.
- Cross-filtering across dashboard charts.

### 5. Security and Access Control

- Supabase Authentication.
- Role-based access control (RBAC).
- Server-side authorization.
- Protected API endpoints.
- Role-isolated RAG document retrieval.
- Secure backend data access.

---

## 🛠️ Technology Stack

| Category | Technologies |
|---|---|
| Frontend | React, TypeScript |
| UI Styling | Tailwind CSS |
| Backend | Node.js |
| API | REST APIs |
| Database | Supabase PostgreSQL |
| Authentication | Supabase Auth |
| AI Model | Google Gemini |
| Embeddings | Gemini Embedding API |
| RAG | Retrieval-Augmented Generation |
| Vector Database | PostgreSQL + pgvector |
| Storage | Supabase Storage |
| Data Visualization | Interactive Dashboard Charts |
| Development Tools | VS Code, Git, GitHub, Google AI Studio |

---

## 🏗️ System Architecture

The platform follows an integrated frontend, backend, database, and AI architecture.

```text
                 FinSight AI Platform
                         |
          +--------------+--------------+
          |                             |
     React Frontend                 User Login
          |                             |
          +--------------+--------------+
                         |
                  Node.js Backend
                         |
          +--------------+--------------+
          |              |              |
       Supabase       Gemini AI       RAG Engine
          |              |              |
      PostgreSQL      AI Responses   Document Retrieval
          |                             |
       pgvector <-----------------------+
          |
     Vector Search
          |
    Retrieved Context
          |
     Gemini Generation
          |
    Contextual Answer
```

---

## 🗄️ Database Overview

FinSight AI uses Supabase PostgreSQL as its primary database.

The platform's database includes financial and operational datasets such as:

- Customers
- Accounts
- Transactions
- Merchants
- Balance Snapshots
- Credit Score History
- Fraud Alerts
- Support Cases
- Application Users
- RAG Documents
- RAG Chunks

The database supports financial analytics, customer insights, fraud monitoring, and AI-powered document retrieval.

---

## 🔐 RAG Security Architecture

Security is an important component of the FinSight AI RAG implementation.

The system uses authenticated user roles to control document retrieval.

Supported application roles:

- `admin`
- `business_analyst`
- `risk_analyst`
- `customer`

The backend derives the user's role from the authenticated session instead of trusting role information supplied by the frontend.

This helps prevent unauthorized access to restricted financial documents and information.

---

## ⚙️ Installation and Setup

Follow these steps to run the project locally.

### Prerequisites

- Node.js
- npm
- Git
- Supabase account
- Google AI Studio account
- Gemini API key

### 1. Clone the Repository

```bash
git clone YOUR_GITHUB_REPOSITORY_URL
```

### 2. Navigate to the Project

```bash
cd FinSight-AI
```

### 3. Install Dependencies

```bash
npm install
```

### 4. Configure Environment Variables

Create a `.env` file in the project root.

Add the required environment variables:

```env
VITE_SUPABASE_URL=your_supabase_project_url
VITE_SUPABASE_ANON_KEY=your_supabase_anon_key

GEMINI_API_KEY=your_gemini_api_key
```

**Important:**
- Never upload API keys or credentials to GitHub.
- Keep server-side secrets in the backend environment.
- Do not expose `GEMINI_API_KEY` through frontend environment variables.
- Configure your Supabase and backend environment variables according to the application configuration.

### 5. Start the Development Server

```bash
npm run dev
```

Open the local application using the URL displayed in your terminal.

---

## 📊 Project Highlights

FinSight AI brings together several modern technologies:

- AI-powered financial assistance using Gemini.
- RAG-based intelligent document retrieval.
- Semantic search using vector embeddings.
- Interactive financial dashboards.
- Role-based access control.
- Supabase-powered backend integration.
- Financial risk and fraud intelligence.
- Context-aware financial insights.

---

## 🔮 Future Enhancements

Potential future improvements include:

- Advanced fraud prediction using machine learning.
- More personalized financial recommendations.
- Improved RAG retrieval accuracy and evaluation.
- Advanced financial forecasting.
- Automated financial reporting.
- Enhanced AI response evaluation.
- Production deployment and monitoring.
- Expanded financial intelligence capabilities.

---

## 👨‍💻 Project Team

**Project:** FinSight AI — AI-Powered Financial Customer Insights & Recommendation Platform

**Project Lead:** Umesh Poshala

**Project Contributors:** Team FinSight AI

The project involves collaborative development across frontend engineering, backend integration, financial analytics, data preparation, AI integration, and quality assurance.

---

## 🎓 Learning Outcomes

This project provides practical experience in:

- Full-stack application development.
- Artificial Intelligence and Large Language Models (LLMs).
- Retrieval-Augmented Generation (RAG).
- Vector databases and semantic search.
- Financial data analytics.
- Database management with Supabase.
- Authentication and authorization.
- API integration.
- Interactive data visualization.
- Software testing and quality assurance.

---

## 📌 Project Information

**Project Name:** FinSight AI

**Domain:** FinTech / Artificial Intelligence

**Project Type:** AI-Powered Financial Analytics Platform

**AI Integration:** Google Gemini

**Database:** Supabase PostgreSQL

**Architecture:** Full-Stack Application with RAG Integration

---

## ⭐ Support

If you find this project interesting, consider giving the repository a ⭐ on GitHub.

Your feedback and suggestions are welcome!

---

**FinSight AI — Transforming Financial Data into Intelligent Decisions.**
