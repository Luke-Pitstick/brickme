"use client"; // For Next.js 13+ app directory, ensures client-side rendering

import React, { useRef, useEffect } from "react";
import * as BABYLON from "babylonjs";

export default function BabylonScene() {
  const canvasRef = useRef(null);

  useEffect(() => {
    if (!canvasRef.current) return;

    // Create Babylon engine and scene
    const engine = new BABYLON.Engine(canvasRef.current, true);
    const scene = new BABYLON.Scene(engine);

    // Camera
    const camera = new BABYLON.ArcRotateCamera(
      "camera",
      Math.PI / 4,
      Math.PI / 4,
      5,
      BABYLON.Vector3.Zero(),
      scene
    );
    camera.attachControl(canvasRef.current, true);

    // Light
    const light = new BABYLON.HemisphericLight(
      "light",
      new BABYLON.Vector3(1, 1, 0),
      scene
    );
    light.intensity = 0.9;

    // Mesh (no loaders — pure code)
    const sphere = BABYLON.MeshBuilder.CreateSphere("sphere", { diameter: 2 }, scene);
    const material = new BABYLON.StandardMaterial("mat", scene);
    material.diffuseColor = new BABYLON.Color3(0.2, 0.6, 1);
    sphere.material = material;

    // Render loop
    engine.runRenderLoop(() => {
      scene.render();
    });

    // Resize handling
    const handleResize = () => engine.resize();
    window.addEventListener("resize", handleResize);

    // Cleanup
    return () => {
      window.removeEventListener("resize", handleResize);
      engine.dispose();
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      style={{ width: "100%", height: "100vh", display: "block" }}
    />
  );
}
