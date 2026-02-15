import "./App.css";
import { SimpleEditor } from "./components/tiptap-templates/simple/simple-editor";
import { Settings } from "./components/Settings";
import { useStore } from "./lib/store";

function App() {
  const { showSettings } = useStore();

  return (
    <>
      <SimpleEditor />
      {showSettings && <Settings />}
    </>
  );
}

export default App;
