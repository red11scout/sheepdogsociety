const ESV_API_BASE = "https://api.esv.org/v3/passage/text/";

type ESVResponse = {
  query: string;
  canonical: string;
  parsed: number[][];
  passage_meta: { canonical: string; chapter_start: number[] }[];
  passages: string[];
};

export async function getESVPassage(reference: string): Promise<{
  text: string;
  reference: string;
  copyright: string;
}> {
  const apiKey = process.env.ESV_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ESV_API_KEY not configured");
  }

  const params = new URLSearchParams({
    q: reference,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "true",
    "include-short-copyright": "true",
    "include-passage-references": "true",
  });

  const res = await fetch(`${ESV_API_BASE}?${params}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!res.ok) {
    throw new Error(`ESV API error: ${res.status}`);
  }

  const data: ESVResponse = await res.json();

  return {
    text: data.passages.join("\n\n"),
    reference: data.canonical,
    copyright: "Scripture quotations are from the ESV® Bible, copyright © 2001 by Crossway.",
  };
}

/**
 * Chapter text tuned for the public reader (Phase 3): verse markers in,
 * everything else out. The page renders its own heading and attribution,
 * so passage references and the inline "(ESV)" tag are disabled. The 24h
 * revalidate matches getESVPassage and stays within Crossway's terms for
 * attributed non-commercial use (re-verified at api.esv.org — see the
 * Phase 3 plan, Task 2 Step 5).
 */
export async function getESVChapterText(reference: string): Promise<string> {
  const apiKey = process.env.ESV_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ESV_API_KEY not configured");
  }

  const params = new URLSearchParams({
    q: reference,
    "include-headings": "false",
    "include-footnotes": "false",
    "include-verse-numbers": "true",
    "include-short-copyright": "false",
    "include-passage-references": "false",
  });

  const res = await fetch(`${ESV_API_BASE}?${params}`, {
    headers: {
      Authorization: `Token ${apiKey}`,
    },
    next: { revalidate: 86400 }, // Cache for 24 hours
  });

  if (!res.ok) {
    throw new Error(`ESV API error: ${res.status}`);
  }

  const data: ESVResponse = await res.json();
  const text = data.passages?.join("\n\n") ?? "";
  if (!text.trim()) {
    throw new Error(`ESV returned no passage for "${reference}"`);
  }
  return text;
}

export async function searchESV(query: string): Promise<{
  results: { reference: string; content: string }[];
}> {
  const apiKey = process.env.ESV_API_KEY?.trim();
  if (!apiKey) {
    throw new Error("ESV_API_KEY not configured");
  }

  const params = new URLSearchParams({
    q: query,
    "page-size": "20",
  });

  const res = await fetch(
    `https://api.esv.org/v3/passage/search/?${params}`,
    {
      headers: {
        Authorization: `Token ${apiKey}`,
      },
      next: { revalidate: 86400 },
    }
  );

  if (!res.ok) {
    throw new Error(`ESV search error: ${res.status}`);
  }

  const data = await res.json();

  return {
    results: (data.results ?? []).map(
      (r: { reference: string; content: string }) => ({
        reference: r.reference,
        content: r.content,
      })
    ),
  };
}
