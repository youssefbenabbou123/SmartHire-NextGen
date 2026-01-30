import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

interface SaveRankingRequest {
  jobRole: string;
  requiredSkills: string;
  rankedCandidates: any[];
  timestamp?: string;
}

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { jobRole, requiredSkills, rankedCandidates, timestamp }: SaveRankingRequest = req.body;

    if (!jobRole || !rankedCandidates || rankedCandidates.length === 0) {
      return res.status(400).json({ error: 'Job role and ranked candidates are required' });
    }

    // Get MongoDB connection from environment variables
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ 
        error: 'MongoDB URI not configured',
        message: 'Please set MONGODB_URI in .env.local file'
      });
    }

    // Connect to MongoDB
    client = new MongoClient(mongoUri);
    await client.connect();

    const db = client.db(dbName);
    const collection = db.collection('rankings');

    // Prepare document to save
    const document = {
      job_role: jobRole,
      required_skills: requiredSkills,
      ranked_candidates: rankedCandidates,
      candidate_count: rankedCandidates.length,
      created_at: timestamp ? new Date(timestamp) : new Date(),
      updated_at: new Date(),
    };

    // Insert ranking
    await collection.insertOne(document);

    return res.status(200).json({ 
      success: true, 
      message: 'Ranking saved successfully',
      ranking_id: document._id
    });
  } catch (error: any) {
    console.error('MongoDB save ranking error:', error);
    return res.status(500).json({
      error: 'Failed to save ranking to database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
