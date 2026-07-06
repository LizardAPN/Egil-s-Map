import type { SupabaseClient } from "@supabase/supabase-js";

import type { Chapter, CreateChapterInput, Database } from "@imprint/types";

import { ApiError, toApiError } from "./errors";
import { mapChapterRow, type ChapterRow } from "./mappers";
import { slugifyChapterTitle, slugWithSuffix } from "./slugify";

type ChaptersClient = SupabaseClient<Database>;

const CHAPTER_COLUMNS =
  "id, user_id, slug, title, description, color, cover_url, started_at, ended_at, visibility, position, created_at, updated_at" as const;

function isUniqueViolation(error: { code?: string }): boolean {
  return error.code === "23505";
}

async function insertChapter(
  client: ChaptersClient,
  userId: string,
  slug: string,
  input: CreateChapterInput,
): Promise<ChapterRow> {
  const { data, error } = await client
    .from("chapters")
    .insert({
      user_id: userId,
      slug,
      title: input.title,
      color: input.color,
      started_at: input.startedAt ?? null,
      ended_at: input.endedAt ?? null,
    })
    .select(CHAPTER_COLUMNS)
    .single();

  if (error) {
    throw toApiError(error);
  }

  return data;
}

export async function createChapter(
  client: ChaptersClient,
  input: CreateChapterInput,
) {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    throw new ApiError("not_authenticated", "Not signed in");
  }

  const baseSlug = slugifyChapterTitle(input.title);

  let slug = baseSlug;

  for (let attempt = 0; attempt < 5; attempt += 1) {
    try {
      const row = await insertChapter(client, user.id, slug, input);
      return mapChapterRow(row);
    } catch (error) {
      if (error instanceof ApiError && isUniqueViolation(error) && attempt < 4) {
        slug = slugWithSuffix(baseSlug, attempt + 2);
        continue;
      }

      throw error;
    }
  }

  throw new ApiError("slug_exhausted", "Could not generate a unique chapter slug");
}

export async function listMine(client: ChaptersClient): Promise<Chapter[]> {
  const {
    data: { user },
    error: authError,
  } = await client.auth.getUser();

  if (authError) {
    throw toApiError(authError);
  }

  if (!user) {
    throw new ApiError("not_authenticated", "Not signed in");
  }

  const { data, error } = await client
    .from("chapters")
    .select(CHAPTER_COLUMNS)
    .eq("user_id", user.id)
    .order("position");

  if (error) {
    throw toApiError(error);
  }

  return data.map(mapChapterRow);
}
