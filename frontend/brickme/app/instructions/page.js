"use client";

import React, { useEffect, useMemo, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import * as THREE from "three";
import { GLTFLoader } from "three/examples/jsm/loaders/GLTFLoader.js";

/* =========================
   Tiny LEGO-like part icons
   ========================= */
function BrickThumb({ color = "#d32f2f", shape = "2x4" }) {
  const dims =
    shape === "1x2" ? { w: 34, h: 18, studsX: 2, studsY: 1 } :
    shape === "1x4" ? { w: 56, h: 18, studsX: 4, studsY: 1 } :
    shape === "2x2" ? { w: 34, h: 34, studsX: 2, studsY: 2 } :
    { w: 56, h: 34, studsX: 4, studsY: 2 };

  const studs = [];
  const pad = 6;
  const sx = (dims.w - pad * 2) / Math.max(1, dims.studsX - 1 || 1);
  const sy = (dims.h - pad * 2) / Math.max(1, dims.studsY - 1 || 1);

  for (let y = 0; y < dims.studsY; y++) {
    for (let x = 0; x < dims.studsX; x++) {
      studs.push({
        x: dims.studsX === 1 ? dims.w / 2 : pad + x * sx,
        y: dims.studsY === 1 ? dims.h / 2 : pad + y * sy,
      });
    }
  }

  return (
    <svg width={dims.w} height={dims.h} viewBox={`0 0 ${dims.w} ${dims.h}`} aria-hidden>
      <defs>
        <filter id="shadow" x="-50%" y="-50%" width="200%" height="200%">
          <feDropShadow dx="0" dy="1" stdDeviation="1" floodOpacity="0.15" />
        </filter>
      </defs>
      <rect
        x="1"
        y="1"
        rx="8"
        ry="8"
        width={dims.w - 2}
        height={dims.h - 2}
        fill={color}
        stroke="rgba(0,0,0,0.15)"
        filter="url(#shadow)"
      />
      {studs.map((s, i) => (
        <g key={i}>
          <ellipse cx={s.x} cy={s.y + 1.5} rx="4.5" ry="2.2" fill="rgba(0,0,0,0.12)" />
          <circle cx={s.x} cy={s.y} r="4.5" fill="rgba(255,255,255,0.22)" />
          <circle cx={s.x} cy={s.y} r="3.9" fill={color} />
        </g>
      ))}
    </svg>
  );
}

/* =========================
   Three.js model viewer
   ========================= */
function centerAndScaleModel(model, THREE) {
  model.position.set(0, 0, 0);
  model.rotation.set(0, 0, 0);
  model.scale.set(1, 1, 1);
  model.updateMatrixWorld(true);

  const box = new THREE.Box3().setFromObject(model);
  const center = box.getCenter(new THREE.Vector3());
  const size = box.getSize(new THREE.Vector3());
  const maxDim = Math.max(size.x, size.y, size.z, 1);
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

function ModelViewer({ dataUrl }) {
  const mountRef = useRef(null);

  useEffect(() => {
    if (!mountRef.current || !dataUrl) return;

    const mount = mountRef.current;
    const width = mount.clientWidth;
    const height = mount.clientHeight;

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0xece6da);

    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.set(7, 8, 7);
    camera.lookAt(0, 1, 0);

    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(width, height);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    mount.appendChild(renderer.domElement);

    scene.add(new THREE.AmbientLight(0xffffff, 0.8));

    const dirLight = new THREE.DirectionalLight(0xffffff, 1.2);
    dirLight.position.set(10, 20, 10);
    scene.add(dirLight);

    scene.add(new THREE.HemisphereLight(0x87ceeb, 0x444444, 0.6));

    const loader = new GLTFLoader();
    let cancelled = false;
    let model = null;

    loader.load(
      dataUrl,
      (gltf) => {
        if (cancelled) return;

        model = gltf.scene;

        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
          }
        });

        centerAndScaleModel(model, THREE);
        scene.add(model);
      },
      undefined,
      (err) => {
        console.error("Failed to load model:", err);
      }
    );

    let frameId;
    const animate = () => {
      frameId = requestAnimationFrame(animate);
      renderer.render(scene, camera);
    };
    animate();

    const onResize = () => {
      if (!mountRef.current) return;
      const w = mountRef.current.clientWidth;
      const h = mountRef.current.clientHeight;
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
      renderer.setSize(w, h);
    };

    window.addEventListener("resize", onResize);

    return () => {
      cancelled = true;
      window.removeEventListener("resize", onResize);
      cancelAnimationFrame(frameId);
      renderer.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
      scene.traverse((obj) => {
        if (obj.geometry) obj.geometry.dispose?.();
        if (obj.material) {
          if (Array.isArray(obj.material)) obj.material.forEach((m) => m.dispose?.());
          else obj.material.dispose?.();
        }
      });
    };
  }, [dataUrl]);

  return <div ref={mountRef} style={{ width: "100%", height: "100%" }} />;
}

function shapeFromBrick(part) {
  const w = part?.width;
  const l = part?.length;

  if ((w === 1 && l === 2) || (w === 2 && l === 1)) return "1x2";
  if ((w === 1 && l === 4) || (w === 4 && l === 1)) return "1x4";
  if (w === 2 && l === 2) return "2x2";
  return "2x4";
}

export default function InstructionsPage() {
  const router = useRouter();
  const [page, setPage] = useState(0);
  const [steps, setSteps] = useState([]);
  const [modelDataUrl, setModelDataUrl] = useState(null);
  const [modelName, setModelName] = useState("Your Build");

  useEffect(() => {
    const rawInstructions = localStorage.getItem("instructions");
    const storedModelUrl = localStorage.getItem("modelUrl");
    const storedResult = localStorage.getItem("conversionResult");

    if (storedModelUrl) {
      setModelDataUrl(storedModelUrl);
    }

    if (storedResult) {
      try {
        const parsed = JSON.parse(storedResult);
        if (parsed?.job_id) {
          setModelName(`Build ${parsed.job_id}`);
        }
      } catch (err) {
        console.error("Failed to parse conversion result", err);
      }
    }

    if (rawInstructions) {
      try {
        const parsed = JSON.parse(rawInstructions);
        const parsedSteps = parsed?.steps || [];
        setSteps(parsedSteps);
      } catch (err) {
        console.error("Failed to parse instructions", err);
        setSteps([]);
      }
    }

    setPage(0);
  }, []);

  const totalPages = steps.length;
  const isCover = page === 0;
  const stepData = useMemo(() => (isCover ? null : steps[page - 1]), [isCover, page, steps]);

  const viewerUrl = isCover ? modelDataUrl : stepData?.full_render_url || modelDataUrl;

  const currentTitle = isCover ? "Instruction Booklet" : `Step ${stepData?.step_number ?? ""}`;
  const currentSubtitle = isCover
    ? "Open this build and follow the steps."
    : `${stepData?.current_step_bricks?.length || 0} bricks to add`;

  const handlePrev = () => setPage((p) => Math.max(0, p - 1));
  const handleNext = () => setPage((p) => Math.min(totalPages, p + 1));

  return (
    <div
      style={{
        minHeight: "100vh",
        background: "linear-gradient(180deg,#c7d3d6 0%,#bcc9cd 100%)",
        display: "grid",
        placeItems: "center",
        padding: "20px",
      }}
    >
      <div
        style={{
          width: "min(1200px, 96vw)",
          aspectRatio: "15 / 9",
          background: "#f8f5ef",
          borderRadius: "18px",
          boxShadow: "0 20px 50px rgba(0,0,0,0.18)",
          overflow: "hidden",
          display: "grid",
          gridTemplateColumns: "1.45fr 0.55fr",
          position: "relative",
        }}
      >
        <button
          onClick={() => router.push("/Test")}
          style={{
            position: "absolute",
            top: 16,
            left: 16,
            zIndex: 20,
            background: "#ffffff",
            color: "#1a1a1a",
            border: "1px solid rgba(0,0,0,0.08)",
            borderRadius: "999px",
            padding: "8px 12px",
            fontSize: "12px",
            fontWeight: 700,
            cursor: "pointer",
          }}
        >
          Back
        </button>

        <div
          style={{
            minWidth: 0,
            padding: "26px 22px 22px 22px",
            display: "grid",
            gridTemplateRows: "auto 1fr",
            background: "#efe9dd",
            borderRight: "1px solid rgba(0,0,0,0.06)",
          }}
        >
          <div style={{ marginBottom: "14px", display: "flex", alignItems: "center", gap: 12 }}>
            <div>
              <div style={{ fontSize: "28px", fontWeight: 900, letterSpacing: "-0.02em" }}>
                {modelName}
              </div>
              <div style={{ fontSize: "13px", color: "#666", marginTop: 4 }}>
                {isCover ? "Overview" : `Step ${stepData?.step_number ?? page}`}
              </div>
            </div>
          </div>

          <div
            style={{
              position: "relative",
              borderRadius: "18px",
              overflow: "hidden",
              background: "#ece6da",
              boxShadow: "inset 0 0 0 1px rgba(0,0,0,0.05)",
            }}
          >
            {viewerUrl ? (
              <ModelViewer key={viewerUrl} dataUrl={viewerUrl} />
            ) : (
              <div
                style={{
                  position: "absolute",
                  inset: 0,
                  display: "grid",
                  placeItems: "center",
                  color: "#666",
                  fontSize: "14px",
                }}
              >
                No model available
              </div>
            )}
          </div>
        </div>

        <div
          style={{
            minWidth: 0,
            display: "grid",
            gridTemplateRows: "auto auto 1fr auto",
            padding: "18px 16px 14px 16px",
            background: "#fbf8f2",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 12 }}>
            <div>
              <div style={{ fontSize: "18px", fontWeight: 900, color: "#1a1a1a" }}>
                {currentTitle}
              </div>
              <div style={{ fontSize: "12px", color: "#777", marginTop: 2 }}>
                {currentSubtitle}
              </div>
            </div>

            <div
              style={{
                minWidth: 44,
                height: 44,
                borderRadius: "12px",
                background: isCover ? "#E3000B" : "#1a1a1a",
                color: "#fff",
                display: "grid",
                placeItems: "center",
                fontWeight: 900,
                fontSize: "15px",
              }}
            >
              {isCover ? "★" : stepData?.step_number ?? ""}
            </div>
          </div>

          <div
            style={{
              marginTop: 12,
              marginBottom: 10,
              padding: "10px 12px",
              borderRadius: "14px",
              background: "#fff",
              border: "1px solid rgba(0,0,0,0.06)",
            }}
          >
            {isCover ? (
              <div style={{ fontSize: "14px", color: "#444", lineHeight: 1.55 }}>
                Use the arrows below to go step by step through your generated LEGO instructions.
              </div>
            ) : (
              <div>
                <div style={{ fontSize: "14px", fontWeight: 800, color: "#1a1a1a", lineHeight: 1.2 }}>
                  Add these bricks
                </div>
                <div style={{ fontSize: "12px", color: "#888", marginTop: 2 }}>
                  {stepData?.current_step_bricks?.length || 0} brick(s) in this step
                </div>
              </div>
            )}
          </div>

          <div
            style={{
              minHeight: 0,
              overflow: "auto",
              paddingRight: "2px",
            }}
          >
            {isCover ? (
              <div
                style={{
                  background: "#f5f0e8",
                  borderRadius: "14px",
                  padding: "16px",
                  border: "1px solid #e8e0d0",
                  color: "#555",
                  fontSize: "14px",
                  lineHeight: 1.6,
                }}
              >
                {steps.length > 0
                  ? `This instruction booklet contains ${steps.length} step${steps.length === 1 ? "" : "s"}.`
                  : "No instruction steps were found yet."}
              </div>
            ) : (
              <div style={{ display: "flex", flexDirection: "column", gap: "6px" }}>
                {(stepData?.current_step_bricks || []).map((part, i) => (
                  <div
                    key={i}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: "6px",
                      background: "#f5f0e8",
                      borderRadius: "8px",
                      padding: "5px 7px",
                      border: "1px solid #e8e0d0",
                      flexShrink: 0,
                    }}
                  >
                    <BrickThumb color={part.color || "#cccccc"} shape={shapeFromBrick(part)} />

                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        style={{
                          fontSize: "9px",
                          fontWeight: 700,
                          color: "#1a1a1a",
                          lineHeight: 1.3,
                        }}
                      >
                        {part.width}×{part.length} Brick
                      </div>
                      <div
                        style={{
                          fontSize: "8px",
                          color: "#999",
                          fontFamily: "monospace",
                        }}
                      >
                        x:{part.x} y:{part.y} z:{part.z}
                        {part.rotated ? " rot" : ""}
                      </div>
                    </div>

                    <div
                      style={{
                        background: "#E3000B",
                        color: "#fff",
                        borderRadius: "50%",
                        width: "22px",
                        height: "22px",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: "10px",
                        fontWeight: 800,
                        flexShrink: 0,
                      }}
                    >
                      1
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          <div style={{ paddingTop: "14px", minWidth: 0 }}>
            <div
              style={{
                overflowX: "auto",
                overflowY: "hidden",
                paddingBottom: "6px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "flex-start",
                  gap: "6px",
                  width: "max-content",
                  minWidth: "100%",
                }}
              >
                {Array.from({ length: totalPages + 1 }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => setPage(i)}
                    aria-label={i === 0 ? "Cover page" : `Go to step ${i}`}
                    style={{
                      width: i === 0 ? 12 : 10,
                      height: i === 0 ? 12 : 10,
                      borderRadius: "999px",
                      border: "none",
                      background: page === i ? "#E3000B" : "#d6cec1",
                      cursor: "pointer",
                      padding: 0,
                      flex: "0 0 auto",
                    }}
                  />
                ))}
              </div>
            </div>

            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: "12px" }}>
              <button
                onClick={handlePrev}
                disabled={page === 0}
                style={{
                  border: "none",
                  background: page === 0 ? "#ddd" : "#1a1a1a",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  cursor: page === 0 ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                ← Prev
              </button>

              <div style={{ fontSize: "12px", color: "#666", fontWeight: 700, textAlign: "center", flex: 1 }}>
                {isCover ? "Cover" : `Step ${page} of ${totalPages}`}
              </div>

              <button
                onClick={handleNext}
                disabled={page === totalPages}
                style={{
                  border: "none",
                  background: page === totalPages ? "#ddd" : "#E3000B",
                  color: "#fff",
                  padding: "10px 14px",
                  borderRadius: "12px",
                  cursor: page === totalPages ? "not-allowed" : "pointer",
                  fontWeight: 800,
                }}
              >
                Next →
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}