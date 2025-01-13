import { useState } from "react";
import { Switch, Route } from "wouter";
import Home from "./pages/Home";
import { Toaster } from "@/components/ui/toaster";
import LoadingScreen from "./components/LoadingScreen";

function App() {
  const [isLoading, setIsLoading] = useState(true);

  return (
    <>
      {isLoading ? (
        <LoadingScreen onLoadComplete={() => setIsLoading(false)} />
      ) : (
        <Switch>
          <Route path="/" component={Home} />
        </Switch>
      )}
      <Toaster />
    </>
  );
}

export default App;