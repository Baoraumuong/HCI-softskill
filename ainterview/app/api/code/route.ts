import { NextRequest, NextResponse } from 'next/server';

const JUDGE0_URL = 'https://ce.judge0.com';

// Free-tier headers (no API key needed for public CE)
const headers = {
  'Content-Type': 'application/json',
  'X-Requested-With': 'XMLHttpRequest', // Helps bypass some CORS on public CE
};

async function pollSubmission(token: string, maxRetries = 12, delay = 1000) {
  for (let i = 0; i < maxRetries; i++) {
    await new Promise((res) => setTimeout(res, delay));
    
    const res = await fetch(`${JUDGE0_URL}/submissions/${token}?base64_encoded=false`, { headers });
    
    if (res.status === 429) {
      throw new Error('RATE_LIMITED: Too many submissions. Please wait a moment.');
    }
    
    const data = await res.json();
    if (data.status && data.status.id > 2) {
      return {
        status: data.status.id,
        stdout: data.stdout,
        stderr: data.stderr,
        time: data.time,
        memory: data.memory,
        compile_output: data.compile_output,
      };
    }
  }
  throw new Error('EXECUTION_TIMEOUT: Judge0 is taking too long. Try a simpler solution.');
}

export async function POST(req: NextRequest) {
  try {
    const { code, language_id, test_cases } = await req.json();

    if (!code || !language_id) {
      return NextResponse.json({ error: 'Missing code or language_id' }, { status: 400 });
    }

    const testCase = test_cases?.[0];
    const stdin = testCase?.input || '';
    const expectedOutput = testCase?.output?.trim() || '';

    const createRes = await fetch(`${JUDGE0_URL}/submissions?base64_encoded=false&wait=false`, {
      method: 'POST',
      headers,
      body: JSON.stringify({
        source_code: code,
        language_id,
        stdin,
        cpu_time_limit: 2,
        memory_limit: 128000,
        // ✅ Tell Judge0 to compare stdout for you
        expected_output: expectedOutput,
      }),
    });

    if (createRes.status === 429) {
      return NextResponse.json({ error: 'RATE_LIMITED: Please wait 10 seconds before retrying.' }, { status: 429 });
    }

    if (!createRes.ok) {
      const err = await createRes.json();
      return NextResponse.json({ error: err.error || 'Failed to queue submission' }, { status: 500 });
    }

    const { token } = await createRes.json();
    const result = await pollSubmission(token);

    return NextResponse.json(result);
  } catch (error) {
    const msg = error instanceof Error ? error.message : 'Internal server error';
    return NextResponse.json({ error: msg }, { status: 500 });
  }
}