"use client";

import { useState, useEffect, useRef, Suspense } from "react";
import { useSearchParams } from "next/navigation";

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

  // Sit flush on grid
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

function ModelViewerInner() {
  const searchParams = useSearchParams();
  const containerRef = useRef(null);
  const sceneRef = useRef(null);
  const modelRef = useRef(null);
  const loaderRef = useRef(null);
  const THREERef = useRef(null);
  const readyRef = useRef(false);
  const [fileName, setFileName] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [threeMounted, setThreeMounted] = useState(false);

  const loadUrl = useRef((modelUrl) => {
    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }
    setLoading(true);
    setError("");
    setFileName("Generated Model");
    loadModelFromUrl(
      modelUrl,
      loaderRef.current,
      sceneRef.current,
      THREERef.current,
      (model) => { modelRef.current = model; setLoading(false); },
      (err) => { setError("Failed to load model: " + (err.message || "Unknown error")); setLoading(false); }
    );
  });

  // Initialize Three.js once — then immediately load model from window.location
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
        scene.background = new THREE.Color(0x2a2a2a);
        sceneRef.current = scene;

        const width = containerRef.current.clientWidth;
        const height = containerRef.current.clientHeight;
        const camera = new THREE.PerspectiveCamera(75, width / height, 0.1, 2000);
        camera.position.set(0, 10, 0);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(width, height);
        renderer.setPixelRatio(window.devicePixelRatio);
        containerRef.current.appendChild(renderer.domElement);

        scene.add(new THREE.AmbientLight(0xffffff, 0.8));
        const dirLight = new THREE.DirectionalLight(0xffffff, 1);
        dirLight.position.set(10, 20, 10);
        scene.add(dirLight);
        scene.add(new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6));

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

        readyRef.current = true;
        setThreeMounted(true);

        // Read directly from window.location — bypasses React render timing issues
        const params = new URLSearchParams(window.location.search);
        const modelUrl = params.get("modelUrl");
        if (modelUrl) loadUrl.current(modelUrl);

        return () => {
          window.removeEventListener("resize", handleResize);
          renderer.dispose();
        };
      } catch (err) {
        setError("Failed to initialize 3D viewer: " + err.message);
      }
    });
  }, []);

  // Handle URL changes after init (e.g. user navigates to a different model)
  useEffect(() => {
    if (!readyRef.current) return; // first load is handled inside init
    const modelUrl = searchParams.get("modelUrl");
    if (!modelUrl) return;
    loadUrl.current(modelUrl);
  }, [searchParams]);

  const handleFileUpload = (e) => {
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

    const url = URL.createObjectURL(file);

    if (modelRef.current) {
      sceneRef.current.remove(modelRef.current);
      modelRef.current = null;
    }

    loadModelFromUrl(
      url,
      loaderRef.current,
      sceneRef.current,
      THREERef.current,
      (model) => { modelRef.current = model; setLoading(false); URL.revokeObjectURL(url); },
      (err) => { setError("Failed to load model: " + (err.message || "Unknown error")); setLoading(false); URL.revokeObjectURL(url); }
    );
  };

  return (
    <div className="w-full h-screen flex flex-col bg-gray-900">
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

export default function ModelViewer() {
  return (
    <Suspense fallback={
      <div className="w-full h-screen flex items-center justify-center bg-gray-900">
        <div className="text-white text-center">
          <div className="w-12 h-12 border-4 border-[#9B6DC6] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
          <p>Loading viewer...</p>
        </div>
      </div>
    }>
      <ModelViewerInner />
    </Suspense>
  );
}
