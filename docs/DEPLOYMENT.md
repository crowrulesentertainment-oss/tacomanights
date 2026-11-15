# GitHub Pages Deployment

The repository includes a GitHub Actions workflow at `.github/workflows/pages.yml` that deploys the repository root on pushes to `main`.

If Pages has not previously been enabled, open repository Settings → Pages and select GitHub Actions as the build/deployment source. Then verify the latest workflow run in the Actions tab.

After deployment, check:
- Homepage and navigation links.
- Nested member and admin routes.
- YouTube playlist embeds.
- Public form submission to the shared Supabase project.
- Staff login with a real account carrying app_metadata.role=admin.
- Responsive layout on mobile and desktop.

No secrets are required for the static public site. The Supabase publishable key is browser-safe; never add a service-role or secret key.
