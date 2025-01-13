import { useEffect } from "react";
import WorldView from "../components/WorldView";
import { Card } from "@/components/ui/card";

export default function Home() {
  useEffect(() => {
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, []);

  return (
    <div className="w-screen h-screen bg-background">
      <WorldView />

      <div className="fixed top-4 left-4 z-10">
        <Card className="bg-background/80 backdrop-blur p-4">
          <h1 className="text-lg font-bold text-primary" style={{ fontFamily: 'SandroGrottesco' }}>
            Clustr Simulation
          </h1>
          <p className="text-sm text-muted-foreground" style={{ fontFamily: 'SandroGrottesco' }}>
            Active Agents: <span className="text-primary">1,110,080</span>
          </p>
        </Card>
      </div>
    </div>
  );
}