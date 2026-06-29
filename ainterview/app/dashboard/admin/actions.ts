"use server";

import { revalidatePath } from "next/cache";
import { createSupabaseServerClient } from "@/app/lib/supabase/server-client";
import type { Database } from "@/database.types";

type DifficultyLevel = Database["public"]["Enums"]["difficulty_level"];

const DIFFICULTY_LEVELS = ["easy", "medium", "hard"] as const satisfies readonly DifficultyLevel[];

async function requireAdmin() {
  const supabase = await createSupabaseServerClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) throw new Error("Unauthorized");

  const { data: profile } = await supabase
    .from("users")
    .select("role")
    .eq("user_id", user.id)
    .single();

  if (profile?.role !== "admin") throw new Error("Admin access required");
  return supabase;
}

function requiredString(formData: FormData, key: string) {
  const value = String(formData.get(key) ?? "").trim();
  if (!value) throw new Error(`${key} is required`);
  return value;
}

function requiredDifficulty(formData: FormData): DifficultyLevel {
  const value = requiredString(formData, "difficulty").toLowerCase();

  if (!DIFFICULTY_LEVELS.includes(value as DifficultyLevel)) {
    throw new Error("difficulty must be easy, medium, or hard");
  }

  return value as DifficultyLevel;
}

export async function createCodingProblem(formData: FormData) {
  const supabase = await requireAdmin();
  const title = requiredString(formData, "title");
  const description = requiredString(formData, "description");
  const difficulty = requiredDifficulty(formData);
  const languages = requiredString(formData, "languages")
    .split(",")
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
  const testcasesRaw = String(formData.get("testcases") ?? "[]").trim();

  let testcases: { input: string; output: string; is_public?: boolean }[];
  try {
    testcases = JSON.parse(testcasesRaw);
  } catch {
    throw new Error("Test cases must be valid JSON.");
  }

  if (!Array.isArray(testcases) || testcases.length === 0) {
    throw new Error("Add at least one test case.");
  }

  const { data: problem, error: problemError } = await supabase
    .from("problems")
    .insert({ title, description, difficulty, languages })
    .select("problem_id")
    .single();

  if (problemError) throw new Error(problemError.message);

  const { error: testcaseError } = await supabase.from("testcases").insert(
    testcases.map((testcase) => ({
      problem_id: problem.problem_id,
      input: String(testcase.input ?? ""),
      output: String(testcase.output ?? ""),
      is_public: Boolean(testcase.is_public),
    })),
  );

  if (testcaseError) throw new Error(testcaseError.message);
  revalidatePath("/dashboard/admin");
}

export async function updateAccountRequest(formData: FormData) {
  const supabase = await requireAdmin();
  const requestId = requiredString(formData, "request_id");
  const status = requiredString(formData, "status") as "open" | "reviewing" | "approved" | "rejected";
  const userId = String(formData.get("user_id") ?? "").trim();

  const { error } = await supabase
    .from("account_requests")
    .update({
      status,
      resolved_at: status === "approved" || status === "rejected" ? new Date().toISOString() : null,
    })
    .eq("request_id", requestId);

  if (error) throw new Error(error.message);

  if (status === "approved" && userId) {
    const { error: userError } = await supabase
      .from("users")
      .update({ account_plan: "plus" })
      .eq("user_id", userId);

    if (userError) throw new Error(userError.message);
  }

  revalidatePath("/dashboard/admin");
}

export async function setUserPlan(formData: FormData) {
  const supabase = await requireAdmin();
  const userId = requiredString(formData, "user_id");
  const accountPlan = requiredString(formData, "account_plan") as "normal" | "plus";

  const { error } = await supabase
    .from("users")
    .update({ account_plan: accountPlan })
    .eq("user_id", userId);

  if (error) throw new Error(error.message);
  revalidatePath("/dashboard/admin");
}
