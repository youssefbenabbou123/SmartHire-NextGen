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

    // Get query parameters
    const { limit, skip, search } = req.query;
    const limitNum = limit ? parseInt(limit as string) : 50;
    const skipNum = skip ? parseInt(skip as string) : 0;

    // Build query
    let query: any = {};
    if (search) {
      query = {
        $or: [
          { job_role: { $regex: search as string, $options: 'i' } },
          { required_skills: { $regex: search as string, $options: 'i' } },
          { jobTitle: { $regex: search as string, $options: 'i' } },
        ]
      };
    }

    // Try both collections
    let rankings: any[] = [];
    let total = 0;

    try {
      const rankingsCollection = db.collection('rankings');
      const rankingsData = await rankingsCollection
        .find(query)
        .sort({ created_at: -1 })
        .skip(skipNum)
        .limit(limitNum)
        .toArray();

      rankings = rankingsData.map(r => ({
        ...r,
        id: r._id?.toString(),
        jobTitle: r.job_role,
        candidatesCount: r.candidate_count || r.ranked_candidates?.length || 0,
        createdAt: r.created_at || r.createdAt,
        ranked_candidates: r.ranked_candidates || [], // Explicitly include ranked_candidates
      }));

      total = await rankingsCollection.countDocuments(query);
    } catch (e) {
      console.log('Rankings collection not found or error:', e);
    }

    // Also try ranking_history collection if we need more data
    if (rankings.length < limitNum) {
      try {
        const historyCollection = db.collection('ranking_history');
        const historyQuery = search ? { jobTitle: { $regex: search as string, $options: 'i' } } : {};
        const historyData = await historyCollection
          .find(historyQuery)
          .sort({ createdAt: -1 })
          .skip(skipNum)
          .limit(limitNum)
          .toArray();

        const formattedHistory = historyData.map(r => ({
          ...r,
          id: r._id?.toString(),
          createdAt: r.createdAt,
          ranked_candidates: r.rankedCandidates || [], // Include rankedCandidates from history
        }));

        rankings = [...rankings, ...formattedHistory].slice(0, limitNum);
        total = (total || 0) + (await historyCollection.countDocuments(historyQuery));
      } catch (e) {
        console.log('Ranking history collection not found or error:', e);
      }
    }

    // Remove MongoDB _id and convert to JSON-serializable format
    const formattedRankings = rankings.map(ranking => {
      const { _id, ...rest } = ranking;
      return {
        ...rest,
        id: rest.id || _id?.toString(),
      };
    });

    return res.status(200).json({
      success: true,
      rankings: formattedRankings,
      total,
      limit: limitNum,
      skip: skipNum,
    });
  } catch (error: any) {
    console.error('MongoDB fetch rankings error:', error);
    return res.status(500).json({
      error: 'Failed to fetch rankings from database',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
