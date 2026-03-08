"use client"; 

import React from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";

function SpinningCube() {
  return (
    <mesh rotation={[0.4, 0.2, 0]}>

      <boxGeometry args={[1, 1, 1]} />
      <meshStandardMaterial color="orange" />
    </mesh>
  );
}

export default function ThreeScene() {
  return (
    <Canvas
      style={{ height: "100vh", background: "#202020" }}
      camera={{ position: [3, 3, 3], fov: 60 }}
    >

      <ambientLight intensity={0.5} />
      <directionalLight position={[5, 5, 5]} intensity={1} />


      <SpinningCube />

      <OrbitControls enableZoom={true} />
    </Canvas>
  );
}
