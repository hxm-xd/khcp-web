# Security Vulnerability Analysis Report

**Date:** December 28, 2025
**Project:** KHCP Website

## Executive Summary

A security analysis was performed on the KHCP Website project. Several critical and high-severity vulnerabilities were identified, primarily related to database access controls and Cross-Site Scripting (XSS). Remediation steps have been applied to the codebase to mitigate these risks.

## Identified Vulnerabilities

### 1. Insecure Firestore Rules (Critical)

- **Description:** The original `firestore.rules` configuration allowed public read access to the entire database (`allow read: if true;` on `match /{document=**}`). This exposed all data, including potentially sensitive internal records, to anyone with the project's API key.
- **Impact:** Complete data leakage.
- **Status:** **Fixed**.
- **Remediation:** The rules have been updated to explicitly define which collections are publicly readable (`posts`, `projects`, `avenues`, `directors`, `settings`). The `messages` collection is now restricted to authenticated users (admins) only, while still allowing public creation (for the contact form).

### 2. Stored Cross-Site Scripting (XSS) in Public Site (High)

- **Description:** The blog and project details pages rendered rich text content (HTML) from the database directly using `innerHTML` without sanitization. Since the database was writable by any authenticated user (and potentially vulnerable to injection), malicious scripts could be stored and executed on visitors' browsers.
- **Impact:** Execution of malicious scripts on client browsers, potentially leading to session hijacking or redirection.
- **Status:** **Fixed**.
- **Remediation:** `DOMPurify` has been integrated into `js/firebase-public.js` to sanitize all rich text content before rendering.

### 3. Stored Cross-Site Scripting (XSS) in Admin Panel (Medium)

- **Description:** The admin dashboard's message list displayed a preview of user-submitted messages using `innerHTML` without escaping the content.
- **Impact:** An attacker could submit a malicious message via the contact form that would execute scripts when an admin viewed the message list.
- **Status:** **Fixed**.
- **Remediation:** The message preview is now escaped using the `escapeHtml` helper function before being rendered.

### 4. Broad Write Access (High)

- **Description:** The rule `allow write: if request.auth != null;` allows any authenticated user to modify data. While no public registration form was found, this is a broad permission that relies solely on the inability of attackers to create an account.
- **Impact:** Potential data integrity loss if an attacker can authenticate.
- **Status:** **Mitigated**.
- **Remediation:** While the rule remains `request.auth != null` (assuming admin accounts are managed via Firebase Console), the removal of the public read rule for `messages` and the general tightening of rules improves the posture. **Recommendation:** Ensure "Email/Password" sign-up is disabled in the Firebase Console or restrict write access to specific admin UIDs.

## Recommendations

1.  **Firebase Console Settings:**

    - Go to **Authentication > Sign-in method** and ensure "Email/Password" provider has "Email link (passwordless sign-in)" disabled (unless used) and strictly control who can create accounts. Ideally, disable public sign-up if possible or use Cloud Functions to manage admin creation.
    - Go to **Google Cloud Console > APIs & Services > Credentials** and restrict the API key (`AIzaSyAR...`) to:
      - **HTTP Referrers:** Your specific domains (e.g., `khcp-web.firebaseapp.com`, `your-custom-domain.com`).
      - **API Restrictions:** Only allow Firestore, Firebase Auth, and Firebase Storage APIs.

2.  **Regular Audits:**

    - Periodically review Firestore rules and dependencies.

3.  **Content Security Policy (CSP):**
    - Consider implementing a CSP header to further mitigate XSS risks by restricting where scripts can be loaded from.

## Applied Fixes

- **`firestore.rules`**: Updated to whitelist specific collections for public read and restrict `messages` read access.
- **`js/firebase-public.js`**: Imported `DOMPurify` and applied it to `p.description` and `p.content` rendering.
- **`admin/js/app.js`**: Applied `escapeHtml` to message previews in the admin dashboard.
