import type { NextApiRequest, NextApiResponse } from 'next';

const OLLAMA_URL = 'http://localhost:11434/api/generate';

// Fallback extraction when Mistral is unavailable
function extractFromText(title: string, description: string) {
  const fullText = `${title} ${description}`.toLowerCase();
  
  // Common skills to look for
  const skillPatterns = [
    'python', 'java', 'javascript', 'typescript', 'c\\+\\+', 'c#', '\\bc\\b',
    'react', 'angular', 'vue', 'node', 'nodejs', 'express', 'django', 'flask', 'spring',
    'sql', 'mysql', 'postgresql', 'mongodb', 'redis', 'elasticsearch',
    'aws', 'azure', 'gcp', 'docker', 'kubernetes', 'jenkins', 'git', 'github',
    'html', 'css', 'sass', 'tailwind', 'bootstrap',
    'rest', 'api', 'graphql', 'microservices',
    '.net', 'php', 'ruby', 'go', 'golang', 'rust', 'scala', 'kotlin', 'swift',
    'machine learning', 'ml', 'ai', 'deep learning', 'tensorflow', 'pytorch',
    'linux', 'unix', 'bash', 'powershell',
    'agile', 'scrum', 'jira', 'confluence'
  ];
  
  const skills: string[] = [];
  for (const pattern of skillPatterns) {
    const regex = new RegExp(pattern, 'gi');
    const match = fullText.match(regex);
    if (match) {
      // Normalize the skill name
      let skill = match[0];
      if (skill === 'c') skill = 'C';
      if (skill === 'c++') skill = 'C++';
      if (skill === 'c#') skill = 'C#';
      if (!skills.some(s => s.toLowerCase() === skill.toLowerCase())) {
        skills.push(skill);
      }
    }
  }
  
  // Extract experience (e.g., "3 years", "5+ years")
  const expMatch = fullText.match(/(\d+)\+?\s*(?:years?|yrs?)/i);
  const experience = expMatch ? `${expMatch[1]}+ years` : null;
  
  // Extract date/duration
  const dateMatch = fullText.match(/(\d{1,2}\/\d{1,2}\/\d{4}|\d{4}-\d{2}-\d{2})/);
  const durationMatch = fullText.match(/(\d+)\s*(?:months?|weeks?)/i);
  
  // Extract employment type
  let employmentType = null;
  if (fullText.includes('full-time') || fullText.includes('full time')) employmentType = 'Full-time';
  else if (fullText.includes('part-time') || fullText.includes('part time')) employmentType = 'Part-time';
  else if (fullText.includes('contract')) employmentType = 'Contract';
  else if (fullText.includes('internship') || fullText.includes('intern')) employmentType = 'Internship';
  else if (fullText.includes('freelance')) employmentType = 'Freelance';
  
  // Extract seniority
  let seniority = null;
  if (fullText.includes('senior') || fullText.includes('sr.')) seniority = 'Senior';
  else if (fullText.includes('junior') || fullText.includes('jr.')) seniority = 'Junior';
  else if (fullText.includes('lead') || fullText.includes('principal')) seniority = 'Lead';
  else if (fullText.includes('mid-level') || fullText.includes('mid level')) seniority = 'Mid-level';
  
  // Extract location
  let location = null;
  if (fullText.includes('remote')) location = 'Remote';
  else if (fullText.includes('hybrid')) location = 'Hybrid';
  
  // Build requirements from duration/date mentions
  const requirements: string[] = [];
  if (dateMatch) requirements.push(`Start date: ${dateMatch[1]}`);
  if (durationMatch) requirements.push(`Duration: ${durationMatch[0]}`);
  
  return {
    skills,
    experience,
    education: null,
    employmentType,
    location,
    salary: null,
    responsibilities: [],
    requirements,
    benefits: [],
    seniority,
  };
}

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { title, description } = req.body;

    if (!title && !description) {
      return res.status(400).json({ error: 'Title or description is required' });
    }

    // First try Mistral
    let parsedData = extractFromText(title || '', description || ''); // Fallback data
    let usedMistral = false;

    try {
      const fullText = `Job Title: ${title || 'Not specified'}\n\nJob Description:\n${description || 'Not specified'}`;

      const prompt = `You are a job posting analyzer. Extract structured information from this job posting.

${fullText}

Extract and return a JSON object with these fields (only include fields if you find relevant information, leave as null or empty array if not found):

{
  "skills": ["array of technical skills, programming languages, tools mentioned"],
  "experience": "years of experience required (e.g., '3-5 years', '5+ years') or null",
  "education": "education requirements (e.g., 'Bachelor's in Computer Science') or null",
  "employmentType": "full-time, part-time, contract, internship, etc. or null",
  "location": "job location or 'remote' if mentioned, or null",
  "salary": "salary range if mentioned or null",
  "responsibilities": ["array of main job responsibilities/duties"],
  "requirements": ["array of job requirements beyond skills"],
  "benefits": ["array of benefits mentioned"],
  "seniority": "junior, mid, senior, lead, etc. or null"
}

Important:
- Extract skills from BOTH the title and description
- Be thorough with skills - include programming languages, frameworks, tools, soft skills
- If something is not mentioned, use null for strings and [] for arrays
- Return ONLY valid JSON, no explanations`;

      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 15000); // 15 second timeout

      const response = await fetch(OLLAMA_URL, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          model: 'mistral',
          prompt,
          stream: false,
          options: {
            temperature: 0.1,
            num_predict: 1000,
          }
        }),
        signal: controller.signal,
      });

      clearTimeout(timeout);

      if (response.ok) {
        const data = await response.json();
        const aiResponse = data.response || '';

        // Find JSON in response
        const jsonMatch = aiResponse.match(/\{[\s\S]*\}/);
        if (jsonMatch) {
          const parsed = JSON.parse(jsonMatch[0]);
          // Merge with fallback data (Mistral data takes priority)
          const combinedSkills = [...(parsed.skills || []), ...parsedData.skills];
          const uniqueSkills = combinedSkills.filter((skill, index) => 
            combinedSkills.findIndex(s => s.toLowerCase() === skill.toLowerCase()) === index
          );
          parsedData = { 
            ...parsedData, 
            ...parsed,
            skills: uniqueSkills,
          };
          usedMistral = true;
        }
      }
    } catch (mistralError: any) {
      console.log('Mistral unavailable, using fallback extraction:', mistralError.message);
    }

    // Ensure skills is always an array
    if (!Array.isArray(parsedData.skills)) {
      parsedData.skills = [];
    }

    return res.status(200).json({
      success: true,
      parsedData,
      usedMistral,
    });

  } catch (error: any) {
    console.error('Parse job error:', error);
    // Return fallback extraction even on error
    const fallbackData = extractFromText(req.body?.title || '', req.body?.description || '');
    return res.status(200).json({ 
      success: true,
      parsedData: fallbackData,
      usedMistral: false,
    });
  }
}