import { Menu, MenuItem, Submenu, PredefinedMenuItem } from "@tauri-apps/api/menu";

export interface MenuHandlers {
  onNew: () => void;
  onOpen: () => void;
  onSave: () => void;
  onSaveAs: () => void;
  onCloseFile: () => void;
  onSettings: () => void;
  onToggleDarkMode: () => void;
}

export async function setupNativeMenu(handlers: MenuHandlers) {
  const appSubmenu = await Submenu.new({
    text: "MarkSlate",
    items: [
      await MenuItem.new({
        id: "about",
        text: "About MarkSlate",
        enabled: false,
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({
        id: "settings",
        text: "Settings...",
        accelerator: "CmdOrCtrl+,",
        action: () => handlers.onSettings(),
      }),
      await MenuItem.new({
        id: "toggle-dark-mode",
        text: "Toggle Dark Mode",
        action: () => handlers.onToggleDarkMode(),
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Quit", text: "Quit" }),
    ],
  });

  const fileSubmenu = await Submenu.new({
    text: "File",
    items: [
      await MenuItem.new({
        id: "new",
        text: "New",
        accelerator: "CmdOrCtrl+N",
        action: () => handlers.onNew(),
      }),
      await MenuItem.new({
        id: "open",
        text: "Open...",
        accelerator: "CmdOrCtrl+O",
        action: () => handlers.onOpen(),
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({
        id: "save",
        text: "Save",
        accelerator: "CmdOrCtrl+S",
        action: () => handlers.onSave(),
      }),
      await MenuItem.new({
        id: "save-as",
        text: "Save As...",
        accelerator: "CmdOrCtrl+Shift+S",
        action: () => handlers.onSaveAs(),
      }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await MenuItem.new({
        id: "close-file",
        text: "Close File",
        accelerator: "CmdOrCtrl+W",
        action: () => handlers.onCloseFile(),
      }),
    ],
  });

  const editSubmenu = await Submenu.new({
    text: "Edit",
    items: [
      await PredefinedMenuItem.new({ item: "Undo" }),
      await PredefinedMenuItem.new({ item: "Redo" }),
      await PredefinedMenuItem.new({ item: "Separator" }),
      await PredefinedMenuItem.new({ item: "Cut" }),
      await PredefinedMenuItem.new({ item: "Copy" }),
      await PredefinedMenuItem.new({ item: "Paste" }),
      await PredefinedMenuItem.new({ item: "SelectAll" }),
    ],
  });

  const menu = await Menu.new({
    items: [appSubmenu, fileSubmenu, editSubmenu],
  });

  await menu.setAsAppMenu();
}
