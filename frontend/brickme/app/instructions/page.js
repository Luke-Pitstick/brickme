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

// ── 3-D viewer component ─────────────────────────────────────────────────────

function ModelViewer({ dataUrl, bgColor = 0xf5f0e8 }) {
  const containerRef = useRef(null);
  const [status, setStatus] = useState("loading");

  useEffect(() => {
    if (!containerRef.current || !dataUrl) return;
    let animId, blobUrl, renderer;

    Promise.all([
      import("three"),
      import("three/examples/jsm/loaders/GLTFLoader.js"),
      import("three/examples/jsm/controls/OrbitControls.js"),
    ]).then(([THREE, { GLTFLoader }, { OrbitControls }]) => {
      const el = containerRef.current;
      if (!el) return;
      const w = el.clientWidth || 400;
      const h = el.clientHeight || 400;

      const scene = new THREE.Scene();
      scene.background = new THREE.Color(bgColor);

      const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 1000);
      camera.position.set(0, 8, 14);
      camera.lookAt(0, 0, 0);

      renderer = new THREE.WebGLRenderer({ antialias: true });
      renderer.setSize(w, h);
      renderer.setPixelRatio(window.devicePixelRatio);
      renderer.shadowMap.enabled = true;
      el.appendChild(renderer.domElement);

      scene.add(new THREE.AmbientLight(0xffffff, 1.1));
      const dir = new THREE.DirectionalLight(0xffffff, 1.4);
      dir.position.set(10, 20, 10);
      dir.castShadow = true;
      scene.add(dir);
      scene.add(new THREE.HemisphereLight(0xffffff, 0xcccccc, 0.6));

      const controls = new OrbitControls(camera, renderer.domElement);
      controls.enableDamping = true;
      controls.dampingFactor = 0.05;
      controls.autoRotate = true;
      controls.autoRotateSpeed = 2.5;
      controls.enableZoom = true;
      controls.maxDistance = 60;
      controls.minDistance = 1;
      controls.update();

      const animate = () => {
        animId = requestAnimationFrame(animate);
        controls.update();
        renderer.render(scene, camera);
      };
      animate();

      const loader = new GLTFLoader();
      fetch(dataUrl)
        .then(r => r.blob())
        .then(blob => {
          blobUrl = URL.createObjectURL(blob);
          loadModelFromUrl(blobUrl, loader, scene, THREE,
            () => { setStatus("ready"); URL.revokeObjectURL(blobUrl); },
            () => setStatus("error")
          );
        })
        .catch(() => setStatus("error"));

      const handleResize = () => {
        if (!el) return;
        const nw = el.clientWidth, nh = el.clientHeight;
        camera.aspect = nw / nh;
        camera.updateProjectionMatrix();
        renderer.setSize(nw, nh);
      };
      window.addEventListener("resize", handleResize);

      return () => {
        window.removeEventListener("resize", handleResize);
        cancelAnimationFrame(animId);
        renderer.dispose();
        if (blobUrl) URL.revokeObjectURL(blobUrl);
      };
    });
  }, [dataUrl]);

  return (
    <div style={{ width: "100%", height: "100%", position: "relative", borderRadius: "8px", overflow: "hidden" }}>
      <div ref={containerRef} style={{ width: "100%", height: "100%" }} />
      {status === "loading" && (
        <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: "12px", background: "rgba(245,240,232,0.9)" }}>
          <div style={{ width: "36px", height: "36px", borderRadius: "50%", border: "3px solid #E3000B", borderTopColor: "transparent", animation: "lego-spin 0.8s linear infinite" }} />
          <span style={{ color: "#E3000B", fontSize: "11px", fontWeight: 700, letterSpacing: "0.12em" }}>LOADING…</span>
        </div>
      )}
      <style>{`@keyframes lego-spin { to { transform: rotate(360deg); } }`}</style>
    </div>
  );
}

// ── Parts list data per step ─────────────────────────────────────────────────

const STEP_DATA = [
  {
    title: "Sort Your Pieces",
    desc: "Separate all bricks by colour and size before you begin.",
    parts: [
      { id: "3001", name: "Brick 2×4", color: "#E3000B", qty: 8 },
      { id: "3003", name: "Brick 2×2", color: "#E3000B", qty: 4 },
      { id: "3020", name: "Plate 2×4", color: "#F5C400", qty: 4 },
    ],
  },
  {
    title: "Build the Base",
    desc: "Lay flat plates to form a solid foundation.",
    parts: [
      { id: "3020", name: "Plate 2×4", color: "#006CB7", qty: 6 },
      { id: "3021", name: "Plate 2×3", color: "#006CB7", qty: 4 },
      { id: "3022", name: "Plate 2×2", color: "#ffffff", qty: 2 },
    ],
  },
  {
    title: "Raise the Walls",
    desc: "Stack bricks alternating joints each row.",
    parts: [
      { id: "3001", name: "Brick 2×4", color: "#F5C400", qty: 12 },
      { id: "3010", name: "Brick 1×4", color: "#F5C400", qty: 6 },
      { id: "3004", name: "Brick 1×2", color: "#F5C400", qty: 8 },
    ],
  },
  {
    title: "Add Details",
    desc: "Clip on windows, doors, and decorative elements.",
    parts: [
      { id: "60596", name: "Window 1×4×3", color: "#aee5ff", qty: 2 },
      { id: "60616", name: "Door 1×4×6", color: "#8B5C2A", qty: 1 },
      { id: "3070", name: "Tile 1×1", color: "#00A650", qty: 16 },
    ],
  },
  {
    title: "Final Assembly",
    desc: "Connect all sub-assemblies. Inspect every side.",
    parts: [
      { id: "3039", name: "Slope 2×2 45°", color: "#E3000B", qty: 8 },
      { id: "3040", name: "Slope 1×2 45°", color: "#E3000B", qty: 4 },
      { id: "3068", name: "Tile 2×2", color: "#333333", qty: 4 },
    ],
  },
];

// Small coloured brick icon for parts list
function BrickIcon({ color }) {
  return (
    <svg width="32" height="22" viewBox="0 0 32 22" fill="none" style={{ flexShrink: 0 }}>
      <rect x="1" y="8" width="30" height="13" rx="2" fill={color} stroke="rgba(0,0,0,0.15)" strokeWidth="0.8" />
      {[8, 16, 24].map(cx => (
        <g key={cx}>
          <rect x={cx - 5} y="3" width="10" height="5" rx="1.5" fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
          <ellipse cx={cx} cy="3" rx="5" ry="2.5" fill={color} stroke="rgba(0,0,0,0.12)" strokeWidth="0.6" />
        </g>
      ))}
      <rect x="3" y="10" width="2" height="8" rx="1" fill="rgba(255,255,255,0.2)" />
    </svg>
  );
}

// ── Main page ────────────────────────────────────────────────────────────────

export default function InstructionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0); // 0 = cover, 1-5 = steps
  const [modelDataUrl, setModelDataUrl] = useState(null);
  const [modelName, setModelName] = useState("My Model");
  const totalPages = STEP_DATA.length; // steps 1-5, plus cover = page 0

  useEffect(() => {
    const dataUrl = sessionStorage.getItem("uploadedModelDataUrl");
    const name = sessionStorage.getItem("uploadedModelName");
    if (dataUrl) { setModelDataUrl(dataUrl); setModelName(name?.replace(/\.[^.]+$/, "") || "My Model"); }
  }, []);

  const isCover = page === 0;
  const stepData = isCover ? null : STEP_DATA[page - 1];
  const stepIndex = page; // 1-based step number shown to user

  // Page turn
  const goNext = () => setPage(p => Math.min(totalPages, p + 1));
  const goPrev = () => setPage(p => Math.max(0, p - 1));

  return (
    <div style={{
      height: "100vh", overflow: "hidden",
      background: "#d4c9b0",   // warm LEGO booklet-shelf background
      fontFamily: "'Helvetica Neue', Arial, sans-serif",
      display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center",
      userSelect: "none",
    }}>

      {/* ── Page book ── */}
      <div style={{
        width: "min(96vw, 1100px)",
        height: "min(92vh, 700px)",
        background: "#faf6ee",   // cream booklet paper
        borderRadius: "4px 12px 12px 4px",
        boxShadow: "-4px 0 0 #bfb49a, 0 8px 40px rgba(0,0,0,0.35), inset 2px 0 6px rgba(0,0,0,0.08)",
        display: "flex", flexDirection: "column",
        overflow: "hidden",
        position: "relative",
      }}>

        {/* ── Top strip (LEGO yellow) ── */}
        <div style={{
          flexShrink: 0,
          background: "#F5C400",
          padding: "10px 20px",
          display: "flex", alignItems: "center", justifyContent: "space-between",
        }}>
          {/* LEGO logo mock */}
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
            <button
              onClick={() => router.back()}
              style={{
                background: "#E3000B", border: "none", borderRadius: "6px",
                color: "#fff", padding: "5px 14px", cursor: "pointer",
                fontWeight: 700, fontSize: "12px",
              }}
            >← BACK</button>

            {/* Page counter */}
            <div style={{
              background: "#fff", borderRadius: "20px", padding: "3px 14px",
              fontSize: "12px", fontWeight: 700, color: "#333",
              border: "2px solid #E3000B",
            }}>
              {isCover ? "COVER" : `${page} / ${totalPages}`}
            </div>
          </div>
        </div>

        {/* ── Main content area ── */}
        <div style={{ flex: 1, minHeight: 0, display: "flex", overflow: "hidden" }}>

          {isCover ? (
            /* ── COVER PAGE ── */
            <div style={{
              flex: 1, display: "flex", flexDirection: "column",
              alignItems: "center", justifyContent: "center", gap: "20px",
              background: "linear-gradient(160deg, #faf6ee 60%, #f0e8d0 100%)",
              padding: "32px",
            }}>
              <div style={{
                background: "#E3000B", color: "#fff", borderRadius: "50%",
                width: "80px", height: "80px", display: "flex",
                alignItems: "center", justifyContent: "center",
                fontSize: "36px", fontWeight: 900, boxShadow: "0 4px 16px rgba(227,0,11,0.4)",
                fontFamily: "'Arial Black', Arial, sans-serif",
              }}>!</div>

              <h1 style={{ fontSize: "32px", fontWeight: 900, color: "#1a1a1a", margin: 0, textAlign: "center", letterSpacing: "-0.01em" }}>
                {modelName.toUpperCase()}
              </h1>
              <p style={{ fontSize: "15px", color: "#777", margin: 0, textAlign: "center" }}>
                Assembly Instructions · {totalPages} Steps
              </p>

              {/* 3-D model preview on cover */}
              <div style={{ width: "360px", height: "240px", borderRadius: "12px", overflow: "hidden", border: "3px solid #E3000B", background: "#f5f0e8" }}>
                {modelDataUrl
                  ? <ModelViewer dataUrl={modelDataUrl} bgColor={0xf5f0e8} />
                  : <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", color: "#bbb", fontSize: "13px" }}>No model loaded</div>
                }
              </div>

              <button
                onClick={goNext}
                style={{
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

          ) : (
            /* ── STEP PAGE ── */
            <>
              {/* Left: big model view */}
              <div style={{
                flex: 1, minWidth: 0, display: "flex", flexDirection: "column",
                padding: "20px 16px 16px 20px", gap: "12px",
              }}>
                {/* Step badge */}
                <div style={{ display: "flex", alignItems: "center", gap: "10px" }}>
                  <div style={{
                    background: "#E3000B", color: "#fff", borderRadius: "50%",
                    width: "42px", height: "42px", display: "flex",
                    alignItems: "center", justifyContent: "center",
                    fontSize: "20px", fontWeight: 900, flexShrink: 0,
                    boxShadow: "0 2px 8px rgba(227,0,11,0.4)",
                  }}>{stepIndex}</div>
                  <div>
                    <div style={{ fontSize: "17px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>{stepData.title}</div>
                    <div style={{ fontSize: "12px", color: "#888", marginTop: "2px" }}>{stepData.desc}</div>
                  </div>
                </div>

                {/* 3-D model — fills remaining space */}
                <div style={{
                  flex: 1, minHeight: 0,
                  border: "2px solid #e0d8c8",
                  borderRadius: "10px", overflow: "hidden",
                  background: "#f5f0e8",
                }}>
                  {modelDataUrl
                    ? <ModelViewer dataUrl={modelDataUrl} bgColor={0xf5f0e8} />
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

              {/* Right: parts list panel */}
              <div style={{
                width: "220px", flexShrink: 0,
                borderLeft: "2px dashed #e0d8c8",
                display: "flex", flexDirection: "column",
                padding: "16px 14px",
                gap: "8px",
                background: "#fffdf7",
              }}>
                {/* Parts list header */}
                <div style={{
                  background: "#1a1a1a", color: "#F5C400",
                  borderRadius: "6px", padding: "6px 10px",
                  fontSize: "11px", fontWeight: 800, letterSpacing: "0.1em",
                  textAlign: "center", marginBottom: "4px",
                }}>PARTS LIST</div>

                {/* Parts */}
                {stepData.parts.map((part, i) => (
                  <div key={i} style={{
                    display: "flex", alignItems: "center", gap: "8px",
                    background: "#f5f0e8", borderRadius: "8px",
                    padding: "8px 10px", border: "1px solid #e8e0d0",
                  }}>
                    <BrickIcon color={part.color} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontSize: "10px", fontWeight: 700, color: "#1a1a1a", lineHeight: 1.2 }}>{part.name}</div>
                      <div style={{ fontSize: "9px", color: "#999", fontFamily: "monospace" }}>#{part.id}</div>
                    </div>
                    <div style={{
                      background: "#E3000B", color: "#fff",
                      borderRadius: "50%", width: "22px", height: "22px",
                      display: "flex", alignItems: "center", justifyContent: "center",
                      fontSize: "11px", fontWeight: 800, flexShrink: 0,
                    }}>×{part.qty}</div>
                  </div>
                ))}

                {/* Spacer then step dots */}
                <div style={{ flex: 1 }} />
                <div style={{ display: "flex", justifyContent: "center", gap: "5px", paddingTop: "4px" }}>
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
            </>
          )}
        </div>

        {/* ── Bottom bar with page-turn arrows ── */}
        {!isCover && (
          <div style={{
            flexShrink: 0,
            background: "#F5C400",
            padding: "8px 20px",
            display: "flex", alignItems: "center", justifyContent: "space-between",
          }}>
            {/* Prev */}
            <button
              onClick={goPrev}
              disabled={page <= 1}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: page <= 1 ? "rgba(0,0,0,0.1)" : "#E3000B",
                border: "none", borderRadius: "8px",
                color: page <= 1 ? "rgba(0,0,0,0.3)" : "#fff",
                padding: "8px 20px", cursor: page <= 1 ? "default" : "pointer",
                fontWeight: 800, fontSize: "13px", letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M15 18l-6-6 6-6"/></svg>
              PREV
            </button>

            {/* step indicator text */}
            <span style={{ fontWeight: 800, fontSize: "13px", color: "#333", letterSpacing: "0.05em" }}>
              STEP {page} OF {totalPages}
            </span>

            {/* Next */}
            <button
              onClick={goNext}
              disabled={page >= totalPages}
              style={{
                display: "flex", alignItems: "center", gap: "8px",
                background: page >= totalPages ? "rgba(0,0,0,0.1)" : "#E3000B",
                border: "none", borderRadius: "8px",
                color: page >= totalPages ? "rgba(0,0,0,0.3)" : "#fff",
                padding: "8px 20px", cursor: page >= totalPages ? "default" : "pointer",
                fontWeight: 800, fontSize: "13px", letterSpacing: "0.05em",
                transition: "all 0.15s",
              }}
            >
              NEXT
              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M9 18l6-6-6-6"/></svg>
            </button>
          </div>
        )}
      </div>

      {/* Page number below booklet */}
      {!isCover && (
        <div style={{ marginTop: "10px", fontSize: "11px", color: "#8a7a60", fontWeight: 600, letterSpacing: "0.08em" }}>
          PAGE {page} · {modelName.toUpperCase()}
        </div>
      )}
    </div>
  );
}
