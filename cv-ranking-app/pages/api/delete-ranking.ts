import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { ranking_id } = req.body;

    if (!ranking_id) {
      return res.status(400).json({ error: 'Ranking ID is required' });
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

    // Delete the ranking
    const result = await collection.deleteOne({ _id: new ObjectId(ranking_id) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ 
        error: 'Ranking not found',
        message: `No ranking found with ID: ${ranking_id}`
      });
    }

    return res.status(200).json({ 
      success: true, 
      message: 'Ranking deleted successfully'
    });
  } catch (error: any) {
    console.error('MongoDB delete ranking error:', error);
    return res.status(500).json({
      error: 'Failed to delete ranking from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
