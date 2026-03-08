import Navbar from "@/components/Navbar";
import { AuthProvider } from "@/context/AuthContext";
import "@/app/global.css";

const Layout = ({ children }) => {
  return (
    <html lang="en">
      <body suppressHydrationWarning>
        <AuthProvider>
          <Navbar />
          <main>{children}</main>
        </AuthProvider>
      </body>
    </html>
  );
};

export default Layout;
