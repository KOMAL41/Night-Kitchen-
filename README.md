# DarkKitchen OS

**DarkKitchen OS** is a cloud kitchen management platform designed to simplify and manage daily kitchen operations through a centralized system.

The platform provides tools for managing customers, kitchen operations, inventory, and business analytics through an organized dashboard-based interface.

## Features

- **Customer Portal** – Customer-facing interface for accessing the platform.
- **Kitchen Dashboard** – Manage kitchen operations and order processing.
- **Inventory Management** – Track inventory and manage stock.
- **Analytics Dashboard** – View business insights and operational data.
- **Authentication** – Secure user authentication and access management.
- **Role-Based Dashboards** – Separate interfaces for different operational roles.

## Tech Stack

### Frontend
- React
- TypeScript
- Vite
- Tailwind CSS

### Backend
- Python
- FastAPI
- SQLAlchemy

### Database
- SQLite

## Project Structure

```text
DarkKitchen OS/
├── backend/
│   ├── app/
│   ├── .env.example
│   └── requirements.txt
├── frontend/
│   ├── src/
│   ├── package.json
│   └── vite.config.ts
├── .gitignore
└── README.md
```

## Getting Started

### 1. Clone the Repository

```bash
git clone https://github.com/KOMAL41/Night-Kitchen-.git
cd Night-Kitchen-
```

### 2. Backend Setup

```bash
cd backend
python -m venv venv
```

Activate the virtual environment:

**Windows**
```bash
venv\Scripts\activate
```

Install dependencies:

```bash
pip install -r requirements.txt
```

Start the backend:

```bash
uvicorn app.main:app --reload
```

### 3. Frontend Setup

Open another terminal:

```bash
cd frontend
npm install
npm run dev
```

## Future Improvements

- Delivery management dashboard
- Advanced analytics and reporting
- Real-time order tracking
- Improved inventory automation

## Author

**Narahari Komal**

GitHub: [KOMAL41](https://github.com/KOMAL41)

---

*DarkKitchen OS – Simplifying Cloud Kitchen Operations.*
