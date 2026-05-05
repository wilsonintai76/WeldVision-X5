/**
 * Workers AI - Weld Image Evaluation
 *
 * Uses @cf/unum/uform-gen2-qwen-500m (lightweight vision-language model)
 * on the free tier to analyze weld images and detect defects.
 *
 * Free tier: ~10,000 neurons/day
 */

export interface WeldEvaluation {
  overall_quality: number;       // 1–5 Likert scale
  defects_detected: string[];    // list of defect type names
  porosity_count: number;
  spatter_count: number;
  crack_count: number;
  burn_through_count: number;
  slag_inclusion_count: number;
  undercut_present: boolean;
  bead_uniformity: number;       // 1–5
  visual_score: number;          // 0–100 derived score
  confidence: number;            // 0–1
  description: string;
  raw_response: string;
}

const WELD_EVAL_PROMPT = `You are a certified welding quality inspector (ISO 5817).
Analyze the welding image carefully and count all visible defects.

Respond with ONLY a JSON object in exactly this format, no extra text:
{
  "porosity_count": <integer, holes/pores in weld>,
  "spatter_count": <integer, metal droplets around weld>,
  "crack_count": <integer, visible cracks>,
  "burn_through_count": <integer, holes burned through base metal>,
  "slag_inclusion_count": <integer, trapped slag>,
  "undercut_present": <true/false, groove at weld toe>,
  "bead_uniformity": <1-5, 5=very uniform>,
  "overall_quality": <1-5, based on ISO 5817 where 5=excellent>,
  "description": "<one sentence assessment>"
}`;

export async function evaluateWeldImage(
  ai: Ai,
  imageBuffer: ArrayBuffer
): Promise<WeldEvaluation> {
  const imageArray = [...new Uint8Array(imageBuffer)];

  try {
    const response = await (ai.run as Function)('@cf/unum/uform-gen2-qwen-500m', {
      image: imageArray,
      prompt: WELD_EVAL_PROMPT,
      max_tokens: 300,
    }) as { description?: string };

    const rawText = (response.description ?? '').trim();
    return parseAIResponse(rawText);
  } catch (err) {
    console.error('[AI] evaluateWeldImage failed:', err);
    return fallbackEvaluation(String(err));
  }
}

function parseAIResponse(rawText: string): WeldEvaluation {
  // Extract JSON block from response (model may include surrounding text)
  const jsonMatch = rawText.match(/\{[\s\S]*\}/);
  if (!jsonMatch) return fallbackEvaluation(rawText);

  try {
    const p = JSON.parse(jsonMatch[0]) as Record<string, unknown>;

    const porosity = clampInt(p.porosity_count, 0);
    const spatter = clampInt(p.spatter_count, 0);
    const crack = clampInt(p.crack_count, 0);
    const burnThrough = clampInt(p.burn_through_count, 0);
    const slag = clampInt(p.slag_inclusion_count, 0);
    const undercutPresent = Boolean(p.undercut_present);

    const defects: string[] = [];
    if (porosity > 0) defects.push('porosity');
    if (spatter > 0) defects.push('spatter');
    if (crack > 0) defects.push('crack');
    if (burnThrough > 0) defects.push('burn_through');
    if (slag > 0) defects.push('slag_inclusion');
    if (undercutPresent) defects.push('undercut');

    const totalDefects = porosity + spatter + crack + burnThrough + slag;
    const visualScore = Math.max(0, Math.min(100, 100 - totalDefects * 8 - (undercutPresent ? 10 : 0)));

    return {
      overall_quality: clampInt(p.overall_quality, 3, 1, 5),
      defects_detected: defects,
      porosity_count: porosity,
      spatter_count: spatter,
      crack_count: crack,
      burn_through_count: burnThrough,
      slag_inclusion_count: slag,
      undercut_present: undercutPresent,
      bead_uniformity: clampInt(p.bead_uniformity, 3, 1, 5),
      visual_score: visualScore,
      confidence: 0.75,
      description: String(p.description ?? ''),
      raw_response: rawText,
    };
  } catch {
    return fallbackEvaluation(rawText);
  }
}

function fallbackEvaluation(reason: string): WeldEvaluation {
  return {
    overall_quality: 3,
    defects_detected: [],
    porosity_count: 0,
    spatter_count: 0,
    crack_count: 0,
    burn_through_count: 0,
    slag_inclusion_count: 0,
    undercut_present: false,
    bead_uniformity: 3,
    visual_score: 50,
    confidence: 0,
    description: 'AI evaluation unavailable',
    raw_response: reason,
  };
}

function clampInt(val: unknown, fallback: number, min = 0, max = 999): number {
  const n = parseInt(String(val), 10);
  if (isNaN(n)) return fallback;
  return Math.max(min, Math.min(max, n));
}
