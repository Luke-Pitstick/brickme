
"use client";

import { useState, useEffect, useRef } from "react";

// Helper function to load model from URL
function autoLoadModel(url, loader, scene, THREE) {
  loader.load(
    url,
    (gltf) => {
      console.log("Auto-loaded model successfully!", gltf);
      const model = gltf.scene;

      // Center and scale model
      const box = new THREE.Box3().setFromObject(model);
      const center = box.getCenter(new THREE.Vector3());
      const size = box.getSize(new THREE.Vector3());
      const maxDim = Math.max(size.x, size.y, size.z);
      const scale = 5 / maxDim;

      model.position.sub(center);
      model.scale.multiplyScalar(scale);
      scene.add(model);

      console.log("Model added to scene. Position:", model.position, "Scale:", model.scale);
    },
    undefined,
    (err) => {
      console.error("Failed to auto-load model:", err);
    }
  );
}

export default function ModelViewer() {
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const cameraRef = useRef(null);
  const modelRef = useRef(null);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [threeMounted, setThreeMounted] = useState(false);

  // Initialize Three.js scene
  useEffect(() => {
    if (!containerRef.current) return;

    console.log("Initializing Three.js scene...");

    // Check for auto-load model from home page
    if (typeof window !== "undefined") {
      const storedUrl = localStorage.getItem("modelUrl");
      if (storedUrl) {
        console.log("Found stored model URL, will auto-load:", storedUrl);
        localStorage.removeItem("modelUrl");
      }
    }

    // Dynamically import Three.js to avoid SSR issues
    Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      try {
        // Scene setup
        const scene = new THREE.Scene();
        scene.background = new THREE.Color(0x2a2a2a);
        sceneRef.current = scene;

        // Camera setup
        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
        camera.position.set(0, 0, 10);
        cameraRef.current = camera;

        // Renderer setup
        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);
        rendererRef.current = renderer;

        console.log("Renderer initialized:", { width, height });

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.8);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 1);
        directionalLight.position.set(10, 20, 10);
        scene.add(directionalLight);

        const hemisphereLight = new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6);
        scene.add(hemisphereLight);

        // Orbit Controls
        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;
        controls.dampingFactor = 0.05;
        controls.autoRotate = true;
        controls.autoRotateSpeed = 4;
        controls.enableZoom = true;
        controls.enablePan = true;
        controls.maxDistance = 100;
        controls.minDistance = 1;

        // Grid helper
        const gridHelper = new THREE.GridHelper(50, 50, 0x444444, 0x222222);
        scene.add(gridHelper);

        // Store loader for later use
        const gltfLoader = new GLTFLoader();
        window.__gltfLoader = gltfLoader;
        window.__scene = scene;
        window.__camera = camera;
        window.__controls = controls;
        window.__THREE = THREE;

        // Animation loop
        const animate = () => {
          requestAnimationFrame(animate);
          controls.update();
          renderer.render(scene, camera);
        };
        animate();

        // Handle resize
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
        console.log("Three.js scene initialized successfully!");

        // Auto-load stored model if exists
        const storedUrl = localStorage.getItem("modelUrl");
        if (storedUrl) {
          console.log("Auto-loading stored model:", storedUrl);
          localStorage.removeItem("modelUrl");
          autoLoadModel(storedUrl, gltfLoader, scene, THREE);
        }

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
        };
      } catch (err) {
        console.error("Failed to initialize Three.js:", err);
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
    setFileName(file.name);

    try {
      const url = URL.createObjectURL(file);
      console.log("Loading model from:", url);

      const THREE = await import("three");
      const { GLTFLoader } = await import("three/examples/jsm/loaders/GLTFLoader.js");

      const loader = new GLTFLoader();

      loader.load(
        url,
        (gltf) => {
          console.log("Model loaded successfully!", gltf);

          // Remove previous model
          if (modelRef.current) {
            sceneRef.current.remove(modelRef.current);
          }

          const model = gltf.scene;
          modelRef.current = model;

          // Traverse and log model structure
          model.traverse((node) => {
            if (node.isMesh) {
              node.castShadow = true;
              node.receiveShadow = true;
              console.log("Mesh found:", node.name, node.geometry.boundingBox);
            }
          });

          // Center and scale model
          const box = new THREE.Box3().setFromObject(model);
          const center = box.getCenter(new THREE.Vector3());
          const size = box.getSize(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z);
          const scale = 5 / maxDim;

          console.log("Model dimensions:", { size, center, maxDim, scale });

          model.position.sub(center);
          model.scale.multiplyScalar(scale);

          sceneRef.current.add(model);

          console.log("Model added to scene. Position:", model.position, "Scale:", model.scale);

          setLoading(false);
          URL.revokeObjectURL(url);
        },
        (progress) => {
          const percent = ((progress.loaded / progress.total) * 100).toFixed(0);
          console.log("Loading progress:", percent + "%");
        },
        (err) => {
          console.error("Model load error:", err);
          setError("Failed to load model: " + (err.message || "Unknown error"));
          setLoading(false);
          URL.revokeObjectURL(url);
        }
      );
    } catch (err) {
      console.error("File upload error:", err);
      setError("Error: " + err.message);
      setLoading(false);
    }
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
      {/* Header */}
      <div className="bg-gray-800 text-white p-6 shadow-lg z-10">
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

          {!threeMounted && (
            <div className="text-yellow-400 text-sm">Initializing 3D viewer...</div>
          )}
        </div>

        {error && <div className="mt-3 text-red-400 text-sm">{error}</div>}
      </div>

      {/* 3D Viewer */}
      <div
        ref={containerRef}
        className="flex-1 bg-gray-800 relative overflow-hidden"
        style={{ width: "100%", height: "100%" }}
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
    </div>
  );
}
