# Clinical Task Manager — Backend API

Express.js REST API server for the Clinical Task Manager, designed for deployment on **Railway**.

## API Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| GET | `/` | Health check / service info |
| GET | `/api/health` | Server health status |
| GET | `/api/tasks` | List all tasks |
| GET | `/api/tasks/:id` | Get single task |
| POST | `/api/tasks` | Create a task |
| PATCH | `/api/tasks/:id` | Update a task |
| DELETE | `/api/tasks/:id` | Delete a task |
| GET | `/api/departments` | List departments |
| GET | `/api/profiles` | List user profiles |
| GET | `/api/leave-requests` | List leave requests |
| POST | `/api/leave-requests` | Create leave request |
| PATCH | `/api/leave-requests/:id` | Update leave request |
| GET | `/api/notifications/:userId` | Get user notifications |
| GET | `/api/messages` | List messages |
| POST | `/api/messages` | Send a message |
| GET | `/api/task-comments/:taskId` | Get comments for task |
| POST | `/api/task-comments` | Add comment to task |

## Deploy to Railway

1. Go to [railway.app](https://railway.app) and sign in with GitHub
2. Click **"New Project"** → **"Deploy from GitHub Repo"**
3. Select your repository and set the **root directory** to `server`
4. Add these environment variables in Railway dashboard:

| Variable | Value |
|----------|-------|
| `SUPABASE_URL` | `https://whhooxgqwxumseyaxocc.supabase.co` |
| `SUPABASE_ANON_KEY` | *(your anon key)* |
| `PORT` | `3001` (Railway auto-assigns, usually not needed) |

5. Railway will auto-detect Node.js, run `npm install` and `npm start`
6. Your backend URL will be: `https://your-project.up.railway.app`

## Local Development

```bash
cd server
npm install
cp .env.example .env   # Edit with your keys
npm start
```

Server runs at `http://localhost:3001`
