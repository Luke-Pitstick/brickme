"use client";

import { useState, useRef, useEffect } from "react";
import { useRouter } from "next/navigation";
import { uploadImage, startImageTo3D, pollUntilComplete, saveBuild } from "@/lib/api";
import { useAuth } from "@/context/AuthContext";

const STEPS = {
  IDLE: "idle",
  UPLOADING: "uploading",
  CONVERTING: "converting",
  DONE: "done",
  ERROR: "error",
};

const Home = () => {
  const router = useRouter();
  const { user } = useAuth();
  const [imageSrc, setImageSrc] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [step, setStep] = useState(STEPS.IDLE);
  const [statusMsg, setStatusMsg] = useState("");
  const [resultUrl, setResultUrl] = useState(null);
  const [imageUrl, setImageUrl] = useState(null);
  const [error, setError] = useState(null);
  const [saved, setSaved] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (imageSrc) URL.revokeObjectURL(imageSrc);
    setImageSrc(URL.createObjectURL(file));
    setSelectedFile(file);
    setStep(STEPS.IDLE);
    setResultUrl(null);
    setImageUrl(null);
    setError(null);
    setSaved(false);
  };

  const handleAreaClick = () => {
    fileInputRef.current?.click();
  };

  const handleConvert = async () => {
    if (!selectedFile) return;

    try {
      setStep(STEPS.UPLOADING);
      setStatusMsg("Uploading image...");
      const cdnUrl = await uploadImage(selectedFile);
      setImageUrl(cdnUrl);

      setStep(STEPS.CONVERTING);
      setStatusMsg("Starting 3D conversion...");
      const { task_id } = await startImageTo3D(cdnUrl);

      const result = await pollUntilComplete(task_id, {
        onStatusUpdate: (status) => {
          setStatusMsg(`Status: ${status.status}...`);
        },
      });

      if (result.status === "succeeded") {
          const payload = result.result;

          console.log("FULL RESULT:", result);
          console.log("PAYLOAD:", payload);

          let modelUrl = payload?.model_url;
          const jobId = payload?.job_id;
          const instructions = payload?.instructions;

          // Defensive normalization in case model_url is wrapped oddly
          if (modelUrl && typeof modelUrl === "object") {
            modelUrl =
              modelUrl.url ||
              modelUrl.model_url ||
              modelUrl.href ||
              null;
          }

          console.log("NORMALIZED modelUrl:", modelUrl, typeof modelUrl);

          if (!modelUrl || typeof modelUrl !== "string" || modelUrl === "[object Object]") {
            console.error("Invalid model_url from backend:", modelUrl);
            throw new Error("Backend succeeded but returned an invalid model_url");
          }

          setStep(STEPS.DONE);
          setResultUrl(modelUrl);
          setStatusMsg("Conversion complete!");

          if (typeof window !== "undefined") {
            localStorage.setItem("modelUrl", modelUrl);

            if (jobId) {
              localStorage.setItem("jobId", jobId);
            }

            localStorage.setItem("conversionResult", JSON.stringify(payload));

            if (instructions) {
              localStorage.setItem("instructions", JSON.stringify(instructions));
            }
          }

          if (user) {
            try {
              await saveBuild({
                userId: user.id,
                imageUrl: cdnUrl,
                modelUrl: modelUrl,
              });
              setSaved(true);
            } catch (err) {
              console.error("saveBuild failed:", err);
            }
          }

          console.log("ABOUT TO STORE modelUrl:", modelUrl, typeof modelUrl);
            console.log("ABOUT TO STORE payload:", payload);

            if (typeof window !== "undefined") {
              localStorage.setItem("modelUrl", String(modelUrl));
              console.log("STORED modelUrl:", localStorage.getItem("modelUrl"));
            }


            setTimeout(() => {
               router.push(`/Test?modelUrl=${encodeURIComponent(modelUrl)}`);
             }, 1500);
        } else {
        setStep(STEPS.ERROR);
        setError(result.error || "Conversion failed");
        setStatusMsg("");
      }
    } catch (err) {
      setStep(STEPS.ERROR);
      setError(err.message);
      setStatusMsg("");
    }
  };

  useEffect(() => {
    return () => {
      if (imageSrc) URL.revokeObjectURL(imageSrc);
    };
  }, [imageSrc]);

  const isProcessing = step === STEPS.UPLOADING || step === STEPS.CONVERTING;

  return (
    <div className="flex flex-col items-center justify-center min-h-screen p-4 gap-6">
      <h1 className="text-3xl font-bold text-gray-800 mb-4">Convert to LEGO</h1>

      {/* Upload / preview area */}
      <div className="flex flex-col items-center gap-4">
        <div
          onClick={handleAreaClick}
          className="w-80 h-80 bg-gray-100 border-2 border-dashed border-gray-300 rounded-xl flex items-center justify-center cursor-pointer hover:border-[#9B6DC6] hover:bg-gray-50 transition-colors relative"
        >
          {imageSrc ? (
            <img src={imageSrc} alt="Preview" className="max-w-full max-h-full rounded-lg" />
          ) : (
            <div className="flex flex-col items-center gap-3">
              <span className="text-gray-400 text-sm">Click to upload an image</span>
            </div>
          )}
        </div>

        {/* Upload button - always visible */}
        <button
          onClick={handleAreaClick}
          disabled={isProcessing}
          className={`px-6 py-3 font-bold rounded-lg transition-colors ${
            isProcessing
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#9B6DC6] text-white hover:bg-[#8558B0]"
          }`}
        >
          {imageSrc ? "Change Image" : "Upload Picture"}
        </button>
      </div>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileChange}
        className="hidden"
      />

      {/* Convert button */}
      {selectedFile && (
        <button
          onClick={handleConvert}
          disabled={isProcessing}
          className={`px-6 py-3 font-bold rounded-lg transition-colors ${
            isProcessing
              ? "bg-gray-300 text-gray-500 cursor-not-allowed"
              : "bg-[#9B6DC6] text-white hover:bg-[#8558B0]"
          }`}
        >
          {isProcessing ? "Processing..." : "Convert to LEGO"}
        </button>
      )}

      {/* Status */}
      {isProcessing && (
        <div className="flex items-center gap-3 text-gray-600">
          <div className="w-5 h-5 border-2 border-[#9B6DC6] border-t-transparent rounded-full animate-spin" />
          <span className="text-sm font-medium">{statusMsg}</span>
        </div>
      )}

      {/* Error */}
      {step === STEPS.ERROR && (
        <div className="text-red-500 text-sm font-medium">{error}</div>
      )}

      {/* Result */}
      {step === STEPS.DONE && resultUrl && (
        <div className="flex flex-col items-center gap-3">
          <p className="text-green-600 font-bold">{statusMsg}</p>
          {saved && (
            <p className="text-sm text-gray-400">Saved to My Builds</p>
          )}
          <a
            href={resultUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="px-6 py-3 bg-[#9B6DC6] text-white font-bold rounded-lg hover:bg-[#8558B0] transition-colors"
          >
            Download 3D Model
          </a>
          <button
            onClick={() => {
              setStep(STEPS.IDLE);
              setResultUrl(null);
              setImageUrl(null);
              setSelectedFile(null);
              setSaved(false);
              if (imageSrc) URL.revokeObjectURL(imageSrc);
              setImageSrc(null);
            }}
            className="text-sm text-gray-500 hover:text-gray-700 underline"
          >
            Convert another image
          </button>
        </div>
      )}
    </div>
  );
};

export default Home;
