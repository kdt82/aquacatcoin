# AQUA Custom Model Setup Instructions

## Current Status
✅ **AI Generation is now working with your custom AQUA model!**  
✅ **Custom AQUA model "aquacat" is active** (ID: `c01eee56-97b1-402e-8471-221481ea5bd9`)

## When Your Custom Model is Ready

### Step 1: Get Your Model ID
1. Go to Leonardo AI dashboard
2. Navigate to "My Models" or "Custom Models"
3. Find your trained AQUA model
4. Copy the Model ID (format: `xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx`)

### Step 2: Update Configuration
Edit `local.env` and replace:
```env
# Current (Flux Dev)
AQUA_MODEL_ID=b24e16ff-06e3-43eb-8d33-4416c2d75876
```

With:
```env
# Your Custom Model
AQUA_MODEL_ID=YOUR_ACTUAL_AQUA_MODEL_ID_HERE
```

### Step 3: Update Model Info (Optional)
Edit `server/controllers/aiController.js` line 7-14 to:
```javascript
const AQUA_MODEL = {
  id: process.env.AQUA_MODEL_ID || "b24e16ff-06e3-43eb-8d33-4416c2d75876",
  name: "AQUA Cat Model",
  description: "Custom trained model for AQUA meme generation featuring the soggy cat",
  example: "A wet blue cat mascot sitting in the rain, crypto themed",
  speed: "Fast",
  trained: true  // ← Change this to true
};
```

### Step 4: Test
1. Restart the server: `npm run dev`
2. Visit: http://localhost:3000/preview/meme-generator
3. Try generating an image
4. Should now use your custom AQUA model! 🎯

## Current Working Features
- ✅ AI Generation (Flux Dev)
- ✅ Rate limit bypass for your IP
- ✅ Canvas editor with advanced features
- ✅ Credit system integration
- ✅ Professional UI with model info display

## Notes
- The Flux Dev model produces high-quality results
- Your custom model will provide AQUA-specific consistency
- All other features work perfectly with either model
