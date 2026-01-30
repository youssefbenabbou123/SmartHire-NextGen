import type { NextApiRequest, NextApiResponse } from 'next';
import { exec } from 'child_process';
import { promisify } from 'util';
import * as fs from 'fs';
import * as path from 'path';
import { tmpdir } from 'os';

const execAsync = promisify(exec);

interface RankRequest {
  candidates: any[];
  jobRequirements: {
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
    const { candidates, jobRequirements }: RankRequest = req.body;

    if (!candidates || !Array.isArray(candidates) || candidates.length === 0) {
      return res.status(400).json({ error: 'Candidates array is required' });
    }

    // Create temporary files for each candidate
    const tempFiles: string[] = [];
    const candidateFiles: string[] = [];

    for (let i = 0; i < candidates.length; i++) {
      const tempFile = path.join(tmpdir(), `candidate_${Date.now()}_${i}.json`);
      fs.writeFileSync(tempFile, JSON.stringify(candidates[i], null, 2), 'utf-8');
      tempFiles.push(tempFile);
      candidateFiles.push(tempFile);
    }

    // Build command to call Python ranking script
    const rankingScriptPath = path.join(process.cwd(), '..', 'cv_ranking.py');
    const command = [
      'python',
      rankingScriptPath,
      ...candidateFiles,
      jobRequirements.role ? `--job-role "${jobRequirements.role}"` : '',
      jobRequirements.required_skills && jobRequirements.required_skills.length > 0
        ? `--skills "${jobRequirements.required_skills.join(',')}"`
        : '',
    ]
      .filter(Boolean)
      .join(' ');

    // Execute Python script
    const { stdout, stderr } = await execAsync(command, {
      cwd: path.join(process.cwd(), '..'),
      maxBuffer: 10 * 1024 * 1024, // 10MB buffer
    });

    // Clean up temp files
    tempFiles.forEach((file) => {
      try {
        fs.unlinkSync(file);
      } catch (e) {
        console.error(`Error deleting temp file ${file}:`, e);
      }
    });

    if (stderr && !stdout) {
      return res.status(500).json({ error: `Python script error: ${stderr}` });
    }

    // Parse JSON output from Python script
    // The script outputs JSON at the end
    const jsonMatch = stdout.match(/\{[\s\S]*\}/);
    if (jsonMatch) {
      const result = JSON.parse(jsonMatch[0]);
      return res.status(200).json(result);
    }

    // Fallback: try to parse the output
    return res.status(200).json({
      error: 'Could not parse output',
      raw: stdout,
    });
  } catch (error: any) {
    console.error('Ranking error:', error);
    return res.status(500).json({
      error: 'Failed to rank candidates',
      message: error.message,
    });
  }
}
