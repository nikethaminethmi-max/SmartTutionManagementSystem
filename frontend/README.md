# EduPortal LMS — Frontend Client

Modern React 19 single-page application built with **Vite** and **Bootstrap 5**.

## Available Scripts

- `npm run dev` — Starts the Vite development server at `http://localhost:5173/`.
- `npm run build` — Compiles the production bundle into `dist/`.
- `npm run lint` — Runs ESLint across all `.js` and `.jsx` files (zero warnings policy).
- `npm run preview` — Previews the production build locally.

## Features
- Role-based routing with JWT `ProtectedRoute` (`/login`, `/student-dashboard`, `/teacher-dashboard`, `/parent-dashboard`, `/admin-dashboard`).
- Responsive Bootstrap 5 layout with custom modern LMS palette and Plus Jakarta Sans typography.
- SAFE Box academic risk visualization.
- QR Code identity pass generation (`qrcode.react`) and hardware barcode attendance scanner.
- Offline Fallback Engine (`src/mockData.js`) for smooth previewing without a live backend.
