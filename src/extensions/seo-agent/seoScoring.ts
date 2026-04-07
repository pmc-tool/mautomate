// SEO and AEO scoring utilities — pure functions, no Wasp dependencies

// ---------------------------------------------------------------------------
// Interfaces
// ---------------------------------------------------------------------------

export interface SeoScoreCriterion {
  name: string;
  score: number;       // points earned
  maxScore: number;    // max possible points
  passed: boolean;
  detail: string;      // human-readable explanation
}

export interface SeoScoreResult {
  total: number;       // 0-100
  breakdown: SeoScoreCriterion[];
}

export interface AeoScoreCriterion {
  name: string;
  score: number;
  maxScore: number;
  passed: boolean;
  detail: string;
}

export interface AeoScoreResult {
  total: number;
  breakdown: AeoScoreCriterion[];
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

/** Remove all HTML tags and return plain text. */
export function stripHtml(html: string): string {
  return html.replace(/<[^>]*>/g, ' ').replace(/\s+/g, ' ').trim();
}

/** Count words by splitting on whitespace. */
export function countWords(text: string): number {
  const trimmed = text.trim();
  if (trimmed.length === 0) return 0;
  return trimmed.split(/\s+/).length;
}

// ---------------------------------------------------------------------------
// calculateSeoScore
// ---------------------------------------------------------------------------

export function calculateSeoScore(data: {
  title: string;
  content: string;           // HTML content
  metaDescription?: string | null;
  slug?: string | null;
  primaryKeyword?: string | null;
  secondaryKeywords?: string[];
}): SeoScoreResult {
  const breakdown: SeoScoreCriterion[] = [];

  const plainContent = stripHtml(data.content);
  const totalWords = countWords(plainContent);
  const lowerContent = plainContent.toLowerCase();
  const lowerTitle = data.title.toLowerCase();
  const keyword = (data.primaryKeyword ?? '').toLowerCase().trim();
  const hasKeyword = keyword.length > 0;
  const metaDesc = (data.metaDescription ?? '').trim();
  const slug = (data.slug ?? '').toLowerCase().trim();
  const secondaryKeywords = (data.secondaryKeywords ?? []).map(k => k.toLowerCase().trim()).filter(Boolean);

  // 1. Keyword in title (10pts)
  {
    const found = hasKeyword && lowerTitle.includes(keyword);
    breakdown.push({
      name: 'Keyword in title',
      score: found ? 10 : 0,
      maxScore: 10,
      passed: found,
      detail: found
        ? `Primary keyword "${data.primaryKeyword}" found in title.`
        : hasKeyword
          ? `Primary keyword "${data.primaryKeyword}" not found in title.`
          : 'No primary keyword provided.',
    });
  }

  // 2. Keyword in first paragraph (8pts)
  {
    const first200 = lowerContent.slice(0, 200);
    const found = hasKeyword && first200.includes(keyword);
    breakdown.push({
      name: 'Keyword in first paragraph',
      score: found ? 8 : 0,
      maxScore: 8,
      passed: found,
      detail: found
        ? 'Primary keyword appears in the first 200 characters.'
        : hasKeyword
          ? 'Primary keyword not found in the first 200 characters of content.'
          : 'No primary keyword provided.',
    });
  }

  // 3. Keyword in meta description (7pts)
  {
    const found = hasKeyword && metaDesc.toLowerCase().includes(keyword);
    breakdown.push({
      name: 'Keyword in meta description',
      score: found ? 7 : 0,
      maxScore: 7,
      passed: found,
      detail: found
        ? 'Primary keyword found in meta description.'
        : hasKeyword
          ? 'Primary keyword not found in meta description.'
          : 'No primary keyword provided.',
    });
  }

  // 4. Keyword in slug (5pts)
  {
    const found = hasKeyword && slug.includes(keyword.replace(/\s+/g, '-'));
    breakdown.push({
      name: 'Keyword in slug',
      score: found ? 5 : 0,
      maxScore: 5,
      passed: found,
      detail: found
        ? 'Primary keyword found in slug.'
        : hasKeyword
          ? 'Primary keyword not found in slug.'
          : 'No primary keyword provided.',
    });
  }

  // 5. Meta description length (7pts)
  {
    const len = metaDesc.length;
    const good = len >= 120 && len <= 160;
    breakdown.push({
      name: 'Meta description length',
      score: good ? 7 : 0,
      maxScore: 7,
      passed: good,
      detail: good
        ? `Meta description is ${len} characters (ideal: 120-160).`
        : len === 0
          ? 'No meta description provided.'
          : `Meta description is ${len} characters (should be 120-160).`,
    });
  }

  // 6. Title length (5pts)
  {
    const len = data.title.trim().length;
    const good = len >= 30 && len <= 70;
    breakdown.push({
      name: 'Title length',
      score: good ? 5 : 0,
      maxScore: 5,
      passed: good,
      detail: good
        ? `Title is ${len} characters (ideal: 30-70).`
        : `Title is ${len} characters (should be 30-70).`,
    });
  }

  // 7. Keyword density (8pts)
  {
    let score = 0;
    let detail = '';
    if (!hasKeyword || totalWords === 0) {
      detail = hasKeyword ? 'Content has no words.' : 'No primary keyword provided.';
    } else {
      // Count keyword occurrences (the keyword may be multi-word)
      const keywordWords = countWords(keyword);
      const regex = new RegExp(keyword.replace(/[.*+?^${}()|[\]\\]/g, '\\$&'), 'gi');
      const matches = plainContent.match(regex);
      const occurrences = matches ? matches.length : 0;
      const density = (occurrences * keywordWords) / totalWords * 100;
      const good = density >= 1 && density <= 3;
      score = good ? 8 : 0;
      detail = good
        ? `Keyword density is ${density.toFixed(1)}% (ideal: 1-3%).`
        : `Keyword density is ${density.toFixed(1)}% (should be 1-3%).`;
    }
    breakdown.push({
      name: 'Keyword density',
      score,
      maxScore: 8,
      passed: score > 0,
      detail,
    });
  }

  // 8. Content length (8pts)
  {
    let score = 0;
    if (totalWords >= 800) {
      score = 8;
    } else if (totalWords >= 300) {
      score = 4;
    }
    breakdown.push({
      name: 'Content length',
      score,
      maxScore: 8,
      passed: score === 8,
      detail: totalWords >= 800
        ? `Content is ${totalWords} words (800+ recommended).`
        : totalWords >= 300
          ? `Content is ${totalWords} words — partial credit (300+). Aim for 800+.`
          : `Content is ${totalWords} words (should be at least 300, ideally 800+).`,
    });
  }

  // 9. Subheadings present (7pts)
  {
    const subheadingMatches = data.content.match(/<h[23][^>]*>/gi);
    const count = subheadingMatches ? subheadingMatches.length : 0;
    const good = count >= 2;
    breakdown.push({
      name: 'Subheadings present',
      score: good ? 7 : 0,
      maxScore: 7,
      passed: good,
      detail: good
        ? `Found ${count} subheadings (H2/H3).`
        : `Found ${count} subheading(s) — need at least 2 H2/H3 tags.`,
    });
  }

  // 10. Keyword in subheading (5pts)
  {
    const subheadingRegex = /<h[23][^>]*>([\s\S]*?)<\/h[23]>/gi;
    let found = false;
    if (hasKeyword) {
      let match: RegExpExecArray | null;
      while ((match = subheadingRegex.exec(data.content)) !== null) {
        const headingText = stripHtml(match[1]).toLowerCase();
        if (headingText.includes(keyword)) {
          found = true;
          break;
        }
      }
    }
    breakdown.push({
      name: 'Keyword in subheading',
      score: found ? 5 : 0,
      maxScore: 5,
      passed: found,
      detail: found
        ? 'Primary keyword found in at least one subheading.'
        : hasKeyword
          ? 'Primary keyword not found in any H2/H3 subheading.'
          : 'No primary keyword provided.',
    });
  }

  // 10b. Heading hierarchy check (3pts bonus)
  {
    const h1Count = (data.content.match(/<h1[^>]*>/gi) || []).length;
    const h2Count = (data.content.match(/<h2[^>]*>/gi) || []).length;
    const h3Count = (data.content.match(/<h3[^>]*>/gi) || []).length;
    const goodH1 = h1Count <= 1; // 0 or 1 H1 is fine (title usually serves as H1)
    const goodStructure = h2Count >= 1 && (h3Count === 0 || h2Count >= 1);
    const score = (goodH1 ? 2 : 0) + (goodStructure ? 1 : 0);
    breakdown.push({
      name: 'Heading hierarchy',
      score,
      maxScore: 3,
      passed: score >= 2,
      detail: `H1: ${h1Count}, H2: ${h2Count}, H3: ${h3Count}.${
        h1Count > 1 ? ' Multiple H1 tags found — use only one.' : ''
      }${h2Count === 0 ? ' Add H2 headings to structure content.' : ''}`,
    });
  }

  // 11. Links — internal vs external (5pts)
  {
    const linkMatches = data.content.match(/<a\s[^>]*href\s*=\s*"([^"]*)"/gi) || [];
    const totalLinks = linkMatches.length;
    const externalLinks = linkMatches.filter((l: string) => /https?:\/\//i.test(l)).length;
    const internalLinks = totalLinks - externalLinks;
    const hasInternal = internalLinks >= 1 || totalLinks >= 2;
    const hasExternal = externalLinks >= 1;
    const score = (hasInternal ? 3 : 0) + (hasExternal ? 2 : 0);
    breakdown.push({
      name: 'Links (internal + external)',
      score,
      maxScore: 5,
      passed: score >= 3,
      detail: `${internalLinks} internal link(s), ${externalLinks} external link(s). ${
        !hasInternal ? 'Add internal links to related pages. ' : ''
      }${!hasExternal ? 'Add external links to authoritative sources.' : ''}`.trim() || 'Good link structure.',
    });
  }

  // 12. Image alt text with keyword (5pts)
  {
    const imgWithAlt = data.content.match(/<img\s[^>]*alt\s*=\s*"([^"]*)"/gi) || [];
    const count = imgWithAlt.length;
    const hasAlt = count >= 1;
    const kwInAlt = hasKeyword && imgWithAlt.some((match: string) => {
      const alt = match.match(/alt\s*=\s*"([^"]*)"/i)?.[1] || '';
      return alt.toLowerCase().includes(keyword);
    });
    const score = (hasAlt ? 3 : 0) + (kwInAlt ? 2 : 0);
    breakdown.push({
      name: 'Image optimization',
      score,
      maxScore: 5,
      passed: score >= 3,
      detail: hasAlt
        ? `${count} image(s) with alt text.${kwInAlt ? ' Keyword found in alt text.' : ' Add primary keyword to image alt text.'}`
        : 'No images with alt text found — add at least one image with descriptive alt text.',
    });
  }

  // 13. Readability — Flesch Reading Ease (10pts)
  {
    let score = 0;
    let detail = '';
    if (totalWords === 0) {
      detail = 'Content has no words to assess readability.';
    } else {
      // Count sentences
      const sentenceEnders = plainContent.match(/[.!?]+/g);
      const sentenceCount = Math.max(sentenceEnders ? sentenceEnders.length : 1, 1);
      const avgSentenceLength = totalWords / sentenceCount;

      // Estimate syllables (English approximation)
      const syllableCount = plainContent.toLowerCase().split(/\s+/).reduce((sum: number, word: string) => {
        const w = word.replace(/[^a-z]/g, '');
        if (w.length <= 3) return sum + 1;
        let syllables = w.replace(/(?:[^laeiouy]es|ed|[^laeiouy]e)$/, '').match(/[aeiouy]{1,2}/g);
        return sum + Math.max(syllables ? syllables.length : 1, 1);
      }, 0);
      const avgSyllablesPerWord = syllableCount / Math.max(totalWords, 1);

      // Flesch Reading Ease = 206.835 - 1.015 * ASL - 84.6 * ASW
      const flesch = Math.round(206.835 - (1.015 * avgSentenceLength) - (84.6 * avgSyllablesPerWord));
      const clampedFlesch = Math.max(0, Math.min(100, flesch));

      // Score: 60+ is good (8-10 pts), 40-59 is OK (4-7 pts), <40 is hard (0-3 pts)
      if (clampedFlesch >= 60) {
        score = 10;
        detail = `Flesch Reading Ease: ${clampedFlesch} (easy to read). Avg sentence: ${avgSentenceLength.toFixed(0)} words.`;
      } else if (clampedFlesch >= 40) {
        score = 5;
        detail = `Flesch Reading Ease: ${clampedFlesch} (fairly difficult). Simplify sentences — avg ${avgSentenceLength.toFixed(0)} words per sentence.`;
      } else {
        score = 2;
        detail = `Flesch Reading Ease: ${clampedFlesch} (very difficult). Use shorter sentences and simpler words — avg ${avgSentenceLength.toFixed(0)} words per sentence.`;
      }
    }
    breakdown.push({
      name: 'Readability (Flesch)',
      score,
      maxScore: 10,
      passed: score >= 5,
      detail,
    });
  }

  // 14. Secondary keywords used (10pts)
  {
    let score = 0;
    let detail = '';
    if (secondaryKeywords.length === 0) {
      detail = 'No secondary keywords provided.';
    } else {
      const found = secondaryKeywords.filter(kw => lowerContent.includes(kw));
      const good = found.length >= 2;
      score = good ? 10 : 0;
      detail = good
        ? `${found.length} of ${secondaryKeywords.length} secondary keywords found in content.`
        : `Only ${found.length} of ${secondaryKeywords.length} secondary keywords found — use at least 2.`;
    }
    breakdown.push({
      name: 'Secondary keywords used',
      score,
      maxScore: 10,
      passed: score > 0,
      detail,
    });
  }

  const total = breakdown.reduce((sum, c) => sum + c.score, 0);

  return { total, breakdown };
}

// ---------------------------------------------------------------------------
// calculateAeoScore
// ---------------------------------------------------------------------------

export function calculateAeoScore(data: {
  content: string;
  faqSchema?: any[];       // array of {question, answer}
  title: string;
  metaDescription?: string | null;
}): AeoScoreResult {
  const breakdown: AeoScoreCriterion[] = [];

  const plainContent = stripHtml(data.content);
  const lowerContent = plainContent.toLowerCase();

  // 1. FAQ Schema present (20pts)
  {
    const faqCount = (data.faqSchema ?? []).length;
    const good = faqCount >= 3;
    breakdown.push({
      name: 'FAQ Schema present',
      score: good ? 20 : 0,
      maxScore: 20,
      passed: good,
      detail: good
        ? `FAQ schema has ${faqCount} items (3+ required).`
        : `FAQ schema has ${faqCount} item(s) — need at least 3.`,
    });
  }

  // 2. Question-answer format (15pts)
  {
    // Look for question marks in the content. A "question followed by answer"
    // is approximated as a '?' that is not at the very end of the content
    // (i.e., there is text after it).
    const questionMarks = plainContent.match(/\?/g);
    const qCount = questionMarks ? questionMarks.length : 0;
    const good = qCount >= 3;
    breakdown.push({
      name: 'Question-answer format',
      score: good ? 15 : 0,
      maxScore: 15,
      passed: good,
      detail: good
        ? `Content contains ${qCount} questions in Q&A format.`
        : `Content contains ${qCount} question(s) — use at least 3 for Q&A format.`,
    });
  }

  // 3. Featured snippet eligibility (15pts)
  {
    // Check if there is a short paragraph (under 50 words) following a question mark.
    // We look for patterns like: "question? <answer paragraph under 50 words>"
    // Split content by question marks, check if the text after any '?' starts with
    // a concise paragraph.
    const segments = plainContent.split('?');
    let eligible = false;
    for (let i = 0; i < segments.length - 1; i++) {
      const afterQuestion = segments[i + 1].trim();
      // Take the first sentence or paragraph (up to the next question or period cluster)
      const firstParagraph = afterQuestion.split(/[.!?]\s/)[0]?.trim() ?? '';
      if (firstParagraph.length > 0 && countWords(firstParagraph) <= 50) {
        eligible = true;
        break;
      }
    }
    breakdown.push({
      name: 'Featured snippet eligibility',
      score: eligible ? 15 : 0,
      maxScore: 15,
      passed: eligible,
      detail: eligible
        ? 'Content has concise answer paragraphs suitable for featured snippets.'
        : 'No short definition-style answers found after questions — add concise answers (under 50 words).',
    });
  }

  // 4. Structured data signals (10pts)
  {
    const hasLists = /<(ul|ol)[^>]*>/i.test(data.content);
    const hasTables = /<table[^>]*>/i.test(data.content);
    const score = hasLists && hasTables ? 10 : hasLists || hasTables ? 5 : 0;
    const parts: string[] = [];
    if (hasLists) parts.push('lists');
    if (hasTables) parts.push('tables');
    breakdown.push({
      name: 'Structured data signals',
      score,
      maxScore: 10,
      passed: score === 10,
      detail: parts.length > 0
        ? `Content uses ${parts.join(' and ')}${score < 10 ? ' — add both lists and tables for full score.' : '.'}`
        : 'No lists or tables found — add structured elements for better AI discoverability.',
    });
  }

  // 5. Direct answer pattern (10pts)
  {
    // First paragraph: text before the first major break
    const firstParagraph = plainContent.split(/\n|\. {2,}/)[0]?.trim() ?? '';
    const wordCount = countWords(firstParagraph);
    const good = wordCount > 0 && wordCount <= 50;
    breakdown.push({
      name: 'Direct answer pattern',
      score: good ? 10 : 0,
      maxScore: 10,
      passed: good,
      detail: good
        ? `First paragraph is ${wordCount} words (concise direct answer pattern).`
        : wordCount === 0
          ? 'Content appears empty.'
          : `First paragraph is ${wordCount} words — keep it under 50 for a direct answer pattern.`,
    });
  }

  // 6. How-to format (10pts)
  {
    const hasOrderedList = /<ol[^>]*>/i.test(data.content);
    // Also check for numbered steps like "1." "2." etc in plain text
    const numberedSteps = plainContent.match(/^\s*\d+\.\s/gm);
    const hasSteps = hasOrderedList || (numberedSteps !== null && numberedSteps.length >= 2);
    breakdown.push({
      name: 'How-to format',
      score: hasSteps ? 10 : 0,
      maxScore: 10,
      passed: hasSteps,
      detail: hasSteps
        ? 'Content uses numbered steps or ordered lists (how-to format detected).'
        : 'No numbered steps or ordered lists found — add how-to style formatting.',
    });
  }

  // 7. Conversational keywords (10pts)
  {
    const conversationalWords = ['who', 'what', 'when', 'where', 'why', 'how'];
    const found = conversationalWords.filter(w => {
      // Match as whole word (word boundary)
      const regex = new RegExp(`\\b${w}\\b`, 'i');
      return regex.test(lowerContent);
    });
    const good = found.length >= 3;
    breakdown.push({
      name: 'Conversational keywords',
      score: good ? 10 : 0,
      maxScore: 10,
      passed: good,
      detail: good
        ? `Found ${found.length} conversational keywords: ${found.join(', ')}.`
        : `Found ${found.length} conversational keyword(s) (${found.join(', ') || 'none'}) — use at least 3 of who/what/when/where/why/how.`,
    });
  }

  // 8. Content freshness signals (10pts)
  {
    // Look for years (4-digit numbers starting with 19 or 20), dates, and numbers
    const yearPattern = /\b(19|20)\d{2}\b/;
    const datePattern = /\b\d{1,2}[\/\-]\d{1,2}[\/\-]\d{2,4}\b/;
    const numberPattern = /\b\d{2,}\b/;

    const hasYear = yearPattern.test(plainContent);
    const hasDate = datePattern.test(plainContent);
    const hasNumbers = numberPattern.test(plainContent);

    const signals = [hasYear, hasDate, hasNumbers].filter(Boolean).length;
    const good = signals >= 1;
    breakdown.push({
      name: 'Content freshness signals',
      score: good ? 10 : 0,
      maxScore: 10,
      passed: good,
      detail: good
        ? `Content includes freshness signals (${[hasYear && 'years', hasDate && 'dates', hasNumbers && 'numbers'].filter(Boolean).join(', ')}).`
        : 'No dates, years, or numeric data found — add freshness signals for better AI relevance.',
    });
  }

  const total = breakdown.reduce((sum, c) => sum + c.score, 0);

  return { total, breakdown };
}
