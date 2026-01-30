import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { name } = req.query;

    if (!name || typeof name !== 'string') {
      return res.status(400).json({ error: 'Candidate name is required' });
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
    const collection = db.collection('cvs');

    // Find CV by candidate name (case-insensitive)
    const cv = await collection.findOne({
      candidate_name: { $regex: `^${name}$`, $options: 'i' }
    });

    if (!cv) {
      return res.status(404).json({ error: 'CV not found' });
    }

    // Remove MongoDB _id
    const { _id, ...cvData } = cv;

    return res.status(200).json({
      success: true,
      cv: cvData,
    });
  } catch (error: any) {
    console.error('MongoDB fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch CV from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
