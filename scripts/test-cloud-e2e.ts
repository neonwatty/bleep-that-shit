/**
 * E2E Test for Cloud Transcription Flow
 *
 * Tests the full pipeline:
 * 1. Creates test user profile + project in Supabase
 * 2. Creates a job with a signed URL (using public test audio)
 * 3. Enqueues job to PGMQ
 * 4. Invokes Edge Function
 * 5. Polls for completion
 * 6. Verifies results in database
 *
 * Usage:
 *   doppler run -- npx tsx scripts/test-cloud-e2e.ts
 *
 * Environment vars (via Doppler):
 *   NEXT_PUBLIC_SUPABASE_URL
 *   SUPABASE_SERVICE_ROLE_KEY
 */

import { createClient } from '@supabase/supabase-js';

// Public domain test audio (must be accessible by Groq API - no redirects)
// Using direct URL from Internet Archive (redirects resolved)
const TEST_AUDIO_URL = 'https://ia800208.us.archive.org/14/items/testmp3testfile/mpthreetest.mp3';

async function main() {
  console.log('\n🧪 Cloud Transcription E2E Test\n');
  console.log('─'.repeat(50));

  // Get env vars
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!supabaseUrl || !serviceRoleKey) {
    console.error('❌ Missing required environment variables');
    console.error('   NEXT_PUBLIC_SUPABASE_URL:', supabaseUrl ? '✓' : '✗');
    console.error('   SUPABASE_SERVICE_ROLE_KEY:', serviceRoleKey ? '✓' : '✗');
    console.error('\n   Run with: doppler run -- npx tsx scripts/test-cloud-e2e.ts');
    process.exit(1);
  }

  // Create client with service role (bypasses RLS)
  const supabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false },
  });

  const testId = `test-${Date.now()}`;
  let actualUserId: string | null = null;

  try {
    // Step 1: Create test user via auth admin API
    console.log('\n1️⃣  Creating test user via auth admin...');
    const { data: authData, error: authError } = await supabase.auth.admin.createUser({
      email: `${testId}@test.local`,
      password: `test-password-${testId}`,
      email_confirm: true,
      user_metadata: {
        display_name: 'E2E Test User',
      },
    });

    if (authError || !authData.user) {
      throw new Error(`Failed to create auth user: ${authError?.message || 'Unknown error'}`);
    }
    actualUserId = authData.user.id;
    console.log(`   ✓ Auth user created: ${actualUserId.substring(0, 8)}...`);

    // Wait for profile to be created by trigger (if exists)
    await new Promise(r => setTimeout(r, 500));

    // Check if profile exists, if not create it
    const { data: existingProfile } = await supabase
      .from('profiles')
      .select('id')
      .eq('id', actualUserId)
      .single();

    if (!existingProfile) {
      console.log('   Creating profile manually...');
      const { error: profileError } = await supabase.from('profiles').insert({
        id: actualUserId,
        email: `${testId}@test.local`,
        display_name: 'E2E Test User',
        subscription_tier: 'free',
      });

      if (profileError) {
        throw new Error(`Failed to create profile: ${profileError.message}`);
      }
    }
    console.log(`   ✓ Profile ready`);

    // Step 2: Create test project
    console.log('\n2️⃣  Creating test project...');
    const projectId = crypto.randomUUID();
    const { error: projectError } = await supabase.from('projects').insert({
      id: projectId,
      user_id: actualUserId,
      title: `E2E Test Project ${testId}`,
      status: 'processing',
      original_file_path: 'test/jfk.wav', // Fake path, we'll use URL
    });

    if (projectError) {
      throw new Error(`Failed to create project: ${projectError.message}`);
    }
    console.log(`   ✓ Project created: ${projectId.substring(0, 8)}...`);

    // Step 3: Create job with the public audio URL
    console.log('\n3️⃣  Creating transcription job...');
    const jobId = crypto.randomUUID();
    const signedUrlExpiresAt = new Date(Date.now() + 3600 * 1000);

    const { error: jobError } = await supabase.from('jobs').insert({
      id: jobId,
      project_id: projectId,
      user_id: actualUserId,
      job_type: 'transcription',
      status: 'pending',
      input_file_path: 'test/jfk.wav',
      signed_url: TEST_AUDIO_URL,
      signed_url_expires_at: signedUrlExpiresAt.toISOString(),
      retry_count: 0,
    });

    if (jobError) {
      throw new Error(`Failed to create job: ${jobError.message}`);
    }
    console.log(`   ✓ Job created: ${jobId.substring(0, 8)}...`);

    // Step 4: Enqueue to PGMQ
    console.log('\n4️⃣  Enqueuing job to PGMQ...');
    const { data: msgId, error: queueError } = await supabase.rpc('pgmq_send', {
      queue_name: 'transcription_jobs',
      message: {
        job_id: jobId,
        project_id: projectId,
        signed_url: TEST_AUDIO_URL,
      },
    });

    if (queueError) {
      throw new Error(`Failed to enqueue job: ${queueError.message}`);
    }
    console.log(`   ✓ Enqueued with msg_id: ${msgId}`);

    // Step 5: Invoke Edge Function
    console.log('\n5️⃣  Invoking Edge Function...');
    const edgeFunctionUrl = `${supabaseUrl}/functions/v1/process-transcription`;

    const response = await fetch(edgeFunctionUrl, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${serviceRoleKey}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({}),
    });

    const responseText = await response.text();
    let result;
    try {
      result = JSON.parse(responseText);
    } catch {
      result = { raw: responseText };
    }

    console.log(`   Response status: ${response.status}`);
    console.log(`   Response:`, JSON.stringify(result, null, 2));

    if (!response.ok && !result.success) {
      // Check if error is due to GROQ_API_KEY not being set
      if (result.error?.includes('GROQ_API_KEY')) {
        console.log('\n⚠️  Edge Function needs GROQ_API_KEY secret');
        console.log('   Set it via: supabase secrets set GROQ_API_KEY=gsk_...');
      }
      throw new Error(`Edge Function error: ${result.error || response.statusText}`);
    }

    // Step 6: Verify results
    console.log('\n6️⃣  Verifying database results...');

    // Poll for job completion (max 30 seconds)
    let jobCompleted = false;
    const startPoll = Date.now();
    const pollTimeout = 30000;

    while (!jobCompleted && Date.now() - startPoll < pollTimeout) {
      const { data: job } = await supabase.from('jobs').select('*').eq('id', jobId).single();

      if (job?.status === 'completed') {
        jobCompleted = true;
        console.log(`   ✓ Job completed!`);
        console.log(`   - Processing time: ${job.processing_minutes?.toFixed(2)} minutes`);

        const outputData = job.output_data as { text?: string; words?: unknown[] } | null;
        console.log(`   - Word count: ${outputData?.words?.length || 0}`);
        console.log(`   - Transcript: "${outputData?.text?.substring(0, 100)}..."`);
      } else if (job?.status === 'failed') {
        throw new Error(`Job failed: ${job.error_message}`);
      } else {
        console.log(`   ... polling (status: ${job?.status})`);
        await new Promise(r => setTimeout(r, 2000));
      }
    }

    if (!jobCompleted) {
      throw new Error('Job did not complete within timeout');
    }

    // Verify project was updated
    const { data: project } = await supabase
      .from('projects')
      .select('*')
      .eq('id', projectId)
      .single();

    if (project?.status !== 'ready') {
      console.log(`   ⚠️  Project status is ${project?.status}, expected 'ready'`);
    } else {
      console.log(`   ✓ Project status updated to 'ready'`);
    }

    console.log('\n' + '─'.repeat(50));
    console.log('✅ E2E Test PASSED!\n');
  } catch (error) {
    console.error('\n❌ E2E Test FAILED:', error instanceof Error ? error.message : error);
    process.exit(1);
  } finally {
    // Cleanup: Delete test data
    console.log('\n🧹 Cleaning up test data...');

    if (actualUserId) {
      // Delete in order: jobs -> projects -> profiles (due to FK constraints)
      await supabase.from('jobs').delete().eq('user_id', actualUserId);
      await supabase.from('projects').delete().eq('user_id', actualUserId);
      await supabase.from('profiles').delete().eq('id', actualUserId);

      // Delete the auth user
      await supabase.auth.admin.deleteUser(actualUserId);

      console.log('   ✓ Test data cleaned up\n');
    } else {
      console.log('   ⚠️ No user to clean up\n');
    }
  }
}

main();
