import "./schema-runtime";
import { createRoot } from "react-dom/client";
import Workspace from "./ui/Workspace";
import "./ui/styles.css";
createRoot(document.getElementById("root")!).render(<Workspace />);
