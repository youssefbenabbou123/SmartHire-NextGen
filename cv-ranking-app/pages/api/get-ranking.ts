import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(
  req: NextApiRequest,
  res: NextApiResponse
) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { id } = req.query;

    if (!id || typeof id !== 'string') {
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

    // Fetch ranking by ID
    const ranking = await collection.findOne({ _id: new ObjectId(id) });

    if (!ranking) {
      return res.status(404).json({ 
        error: 'Ranking not found',
        message: `No ranking found with ID: ${id}`
      });
    }

    // Remove MongoDB _id and convert to JSON-serializable format
    const { _id, ...rest } = ranking;

    return res.status(200).json({
      success: true,
      ranking: {
        ...rest,
        id: _id.toString(),
      },
    });
  } catch (error: any) {
    console.error('MongoDB fetch ranking error:', error);
    return res.status(500).json({
      error: 'Failed to fetch ranking from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
