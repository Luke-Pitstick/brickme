"use client";

import React, { useState } from "react";

const Home = () => {
  // state for the selected image URL
  const [imageSrc, setImageSrc] = useState(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // revoke previous URL if present
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(URL.createObjectURL(file));
    }
  };

  // cleanup when component unmounts
  React.useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4">
      {/* upload/preview area */}
      <div className="w-80 h-80 bg-gray-300 flex items-center justify-center">
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Uploaded"
            className="max-w-full max-h-full"
          />
        ) : (
          <span className="text-gray-500">No image selected</span>
        )}
      </div>

      {/* file input */}
      <input
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="mt-4"
      />
    </div>
  );
};

export default Home;