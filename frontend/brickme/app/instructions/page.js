"use client";

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";

// ── Three.js helpers ─────────────────────────────────────────────────────────

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
        if (child.isMesh) { child.castShadow = true; child.receiveShadow = true; }
      });
      centerAndScaleModel(model, THREE);
      scene.add(model);
      onDone?.(model);
    },
    undefined,
    (err) => { console.error(err); onError?.(err); }
  );
}

// Shared Three.js init — reused by both full viewer and mini thumbnails
function createViewer(el, { bgColor = 0xf5f0e8, autoRotate = false, fov = 55, camPos = [0, 8, 14] } = {}) {
  const THREE_ref = {};
  let animId, renderer, controls;

  const promise = Promise.all([
    import("three"),
    import("three/examples/jsm/loaders/GLTFLoader.js"),
    import("three/examples/jsm/controls/OrbitControls.js"),
  ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
    THREE_ref.THREE = THREE;
    const w = el.clientWidth || 300;
    const h = el.clientHeight || 300;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(bgColor);

    const camera = new THREE.PerspectiveCamera(fov, w / h, 0.1, 1000);
    camera.position.set(...camPos);
    camera.lookAt(0, 0, 0);

    renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(w, h);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.shadowMap.enabled = true;
    el.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 1.1));
    const dir = new THREE.DirectionalLight(0xffffff, 1.4);
    dir.position.set(10, 20, 10);
    dir.castShadow = true;
    scene.add(dir);
    scene.add(new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.5));

    controls = new OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.06;
    controls.autoRotate = autoRotate;
    controls.enableZoom = true;
    controls.maxDistance = 80;
    controls.minDistance = 0.5;
    controls.update();

    const animate = () => {
      animId = requestAnimationFrame(animate);
      controls.update();
      renderer.render(scene, camera);
    };
    animate();

    const loader = new GLTFLoader();

    const handleResize = () => {
      const nw = el.clientWidth, nh = el.clientHeight;
      if (!nw || !nh) return;
      camera.aspect = nw / nh;
      camera.updateProjectionMatrix();
      renderer.setSize(nw, nh);
    };
    window.addEventListener("resize", handleResize);

    return {
      THREE, scene, camera, renderer, controls, loader,
      destroy: () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
        controls.dispose();
        renderer.dispose();
        if (el.contains(renderer.domElement)) el.removeChild(renderer.domElement);
      },
    };
  });

  return promise;
}

// ── Full 3-D viewer (main panel + cover) ────────────────────────────────────

function ModelViewer({ dataUrl }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    const el = containerRef.current;
    if (!el || !dataUrl) return;

    // Single state object visible to both the async chain and the cleanup
    const s = { destroyed: false, viewer: null, blobUrl: null };
    setStatus("loading");

    createViewer(el, { bgColor: 0xf5f0e8, autoRotate: false }).then((v) => {
      if (s.destroyed) { v.destroy(); return; }
      s.viewer = v;

      // dataUrl is already a data-URL — convert to blob for GLTFLoader
      fetch(dataUrl)
        .then(r => r.blob())
        .then(blob => {
          if (s.destroyed) return;
          s.blobUrl = URL.createObjectURL(blob);
          loadModelFromUrl(s.blobUrl, v.loader, v.scene, v.THREE,
            () => {
              if (s.blobUrl) { URL.revokeObjectURL(s.blobUrl); s.blobUrl = null; }
              if (!s.destroyed) setStatus("ready");
            },
            () => { if (!s.destroyed) setStatus("error"); }
          );
        })
        .catch(() => { if (!s.destroyed) setStatus("error"); });
    });

    return () => {
      s.destroyed = true;
      s.viewer?.destroy();
      if (s.blobUrl) { URL.revokeObjectURL(s.blobUrl); s.blobUrl = null; }
    };
  }, [dataUrl]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", borderRadius: "8px", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "10px", background: "rgba(245,240,232,0.92)" }}>
          <div style={{ width: "32px", height: "32px", borderRadius: "50%", border: "3px solid #E3000B", borderTopColor: "transparent", animation: "lspin 0.8s linear infinite" }} />
          <span style={{ color: "#E3000B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.1em" }}>LOADING…</span>
        </div>
      )}
      <style>{`@keyframes lspin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Mini placeholder brick thumbnail ─────────────────────────────────────────
// Renders a coloured 3-D LEGO-style brick using Three.js geometry.
// `shape` controls the proportions: "2x4" | "2x2" | "1x4" | "1x2" | "slope" | "tile"

const BRICK_SHAPES = {
  "2x4":  { w: 2.0, h: 1.0, d: 1.0, studs: [[-.75,0,.25],[-.25,0,.25],[.25,0,.25],[.75,0,.25],[-.75,0,-.25],[-.25,0,-.25],[.25,0,-.25],[.75,0,-.25]] },
  "2x2":  { w: 1.0, h: 1.0, d: 1.0, studs: [[-.25,0,.25],[.25,0,.25],[-.25,0,-.25],[.25,0,-.25]] },
  "1x4":  { w: 2.0, h: 0.6, d: 0.5, studs: [[-.75,0,0],[-.25,0,0],[.25,0,0],[.75,0,0]] },
  "1x2":  { w: 1.0, h: 0.6, d: 0.5, studs: [[-.25,0,0],[.25,0,0]] },
  "slope": { w: 1.0, h: 1.0, d: 1.0, studs: [] },
  "tile":  { w: 1.0, h: 0.3, d: 1.0, studs: [] },
};

function BrickThumb({ color, shape = "2x4" }) {
  const ref = useRef(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;

    // state object shared between the async import and the cleanup closure
    const s = { animId: null, renderer: null, destroyed: false };

    import("three").then((THREE) => {
      if (s.destroyed) return;

      const W = el.clientWidth || 60;
      const H = el.clientHeight || 52;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(0xf5f0e8);

      const camera = new THREE.PerspectiveCamera(42, W / H, 0.1, 100);
      camera.position.set(2.8, 2.2, 3.2);
      camera.lookAt(0, 0, 0);

      const renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(W, H);
      renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);
      s.renderer = renderer;

      scene.add(new THREE.AmbientLight(0xffffff, 0.9));
      const dir = new THREE.DirectionalLight(0xffffff, 1.6);
      dir.position.set(5, 8, 5);
      dir.castShadow = true;
      scene.add(dir);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xddddcc, 0.4));

      const brickColor = new THREE.Color(color);
      const mat = new THREE.MeshStandardMaterial({ color: brickColor, roughness: 0.45, metalness: 0.05 });
      const darkMat = new THREE.MeshStandardMaterial({ color: brickColor.clone().multiplyScalar(0.75), roughness: 0.5 });
      const cfg = BRICK_SHAPES[shape] || BRICK_SHAPES["2x4"];

      const body = new THREE.Mesh(new THREE.BoxGeometry(cfg.w, cfg.h, cfg.d), mat);
      body.castShadow = true;
      if (shape === "slope") body.rotation.z = -0.5;
      scene.add(body);

      cfg.studs.forEach(([sx, , sz]) => {
        const stud = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.14, 0.18, 12), mat);
        stud.position.set(sx, cfg.h / 2 + 0.09, sz);
        stud.castShadow = true;
        scene.add(stud);
      });

      if (shape !== "slope" && shape !== "tile") {
        const rim = new THREE.Mesh(new THREE.BoxGeometry(cfg.w * 0.9, 0.08, cfg.d * 0.9), darkMat);
        rim.position.y = -cfg.h / 2 + 0.04;
        scene.add(rim);
      }

      const animate = () => {
        if (s.destroyed) return;
        s.animId = requestAnimationFrame(animate);
        renderer.render(scene, camera);
      };
      animate();
    });

    // Single cleanup — destroyed flag stops the loop even if import hasn't resolved yet
    return () => {
      s.destroyed = true;
      if (s.animId) cancelAnimationFrame(s.animId);
      if (s.renderer) {
        s.renderer.dispose();
        if (el.contains(s.renderer.domElement)) el.removeChild(s.renderer.domElement);
      }
    };
  }, [color, shape]);

  return (
    <div ref={ref} style={{
      width: "60px", height: "52px", borderRadius: "6px",
      overflow: "hidden", flexShrink: 0,
      border: `2px solid ${color}`,
    }} />
  );
}

// ── Parts list data per step ─────────────────────────────────────────────────

const STEP_DATA = [
  {
    title: "Sort Your Pieces",
    desc: "Separate all bricks by colour and size before you begin.",
    parts: [
      { id: "3001", name: "Brick 2×4",  color: "#E3000B", qty: 8,  shape: "2x4" },
      { id: "3003", name: "Brick 2×2",  color: "#E3000B", qty: 4,  shape: "2x2" },
      { id: "3020", name: "Plate 2×4",  color: "#F5C400", qty: 4,  shape: "1x4" },
    ],
  },
  {
    title: "Build the Base",
    desc: "Lay flat plates to form a solid foundation.",
    parts: [
      { id: "3020", name: "Plate 2×4",  color: "#006CB7", qty: 6,  shape: "2x4" },
      { id: "3021", name: "Plate 2×3",  color: "#006CB7", qty: 4,  shape: "1x4" },
      { id: "3022", name: "Plate 2×2",  color: "#cccccc", qty: 2,  shape: "2x2" },
    ],
  },
  {
    title: "Raise the Walls",
    desc: "Stack bricks alternating joints each row.",
    parts: [
      { id: "3001", name: "Brick 2×4",  color: "#F5C400", qty: 12, shape: "2x4" },
      { id: "3010", name: "Brick 1×4",  color: "#F5C400", qty: 6,  shape: "1x4" },
      { id: "3004", name: "Brick 1×2",  color: "#F5C400", qty: 8,  shape: "1x2" },
    ],
  },
  {
    title: "Add Details",
    desc: "Clip on windows, doors, and decorative elements.",
    parts: [
      { id: "60596", name: "Window 1×4×3", color: "#6ec6f5", qty: 2,  shape: "1x4" },
      { id: "60616", name: "Door 1×4×6",   color: "#8B5C2A", qty: 1,  shape: "2x4" },
      { id: "3070",  name: "Tile 1×1",     color: "#00A650", qty: 16, shape: "tile" },
    ],
  },
  {
    title: "Final Assembly",
    desc: "Connect all sub-assemblies. Inspect every side.",
    parts: [
      { id: "3039", name: "Slope 2×2 45°", color: "#E3000B", qty: 8, shape: "slope" },
      { id: "3040", name: "Slope 1×2 45°", color: "#E3000B", qty: 4, shape: "1x2"   },
      { id: "3068", name: "Tile 2×2",      color: "#333333", qty: 4, shape: "tile"  },
    ],
  },
];

// ── Main page ────────────────────────────────────────────────────────────────

export default function InstructionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [modelDataUrl, setModelDataUrl] = useState(null);
  const [modelName, setModelName] = useState("My Model");
  const [lastTimestamp, setLastTimestamp] = useState(null);
  const totalPages = STEP_DATA.length;

  // Read sessionStorage on mount AND whenever the tab regains focus
  // (covers: user goes back to viewer, uploads new model, returns here)
  useEffect(() => {
    const load = () => {
      const dataUrl   = sessionStorage.getItem("uploadedModelDataUrl");
      const name      = sessionStorage.getItem("uploadedModelName");
      const timestamp = sessionStorage.getItem("uploadedModelTimestamp");
      if (dataUrl) {
        // Use timestamp as cheap change-detection key instead of comparing giant base64 strings
        setLastTimestamp(prev => {
          if (prev !== timestamp) {
            setModelDataUrl(dataUrl);
            setModelName((name || "model").replace(/\.[^.]+$/, ""));
            setPage(0);
          }
          return timestamp;
        });
      }
    };

    load(); // run immediately on mount

    // Also re-run when the page becomes visible again after being hidden
    const onVisible = () => { if (document.visibilityState === "visible") load(); };
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", load);

    return () => {
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", load);
    };
  }, []);

  const isCover   = page === 0;
  const stepData  = isCover ? null : STEP_DATA[page - 1];

  const goNext = () => setPage(p => Math.min(totalPages, p + 1));
  const goPrev = () => setPage(p => Math.max(0, p - 1));

  return (
    <div style={{
      height: "100vh", overflow: "hidden",
      background: "#d4c9b0",
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      userSelect: "none",
    }}>
      {/* ── Book ── */}
      <div style={{
        width: "min(96vw, 1100px)",
        height: "min(92vh, 700px)",
        background: "#faf6ee",
        borderRadius: "4px 12px 12px 4px",
        boxShadow: "-4px 0 0 #bfb49a, 0 8px 40px rgba(0,0,0,0.35), inset 2px 0 6px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* ── Yellow top strip ── */}
        <div style={{
          flexShrink: 0, background: "#F5C400",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
            <div style={{
              background: "#E3000B", color: "#F5C400", fontWeight: 900,
              fontSize: "18px", padding: "2px 10px", borderRadius: "4px",
              letterSpacing: "0.05em", border: "2px solid #c00",
              fontFamily: "'Arial Black', Arial, sans-serif",
            }}>LEGO</div>
            <span style={{ fontWeight: 700, fontSize: "13px", color: "#333", letterSpacing: "0.03em" }}>
              {modelName.toUpperCase()}
            </span>
          </div>
          <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
            <button onClick={() => router.back()} style={{
              background: "#E3000B", border: "none", borderRadius: "6px",
              color: "#fff", padding: "5px 14px", cursor: "pointer",
              fontWeight: 700, fontSize: "12px",
            }}>← BACK</button>
            <div style={{
              background: "#fff", borderRadius: "20px", padding: "3px 14px",
              fontSize: "12px", fontWeight: 700, color: "#333",
              border: "2px solid #E3000B",
            }}>
              {isCover ? "COVER" : `${page} / ${totalPages}`}
            </div>
          </div>
        </div>

        {/* ── Content ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden", position: "relative" }}>

          {/* ── COVER — hidden via pointer-events+opacity when on a step ── */}
          <div style={{
            position: "absolute", inset: 0, zIndex: isCover ? 2 : 0,
            opacity: isCover ? 1 : 0, pointerEvents: isCover ? "auto" : "none",
            transition: "opacity 0.2s",
            display: "flex", flexDirection: "column",
            alignItems: "center", justifyContent: "center", gap: "18px",
            background: "linear-gradient(160deg, #faf6ee 60%, #f0e8d0 100%)",
            padding: "28px",
          }}>
            <div style={{
              background: "#E3000B", color: "#fff", borderRadius: "50%",
              width: "72px", height: "72px", display: "flex",
              alignItems: "center", justifyContent: "center",
              fontSize: "32px", fontWeight: 900,
              boxShadow: "0 4px 16px rgba(227,0,11,0.4)",
              fontFamily: "'Arial Black', Arial, sans-serif",
            }}>!</div>
            <h1 style={{ fontSize: "30px", fontWeight: 900, color: "#1a1a1a", margin: 0, textAlign: "center" }}>
              {modelName.toUpperCase()}
            </h1>
            <p style={{ fontSize: "14px", color: "#888", margin: 0, textAlign: "center" }}>
              Assembly Instructions · {totalPages} Steps
            </p>
            {/* Cover viewer — always mounted, never unmounts */}
            <div style={{ width: "360px", height: "230px", borderRadius: "12px", overflow: "hidden", border: "3px solid #E3000B", background: "#f5f0e8" }}>
              {modelDataUrl
                ? <ModelViewer key={modelDataUrl} dataUrl={modelDataUrl} />
                : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "13px" }}>No model loaded</div>
              }
            </div>
            <button onClick={goNext} style={{
              background: "#E3000B", color: "#fff", border: "none",
              borderRadius: "8px", padding: "12px 36px",
              fontSize: "15px", fontWeight: 800, cursor: "pointer",
              letterSpacing: "0.06em", boxShadow: "0 4px 12px rgba(227,0,11,0.35)",
              transition: "transform 0.1s",
            }}
              onMouseEnter={e => e.currentTarget.style.transform = "scale(1.04)"}
              onMouseLeave={e => e.currentTarget.style.transform = "scale(1)"}
            >START BUILDING →</button>
          </div>

          {/* ── STEP PAGES — always mounted, hidden on cover ── */}
          <div style={{
            position: "absolute", inset: 0, zIndex: isCover ? 0 : 2,
            opacity: isCover ? 0 : 1, pointerEvents: isCover ? "none" : "auto",
            transition: "opacity 0.2s",
            display: "flex", overflow: "hidden",
          }}>
            {/* Left: persistent model viewer — NEVER conditionally rendered */}
            <div style={{
              flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
              padding: "18px 14px 14px 18px", gap: "10px",
            }}>
              {/* Step header — updates text only, no remount */}
              <div style={{ display: "flex", alignItems: "center", gap: "10px", flexShrink: 0 }}>
                <div style={{
                  background: "#E3000B", color: "#fff", borderRadius: "50%",
                  width: "40px", height: "40px", display: "flex",
                  alignItems: "center", justifyContent: "center",
                  fontSize: "19px", fontWeight: 900, flexShrink: 0,
                  boxShadow: "0 2px 8px rgba(227,0,11,0.4)",
                }}>{page}</div>
                <div>
                  <div style={{ fontSize: "16px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
                    {stepData?.title ?? ""}
                  </div>
                  <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>
                    {stepData?.desc ?? ""}
                  </div>
                </div>
              </div>

              {/* Model container — always present, ModelViewer never torn down */}
              <div style={{
                flex: 1, minHeight: 0,
                border: "2px solid #e0d8c8",
                borderRadius: "10px", overflow: "hidden",
                background: "#f5f0e8",
              }}>
                {modelDataUrl
                  ? <ModelViewer key={modelDataUrl} dataUrl={modelDataUrl} />
                  : (
                    <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#ccc", flexDirection: "column", gap: "8px" }}>
                      <svg width="48" height="48" viewBox="0 0 72 72" fill="none">
                        <rect x="12" y="20" width="36" height="36" rx="2" stroke="#ccc" strokeWidth="2" />
                        <rect x="24" y="10" width="36" height="36" rx="2" stroke="#ccc" strokeWidth="1.5" strokeDasharray="4 2" />
                        <line x1="12" y1="20" x2="24" y2="10" stroke="#ccc" strokeWidth="1.5" />
                        <line x1="48" y1="20" x2="60" y2="10" stroke="#ccc" strokeWidth="1.5" />
                      </svg>
                      <span style={{ fontSize: "12px" }}>No model loaded</span>
                    </div>
                  )
                }
              </div>
            </div>

            {/* Right: parts list — content swaps, BrickThumbs stay mounted */}
            <div style={{
              width: "220px", flexShrink: 0,
              borderLeft: "2px dashed #e0d8c8",
              display: "flex", flexDirection: "column",
              padding: "14px 12px", gap: "8px",
              background: "#fffdf7", overflow: "hidden",
            }}>
              <div style={{
                background: "#1a1a1a", color: "#F5C400",
                borderRadius: "6px", padding: "5px 10px",
                fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em",
                textAlign: "center", flexShrink: 0,
              }}>PARTS LIST</div>

              {/* Render all steps' parts but only show current step's */}
              {STEP_DATA.map((sd, si) => (
                <div key={si} style={{ display: si + 1 === page ? "flex" : "none", flexDirection: "column", gap: "8px", flex: 1, minHeight: 0 }}>
                  {sd.parts.map((part, i) => (
                    <div key={i} style={{
                      display: "flex", alignItems: "center", gap: "8px",
                      background: "#f5f0e8", borderRadius: "8px",
                      padding: "6px 8px", border: "1px solid #e8e0d0",
                      flexShrink: 0,
                    }}>
                      <BrickThumb color={part.color} shape={part.shape} />
                      <div style={{ flex: 1, minWidth: 0 }}>
                        <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.3 }}>{part.name}</div>
                        <div style={{ fontSize: "9px", color: "#999", fontFamily: "monospace" }}>#{part.id}</div>
                      </div>
                      <div style={{
                        background: "#E3000B", color: "#fff",
                        borderRadius: "50%", width: "22px", height: "22px",
                        display: "flex", alignItems: "center", justifyContent: "center",
                        fontSize: "10px", fontWeight: 800, flexShrink: 0,
                      }}>×{part.qty}</div>
                    </div>
                  ))}
                  <div style={{ flex: 1 }} />
                </div>
              ))}

              {/* Step dots */}
              <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "4px", flexShrink: 0 }}>
                {STEP_DATA.map((_, i) => (
                  <button key={i} onClick={() => setPage(i + 1)} style={{
                    width: i + 1 === page ? "20px" : "7px",
                    height: "7px", borderRadius: "4px",
                    background: i + 1 === page ? "#E3000B" : "#ccc",
                    border: "none", cursor: "pointer",
                    transition: "all 0.2s", padding: 0,
                  }} />
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* ── Yellow bottom bar with page-turn buttons ── */}
        {!isCover && (
          <div style={{
            flexShrink: 0, background: "#F5C400",
            padding: "8px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            <button onClick={goPrev} disabled={page <= 1} style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: page <= 1 ? "rgba(0,0,0,0.1)" : "#E3000B",
              border: "none", borderRadius: "8px",
              color: page <= 1 ? "rgba(0,0,0,0.25)" : "#fff",
              padding: "8px 20px", cursor: page <= 1 ? "default" : "pointer",
              fontWeight: 800, fontSize: "13px", letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}>
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              PREV
            </button>

            <span style={{ fontWeight: 800, fontSize: "13px", color: "#333", letterSpacing: "0.05em" }}>
              STEP {page} OF {totalPages}
            </span>

            <button onClick={goNext} disabled={page >= totalPages} style={{
              display: "flex", alignItems: "center", gap: "6px",
              background: page >= totalPages ? "rgba(0,0,0,0.1)" : "#E3000B",
              border: "none", borderRadius: "8px",
              color: page >= totalPages ? "rgba(0,0,0,0.25)" : "#fff",
              padding: "8px 20px", cursor: page >= totalPages ? "default" : "pointer",
              fontWeight: 800, fontSize: "13px", letterSpacing: "0.05em",
              transition: "all 0.15s",
            }}>
              NEXT
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}
      </div>

      {!isCover && (
        <div style={{ marginTop: "8px", fontSize: "11px", color: "#8a7a60", fontWeight: 600, letterSpacing: "0.08em" }}>
          PAGE {page} · {modelName.toUpperCase()}
        </div>
      )}
    </div>
  );
}
