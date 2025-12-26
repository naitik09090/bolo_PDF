# Vercel Deployment Guide - BoloPDF

## Problem: 404 on Vercel for SPA Routes

Single Page Applications (SPAs) like React apps need special configuration on Vercel. Without it, any route other than `/` will return a 404 error because Vercel tries to find a physical file instead of letting React Router handle the routing.

## Solution Applied

### 1. Created `vercel.json` Configuration

**File:** [vercel.json](file:///c:/Users/Granthik/Desktop/BoloPDF/bolo_PDF/bolosign/vercel.json)

```json
{
  "rewrites": [
    {
      "source": "/(.*)",
      "destination": "/index.html"
    }
  ]
}
```

**What it does:**
- Redirects ALL routes to `index.html`
- Allows React Router to handle client-side routing
- Prevents 404 errors on page refresh or direct URL access

### 2. Updated `App.jsx` with Catch-All Route

**File:** [App.jsx](file:///c:/Users/Granthik/Desktop/BoloPDF/bolo_PDF/bolosign/src/App.jsx)

Added a catch-all route that redirects unknown paths to root:

```jsx
<Route path="*" element={<Navigate to="/" replace />} />
```

**What it does:**
- Catches any undefined routes
- Redirects to home page (`/`)
- Provides better UX than showing blank page

## Deployment Steps

### Step 1: Deploy to Vercel

1. **Push your code to GitHub** (if not already done):
   ```bash
   cd c:\Users\Granthik\Desktop\BoloPDF\bolo_PDF\bolosign
   git add .
   git commit -m "Add Vercel configuration for SPA routing"
   git push
   ```

2. **Go to Vercel Dashboard**: https://vercel.com/dashboard

3. **Import Project**:
   - Click "Add New" → "Project"
   - Import your GitHub repository
   - Select the `bolosign` directory as the root

4. **Configure Build Settings**:
   - **Framework Preset**: Vite
   - **Root Directory**: `bolosign` (if deploying from monorepo)
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
   - **Install Command**: `npm install`

5. **Deploy**: Click "Deploy"

### Step 2: Configure Environment Variables (After Backend Deployment)

Once you deploy the backend, add the environment variable:

1. Go to your Vercel project settings
2. Navigate to "Environment Variables"
3. Add:
   - **Name**: `VITE_API_URL`
   - **Value**: `https://your-backend-url.vercel.app`
   - **Environment**: Production

4. Redeploy the frontend

## Backend Deployment (Deploy This First)

### Step 1: Update Server for Vercel

The backend needs a few modifications for Vercel serverless deployment.

**Create:** `server/vercel.json`

```json
{
  "version": 2,
  "builds": [
    {
      "src": "server.js",
      "use": "@vercel/node"
    }
  ],
  "routes": [
    {
      "src": "/(.*)",
      "dest": "/server.js"
    }
  ]
}
```

**Update CORS in server.js** to include your Vercel frontend URL.

### Step 2: Deploy Backend

1. Import backend to Vercel (separate project)
2. Set environment variables:
   - `MONGODB_URI`
   - `PORT=5000`
   - `FRONTEND_URL=https://your-frontend.vercel.app`
3. Deploy

### Step 3: Update Frontend with Backend URL

After backend is deployed:

1. Note the backend URL (e.g., `https://your-backend.vercel.app`)
2. Update frontend environment variable `VITE_API_URL`
3. Redeploy frontend

## Testing

### Local Testing

Test the catch-all route locally:

```bash
cd bolosign
npm run dev
```

Visit these URLs:
- ✅ http://localhost:5173/ (should work)
- ✅ http://localhost:5173/random-path (should redirect to /)
- ✅ http://localhost:5173/any/nested/path (should redirect to /)

### Production Testing

After deployment:
- ✅ Visit your Vercel URL
- ✅ Try random paths (should redirect to home)
- ✅ Refresh the page (should not show 404)
- ✅ Test PDF upload and signing workflow

## Common Issues

### Issue: Still Getting 404 on Vercel

**Solution:**
- Ensure `vercel.json` is in the root of your project (same level as `package.json`)
- Redeploy after adding `vercel.json`
- Clear Vercel cache: Settings → Data Cache → Clear

### Issue: Environment Variables Not Working

**Solution:**
- Environment variables must start with `VITE_` for Vite
- Redeploy after adding environment variables
- Check browser console for actual API URL being used

### Issue: CORS Error in Production

**Solution:**
- Update backend CORS to include Vercel frontend URL
- Redeploy backend after CORS update

## Files Modified

1. ✅ [vercel.json](file:///c:/Users/Granthik/Desktop/BoloPDF/bolo_PDF/bolosign/vercel.json) - Created
2. ✅ [App.jsx](file:///c:/Users/Granthik/Desktop/BoloPDF/bolo_PDF/bolosign/src/App.jsx) - Updated with catch-all route

## Next Steps

1. **Deploy Backend First** - Get the backend URL
2. **Create `.env.production`** with backend URL
3. **Deploy Frontend** - With Vercel configuration
4. **Test Production** - Verify all routes work
