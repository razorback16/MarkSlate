import { Extension } from "@tiptap/core"
import { Plugin, PluginKey } from "@tiptap/pm/state"
import { Decoration, DecorationSet } from "@tiptap/pm/view"

export const aiHighlightKey = new PluginKey("aiHighlight")

export const AIHighlight = Extension.create({
  name: "aiHighlight",

  addProseMirrorPlugins() {
    return [
      new Plugin({
        key: aiHighlightKey,
        state: {
          init() {
            return DecorationSet.empty
          },
          apply(tr, set) {
            const meta = tr.getMeta(aiHighlightKey)
            if (meta?.clear) {
              return DecorationSet.empty
            }
            // Map existing decorations through document changes
            set = set.map(tr.mapping, tr.doc)
            if (meta?.add) {
              set = set.add(tr.doc, meta.add)
            }
            return set
          },
        },
        props: {
          decorations(state) {
            return this.getState(state)
          },
        },
      }),
    ]
  },
})

export function addAIHighlight(editor: any, from: number, to: number) {
  const deco = Decoration.inline(from, to, { class: "ai-edit-highlight" })
  const tr = editor.state.tr.setMeta(aiHighlightKey, { add: [deco] })
  editor.view.dispatch(tr)
}

export function clearAIHighlights(editor: any) {
  const tr = editor.state.tr.setMeta(aiHighlightKey, { clear: true })
  editor.view.dispatch(tr)
}
