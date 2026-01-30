import Head from 'next/head';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { 
  FiArrowLeft,
  FiDownload,
  FiHome
} from 'react-icons/fi';

export default function RankCandidates() {
  const [isClient, setIsClient] = useState(false);

  useEffect(() => {
    setIsClient(true);
  }, []);

  if (!isClient) return null;

  return (
    <>
      <Head>
        <title>Rank Candidates - Capgemini Recruitment</title>
      </Head>

      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 text-white">
        {/* Header */}
        <div className="border-b border-gray-700 bg-gray-900/50 backdrop-blur-sm sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Link href="/dashboard-new">
                  <button className="p-2 hover:bg-gray-800 rounded-lg transition-colors">
                    <FiArrowLeft className="w-5 h-5" />
                  </button>
                </Link>
                <h1 className="text-2xl font-bold">Rank Candidates</h1>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-6 py-12">
          {/* Iframe for existing ranking page */}
          <iframe
            src="/"
            className="w-full h-screen border-0 rounded-lg"
            title="Ranking System"
          />
        </div>
      </div>
    </>
  );
}
