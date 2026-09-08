# NeuroForge Enterprise SDLC Management Platform

[![Build Status](https://img.shields.io/badge/Build-Passing-brightgreen.svg)](file:///e:/infosys/Project/README.md)
[![Java Version](https://img.shields.io/badge/Java-17-orange.svg)](https://www.oracle.com/java/)
[![Spring Boot](https://img.shields.io/badge/Spring%20Boot-3.4.3-green.svg)](https://spring.io/projects/spring-boot)
[![React](https://img.shields.io/badge/React-18.2-blue.svg)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-8.2.1-purple.svg)](https://vitejs.dev/)
[![License](https://img.shields.io/badge/License-MIT-blue.svg)](file:///e:/infosys/Project/LICENSE)

> **NeuroForge** is an enterprise-grade Application Lifecycle Management (ALM) and Software Development Lifecycle (SDLC) platform designed for agile engineering organizations, project managers, software developers, and quality assurance engineers.

---

## 📌 Executive Overview

NeuroForge provides strict governance, role-based security, and complete traceability across the entire software development lifecycle:

- **Project & Team Governance**: Multi-tenant project organization with project manager scope isolation and team onboarding.
- **Controlled Requirements Lifecycle**: 4-stage sequential requirement progression (`DRAFT` $\rightarrow$ `APPROVED` $\rightarrow$ `IMPLEMENTED` $\rightarrow$ `VERIFIED`) with automated post-approval reset triggers and historical change tracking.
- **Agile Sprint Iteration Engine**: Sequential sprint lifecycle (`PLANNED` $\rightarrow$ `ACTIVE` $\rightarrow$ `COMPLETED`) with date validations.
- **Role & Ownership-Enforced Task Tracking**: Strict state machine execution rules (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` $\rightarrow$ `COMPLETED` / `BLOCKED` / `CHANGES_REQUESTED`) with backend-enforced ownership permissions.
- **Bug & QA Management**: Bug tracking linked directly to requirements, tasks, and test cases.
- **Real-Time System Audit Logging**: Comprehensive audit trail for system log events and deployment metrics.

---

## 🔐 Security & Access Control Model

NeuroForge implements **Role-Based Access Control (RBAC)** coupled with **Resource Ownership Validation**:

| System Role | Scope & Permissions Summary |
| :--- | :--- |
| **`ROLE_ADMIN`** | Unrestricted system-wide management, user onboarding, project/sprint/task creation, assignment, review, approval, and deletion. |
| **`ROLE_PROJECT_MANAGER`** | Full governance over assigned projects, team onboarding, sprint iteration control, task creation, assignment, and work review/approval. |
| **`ROLE_DEVELOPER`** | Project scope visibility. Can edit requirements in assigned projects. Can execute transitions (`TODO` $\rightarrow$ `IN_PROGRESS` $\rightarrow$ `IN_REVIEW` or `BLOCKED`) **ONLY on tasks assigned to them**. Cannot approve/complete own tasks or edit structural project metadata. |
| **`ROLE_TESTER` / `QA`** | Project scope visibility. Performs the `VERIFIED` transition on implemented requirements. Can execute task transitions **ONLY on tasks assigned to them**. Logs and verifies bugs. |
| **`ROLE_USER`** | Read-only visibility into explicitly permitted project resources. Cannot perform unauthorized state transitions or task modifications. |

---

## 🛠️ Technology Stack

### Backend Architecture
- **Framework**: Java 17 + Spring Boot 3.4.3
- **Security**: Spring Security + Stateless JWT Authentication
- **ORM / Persistence**: JPA / Hibernate 6 + Spring Data JPA
- **Database Support**: PostgreSQL (Supabase Production) / H2 In-Memory (Local Development)
- **Logging & Utilities**: SLF4J / Logback + Jakarta Validation

### Frontend Architecture
- **Framework**: React 18 + JavaScript (ES6+)
- **Build Tool**: Vite 8.2.1
- **UI & Styling**: Bootstrap 5 + Bootstrap Icons + Modern Dark Glassmorphism Theme
- **HTTP Client**: Axios (with Bearer JWT interceptor)
- **Routing**: React Router DOM v6

---

## 📁 Repository Directory Structure

```
Project/
├── LICENSE                          # MIT License
├── README.md                        # Primary Project Documentation
├── .gitignore                       # Root Git Ignore Rules
├── docs/                            # System Architecture & Specs
│   ├── SRS.md                       # Software Requirements Specification
│   ├── UML_DIAGRAMS.md              # Complete Mermaid UML Diagrams
│   └── DATABASE_SCHEMA.md           # Database DDL & Schema Documentation
├── Neuroforgebackend/               # Spring Boot Backend API Service
│   ├── mvnw.cmd / mvnw              # Maven Wrapper Scripts
│   ├── pom.xml                      # Maven Dependencies & Plugins
│   └── src/
│       ├── main/java/com/example/demo/
│       │   ├── config/              # Security & Data Bootstrap Config
│       │   ├── controller/          # REST Endpoint Controllers
│       │   ├── dto/                 # Data Transfer Objects
│       │   ├── model/               # JPA Domain Entities
│       │   ├── repository/          # Spring Data JPA Repositories
│       │   ├── security/            # JWT Filter & ProjectScopeResolver
│       │   └── service/             # Core Business Logic & State Machines
│       └── main/resources/
│           ├── application.properties
│           └── schema.sql           # Database DDL Schema Migrations
└── Neuroforgefrontend/              # React SPA Frontend Client
    ├── package.json                 # Node.js Dependencies & Scripts
    ├── vite.config.js               # Vite Configuration
    └── src/
        ├── components/              # Reusable UI Components & Navbar
        ├── pages/                   # Feature Pages (Tasks, Sprints, Req, etc.)
        ├── services/                # Axios API Client Configuration
        └── routes/                  # App Routing & Auth Guards
```

---

## 🚀 Quick Start & Setup Guide

### 1. Prerequisites
- **JDK 17** or higher installed and configured in `JAVA_HOME`.
- **Node.js 18.x** or higher and `npm`.
- (Optional) **PostgreSQL** database instance (defaults to H2 in-memory DB for local development).

### 2. Backend Setup
1. Navigate to the backend directory:
   ```bash
   cd Neuroforgebackend
   ```
2. Compile and run unit tests:
   ```bash
   .\mvnw.cmd test
   ```
3. Launch the Spring Boot application server:
   ```bash
   .\mvnw.cmd spring-boot:run
   ```
   The backend API server will start on `http://localhost:8080`.

### 3. Frontend Setup
1. Navigate to the frontend directory:
   ```bash
   cd Neuroforgefrontend
   ```
2. Install frontend dependencies:
   ```bash
   npm install
   ```
3. Start the Vite development server:
   ```bash
   npm run dev
   ```
   The application UI will be accessible at `http://localhost:5173`.

---

## 📖 API Endpoint Summary

| Module | Endpoint | Method | Access Level | Description |
| :--- | :--- | :---: | :--- | :--- |
| **Auth** | `/api/auth/login` | `POST` | Public | Authenticate user and receive JWT bearer token |
| **Users** | `/api/users` | `GET` | Admin | List system users |
| **Projects** | `/api/projects` | `GET` | Authenticated | List projects allowed in user scope |
| **Projects** | `/api/projects/{id}/members` | `GET` | Authenticated | Retrieve deduplicated eligible team members |
| **Requirements** | `/api/requirements` | `POST` | Dev/PM/Admin | Create requirement (`DRAFT`) |
| **Requirements** | `/api/requirements/{id}/transition` | `PUT` | Role-Enforced | Transition lifecycle stage |
| **Sprints** | `/api/sprints` | `POST` | PM/Admin | Create sprint (`PLANNED` status) |
| **Tasks** | `/api/tasks` | `GET` | Authenticated | Retrieve tasks in allowed project scope |
| **Tasks** | `/api/tasks` | `POST` | PM/Admin | Create task item |
| **Tasks** | `/api/tasks/{id}` | `PUT` | Owner/PM/Admin | Update task details / status transition |

---

## 📄 Documentation Links
- 📘 [Software Requirements Specification (SRS)](file:///e:/infosys/Project/docs/SRS.md)
- 📐 [UML Diagrams & Architectural Specifications](file:///e:/infosys/Project/docs/UML_DIAGRAMS.md)
- 🗄️ [Database Schema & DDL Documentation](file:///e:/infosys/Project/docs/DATABASE_SCHEMA.md)

---

## 📄 License

This project is licensed under the **MIT License**. See the [LICENSE](file:///e:/infosys/Project/LICENSE) file for complete details.
