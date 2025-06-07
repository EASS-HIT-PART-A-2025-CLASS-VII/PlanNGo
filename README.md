# **🧭** PlanNGo - Smart Trip Management System


## 📖 Overview

**PlanNGo** is a microservices-based platform for planning, managing, and sharing personal and recommended trips. It enables users to create daily itineraries, view AI-generated suggestions, interact with public trips, and manage content with admin permissions.

---

### 🎥 Demo Video

[![Watch the demo](https://img.youtube.com/vi/hd9tCDCIjXE/0.jpg)](https://youtu.be/hd9tCDCIjXE)

---

## **✨** Key Features

### 🔐 User Authentication

* Secure JWT-based authentication flow
* Sign up, log in, and password reset via email
* Role-based access control (guest, user, admin)

### 🤖 AI-Powered Planning

* Custom trip generation based on destination, duration, trip type, and number of travelers
* Budget estimation using AI analysis of trip structure

### **🧳** Trip Management

* Create and edit trips with daily activities (CRUD operations)
* View recommended trips curated by admins
* Clone recommended trips for personal customization

### 💬 User Interaction

* Add ratings and comments to recommended trips
* Favorite/unfavorite personal or recommended trips
* Search trips by title, location, and category

### 🔗 Sharing & Communication

* Share trips via unique public link
* Email trip summaries to any recipient

### 🧑‍💼 Admin Panel

* View, edit, or delete recommended trips
* Manage users

---

## 📂 Project Structure

```
plan_n_go/
├── ai_service/                         # AI microservice for trip generation
│   ├── app/
│   │   ├── main.py                     # Entry point for the AI service
│   │   ├── routes.py                   # FastAPI routes for AI endpoints
│   │   ├── schemas.py                  # Pydantic models for request/response
│   │   ├── services.py                 # Core OpenAI interaction logic
│   │   └── requirements.txt            # Dependencies for the AI service
│   ├── unit_tests/                     # Unit tests for AI logic
│   └── Dockerfile                      # Docker config for the AI service
│
├── backend/                            # FastAPI backend application
│   ├── app/
│   │   ├── main.py                     # FastAPI application entry point
│   │   ├── db/                         # Database connection and session config
│   │   ├── models/                     # SQLAlchemy models (User, Trip, Comment, etc.)
│   │   ├── routes/                     # API route definitions
│   │   ├── schemas/                    # Pydantic request/response schemas
│   │   ├── services/                   # Core service logic
│   │   ├── static/                     # Static files (if applicable)
│   │   ├── client-secret.json          # OAuth2 credentials (ignored in .gitignore)
│   │   └── requirements.txt            # Backend dependencies
│   ├── integration_tests/              # End-to-end API tests
│   ├── unit_tests/                     # Unit tests for backend services
│   └── Dockerfile                      # Docker config for backend
│
├── frontend/                           # React frontend application
│   ├── public/                         # Static assets (index.html, icons, etc.)
│   ├── src/
│   │   ├── components/                 # Reusable UI components
│   │   ├── context/                    # React context providers (e.g., auth, theme)
│   │   ├── css/                        # Custom global CSS files
│   │   ├── layouts/                    # Page layout components (e.g., Navbar, Footer)
│   │   ├── pages/                      # Main pages (Trips, Login, AI Planner, etc.)
│   │   ├── services/                   # Axios service functions
│   │   ├── tests/                      # Unit tests for frontend components
│   │   ├── App.js                      # Root component
│   │   └── AppRouter.js                # Routing logic
│   ├── Dockerfile                      # Docker config for frontend
│   ├── nginx.conf                      # Nginx configuration for static deployment
│   └── package.json                    # Project metadata and dependencies
│
├── docker-compose.yml                  # Service orchestration file
├── .env                                # Environment variables for local development
├── venv/                               # Python virtual environment (not tracked in Git)
├── Makefile                            # CLI shortcuts for testing and setup
└── README.md                           # Project documentation
```

---

## 🏗️ Microservices Architecture

![Microservices Architecture](backend/app/static/Architecture.png)

---

## 🛠️ Technology Overview

### 🖥️ Backend

* **FastAPI** – High-performance Python web framework
* **SQLAlchemy** – ORM for database interactions
* **Alembic** – Schema migration tool for managing database changes
* **Pydantic** – Data validation and parsing
* **OAuth2 + JWT** – Secure authentication and token-based authorization
* **Pytest** – Unit and integration testing

### 🗄️ Database

* **PostgreSQL** – Relational database used to store all application data
* **SQLite** – Lightweight database used for testing

### 🌐 Frontend

* **React** – Modern component-based UI framework
* **React Router** – Client-side routing
* **Axios** – API requests
* **CSS Modules** – Scoped component styling

### 🤖 AI Microservice

* **Python + OpenAI API** – Generates personalized trip plans and budget estimates

### 📩 Email Service

* **Gmail SMTP** – Sends trip summaries and password reset links

### 🐳 Infrastructure

* **Docker** – Application containerization
* **Docker Compose** – Multi-container orchestration
* **dotenv** – Environment variable management

---

## **🛠️** Installation & Setup

### 1. Clone the Repository

```bash
git clone <repository-url>
cd plan_n_go
```

### 2. Create Virtual Environment

```bash
python3 -m venv venv
source venv/bin/activate  # On Windows, use `venv\Scripts\activate`
```

### 3. Create a `.env` file in the project root with:

```env
# === 🔐 Backend Auth ===
SECRET_KEY=your_custom_secret_key_here
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=60

# === 🗄️ Database ===
DATABASE_URL=postgresql://<username>:<password>@<host>:<port>/<database_name>

# === 📩 Email ===
EMAIL_ADDRESS=your_email_address@gmail.com
EMAIL_PASSWORD=your_app_password_here
EMAIL_HOST=smtp.gmail.com
EMAIL_PORT=587

# === 🧠 AI Service ===
OPENAI_API_KEY=your_openai_api_key_here
```

> ⚠️ **Important:** Do NOT commit the `.env` file to Git. Keep it private.

### ℹ️ Environment Variable Setup Instructions

#### 🔑 SECRET\_KEY

To generate a secure secret key for token encryption, run the following script:

```bash
python backend/generate_secret_key.py
```

This will output a random key in the terminal. Copy it and paste it in the `SECRET_KEY` field.

#### 🗄️ DATABASE\_URL

Provide the connection string to your PostgreSQL database. Example:

```
postgresql://postgres:yourpassword@localhost:5432/planngo_db
```

Make sure the database exists and is accessible.

#### 📩 Gmail App Password

1. Go to [Google My Account](https://myaccount.google.com/)
2. Enable 2-Step Verification if not already enabled
3. Under 'Security', go to 'App Passwords'
4. Generate a new app password (e.g., for "Other" app: PlanNGo)
5. Copy the 16-digit code and paste it in `EMAIL_PASSWORD`

#### 🔐 OPENAI\_API\_KEY

1. Sign up at [https://platform.openai.com/](https://platform.openai.com/)
2. Go to your API keys page
3. Create a new secret key and paste it in `OPENAI_API_KEY`

### 4. Google Calendar Integration

To enable calendar sync, you'll need to create your own `client_secret.json` file and place it in the correct path:

#### Step-by-Step Instructions:

1. Go to [Google Cloud Console](https://console.cloud.google.com/)
2. Create a new project (or select an existing one)
3. Enable the **Google Calendar API**
4. Go to **APIs & Services > Credentials**
5. Click **Create Credentials > OAuth client ID**

   * Choose **Web Application**
   * Under **Authorized redirect URIs**, add:

     ```
     http://localhost:8000/api/calendar/callback
     ```
6. Download the JSON file
7. Rename it to `client-secret.json`
8. Place it under:

   ```
   backend/app/client_secret.json
   ```
9. Go to **APIs & Services > OAuth consent screen > Audience > Test Users** and add your email address to allow OAuth testing.

> ⚠️ **Important:** Do not commit this file to Git. Add it to your `.gitignore`.

### 5. Run the Application with Docker

```bash
make up
```

This will start:

✅ AI Service - [http://localhost:8001](http://localhost:8001)

✅ Backend (FastAPI) - [http://localhost:8000](http://localhost:8000)

✅ Frontend (React) - [http://localhost:3000](http://localhost:3000)

---

## 🧪 Testing

### Run AI Service Unit Tests

```bash
make test-ai-service
```

### Run Backend Unit Tests

```bash
make test-backend
```

### Run Frontend Unit Tests

```bash
make test-frontend
```

### Run Integration Tests

```bash
make integration-test
```

These tests cover:

* Business logic and service layers
* API endpoints and DB integration
* UI components and user interactions

---

## 📚 API Documentation

PlanNGo offers comprehensive API documentation through Swagger UI:

**URL:** [http://localhost:8000/docs](http://localhost:8000/docs)

**Features:**

* Interactive API testing
* Request/response schema documentation
* Authentication flow demonstration
* Model validation details

---


## 🙌 Conclusion

PlanNGo simplifies the complexity of trip planning with smart tools, personalized recommendations, and collaborative features. Whether you're a casual traveler or a frequent explorer, PlanNGo provides a streamlined, intelligent platform to design your perfect adventure.

Feel free to contribute, report issues, or suggest enhancements.


---
<div align="center">
  <p><strong>Built by Lian Cohen ❤️</strong></p>
  <p><a href="mailto:Liancohen0104@gmail.com">Liancohen0104@gmail.com</a></p>
</div>
