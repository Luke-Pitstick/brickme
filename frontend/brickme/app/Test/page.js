import dynamic from "next/dynamic";

// Dynamically import to avoid SSR issues
const BabylonScene = dynamic(() => import("../components/BabylonScene"), {
  ssr: false,
});

export default function Home() {
  return (
    <div style={{ margin: 0, padding: 0 }}>
      <BabylonScene />
    </div>
  );
}
