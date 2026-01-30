import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  let client: MongoClient | null = null;
  
  try {
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ error: 'MongoDB URI not configured' });
    }

    client = new MongoClient(mongoUri);
    await client.connect();
    
    const db = client.db(dbName);
    const collection = db.collection('ranking_history');

    // GET - List all ranking history or get single entry
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        // Get single entry
        const entry = await collection.findOne({ _id: new ObjectId(id as string) });
        if (!entry) {
          return res.status(404).json({ error: 'Entry not found' });
        }
        return res.status(200).json(entry);
      }
      
      // Get all entries, sorted by newest first
      const entries = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(entries);
    }

    // POST - Save a new ranking session
    if (req.method === 'POST') {
      const { 
        jobTitle,
        skills,
        weights,
        candidatesCount,
        rankedCandidates,
        bestCandidate,
        jobId
      } = req.body;

      const entry = {
        jobTitle: jobTitle || 'Custom Search',
        skills: skills || [],
        weights: weights || {},
        candidatesCount: candidatesCount || 0,
        rankedCandidates: rankedCandidates || [], // Top candidates with scores
        bestCandidate: bestCandidate || null,
        jobId: jobId || null,
        createdAt: new Date(),
      };

      const result = await collection.insertOne(entry);
      return res.status(201).json({ 
        success: true, 
        id: result.insertedId,
        entry: { ...entry, _id: result.insertedId }
      });
    }

    // DELETE - Delete history entry
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Entry ID is required' });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(id as string) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Entry not found' });
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error: any) {
    console.error('Ranking history API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
