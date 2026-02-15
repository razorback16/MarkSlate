import "./App.css";
import { useEffect } from "react";
import { SimpleEditor } from "./components/tiptap-templates/simple/simple-editor";
import { Settings } from "./components/Settings";
import { ClaudeNotFoundDialog } from "./components/ClaudeNotFoundDialog";
import { useStore } from "./lib/store";
import { detectClaudePath } from "./lib/ai";

function App() {
  const { showSettings, showClaudeNotFound, setShowClaudeNotFound, claudePath, setClaudePath } = useStore();

  useEffect(() => {
    if (!claudePath) {
      detectClaudePath()
        .then((path) => setClaudePath(path))
        .catch(() => setShowClaudeNotFound(true));
    }
  }, []);

  return (
    <>
      <SimpleEditor />
      {showSettings && <Settings />}
      {showClaudeNotFound && <ClaudeNotFoundDialog />}
    </>
  );
}

export default App;
