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
    const collection = db.collection('jobs');

    // GET - List all jobs or get single job
    if (req.method === 'GET') {
      const { id } = req.query;
      
      if (id) {
        // Get single job
        const job = await collection.findOne({ _id: new ObjectId(id as string) });
        if (!job) {
          return res.status(404).json({ error: 'Job not found' });
        }
        return res.status(200).json(job);
      }
      
      // Get all jobs, sorted by newest first
      const jobs = await collection.find({}).sort({ createdAt: -1 }).toArray();
      return res.status(200).json(jobs);
    }

    // POST - Create new job
    if (req.method === 'POST') {
      const { title, description, parsedData } = req.body;
      
      if (!title || !description) {
        return res.status(400).json({ error: 'Title and description are required' });
      }

      const job = {
        title,
        description,
        // Parsed data from Mistral or fallback extraction
        skills: parsedData?.skills || [],
        experience: parsedData?.experience || null,
        education: parsedData?.education || null,
        employmentType: parsedData?.employmentType || null,
        location: parsedData?.location || null,
        salary: parsedData?.salary || null,
        seniority: parsedData?.seniority || null,
        responsibilities: parsedData?.responsibilities || [],
        requirements: parsedData?.requirements || [],
        benefits: parsedData?.benefits || [],
        // Metadata
        status: 'active',
        createdAt: new Date(),
        updatedAt: new Date(),
      };

      const result = await collection.insertOne(job);
      return res.status(201).json({ 
        success: true, 
        id: result.insertedId,
        job: { ...job, _id: result.insertedId }
      });
    }

    // PUT - Update job
    if (req.method === 'PUT') {
      const { id } = req.query;
      const updates = req.body;

      if (!id) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      const result = await collection.updateOne(
        { _id: new ObjectId(id as string) },
        { $set: { ...updates, updatedAt: new Date() } }
      );

      if (result.matchedCount === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ success: true });
    }

    // DELETE - Delete job
    if (req.method === 'DELETE') {
      const { id } = req.query;

      if (!id) {
        return res.status(400).json({ error: 'Job ID is required' });
      }

      const result = await collection.deleteOne({ _id: new ObjectId(id as string) });

      if (result.deletedCount === 0) {
        return res.status(404).json({ error: 'Job not found' });
      }

      return res.status(200).json({ success: true });
    }

    res.setHeader('Allow', ['GET', 'POST', 'PUT', 'DELETE']);
    return res.status(405).json({ error: `Method ${req.method} not allowed` });

  } catch (error: any) {
    console.error('Jobs API error:', error);
    return res.status(500).json({ error: error.message || 'Internal server error' });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
