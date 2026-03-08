

import React from 'react';
import Navbar from "@/components/Navbar";
import '@/app/global.css';


const Layout = ({ children }) => {
    return (
        <html lang="en">

            <body>
                <div>
                    <Navbar />
                    <main>{children}</main>
                </div>
            </body>
        </html>

    );
};

export default Layout;