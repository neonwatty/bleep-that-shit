import { NextRequest, NextResponse } from 'next/server';
import { createClient } from '@/lib/supabase/server';
import type { Database } from '@/types/supabase';

type WordsetInsert = Database['public']['Tables']['wordsets']['Insert'];

export const dynamic = 'force-dynamic';

/**
 * GET /api/wordsets
 * List all wordsets for the authenticated user
 */
export async function GET() {
  const supabase = await createClient();

  // Check authentication
  const {
    data: { user },
    error: authError,
  } = await supabase.auth.getUser();

  if (authError || !user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { data: wordsets, error } = await supabase
    .from('wordsets')
    .select('*')
    .eq('user_id', user.id)
    .order('updated_at', { ascending: false });

  if (error) {
    console.error('Error fetching wordsets:', error);
    return NextResponse.json({ error: 'Failed to fetch wordsets' }, { status: 500 });
  }

  return NextResponse.json({ wordsets: wordsets || [] });
}

/**
 * POST /api/wordsets
 * Create a new wordset or bulk create multiple wordsets
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
  let body: { wordsets?: WordsetInput[]; wordset?: WordsetInput };
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: 'Invalid JSON body' }, { status: 400 });
  }

  // Support both single wordset and bulk creation
  const inputWordsets = body.wordsets || (body.wordset ? [body.wordset] : []);

  if (inputWordsets.length === 0) {
    return NextResponse.json({ error: 'No wordsets provided' }, { status: 400 });
  }

  // Validate and prepare wordsets for insertion
  const wordsetsToInsert: WordsetInsert[] = inputWordsets.map(ws => ({
    user_id: user.id,
    name: ws.name.trim(),
    words: ws.words.map((w: string) => w.trim().toLowerCase()).filter(Boolean),
    color: ws.color || null,
    is_default: ws.is_default || false,
  }));

  // Insert wordsets
  const { data: createdWordsets, error } = await supabase
    .from('wordsets')
    .insert(wordsetsToInsert)
    .select();

  if (error) {
    console.error('Error creating wordsets:', error);
    return NextResponse.json({ error: 'Failed to create wordsets' }, { status: 500 });
  }

  return NextResponse.json(
    {
      wordsets: createdWordsets,
      created: createdWordsets?.length || 0,
    },
    { status: 201 }
  );
}

interface WordsetInput {
  name: string;
  words: string[];
  color?: string;
  is_default?: boolean;
}
