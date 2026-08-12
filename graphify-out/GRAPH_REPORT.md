# Graph Report - src/components/notes  (2026-08-12)

## Corpus Check
- Corpus is ~9,734 words - fits in a single context window. You may not need a graph.

## Summary
- 24 nodes · 26 edges · 4 communities (2 shown, 2 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- [[_COMMUNITY_Community 0|Community 0]]
- [[_COMMUNITY_Community 1|Community 1]]
- [[_COMMUNITY_Community 2|Community 2]]
- [[_COMMUNITY_Community 3|Community 3]]

## God Nodes (most connected - your core abstractions)
1. `relativeDate()` - 3 edges
2. `noteTitle()` - 3 edges
3. `NoteCard()` - 3 edges
4. `NoteEditorSidebar()` - 2 edges
5. `formatDate()` - 2 edges
6. `NotesHub()` - 2 edges
7. `initialLibraryItems` - 1 edges
8. `NoteEditorProps` - 1 edges
9. `NoteEditorSidebarProps` - 1 edges
10. `ToolTab` - 1 edges

## Surprising Connections (you probably didn't know these)
- None detected - all connections are within the same source files.

## Import Cycles
- None detected.

## Communities (4 total, 2 thin omitted)

### Community 0 - "Community 0"
Cohesion: 0.33
Nodes (7): formatDate(), Note, NoteCard(), NotesHub(), NotesView, noteTitle(), relativeDate()

### Community 2 - "Community 2"
Cohesion: 0.40
Nodes (3): NoteEditorSidebar(), NoteEditorSidebarProps, ToolTab

## Knowledge Gaps
- **7 isolated node(s):** `initialLibraryItems`, `NoteEditorProps`, `NoteEditorSidebarProps`, `ToolTab`, `Note` (+2 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **2 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **What connects `initialLibraryItems`, `NoteEditorProps`, `NoteEditorSidebarProps` to the rest of the system?**
  _7 weakly-connected nodes found - possible documentation gaps or missing edges._