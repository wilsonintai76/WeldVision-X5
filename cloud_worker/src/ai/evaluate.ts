/**
 * Workers AI - Weld Image Evaluation
 *
 * Uses @cf/unum/uform-gen2-qwen-500m (lightweight vision-language model)
 * on the free tier to analyze weld images and detect defects.
 *
 * Free tier: ~10,000 neurons/day
 */

export interface WeldEvaluation {
  overall_quality: number;                  // 1–5 Likert scale
  defects_detected: string[];               // list of defect type names
  porosity_count: number;
  spatter_count: number;
  undercut_present: boolean;
  severe_craters_count: number;
  lack_of_fusion_present: boolean;
  excessive_reinforcement_present: boolean;
  weld_bead_uniformity: number;             // 1–5 (bead quality, not a defect)
  visual_score: number;                     // 0–100 derived score
  confidence: number;                       // 0–1
  description: string;
  raw_response: string;
}

const WELD_EVAL_PROMPT = `You are a certified welding quality inspector (ISO 5817).
Analyze the welding image carefully and identify all visible defects.

Respond with ONLY a JSON object in exactly this format, no extra text:
{
  "porosity_count": <integer, gas pores/holes in weld>,
  "spatter_count": <integer, metal droplets around weld>,
  "undercut_present": <true/false, groove melted into base metal at weld toe>,
  "severe_craters_count": <integer, crater defects at weld termination>,
  "lack_of_fusion_present": <true/false, incomplete fusion between weld and base metal>,
  "excessive_reinforcement_present": <true/false, weld bead height significantly above base metal surface>,
  "weld_bead_uniformity": <1-5, 5=very uniform and consistent bead shape>,
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
    const undercutPresent = Boolean(p.undercut_present);
    const severeCraters = clampInt(p.severe_craters_count, 0);
    const lackOfFusion = Boolean(p.lack_of_fusion_present);
    const excessiveReinforcement = Boolean(p.excessive_reinforcement_present);

    const defects: string[] = [];
    if (porosity > 0) defects.push('porosity');
    if (spatter > 0) defects.push('spatter');
    if (undercutPresent) defects.push('undercut');
    if (severeCraters > 0) defects.push('severe_craters');
    if (lackOfFusion) defects.push('lack_of_fusion');
    if (excessiveReinforcement) defects.push('excessive_reinforcement');

    const totalDefects = porosity + spatter + severeCraters;
    const visualScore = Math.max(0, Math.min(100,
      100
      - totalDefects * 8
      - (undercutPresent ? 10 : 0)
      - (lackOfFusion ? 15 : 0)
      - (excessiveReinforcement ? 5 : 0)
    ));

    return {
      overall_quality: clampInt(p.overall_quality, 3, 1, 5),
      defects_detected: defects,
      porosity_count: porosity,
      spatter_count: spatter,
      undercut_present: undercutPresent,
      severe_craters_count: severeCraters,
      lack_of_fusion_present: lackOfFusion,
      excessive_reinforcement_present: excessiveReinforcement,
      weld_bead_uniformity: clampInt(p.weld_bead_uniformity, 3, 1, 5),
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
    undercut_present: false,
    severe_craters_count: 0,
    lack_of_fusion_present: false,
    excessive_reinforcement_present: false,
    weld_bead_uniformity: 3,
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
