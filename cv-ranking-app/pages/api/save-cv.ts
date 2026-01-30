import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient } from 'mongodb';

interface SaveCVRequest {
  candidate: any;
  parsedAt?: string;
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
    const { candidate, parsedAt }: SaveCVRequest = req.body;

    if (!candidate) {
      return res.status(400).json({ error: 'Candidate data is required' });
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

    // Prepare document to save - store only the candidate data, no duplication
    const candidateName = candidate.personal_info?.full_name || 'Unknown';
    const document = {
      candidate_name: candidateName,
      parsed_at: parsedAt || new Date().toISOString(),
      created_at: new Date(),
      updated_at: new Date(),
      // Store only the candidate data (no duplication)
      ...candidate,
    };

    // Check if candidate already exists (by name)
    const existing = await collection.findOne({ 
      candidate_name: candidateName 
    });

    if (existing) {
      // Update existing document
      await collection.updateOne(
        { candidate_name: candidateName },
        { 
          $set: {
            ...document,
            updated_at: new Date(),
          }
        }
      );
      return res.status(200).json({ 
        success: true, 
        message: 'CV updated successfully',
        action: 'updated',
        candidate_name: candidateName
      });
    } else {
      // Insert new document
      await collection.insertOne(document);
      return res.status(200).json({ 
        success: true, 
        message: 'CV saved successfully',
        action: 'created',
        candidate_name: candidateName
      });
    }
  } catch (error: any) {
    console.error('MongoDB save error:', error);
    return res.status(500).json({
      error: 'Failed to save CV to database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
