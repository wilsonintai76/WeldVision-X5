/**
 * Workers AI - Weld Image Evaluation
 *
 * Uses @cf/unum/uform-gen2-qwen-500m (lightweight vision-language model)
 * on the free tier to analyze weld images and detect defects.
 *
 * Free tier: ~10,000 neurons/day
 */

// YOLOv8 surface-defect classes: porosity | undercut | spatter | cracks | lack_of_fusion
export interface WeldEvaluation {
  overall_quality: number;                  // 1–5 Likert scale
  defects_detected: string[];               // list of defect type names
  porosity_count: number;                   // gas pinholes / pockets
  undercut_present: boolean;                // groove melted into base metal at weld toe
  spatter_count: number;                    // metal droplets around the weld
  crack_count: number;                      // hairline cracks (most critical on cast iron)
  lack_of_fusion_present: boolean;          // weld metal fails to bond with base metal
  weld_bead_uniformity: number;             // 1–5 (bead quality, not a defect)
  visual_score: number;                     // 0–100 derived score
  confidence: number;                       // 0–1
  description: string;
  raw_response: string;
}

const WELD_EVAL_PROMPT = `You are a certified welding quality inspector (AWS D11.2 — cast iron).
Analyze the welding image carefully and identify all visible defects.

The five defect classes to detect are:
1. porosity   — small pinholes / gas pockets on the surface (trapped gas during cooling)
2. undercut   — groove melted into the base metal at the weld toe, not filled back
3. spatter    — metal droplets splashed onto the base plate around the weld
4. cracks     — hairline cracks (dark lines); especially dangerous on brittle cast iron
5. lack_of_fusion — weld metal fails to bond/merge with the base cast iron (gap or cold overlap)

Respond with ONLY a JSON object in exactly this format, no extra text:
{
  "porosity_count": <integer, gas pores/holes visible on surface>,
  "undercut_present": <true/false, groove melted into base metal at weld toe>,
  "spatter_count": <integer, metal droplets around weld>,
  "crack_count": <integer, hairline crack lines detected>,
  "lack_of_fusion_present": <true/false, incomplete bond between weld and base metal>,
  "weld_bead_uniformity": <1-5, 5=very uniform and consistent bead shape>,
  "overall_quality": <1-5, based on AWS D11.2 where 5=excellent>,
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
    const undercutPresent = Boolean(p.undercut_present);
    const spatter = clampInt(p.spatter_count, 0);
    const cracks = clampInt(p.crack_count, 0);
    const lackOfFusion = Boolean(p.lack_of_fusion_present);

    const defects: string[] = [];
    if (porosity > 0) defects.push('porosity');
    if (undercutPresent) defects.push('undercut');
    if (spatter > 0) defects.push('spatter');
    if (cracks > 0) defects.push('cracks');
    if (lackOfFusion) defects.push('lack_of_fusion');

    const visualScore = Math.max(0, Math.min(100,
      100
      - porosity * 8
      - spatter * 5
      - cracks * 15
      - (undercutPresent ? 10 : 0)
      - (lackOfFusion ? 15 : 0)
    ));

    return {
      overall_quality: clampInt(p.overall_quality, 3, 1, 5),
      defects_detected: defects,
      porosity_count: porosity,
      undercut_present: undercutPresent,
      spatter_count: spatter,
      crack_count: cracks,
      lack_of_fusion_present: lackOfFusion,
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
    undercut_present: false,
    spatter_count: 0,
    crack_count: 0,
    lack_of_fusion_present: false,
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
