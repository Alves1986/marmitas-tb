import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { InstallAppPrompt } from "@/components/pwa/InstallAppPrompt";
import { OfflineNotice } from "@/components/pwa/OfflineNotice";
import NotFound from "@/pages/NotFound";
import { Route, Switch, useLocation } from "wouter";
import ErrorBoundary from "./components/ErrorBoundary";
import { ThemeProvider } from "./contexts/ThemeContext";
import Admin from "./pages/Admin";
import Home from "./pages/Home";
import Operations from "./pages/Operations";
import OperationsExpenses from "./pages/OperationsExpenses";
import CounterPdv from "./pages/CounterPdv";
import KitchenBoard from "./pages/KitchenBoard";
import SetPassword from "./pages/SetPassword";
import StaffAccess from "./pages/StaffAccess";
import TrackOrder from "./pages/TrackOrder";
import Totem from "./pages/Totem";

function Router() {
  // make sure to consider if you need authentication for certain routes
  return (
    <Switch>
      <Route path={"/"} component={Home} />
      <Route path={"/acompanhar"} component={TrackOrder} />
      <Route path={"/totem"} component={Totem} />
      <Route path={"/acesso"} component={StaffAccess} />
      <Route path={"/definir-senha"} component={SetPassword} />
      <Route path={"/operacao"} component={Operations} />
      <Route path={"/operacao/despesas"} component={OperationsExpenses} />
      <Route path={"/operacao/pdv"} component={CounterPdv} />
      <Route path={"/operacao/cozinha"} component={KitchenBoard} />
      <Route path={"/admin"} component={Admin} />
      <Route path={"/404"} component={NotFound} />
      {/* Final fallback route */}
      <Route component={NotFound} />
    </Switch>
  );
}

// NOTE: About Theme
// - First choose a default theme according to your design style (dark or light bg), than change color palette in index.css
//   to keep consistent foreground/background color across components
// - If you want to make theme switchable, pass `switchable` ThemeProvider and use `useTheme` hook

function App() {
  const [location] = useLocation();
  const isPublicRoute = location === "/" || location === "/acompanhar" || location === "/totem";

  return (
    <ErrorBoundary>
      <ThemeProvider
        defaultTheme="light"
        // switchable
      >
        <TooltipProvider>
          {isPublicRoute && <OfflineNotice />}
          <Toaster />
          <Router />
          {isPublicRoute && <InstallAppPrompt />}
        </TooltipProvider>
      </ThemeProvider>
    </ErrorBoundary>
  );
}

export default App;
