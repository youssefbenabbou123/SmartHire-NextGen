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
    const mongoUri = process.env.MONGODB_URI;
    const dbName = process.env.MONGODB_DB_NAME || 'capgemini';

    if (!mongoUri) {
      return res.status(500).json({ error: 'MongoDB URI not configured' });
    }

    client = new MongoClient(mongoUri);
    await client.connect();
    const db = client.db(dbName);

    // Get rankings collection data
    const rankingsCollection = db.collection('rankings');
    const allRankings = await rankingsCollection.find({}).limit(5).toArray();

    // Get ranking_history collection data
    const historyCollection = db.collection('ranking_history');
    const allHistory = await historyCollection.find({}).limit(5).toArray();

    // Collect all candidate scores
    const candidateScoresDebug: { [key: string]: any[] } = {};

    // From rankings
    allRankings.forEach((ranking: any) => {
      if (ranking.ranked_candidates && Array.isArray(ranking.ranked_candidates)) {
        console.log(`\n📊 Rankings collection entry: ${ranking.job_role}`);
        ranking.ranked_candidates.forEach((rc: any) => {
          const name = rc.candidate_name || rc.name;
          const score = rc.total_score || rc.score;
          console.log(`   - ${name}: ${score}`);
          if (name && score) {
            if (!candidateScoresDebug[name]) candidateScoresDebug[name] = [];
            candidateScoresDebug[name].push({
              source: 'rankings',
              score,
              jobRole: ranking.job_role
            });
          }
        });
      }
    });

    // From ranking_history
    allHistory.forEach((history: any) => {
      if (history.rankedCandidates && Array.isArray(history.rankedCandidates)) {
        console.log(`\n📋 History collection entry: ${history.jobTitle}`);
        history.rankedCandidates.forEach((rc: any) => {
          const name = rc.name || rc.candidate_name;
          const score = rc.score || rc.total_score;
          console.log(`   - ${name}: ${score}`);
          if (name && score) {
            if (!candidateScoresDebug[name]) candidateScoresDebug[name] = [];
            candidateScoresDebug[name].push({
              source: 'ranking_history',
              score,
              jobTitle: history.jobTitle
            });
          }
        });
      }
    });

    return res.status(200).json({
      success: true,
      rawRankingsCount: allRankings.length,
      rawHistoryCount: allHistory.length,
      candidateScoresDebug,
      samples: {
        rankings: allRankings.slice(0, 2),
        history: allHistory.slice(0, 2)
      }
    });
  } catch (error: any) {
    console.error('Debug error:', error);
    return res.status(500).json({
      error: 'Debug failed',
      message: error.message,
    });
  } finally {
    if (client) {
      await client.close();
    }
  }
}
