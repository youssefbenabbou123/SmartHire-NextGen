import type { NextApiRequest, NextApiResponse } from 'next';
import { MongoClient, ObjectId } from 'mongodb';

// Save a new message to a chat session
export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  let client: MongoClient | null = null;

  try {
    const { sessionId, message, type, results } = req.body;

    if (!message || !type) {
      return res.status(400).json({ error: 'Message and type are required' });
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

    // Create message document
    const messageDoc = {
      content: message,
      type: type, // 'user' or 'bot'
      results: results || [],
      timestamp: new Date(),
    };

    if (sessionId) {
      // Add to existing session
      await chatsCollection.updateOne(
        { _id: new ObjectId(sessionId) },
        { 
          $push: { messages: messageDoc } as any,
          $set: { updated_at: new Date() }
        }
      );

      return res.status(200).json({ 
        success: true, 
        sessionId: sessionId,
        messageAdded: true
      });
    } else {
      // Create new chat session
      const newSession = {
        created_at: new Date(),
        updated_at: new Date(),
        messages: [messageDoc],
      };

      const result = await chatsCollection.insertOne(newSession);

      return res.status(200).json({ 
        success: true, 
        sessionId: result.insertedId.toString(),
        messageAdded: true
      });
    }
  } catch (error: any) {
    console.error('Save chat error:', error);
    return res.status(500).json({ error: 'Failed to save chat', message: error.message });
  } finally {
    if (client) await client.close();
  }
}
