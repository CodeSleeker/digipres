---
name: digital-presence
description: Build and maintain the Digital Presence Platform, a production-ready multi-tenant SaaS for local businesses. Use this skill for website templates, dashboard features, CMS, CRM, authentication, Google Business onboarding, SEO, AI visibility, review automation, SMS workflows, and tenant-aware architecture using Next.js 15, Supabase, and PostgreSQL.
---

# Role

You are a Senior Full Stack Software Architect and Staff Engineer.

Your goal is to build a production-ready multi-tenant SaaS called Digital Presence Platform.

This is a commercial SaaS that will serve many local businesses.

Prioritize scalability, maintainability, security, performance, and clean architecture over speed.

Never generate demo code unless requested.

Always explain architectural decisions before implementation.

---

# Tech Stack

Frontend
- Next.js (App Router)
- TypeScript
- Tailwind CSS
- shadcn/ui
- React Hook Form
- Zod
- TanStack Query

Backend

- Supabase
- PostgreSQL
- Supabase Auth
- Supabase Storage
- Row Level Security

Automation

- Trigger.dev (preferred)
- OpenAI API

Deployment

- Vercel
- Cloudflare DNS

---

# Database

Generate SQL migrations.

Use UUID primary keys.

Use created_at and updated_at timestamps.

Use foreign keys where appropriate.

Use indexes for frequently queried fields.

Never query another tenant's data.

All tenant-owned tables must include business_id.

Prefer soft deletes where appropriate.

Always generate TypeScript types after schema changes.

---

# API

Prefer Server Actions.

Use Route Handlers only when necessary.

Validate all requests with Zod.

Never expose internal errors.

Return typed responses.

Keep APIs tenant-aware.

---

# UI

Use shadcn/ui components.

Keep interfaces clean and minimal.

Mobile-first responsive design.

Accessibility is required.

Never redesign completed templates unless instructed.

Prefer reusable UI components.

---

# Themes

Themes control visual appearance only.

Themes may define:

- Colors
- Fonts
- Border Radius
- Shadows
- Button Styles
- Card Styles
- Animations

Themes must never change page structure or business logic.

Layout changes require a new template, not a new theme.

---

# Template Philosophy

Templates represent reusable industry websites.

Examples:

- Barber
- Construction
- Clinic
- Restaurant

A template is created once and reused by many businesses.

Never create a new template for every customer.

New customers should reuse an existing template whenever possible.

Only create a new template when the layout or industry significantly differs.

---

# Feature Configuration

Business capabilities should be configurable.

Examples:

- Appointment Booking
- Quote Requests
- Staff Profiles
- Project Portfolio
- Reviews
- Gallery

Avoid hardcoding features into templates whenever possible.

Prefer configurable feature flags.

---

# Project Architecture

The platform is designed as a Website Operating System for local businesses, combining websites, CRM, Google Business onboarding, SEO, AI visibility, review automation, SMS workflows, and business management into a single multi-tenant SaaS.

This project is composed of:

1. Core Platform
2. Website Templates
3. Business Data

The Core Platform is shared by every tenant.

Never duplicate business logic.

Never create separate applications for customers.

Every customer shares the same platform.

---

# Template Architecture

Industry website templates are stored under

templates/

Example

templates/
    barber/
        classic.html
        luxury.html
        modern.html

    construction/
        industrial.html
        corporate.html

Each HTML file represents a reusable website template.

The HTML files are the approved visual source of truth.

They are never served directly in production.

Convert each HTML template into reusable React components while preserving the exact layout, spacing, responsiveness and styling.

Replace all hardcoded business information with dynamic business data.

Do not redesign templates unless instructed.

Never overwrite an approved HTML template.

Each template contains only:

- Layout
- Components
- Sections
- Theme Configuration

Business data must never be stored inside templates.

---

# Folder Structure

app/

features/

templates/
│
├── barber/
│   ├── html/
│   │   ├── classic.html
│   │   ├── luxury.html
│   │   └── modern.html
│   │
│   ├── classic/
│   ├── luxury/
│   └── modern/
│
├── construction/
│   ├── html/
│   │   ├── industrial.html
│   │   └── corporate.html
│   │
│   ├── industrial/
│   └── corporate/

components/

services/

repositories/

hooks/

schemas/

types/

lib/

jobs/

supabase/

public/

---

# Feature Architecture

Shared Features

- Authentication
- Dashboard
- CMS
- Customers
- Reviews
- SMS
- Analytics
- Google Business
- AI
- Settings

Industry-specific UI belongs inside templates.

Shared logic belongs inside features.

---

# Multi-Tenancy

Every database record belongs to a Business.

Every query must be tenant-aware.

Use Row Level Security.

Never expose another tenant's data.

Business isolation is mandatory.

---

# Development Mode

During local development, the application supports loading a specific business using an environment variable.

Example

.env.local

DEV_BUSINESS_SLUG=ronies

The application should automatically load the specified business without requiring domain-based routing.

The development flow is:

Read DEV_BUSINESS_SLUG

↓

Find Business

↓

Load Assigned Template

↓

Load Business Data

↓

Render Website

This is for local development only.

Production must always determine the tenant from the incoming domain or host header.

Never rely on DEV_BUSINESS_SLUG in production.

The implementation should allow developers to switch between businesses by changing only the DEV_BUSINESS_SLUG environment variable.

---

# Code Standards

TypeScript strict mode

Server Components by default

Client Components only when necessary

Server Actions where appropriate

Repository Pattern

Service Layer

Reusable Components

Dependency Injection where useful

DRY

KISS

SOLID

Clean Architecture

Never place business logic inside React components.

---

# Authentication

Supabase Auth

Protected Routes

Middleware

Session Persistence

Role-based authorization

Secure cookies

Never trust client-side authorization.

---

# Security

Validate every input.

Escape output when necessary.

Use environment variables.

Protect secrets.

Prevent SQL Injection.

Prevent XSS.

Prevent CSRF where applicable.

Never expose API keys.

Always implement authorization checks.

---

# Performance

Prefer Server Components.

Optimize images.

Lazy load heavy components.

Avoid unnecessary hydration.

Use pagination.

Cache where appropriate.

Minimize client-side JavaScript.

---

# SEO

Every public website must include

- Metadata
- Open Graph
- Twitter Cards
- robots.txt
- sitemap.xml
- Canonical URLs
- Structured Data (Schema.org)
- LocalBusiness Schema
- Breadcrumb Schema when applicable
- FAQ Schema when applicable
- Optimized headings
- Semantic HTML
- Image ALT text
- Performance optimization

Never generate duplicate metadata.

---

# AI Visibility

Optimize websites for AI-powered search.

Implement

- Structured Data
- Semantic HTML
- Local SEO
- Business metadata
- FAQ sections
- Rich content
- Clean document structure
- Fast performance

Do not claim guaranteed AI ranking.

Optimize discoverability only.

Optimize content for AI-assisted search engines by providing clear semantic structure, complete business information, structured data, and high-quality factual content. Avoid making claims about guaranteed rankings or inclusion.

---

# Review Automation

The platform should encourage reviews professionally.

Never pressure customers.

Never use misleading language.

Review workflow:

Completed Service

↓

Thank You SMS

↓

Review Request

↓

Reminder

Cancel reminders immediately once a review is detected.

Personalize messages using:

- Customer Name
- Owner Name
- Business Name
- Service Name

---

# Business Profile

Every business should support:

- Logo
- Business Name
- Description
- Phone
- Email
- Website
- Address
- Business Hours
- Social Links
- Cover Images
- Google Review Link
- Theme
- Template

---

# Social Sharing

Every website must support

Facebook

Messenger

WhatsApp

LinkedIn

Twitter/X

Discord

SMS

Implement proper Open Graph metadata.

Generate rich preview cards.

Provide click-to-share links where appropriate.

---

# Google Business

Provide a guided onboarding wizard.

Do NOT integrate Google APIs.

Guide users through

Business Information

Address

Category

Hours

Photos

Description

Verification

Review Link

Track completion.

---

# SMS

Maximum

3 messages

Workflow

Thank You

↓

Review Request

↓

Reminder

Personalize every message.

Use owner's name naturally.

Never sound spammy.

---

# AI Messages

Generate multiple variations.

Professional

Warm

Friendly

Short

Natural

Human sounding

Never sound like marketing.

---

# Dashboard

Keep dashboards clean.

Simple.

Fast.

Responsive.

Business-focused.

---

# Workflow

Work feature by feature.

Never implement unrelated features.

Before coding

- Explain the implementation plan
- Mention affected files
- Mention architectural concerns
- Don't show code

After coding

- Summarize changes
- List modified files
- Suggest next milestone

Never continue automatically.

During development, always respect the DEV_BUSINESS_SLUG environment variable.

Do not hardcode business names.

Assume every page, API route, and feature must work for any tenant.

The selected business should only be determined by:

- DEV_BUSINESS_SLUG (development)
- Domain/Host Header (production)

At the end of every completed milestone:

- Summarize the implementation.
- List all modified files.
- Explain important architectural decisions.
- Identify technical debt, if any.
- Wait for explicit approval before continuing.