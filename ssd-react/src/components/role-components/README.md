# 🧱 Role-Based Premium Components Library

This directory contains standalone, isolated, feature-rich components built specifically for expanding the role-based portals (Client, Supervisor, Worker, Supplier, Sub-contractor).

## 🛡️ Design Principles
1. **Never mutate core CRUD components:** These components exist parallel to the original structural ones (`Card.jsx`, `Modal.jsx`, `DataTable.jsx`).
2. **Prop-Drilling Protection:** If a component requires heavy state management (e.g. Chat Thread), it handles its own data fetching via `db-extensions.js` instead of bloating the parent dashboard.
3. **Visual Excellence:** Standardize on glassmorphism, responsive gridding, and micro-animations to deliver a true "Premium" App feel.

## 📂 Planned Components

- `DocumentVault.jsx` - Cloud document viewing.
- `NotificationCenter.jsx` - Alert slide-out.
- `LeaveRequestForm.jsx` - Quick worker PTO management.
- `DailyReportForm.jsx` - Supervisor log capture.
- `TimelineGantt.jsx` - Project milestone viz.
- `SafetyIncidentForm.jsx` - Incident reporter.

> "A dashboard is only as good as the components inside it."
