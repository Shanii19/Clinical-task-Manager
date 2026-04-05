
# Clinic Task Manager — Implementation Plan

## Overview
A hospital task management app with department-based tasks, task comments, team metrics dashboard, and role-based access (Admin = hospital manager, Member = doctor/nurse). Built with React + Lovable Cloud.

---

## 1. Database Schema
- **departments** — id, name, description, color
- **tasks** — id, title, description, status (pending/in-progress/completed), priority (urgent/high/normal/low), department_id, assigned_to (user), created_by (user), due_date, created_at
- **task_comments** — id, task_id, user_id, content, created_at
- **user_roles** — id, user_id, role (admin/member)
- **profiles** — id (linked to auth.users), full_name, avatar_url, department_id
- **notifications** — id, user_id, title, message, read, task_id, created_at

## 2. Authentication & Roles
- Email/password sign-up and login
- Admin can manage departments, create/assign/delete tasks, view all data
- Members see tasks assigned to them or their department, can update status and comment

## 3. Sidebar Navigation
- Clean medical-themed sidebar with icons
- Links: Dashboard, Tasks, Departments (admin only), Notifications, My Profile
- Collapsible with trigger always visible

## 4. Dashboard (Homepage)
- **Summary cards**: Total tasks, pending, in-progress, completed, overdue
- **Charts**: Tasks by status (pie), tasks by department (bar), completion rate over time (line), team workload (bar per member)
- **Activity timeline**: Recent task updates and comments

## 5. Task Management
- Task list with filters: department, status, priority, assigned member, date range
- Sorting by due date, priority, created date
- Task detail view with comment thread
- Admin: create, assign, edit, delete tasks
- Member: update status, add comments on assigned tasks

## 6. Departments (Admin)
- CRUD for departments (name, description, color)
- Assign members to departments

## 7. Notifications
- Auto-generated when: task assigned, comment added, task overdue, status changed
- Notification bell with unread count in header
- Notification list page with mark-as-read

## 8. UI Style
- Clean white/blue medical palette, soft rounded cards
- Hospital-appropriate icons (lucide-react)
- Responsive layout for desktop use

## 9. Implementation Order
1. Set up Lovable Cloud (auth, database tables, RLS policies)
2. Auth pages (login, signup) + role system
3. Layout with sidebar navigation
4. Dashboard with charts (recharts)
5. Department management (admin)
6. Task CRUD with filters, sorting, assignment
7. Task comments
8. Notification system
