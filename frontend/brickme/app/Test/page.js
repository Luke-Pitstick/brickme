"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

function centerAndScaleModel(model, THREE) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z);
  const scale = 5 / maxDim;

  model.traverse((child) => {
    if (child.isMesh && child.geometry) {
      child.geometry.translate(-center.x, -center.y, -center.z);
      child.geometry.computeBoundingBox();
      child.geometry.computeBoundingSphere();
    }
  });

  model.scale.setScalar(scale);
  model.rotation.x = -Math.PI / 2;
  model.updateMatrixWorld(true);

  const finalBox = new THREE.Box3().setFromObject(model);
  model.position.y -= finalBox.min.y;
}

function loadModelFromUrl(url, loader, scene, THREE, onDone, onError) {
  loader.load(
    url,
    (gltf) => {
      const model = gltf.scene;
      model.traverse((child) => {
        if (child.isMesh) {
          child.castShadow = true;
          child.receiveShadow = true;
        }
      });
      centerAndScaleModel(model, THREE);
      scene.add(model);
      onDone?.(model);
    },
    undefined,
    (err) => {
      console.error("Failed to load model:", err);
      onError?.(err);
    }
  );
}

// Read a File as a base64 data-URL so we can stash it in sessionStorage
function fileToBase64(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result); // full data-URL e.g. "data:model/gltf-binary;base64,..."
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

export default function ModelViewer() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);
  const loaderRef = useRef(null);
  const THREERef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [threeMounted, setThreeMounted] = useState(false);
  // Only true once a model has fully loaded — controls button visibility
  const [modelReady, setModelReady] = useState(false);
  const router = useRouter();

  const doLoad = useRef(null);

  useEffect(() => {
    if (!containerRef.current) return;

    Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      try {
        THREERef.current = THREE;

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0xc4c4c4);
        sceneRef.current = scene;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
        camera.position.set(7, 8, 7);
        camera.lookAt(0, 1, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);
        scene.add(new THREE.HemisphereLight(0xfafafa, 0x444444, 1));

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 4;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.maxDistance = 100;
        controls.minDistance = 1;
        controls.target.set(0, 0, 0);
        controls.update();

        scene.add(new THREE.GridHelper(50, 50, 0x444444, 0x222222));
        loaderRef.current = new GLTFLoader();

        doLoad.current = async (url) => {
          if (!url || typeof url !== "string") return;

          if (modelRef.current) {
            scene.remove(modelRef.current);
            modelRef.current = null;
          }

          setLoading(true);
          setError("");
          setFileName("Generated Model");
          setModelReady(false);

          let blobUrl = null;

          try {
            console.log("Auto-loading model from:", url);

            const res = await fetch(url);
            if (!res.ok) {
              throw new Error(`Model fetch failed: ${res.status} ${res.statusText}`);
            }

            const blob = await res.blob();
            console.log("Fetched model blob:", blob.size, "bytes", blob.type);

            blobUrl = URL.createObjectURL(blob);

            loadModelFromUrl(
              blobUrl,
              loaderRef.current,
              scene,
              THREE,
              (model) => {
                modelRef.current = model;
                setLoading(false);
                setModelReady(true);
                if (blobUrl) URL.revokeObjectURL(blobUrl);
              },
              (err) => {
                setError("Failed to load model: " + (err.message || "Unknown error"));
                setLoading(false);
                if (blobUrl) URL.revokeObjectURL(blobUrl);
              }
            );
          } catch (err) {
            console.error("Auto-load failed:", err);
            setError("Failed to auto-load model: " + (err.message || "Unknown error"));
            setLoading(false);
            if (blobUrl) URL.revokeObjectURL(blobUrl);
          }
        };

        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        const handleResize = () => {
          if (!containerRef.current) return;
          const w = containerRef.current.clientWidth;
          const h = containerRef.current.clientHeight;
          camera.aspect = w / h;
          camera.updateProjectionMatrix();
          renderer.setSize(w, h);
        };
        window.addEventListener("resize", handleResize);
        setThreeMounted(true);

        let attempts = 0;
        const tryLoadFromUrl = () => {
          const params = new URLSearchParams(window.location.search);
          const modelUrlRaw =
            params.get("modelUrl") ||
            (typeof window !== "undefined" ? localStorage.getItem("modelUrl") : null);

          let modelUrl = modelUrlRaw;

          if (typeof modelUrlRaw === "string") {
            const trimmed = modelUrlRaw.trim();

            if (trimmed.startsWith("{")) {
              try {
                const parsed = JSON.parse(trimmed);
                modelUrl = parsed?.model_url || parsed?.result?.model_url || null;
              } catch {
                modelUrl = modelUrlRaw;
              }
            }
          }

          console.log("Resolved modelUrlRaw:", modelUrlRaw);
          console.log("Resolved modelUrl:", modelUrl);

          if (modelUrl && typeof modelUrl === "string" && modelUrl !== "[object Object]") {
            doLoad.current(modelUrl);
          } else if (attempts < 10) {
            attempts++;
            setTimeout(tryLoadFromUrl, 150);
          } else {
            setError("No valid generated model URL found.");
          }
        };
        tryLoadFromUrl();

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
        };
      } catch (err) {
        setError("Failed to initialize 3D viewer: " + err.message);
      }
    });
  }, []);

  const handleFileUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.name.endsWith(".glb") && !file.name.endsWith(".gltf")) {
      setError("Please upload a .glb or .gltf file");
      return;
    }

    if (!threeMounted) {
      setError("3D viewer not ready. Please wait...");
      return;
    }

    setLoading(true);
    setError("");
    setModelReady(false);
    setFileName(file.name);

    try {
      // Convert file → base64 and cache in sessionStorage so the
      // instructions page can reconstruct a blob URL from it.
      const dataUrl = await fileToBase64(file);
      sessionStorage.setItem("uploadedModelDataUrl", dataUrl);
      sessionStorage.setItem("uploadedModelName", file.name);
      sessionStorage.setItem("uploadedModelTimestamp", Date.now().toString());
    } catch (err) {
      console.warn("Could not store model in sessionStorage:", err);
    }

    // Also create a short-lived blob URL for the viewer on this page
    const blobUrl = URL.createObjectURL(file);

    if (modelRef.current && sceneRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    loadModelFromUrl(
      blobUrl,
      loaderRef.current,
      sceneRef.current,
      THREERef.current,
      (model) => {
        modelRef.current = model;
        setLoading(false);
        setModelReady(true);
        URL.revokeObjectURL(blobUrl);
      },
      (err) => {
        setError("Failed to load model: " + (err.message || "Unknown error"));
        setLoading(false);
        URL.revokeObjectURL(blobUrl);
      }
    );
  };

  const handleGoToInstructions = () => {
    router.push("/instructions");
  };

  return (
    <div
      className="w-full h-screen flex flex-col bg-gray-900"
      style={{ position: "relative" }}
    >
      {/* ── Header ── */}
      <div className="bg-gray-800 text-white p-6 shadow-lg" style={{ zIndex: 10, position: "relative" }}>
        <h1 className="text-3xl font-bold mb-4">3D Model Viewer</h1>

        <div className="flex items-center gap-4 flex-wrap">
          <label className="flex items-center gap-2 px-4 py-2 bg-[#9B6DC6] hover:bg-[#8558B0] rounded-lg cursor-pointer font-semibold transition-colors">
            <span>{loading ? "Loading..." : "Upload GLB/GLTF Model"}</span>
            <input
              type="file"
              accept=".glb,.gltf"
              onChange={handleFileUpload}
              disabled={loading || !threeMounted}
              className="hidden"
            />
          </label>

          {fileName && (
            <div className="text-sm">
              <span className="text-gray-300">Loaded: </span>
              <span className="text-[#9B6DC6] font-semibold">{fileName}</span>
            </div>
          )}

          {loading && (
            <div className="flex items-center gap-2 text-yellow-400 text-sm">
              <div className="w-4 h-4 border-2 border-yellow-400 border-t-transparent rounded-full animate-spin" />
              Loading model...
            </div>
          )}

          {!threeMounted && (
            <div className="text-yellow-400 text-sm">Initializing 3D viewer...</div>
          )}
        </div>

        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
      </div>

      {/* ── 3D Viewport ── */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-800 overflow-hidden"
        style={{ width: "100%", position: "relative" }}
      >
        {!threeMounted && (
          <div className="absolute inset-0 flex items-center justify-center bg-gray-900 bg-opacity-50">
            <div className="text-white text-center">
              <div className="w-12 h-12 border-4 border-[#9B6DC6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
              <p>Initializing 3D Viewer...</p>
            </div>
          </div>
        )}
      </div>

      {/* ── Instructions button — only visible once a model is loaded ── */}
      {modelReady && (
        <button
          onClick={handleGoToInstructions}
          style={{
            position: "fixed",
            bottom: "28px",
            right: "28px",
            zIndex: 9999,
            display: "flex",
            alignItems: "center",
            gap: "8px",
            padding: "12px 22px",
            borderRadius: "12px",
            border: "none",
            cursor: "pointer",
            fontWeight: 700,
            fontSize: "15px",
            color: "#fff",
            background: "linear-gradient(135deg, #9B6DC6 0%, #6B3FA0 100%)",
            boxShadow: "0 4px 24px rgba(155,109,198,0.55), 0 2px 8px rgba(0,0,0,0.5)",
            letterSpacing: "0.03em",
            transition: "transform 0.15s, box-shadow 0.15s",
            animation: "fadeInUp 0.35s ease",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.transform = "scale(1.07)";
            e.currentTarget.style.boxShadow = "0 8px 36px rgba(155,109,198,0.75), 0 2px 8px rgba(0,0,0,0.5)";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.transform = "scale(1)";
            e.currentTarget.style.boxShadow = "0 4px 24px rgba(155,109,198,0.55), 0 2px 8px rgba(0,0,0,0.5)";
          }}
        >
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M2 3h6a4 4 0 0 1 4 4v14a3 3 0 0 0-3-3H2z" />
            <path d="M22 3h-6a4 4 0 0 0-4 4v14a3 3 0 0 1 3-3h7z" />
          </svg>
          Instructions
        </button>
      )}

      <style>{`
        @keyframes fadeInUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
