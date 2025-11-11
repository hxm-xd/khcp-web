KHCP Admin Frontend

This is a lightweight frontend-only admin scaffold for the KHCP website. It is deliberately simple and stores data in the browser's localStorage so you can try CRUD flows without a backend.

Pages

- index.html — Login (mock)
- dashboard.html — Overview and quick counts
- blog.html — Manage blog posts (add / edit via the form)
- avenues.html — Manage avenues
- directors.html — Manage avenue directors
- projects.html — Manage projects
- analytics.html — Simple charts powered by Chart.js (CDN)
- profile.html — Admin profile stored in localStorage

How it works

- Login sets an `adminAuth` entry in localStorage. All other pages check for this key and redirect to login if missing.
- Content collections are kept under keys: `admin_posts`, `admin_avenues`, `admin_directors`, `admin_projects`.
- Data is persisted in localStorage. To reset admin data, open devtools Storage > localStorage and remove those keys.

Extending

- Replace localStorage calls with API fetch() calls to your backend.
- Add validation and file uploads on the relevant pages.

Security note

- This is only a demo/prototype. Do not use in production as-is — it has no real authentication or server-side protection.
