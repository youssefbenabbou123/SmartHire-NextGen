import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

// Get chat history for a session, or list all sessions
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'GET') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { sessionId } = req.query;

    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ error: 'MongoDB URI not configured' });
    }

    client = new MongoClient(mongoUri);
    await client.connect();

    const db = client.db(dbName);
    const chatsCollection = db.collection('recruiter_chats');

    if (sessionId && typeof sessionId === 'string') {
      // Get specific session
      const session = await chatsCollection.findOne({ _id: new ObjectId(sessionId) });
      
      if (!session) {
        return res.status(404).json({ error: 'Chat session not found' });
      }

      return res.status(200).json({ 
        success: true, 
        session: {
          id: session._id.toString(),
          created_at: session.created_at,
          updated_at: session.updated_at,
          messages: session.messages || [],
        }
      });
    } else {
      // List all sessions (most recent first)
      const sessions = await chatsCollection
        .find({})
        .sort({ updated_at: -1 })
        .limit(50)
        .toArray();

      return res.status(200).json({ 
        success: true, 
        sessions: sessions.map(s => ({
          id: s._id.toString(),
          created_at: s.created_at,
          updated_at: s.updated_at,
          message_count: s.messages?.length || 0,
          preview: s.messages?.[0]?.content?.substring(0, 100) || 'Empty chat',
        }))
      });
    }
  } catch (error: any) {
    console.error('Get chat error:', error);
    return res.status(500).json({ error: 'Failed to get chat history', message: error.message });
  } finally {
    if (client) await client.close();
  }
}
