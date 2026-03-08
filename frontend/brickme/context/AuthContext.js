"use client";

import { createContext, useContext, useEffect, useState } from "react";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(false);

  // Placeholder auth functions - update when Supabase credentials are available
  const signUp = async (email, password) => {
    console.log("Sign up not yet implemented", email);
    // TODO: Implement when Supabase is set up
  };

  const signIn = async (email, password) => {
    console.log("Sign in not yet implemented", email);
    // TODO: Implement when Supabase is set up
  };

  const signOut = async () => {
    console.log("Sign out not yet implemented");
    // TODO: Implement when Supabase is set up
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}
