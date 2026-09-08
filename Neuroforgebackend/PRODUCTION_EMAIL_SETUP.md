# NeuroForge Production Email & User Onboarding Deployment Guide

This guide details the steps and environment variables required to deploy the NeuroForge Enterprise User Invitation & Onboarding Email System in production.

---

## 1. Required Production Environment Variables

Configure the following environment variables on your production server, container environment (Docker / Kubernetes), or cloud platform (AWS ECS, Render, Railway, Heroku, Azure App Service, etc.):

| Environment Variable | Description | Example / Recommended Value |
| :--- | :--- | :--- |
| `MAIL_HOST` | Hostname of your production SMTP server | `smtp.gmail.com` / `smtp.sendgrid.net` / `smtp.mailgun.org` |
| `MAIL_PORT` | Port for TLS or SSL connections | `587` (STARTTLS) or `465` (SSL) |
| `MAIL_USERNAME` | Production SMTP account username / email | `notifications@yourcompany.com` |
| `MAIL_PASSWORD` | Production SMTP App Password or API Key | Secret 16-character App Password or SendGrid API Key |
| `APP_FRONTEND_URL` | Fully-qualified public URL of the NeuroForge frontend | `https://neuroforge.yourcompany.com` |
| `SPRING_PROFILES_ACTIVE` | Active Spring profile for database & service setup | `supabase` / `production` |
| `JWT_SECRET` | 256-bit secret key for signing JWT user sessions | Production 32+ character random string |

---

## 2. SMTP Provider Setup Instructions

### Option A: Gmail SMTP
1. Log into the Google Account dedicated to system notifications (e.g. `notifications@yourcompany.com`).
2. Navigate to **Google Account Settings** (`myaccount.google.com`) -> **Security**.
3. Enable **2-Step Verification**.
4. Search for **App Passwords**, select *Other (Custom name)*, enter `NeuroForge Production`, and click **Generate**.
5. Copy the generated 16-character passcode and assign it to the `MAIL_PASSWORD` environment variable.
6. Set `MAIL_HOST=smtp.gmail.com` and `MAIL_PORT=587`.

### Option B: SendGrid / Mailgun / AWS SES
1. Set `MAIL_HOST` to your transactional mail provider (e.g. `smtp.sendgrid.net`).
2. Set `MAIL_PORT=587`.
3. Set `MAIL_USERNAME=apikey` (for SendGrid) or your SMTP username.
4. Set `MAIL_PASSWORD` to your SendGrid API key or SMTP password.

---

## 3. Architecture & Security Compliance

- **Zero Admin Configuration Overhead:** Administrators using the NeuroForge UI do NOT enter SMTP credentials, app passwords, or user passwords. Administrators simply enter the user's name, email, role, and click **+ Add User**.
- **Token Security:** Invitation tokens expire after 24 hours, are single-use, and are invalidated immediately upon successful password setup. `@JsonIgnore` prevents token serialization in REST API JSON responses or browser network logs.
- **Audit Logging:** System logs record account invitation events with `deployment_id = NULL` without exposing tokens, passwords, or SMTP secrets.

---

## 4. Production Deployment Commands

### Building Production Binaries

```bash
# Build Backend JAR
cd Neuroforgebackend
./mvnw clean package -DskipTests

# Build Frontend Static Assets
cd ../Neuroforgefrontend
npm run build
```

### Launching Backend Service

```bash
export MAIL_HOST="smtp.gmail.com"
export MAIL_PORT="587"
export MAIL_USERNAME="notifications@yourcompany.com"
export MAIL_PASSWORD="xxxx xxxx xxxx xxxx"
export APP_FRONTEND_URL="https://neuroforge.yourcompany.com"

java -jar target/demo-0.0.1-SNAPSHOT.jar
```
