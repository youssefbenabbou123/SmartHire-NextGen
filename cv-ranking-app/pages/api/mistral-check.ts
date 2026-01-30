import type { NextApiRequest, NextApiResponse } from 'next';

interface MistralCheckRequest {
  rankedCandidates: any[];
  jobRequirements?: {
    role?: string;
    required_skills?: string[];
    field?: string;
  };
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { rankedCandidates, jobRequirements }: MistralCheckRequest = req.body;

    if (!rankedCandidates || !Array.isArray(rankedCandidates) || rankedCandidates.length === 0) {
      return res.status(400).json({ error: 'Ranked candidates array is required' });
    }

    // Get local Mistral endpoint (default to Ollama if not specified)
    const mistralEndpoint = process.env.MISTRAL_LOCAL_ENDPOINT || 'http://localhost:11434/api/generate';
    const mistralModel = process.env.MISTRAL_MODEL || 'mistral';

    // Prepare the analysis prompt
    const candidatesSummary = rankedCandidates.map((candidate, index) => {
      const scores = candidate.scores || {};
      return {
        rank: candidate.rank || index + 1,
        name: candidate.candidate_name || 'Unknown',
        total_score: candidate.total_score || 0,
        scores: {
          experience: scores.experience_quality || 0,
          technical_skills: scores.technical_skills || 0,
          projects: scores.projects_impact || 0,
          education: scores.education_certifications || 0,
          signal: scores.signal_consistency || 0,
        },
        explanation: candidate.explanation || '',
        raw_data: candidate.raw_data || candidate,
      };
    });

    const jobInfo = jobRequirements ? {
      role: jobRequirements.role || 'Not specified',
      skills: jobRequirements.required_skills?.join(', ') || 'Not specified',
      field: jobRequirements.field || 'Not specified',
    } : null;

    // Create the prompt for Mistral
    const prompt = `You are an expert HR consultant and fairness auditor. Analyze the following CV ranking results and determine if the ranking is:

1. **CORRECT**: Does the ranking accurately reflect candidate qualifications?
2. **FAIR**: Are all candidates evaluated using consistent criteria?
3. **SQUARE**: Are there any biases, inconsistencies, or questionable scoring decisions?

**Job Requirements:**
${jobInfo ? JSON.stringify(jobInfo, null, 2) : 'Not specified'}

**Ranked Candidates:**
${JSON.stringify(candidatesSummary, null, 2)}

For each candidate, you have access to:
- Total score and breakdown (experience, technical skills, projects, education, signal)
- Explanation provided
- Full CV data in raw_data

**Your Task:**
1. Review the ranking order - does it make sense based on the scores and CV data?
2. Check for fairness - are similar candidates ranked appropriately?
3. Identify any potential issues:
   - Scoring inconsistencies
   - Biases (gender, age, company names, etc.)
   - Missing important factors
   - Over/under-weighting of certain criteria
4. Provide specific recommendations for improvement

**Response Format (JSON):**
{
  "is_correct": true/false,
  "is_fair": true/false,
  "is_square": true/false,
  "overall_assessment": "Brief summary",
  "issues_found": [
    {
      "severity": "high/medium/low",
      "type": "bias/inconsistency/missing_factor/weighting",
      "description": "Detailed description",
      "affected_candidates": ["candidate names or ranks"],
      "recommendation": "How to fix"
    }
  ],
  "candidate_reviews": [
    {
      "rank": 1,
      "name": "Candidate name",
      "score_justification": "Is the score justified?",
      "ranking_position_appropriate": true/false,
      "concerns": ["any concerns"],
      "strengths": ["notable strengths"],
      "suggested_score_adjustments": {
        "experience_quality": null or number (suggested new score),
        "technical_skills": null or number,
        "projects_impact": null or number,
        "education_certifications": null or number,
        "signal_consistency": null or number
      },
      "adjustment_reason": "Why these adjustments are suggested"
    }
  ],
  "recommendations": [
    "Actionable recommendations for improving the ranking system"
  ],
  "confidence_score": 0.0-1.0
}

IMPORTANT: For "suggested_score_adjustments", only include fields that need adjustment. Use null for fields that are fine as-is.
Provide specific numeric values for scores that should be changed, staying within the maximum limits (experience: 35, technical_skills: 25, projects: 20, education: 10, signal: 10).

Provide your analysis in valid JSON format only.`;

    // Call local Mistral (Ollama format)
    const fullPrompt = `You are an expert HR consultant specializing in fair and unbiased candidate evaluation. Always respond with valid JSON only.

${prompt}`;

    const mistralResponse = await fetch(mistralEndpoint, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        model: mistralModel,
        prompt: fullPrompt,
        stream: false,
        options: {
          temperature: 0.3,
          num_predict: 4000,
        },
      }),
    });

    if (!mistralResponse.ok) {
      const errorText = await mistralResponse.text();
      console.error('Local Mistral error:', errorText);
      return res.status(500).json({
        error: 'Local Mistral request failed',
        message: `Make sure Mistral is running locally. Error: ${errorText}`,
        hint: 'If using Ollama, make sure it\'s running: ollama serve',
      });
    }

    const mistralData = await mistralResponse.json();
    const analysisText = mistralData.response || mistralData.text || '';

    // Try to parse the JSON response
    let analysis;
    try {
      // Extract JSON from the response (in case there's extra text)
      const jsonMatch = analysisText.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        analysis = JSON.parse(jsonMatch[0]);
      } else {
        throw new Error('No JSON found in response');
      }
    } catch (parseError) {
      // If parsing fails, return the raw text
      return res.status(200).json({
        success: true,
        raw_analysis: analysisText,
        parse_error: 'Could not parse JSON response',
        note: 'Mistral response received but could not be parsed as JSON',
      });
    }

    return res.status(200).json({
      success: true,
      analysis,
      timestamp: new Date().toISOString(),
    });
  } catch (error: any) {
    console.error('Mistral check error:', error);
    return res.status(500).json({
      error: 'Failed to check ranking with Mistral',
      message: error.message,
    });
  }
}
