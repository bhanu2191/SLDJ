# SL Dream Japan (SLDJ) Management System

[![Electron](https://img.shields.io/badge/Electron-Latest-blue?style=flat-square&logo=electron)](https://www.electronjs.org/)
[![React](https://img.shields.io/badge/React-19.0-blue?style=flat-square&logo=react)](https://react.dev/)
[![Vite](https://img.shields.io/badge/Vite-Latest-646CFF?style=flat-square&logo=vite)](https://vitejs.dev/)
[![TypeScript](https://img.shields.io/badge/TypeScript-5.0-blue?style=flat-square&logo=typescript)](https://www.typescriptlang.org/)
[![TailwindCSS](https://img.shields.io/badge/TailwindCSS-3.4-38B2AC?style=flat-square&logo=tailwindcss)](https://tailwindcss.com/)
[![SQLite](https://img.shields.io/badge/SQLite-Latest-003B57?style=flat-square&logo=sqlite)](https://www.sqlite.org/)

A comprehensive Student Management and Payment System built with Electron, React, and SQLite. This application is designed to streamline the administrative and operational tasks for SL Dream Japan Institute, offering robust features for student registration, fee management, and automated communications.

## Features

### Student Management
- **Registration**: Register new students with detailed profiles including personal information, guardian details, and multiple class assignments.
- **Profile Management**: View and edit student details, track payment history, and manage class enrollments.
- **Search & Filter**: Efficiently search for students by registration number or name.

### Financial Management
- **Payment Processing**: Record monthly class fees with support for various payment methods.
- **Receipts**: Automatically generate and email digital receipts to students upon payment.
- **Revenue Tracking**: Real-time dashboard usage for monitoring daily and monthly revenue.
- **Pending Payments**: Automated tracking of overdue and pending payments.

### Role-Based Access Control
- **Admin Portal**: 
    - Full system access.
    - Dashboard with financial and operational analytics.
    - User management (create/suspend operators).
    - System configuration (class fees, SMS settings).
- **Operator Portal**: 
    - Focused interface for daily operations.
    - streamlined student registration and payment collection.

### Automated Communications
- **SMS Integration**: Automated SMS notifications for new registrations and payment reminders (configurable).
- **Email Services**: Integrated email service for sending official payment receipts.

### 🛠 System Features
- **Data Persistence**: Robust local data storage using SQLite.
- **Automated Scheduler**: Background jobs for checking payment statuses and sending reminders.
- **Offline Capable**: Fully functional desktop application.

## Tech Stack

- **Runtime**: [Electron](https://www.electronjs.org/)
- **Frontend**: [React](https://react.dev/), [Vite](https://vitejs.dev/)
- **Language**: [TypeScript](https://www.typescriptlang.org/)
- **Database**: [SQLite](https://www.sqlite.org/) (via `better-sqlite3`)
- **Styling**: [TailwindCSS](https://tailwindcss.com/)
- **Charting**: [Recharts](https://recharts.org/)
- **Communication**: `nodemailer` (Email), Custom SMS Service Integration

## Installation & Setup

1. **Prerequisites**
   - Node.js (v18 or higher recommended)
   - npm (Node Package Manager)

2. **Clone the Repository**
   ```bash
   git clone <repository-url>
   cd SLDJ
   ```

3. **Install Dependencies**
   ```bash
   npm install
   ```
   *Note: If you encounter errors related to native modules, ensure you have build tools installed or run `npm run rebuild`.*

4. **Run in Development Mode**
   ```bash
   npm run electron:dev
   ```

5. **Build for Production**
   ```bash
   npm run build
   ```

## Project Structure

```
SLDJ/
├── electron/        # Main process & backend logic (IPC handlers, Database)
├── src/            # Renderer process (React Frontend)
│   ├── components/ # Reusable UI components
│   ├── pages/      # Application route pages
│   ├── layouts/    # Admin & Operator layout wrappers
│   └── context/    # Global state (Auth, etc.)
├── data/           # SQLite database location (generated at runtime)
└── dist/           # Production build output
```

## Configuration

### SMS & Email
- **SMS Settings**: Configurable via the Admin Portal under "System Settings".
- **Email**: Currently configured for Gmail SMTP. Update credentials in `electron/main.js` or move to environment variables for production.


## License

This project is proprietary software developed for SL Dream Japan.
