# IT Service Management Platform (ITSM)
> Ministry of Higher Education — IT Department Management System

A full-stack IT Service Management (ITSM) solution designed to streamline IT operations, asset tracking, incident management, user access control, repair ticketing, and meeting resource allocation.

---

## 🏛️ Clean Architectural Structure

The codebase is organized following industry-standard layered and modular software engineering principles:

```
IT-Service-Management-Platform/
├── backend/                             # Express / PostgreSQL REST API
│   ├── src/
│   │   ├── config/                     # Configuration (DB pool, environment)
│   │   │   └── db.js
│   │   ├── controllers/                # HTTP Request & Response handlers
│   │   │   ├── authController.js
│   │   │   └── userController.js
│   │   ├── services/                   # Business logic & SQL query layer
│   │   │   ├── authService.js
│   │   │   └── userService.js
│   │   ├── routes/                     # Thin route definitions & endpoint mapping
│   │   │   ├── index.js                # Central API router aggregator
│   │   │   ├── auth.js
│   │   │   ├── users.js
│   │   │   ├── assets.js
│   │   │   ├── tickets.js
│   │   │   ├── stock-items.js
│   │   │   ├── repairs.js
│   │   │   ├── tasks.js
│   │   │   ├── zoom-requests.js
│   │   │   ├── publications.js
│   │   │   ├── vendors.js
│   │   │   ├── divisions.js
│   │   │   └── audit-logs.js
│   │   ├── middleware/                 # Global & route-level middleware
│   │   │   ├── errorHandler.js         # Centralized error handler
│   │   │   └── requestLogger.js        # Request & response duration logger
│   │   ├── utils/                      # Helper utilities
│   │   │   ├── roleHelper.js           # Role slug normalization & conversion
│   │   │   └── resolveHelper.js        # Identifier resolver (UUID / name matching)
│   │   ├── db/                         # Database migrations & seed scripts
│   │   │   ├── itsm_upgrade_and_seed.sql
│   │   │   └── seed.js
│   │   └── server.js                   # Express application entry point
│   ├── package.json
│   └── .env
│
├── Frontend/                            # React (Vite) Single Page Application
│   ├── src/
│   │   ├── assets/                     # Logos, icons, and static images
│   │   ├── components/                 # Reusable UI component library
│   │   │   ├── common/                 # Shared generic widgets
│   │   │   │   ├── AlertBanner.jsx
│   │   │   │   ├── LoadingSpinner.jsx
│   │   │   │   └── PageHeader.jsx
│   │   │   ├── layout/                 # Layout wrappers
│   │   │   │   ├── AppLayout.jsx
│   │   │   │   ├── Sidebar.jsx
│   │   │   │   └── TopBar.jsx
│   │   │   └── ui/                     # Generic design system components
│   │   │       ├── Badge.jsx
│   │   │       ├── DataTable.jsx
│   │   │       ├── Modal.jsx
│   │   │       ├── ProgressBar.jsx
│   │   │       ├── StatCard.jsx
│   │   │       └── HoldReasonModal.jsx
│   │   ├── constants/                  # Application constants
│   │   │   └── routes.js               # Centralized route path constants
│   │   ├── context/                    # React state providers
│   │   │   ├── AuthContext.jsx         # User session & credentials
│   │   │   ├── DataContext.jsx         # Domain data synchronization
│   │   │   └── NotificationContext.jsx # Toast and alert notifications
│   │   ├── services/                   # Frontend API integration layer
│   │   │   ├── apiClient.js            # Fetch wrapper with base URL & auth headers
│   │   │   ├── authService.js          # Authentication API calls
│   │   │   └── divisionService.js      # Division lookup API calls
│   │   ├── routes/                     # Centralized Routing
│   │   │   └── AppRoutes.jsx           # Protected routes, role guards, switch
│   │   ├── pages/                      # Feature modules & views
│   │   │   ├── auth/                   # Authentication (LoginPage, SignUpPage)
│   │   │   ├── dashboards/             # Role-specific dashboards (SuperAdmin, ITAdmin, Trainee, etc.)
│   │   │   ├── assets/                 # Hardware & device inventory
│   │   │   ├── helpdesk/               # Incident tickets & support workflow
│   │   │   ├── stock/                  # Spare parts & warehouse items
│   │   │   ├── repairs/                # Hardware maintenance & repairs
│   │   │   ├── tasks/                  # Task board, lists, and calendar
│   │   │   ├── zoom/                   # Meeting & video conference requests
│   │   │   ├── publication/            # Document publications
│   │   │   ├── users/                  # User account management
│   │   │   └── audit/                  # Audit trail & security logs
│   │   ├── data/                       # Mock data fallbacks for offline support
│   │   │   └── mockData.js
│   │   ├── App.jsx                     # Top-level provider wrapper
│   │   ├── main.jsx                    # React DOM entry point
│   │   └── index.css                   # Global stylesheet
│   ├── package.json
│   └── vite.config.js
│
└── README.md
```

---

## ⚙️ Architecture Highlights

### Backend Layered Pattern (Controller - Service - Route)
1. **Routes (`src/routes/`)**: Focus strictly on defining HTTP endpoints and verbs. All routes are aggregated in [`routes/index.js`](file:///d:/IT-Service-Management-Platform-dev-test-frontend-backend/backend/src/routes/index.js) and mounted under `/api` in `server.js`.
2. **Controllers (`src/controllers/`)**: Handle incoming request payloads, validate inputs, format responses, and route errors to the centralized error middleware.
3. **Services (`src/services/`)**: Isolate business logic, data persistence, and SQL queries away from the HTTP transport layer.
4. **Middleware (`src/middleware/`)**: Encapsulates cross-cutting concerns (request timing logging, structured error handling).

### Frontend Modular Pattern
1. **API Client (`src/services/apiClient.js`)**: Single source of truth for base URLs and request headers (including `x-user-id`).
2. **Dedicated Services (`src/services/`)**: Provide typed, promise-based methods (`authService.login`, `authService.register`, `divisionService.getAllNames`) preventing hardcoded API URLs across views.
3. **Route Hub (`src/routes/AppRoutes.jsx`)**: Separates routing definitions and access control guards (`ProtectedRoute`, `DashboardRedirect`) from [`App.jsx`](file:///d:/IT-Service-Management-Platform-dev-test-frontend-backend/Frontend/src/App.jsx).
4. **Constants (`src/constants/routes.js`)**: Eliminates magic strings for path navigation.

---

## 🚀 Getting Started

### 1. Backend Setup
```bash
cd backend
npm install
npm run dev
# Server will listen on http://localhost:5000
```

### 2. Frontend Setup
```bash
cd Frontend
npm install
npm run dev
# Vite server will start on http://localhost:5173
```
