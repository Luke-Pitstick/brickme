"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "@/context/AuthContext";

export default function LoginPage() {
  const [isSignUp, setIsSignUp] = useState(false);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState(null);
  const [message, setMessage] = useState(null);
  const [loading, setLoading] = useState(false);
  const { user, signIn, signUp, signOut } = useAuth();
  const router = useRouter();

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setMessage(null);
    setLoading(true);

    try {
      if (isSignUp) {
        await signUp(email, password);
        setMessage("Check your email to confirm your account!");
      } else {
        await signIn(email, password);
        router.push("/Home");
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  if (user) {
    return (
      <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
        <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 p-8">
          <h2 className="text-xl font-bold text-gray-800 text-center mb-4">
            You're logged in
          </h2>
          <p className="text-gray-500 text-sm text-center mb-6">{user.email}</p>
          <button
            onClick={signOut}
            className="w-full py-3 bg-gray-100 text-gray-700 font-semibold rounded-lg hover:bg-gray-200 transition-colors"
          >
            Sign Out
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <div className="w-full max-w-sm bg-white rounded-xl shadow-lg border border-gray-100 p-8">
        <h2 className="text-2xl font-bold text-gray-800 text-center mb-2">
          {isSignUp ? "Create Account" : "Welcome Back"}
        </h2>
        <p className="text-gray-400 text-sm text-center mb-6">
          {isSignUp
            ? "Sign up to save your LEGO builds"
            : "Sign in to view your builds"}
        </p>

        <form onSubmit={handleSubmit} className="flex flex-col gap-4">
          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#9B6DC6] focus:ring-1 focus:ring-[#9B6DC6] transition-colors"
          />
          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
            minLength={6}
            className="w-full px-4 py-3 border border-gray-200 rounded-lg text-sm focus:outline-none focus:border-[#9B6DC6] focus:ring-1 focus:ring-[#9B6DC6] transition-colors"
          />

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 bg-[#9B6DC6] text-white font-bold rounded-lg hover:bg-[#8558B0] transition-colors disabled:bg-gray-300 disabled:cursor-not-allowed"
          >
            {loading
              ? "Loading..."
              : isSignUp
              ? "Sign Up"
              : "Sign In"}
          </button>
        </form>

        {error && (
          <p className="mt-4 text-red-500 text-sm text-center">{error}</p>
        )}
        {message && (
          <p className="mt-4 text-green-600 text-sm text-center">{message}</p>
        )}

        <p className="mt-6 text-sm text-gray-400 text-center">
          {isSignUp ? "Already have an account?" : "Don't have an account?"}{" "}
          <button
            onClick={() => {
              setIsSignUp(!isSignUp);
              setError(null);
              setMessage(null);
            }}
            className="text-[#9B6DC6] font-semibold hover:underline"
          >
            {isSignUp ? "Sign In" : "Sign Up"}
          </button>
        </p>
      </div>
    </div>
  );
}
