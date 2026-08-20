import { MainWindow } from "./windows/MainWindow";
import { PetWindow } from "./windows/PetWindow";
import { BreakOverlay } from "./windows/BreakOverlay";

export default function App() {
  const windowType = new URLSearchParams(window.location.search).get("window");
  if (windowType === "pet") return <PetWindow />;
  if (windowType === "break-overlay") return <BreakOverlay />;
  return <MainWindow />;
}
