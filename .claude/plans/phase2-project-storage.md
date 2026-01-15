# Phase 2: Project Storage - Detailed Implementation Plan

> Build the project storage layer on top of Phase 1 authentication. Enable authenticated users to upload media files to Supabase Storage, persist project state in the database, and sync local IndexedDB wordsets to the cloud on first login.

## Current State Analysis

**Existing Components to Leverage:**

- `components/FileUpload.tsx` - Basic dropzone (no progress, single file)
- `lib/utils/db/wordsetDb.ts` - Dexie/IndexedDB wordset storage
- `lib/utils/db/wordsetOperations.ts` - CRUD operations for local wordsets
- `app/bleep/hooks/useBleepState.ts` - Complex state management for bleep workflow
- `providers/AuthProvider.tsx` - User session context
- `types/supabase.ts` - Full database type definitions

**Database Schema Ready:**

- `public.projects` table with all required fields
- `public.wordsets` table for cloud wordset storage
- RLS policies already configured for user-owned data

---

## Implementation Steps

### Step 1: Configure Supabase Storage Buckets

**New Files:**

- `supabase/migrations/00002_storage_buckets.sql`
- `lib/supabase/storage.ts`

**Storage Utility Functions:**

- `uploadOriginalFile(file: File, userId: string, projectId: string)` - Upload with progress
- `uploadProcessedFile(blob: Blob, userId: string, projectId: string)` - Upload processed media
- `getSignedUrl(bucket: string, path: string)` - Get temporary download URL
- `deleteProjectFiles(userId: string, projectId: string)` - Cleanup on project deletion

**File Path Pattern:** `{userId}/{projectId}/{filename}`

---

### Step 2: Create Enhanced File Upload Component with Progress

**New Files:**

- `components/projects/FileUploadWithProgress.tsx`
- `hooks/useFileUpload.ts`

**Key Features:**

- Chunked upload for large files (resumable)
- Real-time progress percentage
- File validation (type, size, duration)
- Cancel upload capability
- Drag-and-drop zone (reuse existing `useDropzone`)
- Error handling with retry option

---

### Step 3: Implement Project CRUD API Routes

**New Files:**

- `app/api/projects/route.ts` - List projects, Create project
- `app/api/projects/[id]/route.ts` - Get, Update, Delete project

**API Endpoints:**

| Method | Endpoint             | Description                      |
| ------ | -------------------- | -------------------------------- |
| GET    | `/api/projects`      | List user's projects (paginated) |
| POST   | `/api/projects`      | Create new project               |
| GET    | `/api/projects/[id]` | Get project details              |
| PATCH  | `/api/projects/[id]` | Update project                   |
| DELETE | `/api/projects/[id]` | Delete project and files         |

---

### Step 4: Build Project List/Dashboard UI

**New/Modified Files:**

- `app/(dashboard)/dashboard/projects/page.tsx` - Projects list page
- `components/projects/ProjectCard.tsx` - Individual project card
- `components/projects/ProjectList.tsx` - Project list with filtering
- `components/projects/ProjectStats.tsx` - Usage statistics
- `app/(dashboard)/dashboard/page.tsx` - Update with real data

**Status Indicators:**

- Draft (gray) - Project created but not processed
- Processing (blue/animated) - Transcription in progress
- Ready (green) - Transcription complete, can export
- Error (red) - Processing failed

---

### Step 5: Add Local Wordset Sync on First Login

**New Files:**

- `lib/sync/wordsetSync.ts` - Sync logic
- `hooks/useWordsetSync.ts` - React hook for sync

**Sync Logic:**

1. Get all local wordsets from IndexedDB
2. Get existing cloud wordsets for user
3. Compare and merge (local wins for conflicts by name)
4. Upload new wordsets to cloud
5. Mark sync complete in localStorage

---

### Step 6: Create Project Detail Page with Bleep UI Integration

**New Files:**

- `app/(dashboard)/dashboard/projects/[id]/page.tsx` - Project detail page
- `app/(dashboard)/dashboard/projects/[id]/edit/page.tsx` - Edit project (bleep UI)
- `components/projects/ProjectHeader.tsx` - Project title, status, actions
- `hooks/useProject.ts` - Project data fetching hook
- `providers/ProjectProvider.tsx` - Project state context

**Data Flow:**

```
Load Project from DB
     ↓
Hydrate useBleepState (file from Storage, transcription from DB)
     ↓
User makes changes (select words, configure bleeps)
     ↓
Auto-save to DB (debounced, status='draft')
     ↓
User clicks "Apply Bleeps"
     ↓
Upload processed file to Storage
     ↓
Update project (status='ready', processed_file_path)
```

---

## Implementation Order (Dependencies)

```
Step 1: Storage Buckets ─────────────────────────────┐
                                                     │
Step 2: FileUploadWithProgress ──────────────────────┼─── Can start in parallel
                                                     │
Step 3: Project API Routes ──────────────────────────┘
         ↓
Step 4: Dashboard UI (ProjectList, ProjectCard)
         ↓
Step 5: Wordset Sync (can run in parallel with Step 4)
         ↓
Step 6: Project Detail/Edit Pages (integrates everything)
```

---

## Files to Create

| File                                               | Purpose                               |
| -------------------------------------------------- | ------------------------------------- |
| `supabase/migrations/00002_storage_buckets.sql`    | Storage bucket setup and RLS policies |
| `lib/supabase/storage.ts`                          | Storage utility functions             |
| `hooks/useFileUpload.ts`                           | File upload with progress hook        |
| `components/projects/FileUploadWithProgress.tsx`   | Enhanced upload component             |
| `app/api/projects/route.ts`                        | Projects list/create API              |
| `app/api/projects/[id]/route.ts`                   | Project CRUD API                      |
| `components/projects/ProjectCard.tsx`              | Project card component                |
| `components/projects/ProjectList.tsx`              | Project list with filtering           |
| `app/(dashboard)/dashboard/projects/page.tsx`      | Projects list page                    |
| `lib/sync/wordsetSync.ts`                          | Wordset sync logic                    |
| `hooks/useWordsetSync.ts`                          | Wordset sync hook                     |
| `app/(dashboard)/dashboard/projects/[id]/page.tsx` | Project detail page                   |
| `hooks/useProject.ts`                              | Project data fetching                 |
| `providers/ProjectProvider.tsx`                    | Project state context                 |

---

## Testing Strategy

**Unit Tests:**

- Storage upload/download functions
- Wordset sync merge logic
- File upload progress calculation

**E2E Tests:**

- Create project → upload file → view in list
- Edit project → save changes → verify persistence
- First login wordset sync flow

---

## Risks & Mitigations

| Risk                    | Mitigation                                                 |
| ----------------------- | ---------------------------------------------------------- |
| Large file uploads fail | Chunked uploads with resumability                          |
| Storage costs grow      | Track file sizes, display usage, enforce quotas in Phase 4 |
| Sync conflicts          | Local wordsets win on first sync, cloud is truth after     |
| State hydration slow    | Show loading states, lazy load file blobs                  |
