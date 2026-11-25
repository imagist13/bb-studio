# EDA workbench

The EDA section of the app: one page that brings the chip workflow — overview,
chips, balls, waveforms, advanced — together with a docked agent chat. It is
driven by mock data today; the layout, the conversation plumbing and the
workspace model are real and are what later backend wiring should build on.

Route: `/eda/:tab?` (`overview` | `chips` | `balls` | `waveforms` | `advanced`).
The active tab lives in the URL so the sider and the page never disagree.

## Layout

```
EdaPage
└─ EdaProvider                      state of the whole workbench (edaStore.tsx)
   └─ Workbench
      ├─ content column             EdaSider (tabs) + the active tab component
      ├─ EdaChatDock                desktop only, width 320–640 px, ≤ 46% of the window
      └─ Drawer                     mobile only, hosts the same panel full-screen
          └─ EdaChatPanel           toolbar + conversation surface (shared by both)
```

The dock is resizable, remembered (`eda.chat.width_px`) and can be toggled from
the header (`eda.chat.open`). Below 768 px it becomes a Drawer instead of a
column; `EdaChatPanel` is identical in both hosts.

## Chat dock

- **Toolbar** — the fixed workspace on the left (click it to pick another
  directory), then new chat, open in the chat page, and close. There is no
  per-tab context label: every session in the dock is the same agent session.
- **Conversation** — `useEdaConversation` owns exactly one conversation, created
  through the same API and with the same default assistant/model as the Guid
  page, and remembered in `eda.chat.conversation_id`. Everything below the
  toolbar is the ordinary `ChatConversation`, so sending, streaming, history and
  auto-title behave like the chat page.
- **Workspace** — the dock has one workspace, stored in `eda.chat.workspace`.
  New conversations are created inside it; an existing conversation bound to
  another directory (including a backend-provisioned temporary workspace) is
  moved into it when it loads. The move sends only `{ workspace,
custom_workspace }` through `PATCH /api/conversations/:id` — the backend merges
  it into `extra` and rejects a full payload because the skills and MCP
  snapshots recorded at creation are immutable.
- **Ask agent** — tab buttons can queue a prompt via `requestEdaChatPrompt`;
  the dock drains it (`consumeEdaChatPrompt`) into the send box's prefill channel,
  which holds it until the box mounts.

## Layout invariants

These are load-bearing; breaking one reproduces a real bug:

1. **`box-sizing` is `content-box` app-wide.** There is no global border-box
   reset, so `w-full` plus horizontal padding overflows its parent and is clipped
   by the nearest `overflow-hidden`. Content wrappers that set both need
   `box-border` (see `OverviewTab`).
2. **Never put a block-level child directly inside an Arco `Button`.** The button
   is `display: inline-block` with a fixed height (24 px at `size='mini'`), so a
   `block` child starts a second line, overflows the button and paints over the
   sibling below — in the dock that means the label is clipped by the chat
   header. Use `inline-block` (with `truncate` when the text can be long). A flex
   wrapper inside the button is fine too.
3. **The dock is narrow.** `ChatConversation` is rendered with `compactHeader`:
   the title keeps a 72 px minimum and the model pill shrinks and ellipsises
   instead of pushing the title out (`chat-layout.css`,
   `.chat-layout-header--compact`).
4. **The dock never pushes the page.** Its width is `320–640 px` and `≤ 46%` of
   the window; the content column is `min-w-0 flex-1`, so EDA content shrinks
   rather than sliding under the dock.

## State

| Store             | What it holds                                                                                                             |
| ----------------- | ------------------------------------------------------------------------------------------------------------------------- |
| `edaStore.tsx`    | Chip, ball, runs, open files, active run/waveform. Reducer + context; tab comes from the URL. Mock data in `mockData.ts`. |
| `edaChatStore.ts` | Dock open state (persisted) and the queued "Ask agent" prompt. `useSyncExternalStore`, usable outside React.              |

## Files

| Path                          | Role                                                           |
| ----------------------------- | -------------------------------------------------------------- |
| `EdaPage.tsx`                 | Route entry: provider, header actions, tab switch, dock/Drawer |
| `edaStore.tsx`                | Workbench state and actions (`startRun`, `setChip`, …)         |
| `edaChatStore.ts`             | Dock open state and prompt queue                               |
| `edaWorkspace.ts`             | Workspace read/write (`eda.chat.workspace`) and label          |
| `hooks/useEdaConversation.ts` | The dock's single conversation                                 |
| `hooks/useEdaWorkspace.ts`    | The dock's fixed workspace and conversation rebinding          |
| `components/EdaChatDock.tsx`  | Desktop column + resize handle                                 |
| `components/EdaChatPanel.tsx` | Toolbar + `ChatConversation` (shared with mobile)              |
| `components/*Tab.tsx`         | Overview, chips, balls, waveforms, advanced                    |
| `components/EdaSider.tsx`     | Tab navigation                                                 |
| `types.ts` / `mockData.ts`    | Domain model and fixtures                                      |

## Testing

```bash
bunx vitest run tests/unit/renderer/eda
```

Covers the chat store and the workspace binding (including the minimal
`extra` patch the backend accepts). The layout rules above are easier to verify
in the running app than in a DOM test: open `/eda`, drag the dock to its minimum
width, and check that the toolbar is one line and the chat header follows it
directly.

## Known gaps

- Tabs render mock data; nothing is wired to the backend yet.
- With no stored pick, the workspace falls back to the most recently used
  directory in chat history — which can be a temporary one. Clicking the
  workspace button pins the right repository.
