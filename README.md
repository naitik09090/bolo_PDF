# 📄 BoloPDF - PDF Signature Engine

A full-stack PDF signature application with drag-and-drop field placement, MongoDB audit trail, and hash verification.

## 🚀 Quick Start

### Option 1: Double-Click Startup (Easiest)

1. Double-click `start-dev.bat`
2. Wait for both servers to start
3. Open browser to http://localhost:5173

### Option 2: Command Line

```bash
# Install all dependencies (first time only)
npm run install-all

# Start both servers
npm run dev
```

## 📋 Prerequisites

- Node.js (v14 or higher)
- MongoDB Atlas account (or local MongoDB)
- npm or yarn

## 🛠️ Manual Setup

### 1. Install Dependencies

```bash
# Root dependencies
npm install

# Backend dependencies
cd server
npm install

# Frontend dependencies
cd ../bolosign
npm install
```

### 2. Configure Environment

Edit `server/.env` with your MongoDB connection string:

```env
MONGODB_URI=your_mongodb_connection_string
PORT=5000
```

### 3. Start Development Servers

**Option A: Start Both Together**
```bash
npm run dev
```

**Option B: Start Separately**
```bash
# Terminal 1 - Backend
cd server
npm start

# Terminal 2 - Frontend
cd bolosign
npm run dev
```

## 🌐 Application URLs

- **Frontend**: http://localhost:5173
- **Backend API**: http://localhost:5000
- **Health Check**: http://localhost:5000/health

## 📁 Project Structure

```
bolo_PDF/
├── bolosign/          # React frontend (Vite)
│   ├── src/
│   │   ├── components/
│   │   │   └── PDF.jsx
│   │   ├── App.jsx
│   │   └── main.jsx
│   └── package.json
├── server/            # Express backend
│   ├── server.js
│   ├── .env
│   └── package.json
├── package.json       # Root package (concurrent scripts)
├── start-dev.bat      # Windows startup script
└── README.md
```

## 🔧 Available Scripts

### Root Level
- `npm run dev` - Start both frontend and backend
- `npm run server` - Start backend only
- `npm run client` - Start frontend only
- `npm run install-all` - Install all dependencies

### Backend (server/)
- `npm start` - Start production server
- `npm run dev` - Start with nodemon (auto-reload)

### Frontend (bolosign/)
- `npm run dev` - Start Vite dev server
- `npm run build` - Build for production
- `npm run preview` - Preview production build

## 🎯 Features

- ✅ Drag-and-drop PDF field placement
- ✅ Multiple field types (text, signature, image, date, radio)
- ✅ Canvas-based signature drawing
- ✅ Image upload for fields
- ✅ SHA-256 hash verification
- ✅ MongoDB audit trail
- ✅ Coordinate conversion (CSS to PDF)
- ✅ Responsive design

## 🔍 API Endpoints

- `POST /api/pdf/sign-pdf` - Sign PDF with fields
- `GET /api/pdf/audit/:auditId` - Get audit record
- `GET /api/pdf/verify/:hash` - Verify document by hash
- `GET /api/pdf/audits` - Get all audit records
- `GET /health` - Server health check

## 🐛 Troubleshooting

### 404 Error

**Problem**: Frontend shows 404 NOT_FOUND error

**Solution**: Make sure the backend server is running on port 5000
```bash
# Check if backend is running
netstat -ano | findstr :5000

# If not running, start it
cd server
npm start
```

### MongoDB Connection Error

**Problem**: "MongoDB Error" in console

**Solution**: 
1. Check your `.env` file has correct `MONGODB_URI`
2. Verify MongoDB Atlas cluster is running
3. Check network connectivity

### Port Already in Use

**Problem**: "Port 5000 is already in use"

**Solution**:
```bash
# Find process using port 5000
netstat -ano | findstr :5000

# Kill the process (replace PID with actual process ID)
taskkill /PID <PID> /F
```

## 📝 Usage Guide

1. **Upload PDF**: Click the upload area and select a PDF file
2. **Add Fields**: Drag field types from sidebar onto the PDF
3. **Position Fields**: Drag fields to desired positions
4. **Fill Fields**: 
   - Text/Date: Type directly in the field
   - Signature: Click "Sign Here" to draw signature
   - Image: Click "Upload" to add image
5. **Save**: Click "Save PDF" button
6. **Download**: Click the download link to get signed PDF

## 🔐 Security Features

- SHA-256 hash calculation for original and signed PDFs
- MongoDB audit trail with timestamps
- IP address and user agent logging
- File integrity verification

## 📦 Dependencies

### Backend
- express - Web framework
- mongoose - MongoDB ODM
- multer - File upload handling
- pdf-lib - PDF manipulation
- cors - Cross-origin resource sharing
- dotenv - Environment variables

### Frontend
- react - UI framework
- axios - HTTP client
- react-pdf - PDF rendering
- crypto-js - Hash calculation
- lucide-react - Icons
- react-rnd - Drag and resize

## 👨‍💻 Development

Built with:
- **Frontend**: React 19 + Vite
- **Backend**: Node.js + Express
- **Database**: MongoDB Atlas
- **PDF Processing**: pdf-lib

## 📄 License

ISC
