'use client';

import { useState, useEffect } from 'react';
import { createClient } from '@/utils/supabase/client';

// Update the interface to match the `problems` and `testcases` tables
interface TestCase {
  input: string;
  output: string; // The database column is 'output', not 'expected'
}

interface Question {
  problem_id: string; // Database uses problem_id
  title: string;
  description: string;
  languages: string[]; // Database stores an array of languages
  test_cases: TestCase[];
}

interface ExecutionResult {
  status: number;
  stdout: string | null;
  stderr: string | null;
  time: string | null;
  memory: string | null;
}

const LANGUAGE_MAP: Record<string, number> = {
  python: 71,
  javascript: 63,
  java: 62,
  cpp: 54,
  c: 50,
};

export default function InterviewPage() {
  const [question, setQuestion] = useState<Question | null>(null);
  // Default to the first language in the array, or Python if none
  const [selectedLanguage, setSelectedLanguage] = useState<string>('python');
  const [code, setCode] = useState('# Write your solution here\n');
  const [result, setResult] = useState<ExecutionResult | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [cooldown, setCooldown] = useState(false);
  
  // Initialize Supabase client
  const supabase = createClient();

  useEffect(() => {
    const fetchQuestion = async () => {
      try {
        // 1. Fetch the problem from the pluralized 'problems' table
        const { data: problemData, error: problemError } = await supabase
          .from('problems')
          .select('*')
          .limit(1)
          .single(); // We expect just one for this test

        if (problemError) throw problemError;
        if (!problemData) throw new Error('No questions available in database.');

        // 2. Fetch the associated test cases
        const { data: testCasesData, error: testCasesError } = await supabase
          .from('testcases')
          .select('input, output')
          .eq('problem_id', problemData.problem_id);

        if (testCasesError) throw testCasesError;

        // 3. Combine them to match our interface
        const fullQuestion: Question = {
          ...problemData,
          test_cases: testCasesData || [],
        };

        setQuestion(fullQuestion);
        
        // Set initial language based on what the problem supports
        const initialLang = fullQuestion.languages && fullQuestion.languages.length > 0 
          ? fullQuestion.languages[0] 
          : 'python';
          
        setSelectedLanguage(initialLang);
        setCode(getDefaultCode(initialLang));
        
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Failed to load question');
      }
    };
    fetchQuestion();
  }, []); // Note: In a real app, you might want to pass supabase down or handle dependency warnings

  const getDefaultCode = (lang: string) => {
    switch (lang.toLowerCase()) {
      case 'python': return 'def solution():\n    pass\n';
      case 'javascript': case 'typescript': return 'function solution() {\n    // your code\n}\n';
      case 'cpp': case 'c': return '#include <iostream>\nusing namespace std;\n\nint main() {\n    return 0;\n}\n';
      default: return '// Write your code here\n';
    }
  };

  const handleLanguageChange = (lang: string) => {
    setSelectedLanguage(lang);
    setCode(getDefaultCode(lang));
  };

  const handleSubmit = async () => {
    if (!question || loading || cooldown) return;
    
    setLoading(true);
    setError(null);
    setResult(null);
    setCooldown(true);

    try {
      const languageId = LANGUAGE_MAP[selectedLanguage.toLowerCase()];
      if (!languageId) throw new Error(`Unsupported language: ${selectedLanguage}`);

      const res = await fetch('/api/submit', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code,
          language_id: languageId,
          test_cases: question.test_cases || [],
        }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error || 'Submission failed');

      setResult(data);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
      setTimeout(() => setCooldown(false), 15000);
    }
  };

  if (error && !question) {
    return <div className="p-8 text-center text-red-600 bg-red-50 rounded-lg">{error}</div>;
  }

  if (!question) {
    return <div className="p-8 text-center animate-pulse">Loading question...</div>;
  }

  return (
    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
      {/* Question & Editor */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h2 className="text-2xl font-bold mb-2">{question.title}</h2>
          <p className="text-gray-600 whitespace-pre-wrap text-sm leading-relaxed">{question.description}</p>
          
          <div className="mt-4">
            <label className="text-sm font-semibold text-gray-700 mr-2">Language:</label>
            <select 
              value={selectedLanguage}
              onChange={(e) => handleLanguageChange(e.target.value)}
              className="px-3 py-1 text-sm border rounded bg-gray-50 focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              {question.languages?.map(lang => (
                <option key={lang} value={lang}>{lang}</option>
              ))}
            </select>
          </div>
        </div>

        <div className="bg-gray-900 rounded-xl shadow-sm overflow-hidden">
          <textarea
            value={code}
            onChange={(e) => setCode(e.target.value)}
            className="w-full h-80 p-4 font-mono text-sm text-green-400 bg-transparent resize-none focus:outline-none"
            spellCheck={false}
            aria-label="Code editor"
          />
        </div>
      </div>

      {/* Test Cases & Output */}
      <div className="space-y-4">
        <div className="bg-white p-5 rounded-xl shadow-sm border">
          <h3 className="font-semibold mb-3">Test Cases</h3>
          <div className="space-y-2">
            {question.test_cases?.map((tc, i) => (
              <div key={i} className="bg-gray-50 p-3 rounded text-sm font-mono">
                <div className="text-gray-500">Input:</div>
                <pre className="whitespace-pre-wrap">{tc.input}</pre>
                <div className="text-gray-500 mt-2">Expected Output:</div>
                <pre className="whitespace-pre-wrap text-green-600">{tc.output}</pre>
              </div>
            ))}
            {(!question.test_cases || question.test_cases.length === 0) && (
               <div className="text-sm text-gray-500">No test cases available for this problem.</div>
            )}
          </div>
        </div>

        <button
          onClick={handleSubmit}
          disabled={loading || cooldown}
          className={`w-full py-3 font-medium rounded-lg transition active:scale-[0.98] 
            ${loading || cooldown ? 'bg-gray-400 text-gray-200 cursor-not-allowed' : 'bg-blue-600 text-white hover:bg-blue-700'}`}
        >
          {loading ? '⏳ Running...' : cooldown ? '⏳ Cooldown (15s)' : '🚀 Submit Code'}
        </button>

        {result && (
          <div className={`p-4 rounded-xl border ${result.status === 3 ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <h3 className="font-semibold mb-2">Execution Result</h3>
            <div className="space-y-1 text-sm">
              <p><span className="font-medium">Status:</span> {result.status === 3 ? '✅ Accepted' : `❌ Status ID ${result.status}`}</p>
              {result.stdout && <p><span className="font-medium">Output:</span> <pre className="inline font-mono bg-white px-2 rounded">{result.stdout.trim()}</pre></p>}
              {result.stderr && <p className="text-red-600"><span className="font-medium">Error:</span> <pre className="inline font-mono bg-white px-2 rounded">{result.stderr.trim()}</pre></p>}
              {result.time && <p><span className="font-medium">Time:</span> {result.time}s</p>}
              {result.memory && <p><span className="font-medium">Memory:</span> {result.memory} KB</p>}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}