import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { candidate_name } = req.body;

    if (!candidate_name) {
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

    // Delete the CV
    const result = await collection.deleteOne({ candidate_name });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'CV not found',
        message: `No CV found for candidate: ${candidate_name}`
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'CV deleted successfully',
      candidate_name
    });
  } catch (error: any) {
    console.error('MongoDB delete error:', error);
    return res.status(500).json({
      error: 'Failed to delete CV from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
