"use client";

import React, { useState } from "react";

const Home = () => {
  // state for the selected image URL
  const [imageSrc, setImageSrc] = useState(null);
  const fileInputRef = React.useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file) {
      // revoke previous URL if present
      if (imageSrc) URL.revokeObjectURL(imageSrc);
      setImageSrc(URL.createObjectURL(file));
    }
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
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
      <div
        onClick={handleAreaClick}
        className="w-80 h-80 bg-gray-300 flex items-center justify-center cursor-pointer hover:bg-gray-400 transition-colors"
      >
        {imageSrc ? (
          <img
            src={imageSrc}
            alt="Uploaded"
            className="max-w-full max-h-full"
          />
        ) : (
          <span className="text-gray-500">Click to upload an image</span>
        )}
      </div>

      {/* hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />
    </div>
  );
};

export default Home;