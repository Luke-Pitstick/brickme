"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { useAuth } from "@/context/AuthContext";
import { getBuilds, deleteBuild } from "@/lib/api";

export default function MyBuildsPage() {
  const { user, loading: authLoading } = useAuth();
  const [builds, setBuilds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (authLoading) return;
    if (!user) {
      setLoading(false);
      return;
    }

    fetchBuilds();
  }, [user, authLoading]);

  const fetchBuilds = async () => {
    try {
      setLoading(true);
      const data = await getBuilds(user.id);
      setBuilds(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (buildId) => {
    try {
      await deleteBuild(buildId);
      setBuilds(builds.filter((b) => b.id !== buildId));
    } catch (err) {
      setError(err.message);
    }
  };

  if (authLoading || loading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <div className="w-6 h-6 border-2 border-[#9B6DC6] border-t-transparent rounded-full animate-spin" />
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-4">
        <p className="text-gray-500">Sign in to view your builds</p>
        <Link
          href="/Login"
          className="px-6 py-3 bg-[#9B6DC6] text-white font-bold rounded-lg hover:bg-[#8558B0] transition-colors"
        >
          Sign In
        </Link>
      </div>
    );
  }

  return (
    <div className="min-h-screen p-6 max-w-5xl mx-auto">
      <div className="flex items-center justify-between mb-8">
        <h1 className="text-2xl font-bold text-gray-800">My Builds</h1>
        <Link
          href="/Home"
          className="px-4 py-2 bg-[#9B6DC6] text-white text-sm font-bold rounded-lg hover:bg-[#8558B0] transition-colors"
        >
          New Build
        </Link>
      </div>

      {error && (
        <p className="text-red-500 text-sm mb-4">{error}</p>
      )}

      {builds.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 gap-4">
          <p className="text-gray-400 text-lg">No builds yet</p>
          <p className="text-gray-300 text-sm">
            Convert an image to LEGO to see it here
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {builds.map((build) => (
            <div
              key={build.id}
              className="bg-white rounded-xl shadow-sm border border-gray-100 overflow-hidden hover:shadow-md transition-shadow"
            >
              <div className="aspect-square bg-gray-50 relative">
                <img
                  src={build.image_url}
                  alt={build.name}
                  className="w-full h-full object-cover"
                />
              </div>
              <div className="p-4">
                <h3 className="font-semibold text-gray-800 truncate">
                  {build.name}
                </h3>
                <p className="text-xs text-gray-400 mt-1">
                  {new Date(build.created_at).toLocaleDateString()}
                </p>
                <div className="flex gap-2 mt-3">
                  <a
                    href={build.model_url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="flex-1 text-center px-3 py-2 bg-[#9B6DC6] text-white text-xs font-bold rounded-lg hover:bg-[#8558B0] transition-colors"
                  >
                    Download Model
                  </a>
                  <button
                    onClick={() => handleDelete(build.id)}
                    className="px-3 py-2 text-red-400 text-xs font-bold rounded-lg border border-red-200 hover:bg-red-50 transition-colors"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
