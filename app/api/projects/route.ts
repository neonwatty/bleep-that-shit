import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type ProjectInsert = Database['public']['Tables']['projects']['Insert'];
type ProjectStatus = Database['public']['Tables']['projects']['Row']['status'];

const validStatuses: ProjectStatus[] = ['draft', 'processing', 'ready', 'error'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/projects
 * List all projects for the authenticated user
 */
export async function GET(request: NextRequest) {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  // Parse query params
  const { searchParams } = new URL(request.url);
  const status = searchParams.get('status');
  const limit = parseInt(searchParams.get('limit') || '20', 10);
  const offset = parseInt(searchParams.get('offset') || '0', 10);

  // Build query
  let query = supabase
    .from('projects')
    .select('*', { count: 'exact' })
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false })
    .range(offset, offset + limit - 1);

  // Filter by status if provided and valid
  if (status && validStatuses.includes(status as ProjectStatus)) {
    query = query.eq('status', status as ProjectStatus);
  }

  const { data: projects, error, count } = await query;

  if (error) {
    console.error('Error fetching projects:', error);
    return NextResponse.json({ error: 'Failed to fetch projects' }, { status: 500 });
  }

  return NextResponse.json({
    projects: projects || [],
    total: count || 0,
    limit,
    offset,
  });
}

/**
 * POST /api/projects
 * Create a new project
 */
export async function POST(request: NextRequest) {
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
  let body: { title?: string };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  const { title } = body;

  if (!title || typeof title !== 'string' || title.trim().length === 0) {
    return NextResponse.json({ error: 'Title is required' }, { status: 400 });
  }

  // Create the project
  const insertData: ProjectInsert = {
    user_id: user.id,
    title: title.trim(),
    status: 'draft',
  };

  const { data: project, error } = await supabase
    .from('projects')
    .insert(insertData)
    .select()
    .single();

  if (error) {
    console.error('Error creating project:', error);
    return NextResponse.json({ error: 'Failed to create project' }, { status: 500 });
  }

  return NextResponse.json({ project }, { status: 201 });
}
