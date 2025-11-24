<div align="center">
<img width="1200" height="475" alt="GHBanner" src="https://github.com/user-attachments/assets/0aa67016-6eaf-458a-adb2-6e31a0763ed6" />
</div>

# Run and deploy your AI Studio app

This contains everything you need to run your app locally and deploy it to GitHub Pages.

View your app in AI Studio: https://ai.studio/apps/drive/1ppvZC9gpk6Xa3bBEzl6EL3XAl1vHzC2v

## Run Locally

**Prerequisites:**  Node.js


1. Install dependencies:
   `npm install`
2. Set the `GEMINI_API_KEY` in [.env.local](.env.local) to your Gemini API key
3. Run the app:
   `npm run dev`

## Deploy to GitHub Pages

This repository is configured to automatically deploy to GitHub Pages when changes are pushed to the main branch.

### Setup GitHub Pages

1. Go to your repository Settings
2. Navigate to "Pages" in the left sidebar
3. Under "Build and deployment", select "GitHub Actions" as the source
4. Push to the main branch to trigger the deployment

Once deployed, your app will be available at: `https://<your-username>.github.io/SquashTracker/`

### Manual Deployment

You can also manually trigger a deployment:
1. Go to the "Actions" tab in your repository
2. Select the "Deploy to GitHub Pages" workflow
3. Click "Run workflow"
