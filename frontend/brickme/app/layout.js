import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import "@/app/globals.css";

const Layout = ({ children }) => {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
};

export default Layout;
