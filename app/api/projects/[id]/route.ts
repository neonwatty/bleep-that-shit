import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import { deleteProjectFiles } from '@/lib/supabase/storage';
import type { Database } from '@/types/supabase';

type ProjectUpdate = Database['public']['Tables']['projects']['Update'];

export const dynamic = 'force-dynamic';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]
 * Get a single project by ID
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Fetch the project
  const { data: project, error } = await supabase
    .from('projects')
    .select('*')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.error('Error fetching project:', error);
    return NextResponse.json({ error: 'Failed to fetch project' }, { status: 500 });
  }

  return NextResponse.json({ project });
}

/**
 * PATCH /api/projects/[id]
 * Update a project
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse request body
  let body: Partial<ProjectUpdate>;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Allowed fields to update
  const allowedFields: (keyof ProjectUpdate)[] = [
    'title',
    'status',
    'original_file_path',
    'original_file_size',
    'duration_seconds',
    'transcription',
    'bleep_config',
    'processing_minutes',
  ];

  // Filter to only allowed fields
  const updateData: ProjectUpdate = {};
  for (const field of allowedFields) {
    if (field in body) {
      (updateData as Record<string, unknown>)[field] = body[field];
    }
  }

  if (Object.keys(updateData).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Add updated_at timestamp
  updateData.updated_at = new Date().toISOString();

  // Update the project
  const { data: project, error } = await supabase
    .from('projects')
    .update(updateData)
    .eq('id', id)
    .eq('user_id', user.id)
    .select()
    .single();

  if (error) {
    if (error.code === 'PGRST116') {
      return NextResponse.json({ error: 'Project not found' }, { status: 404 });
    }
    console.error('Error updating project:', error);
    return NextResponse.json({ error: 'Failed to update project' }, { status: 500 });
  }

  return NextResponse.json({ project });
}

/**
 * DELETE /api/projects/[id]
 * Delete a project and its associated files
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  const { id } = await params;
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // First, verify the project exists and belongs to the user
  const { data: project, error: fetchError } = await supabase
    .from('projects')
    .select('id')
    .eq('id', id)
    .eq('user_id', user.id)
    .single();

  if (fetchError || !project) {
    return NextResponse.json({ error: 'Project not found' }, { status: 404 });
  }

  // Delete associated files from storage
  try {
    await deleteProjectFiles(user.id, id);
  } catch (storageError) {
    console.error('Error deleting project files:', storageError);
    // Continue with project deletion even if file deletion fails
  }

  // Delete any associated jobs
  await supabase.from('jobs').delete().eq('project_id', id);

  // Delete the project
  const { error: deleteError } = await supabase
    .from('projects')
    .delete()
    .eq('id', id)
    .eq('user_id', user.id);

  if (deleteError) {
    console.error('Error deleting project:', deleteError);
    return NextResponse.json({ error: 'Failed to delete project' }, { status: 500 });
  }

  return NextResponse.json({ success: true });
}
