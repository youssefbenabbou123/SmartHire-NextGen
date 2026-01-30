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

    // Get query parameters
    const { limit, skip, search } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 100;
    const skipNum = skip ? parseInt(skip as string) : 0;

    // Build query
    let query: any = {};
    if (search) {
      query = {
        $or: [
          { candidate_name: { $regex: search as string, $options: 'i' } },
          { 'personal_info.full_name': { $regex: search as string, $options: 'i' } },
        ]
      };
    }

    // Fetch CVs
    const cvs = await collection
      .find(query)
      .sort({ created_at: -1 }) // Most recent first
      .skip(skipNum)
      .limit(limitNum)
      .toArray();

    // Get total count
    const total = await collection.countDocuments(query);

    // Remove MongoDB _id and convert to JSON-serializable format
    const formattedCvs = cvs.map(cv => {
      const { _id, ...rest } = cv;
      return rest;
    });

    return res.status(200).json({
      success: true,
      cvs: formattedCvs,
      total,
      limit: limitNum,
      skip: skipNum,
    });
  } catch (error: any) {
    console.error('MongoDB fetch error:', error);
    return res.status(500).json({
      error: 'Failed to fetch CVs from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
