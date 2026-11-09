# PinPic Web

Modern React web application for PinPic — turning your camera roll into an interactive geographical memory map.

## 🚀 Features

- **Interactive Map**: Geographical memory exploration powered by Leaflet with custom photo pins, cluster grouping, and dynamic light/dark map tiles.
- **Photo Upload & EXIF Extraction**: Upload photos directly from your browser with automatic client-side EXIF GPS location extraction and direct S3 upload via pre-signed URLs.
- **Gallery**: Responsive photos grid with multi-selection mode, visibility management (Public, Followers, Private), full-screen viewer, and batch deletion.
- **Social Discovery**: Search users, follow/unfollow explorers, and explore other users' maps and shared photos.
- **Profile & Customization**: Manage profile photo, personal information, and switch between Light, Dark, or System themes matching PinPic's design system.
- **Floating Bottom Navigation**: Faithful web recreation of the native mobile experience with responsive adaptation.

## 🛠 Tech Stack

- **Framework**: React 18 + Vite
- **Styling**: Tailwind CSS (custom coral & teal palette matching Android theme)
- **Routing**: React Router v6
- **Icons**: Lucide React
- **Mapping**: Leaflet + React-Leaflet
- **Metadata**: Exifr (client-side GPS & EXIF extraction)
- **API**: Axios with JWT authentication interceptors & backend proxy

## 🏁 Getting Started

### 1. Install Dependencies
```bash
npm install
```

### 2. Start Vite Development Server
```bash
npm run dev
```
The app will be available at `http://localhost:3000`. API requests to `/api` are automatically proxied to the backend running at `http://localhost:8080`.

### 3. Production Build
```bash
npm run build
npm run preview
```

