import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'DELETE') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { sessionId } = req.query;

    if (!sessionId || typeof sessionId !== 'string') {
      return res.status(400).json({ error: 'Session ID is required' });
    }

    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ error: 'MongoDB URI not configured' });
    }

    client = new MongoClient(mongoUri);
    await client.connect();

    const db = client.db(dbName);
    const chatsCollection = db.collection('recruiter_chats');

    // Check if sessionId is a valid MongoDB ObjectId
    if (!ObjectId.isValid(sessionId)) {
      return res.status(400).json({ error: 'Invalid session ID format' });
    }

    const result = await chatsCollection.deleteOne({ _id: new ObjectId(sessionId) });

    if (result.deletedCount === 0) {
      return res.status(404).json({ error: 'Chat session not found' });
    }

    return res.status(200).json({ success: true, message: 'Chat deleted successfully', deletedCount: result.deletedCount });

  } catch (error: any) {
    console.error('Delete chat error:', error);
    return res.status(500).json({ error: 'Failed to delete chat', message: error.message });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
