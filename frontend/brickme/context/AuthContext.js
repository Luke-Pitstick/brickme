"use client";

import { createContext, useContext, useState } from "react";

const AuthContext = createContext({});

export const useAuth = () => useContext(AuthContext);

const DEMO_USER = {
  id: "local-dev-user",
  email: "local@example.com",
};

export function AuthProvider({ children }) {
  const [user, setUser] = useState(DEMO_USER);
  const [loading] = useState(false);

  const signUp = async (email) => {
    setUser({ id: "local-dev-user", email });
  };

  const signIn = async (email) => {
    setUser({ id: "local-dev-user", email });
  };

  const signOut = async () => {
    setUser(null);
  };

  return (
    <AuthContext.Provider value={{ user, loading, signUp, signIn, signOut }}>
      {children}
    </AuthContext.Provider>
  );
}