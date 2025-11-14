# Scratch-GUI Codebase Overview - Codyssey Project

## Project Identity
This is **Scratch-GUI**, a web-based visual programming environment (Scratch 3.0 clone), enhanced with an AI assistant called **"Maximus"** (styled as a Roman commander character) for AI-powered block generation.

**Key Components:**
- **scratch-gui**: React frontend with block editing UI
- **scratch-vm**: Virtual machine for executing blocks
- **scratch-blocks**: Blockly-based block system (modified for Scratch)

---

## What Are Blocks?

### Definition
"Blocks" are the fundamental units of Scratch programs. They are visual, snap-together puzzle pieces that represent code operations.

### Block Types
1. **Command blocks** (rectangular): Execute actions (e.g., move, turn)
2. **Reporter blocks** (rounded): Return values (e.g., get position)
3. **Boolean blocks** (hexagonal): Return true/false (e.g., key pressed?)
4. **Hat blocks** (special shape): Entry points for scripts (e.g., "when flag clicked")
5. **Loop/Control blocks**: Contain substacks (e.g., "repeat", "if-then")

### Block Categories in Scratch
- **Motion**: Move, turn, go to position (~15 blocks)
- **Looks**: Say, think, change appearance (~15 blocks)
- **Sound**: Play sounds, change volume (~10 blocks)
- **Events**: When flag clicked, when key pressed (~10 blocks)
- **Control**: Repeat, if-then, wait (~10 blocks)
- **Sensing**: Touch, ask, key pressed detection (~15 blocks)
- **Operators**: Math, logic, string operations (~10 blocks)
- **Variables**: Create and manipulate variables (~5 blocks)

### Block Representation
At the GUI level, blocks are represented as **React components** rendered within the **Blockly workspace**. In the VM, blocks are stored as:
```json
{
  "id": "unique_block_id_123",
  "opcode": "motion_movesteps",
  "inputs": {
    "STEPS": {
      "block": "number_block_456",
      "shadow": {...}
    }
  },
  "fields": {},
  "next": "next_block_id",
  "parent": "parent_block_id"
}
```

---

## Architecture Overview

### Layer 1: Frontend (scratch-gui)
**Location:** `/workspaces/codespaces-blank/scratch-gui/src/`

**Key Components:**
- **containers/blocks.jsx** (746 lines)
  - Main React container for the blocks workspace
  - Initializes ScratchBlocks (Blockly wrapper)
  - Connects VM to UI
  - **Loads AI integration modules** on mount

- **components/chatgpt-mock/chatgpt-mock.jsx** (482 lines)
  - Maximus AI chat sidebar
  - Integrates Google Generative AI (Gemini API)
  - Uses `handleAISuggestion()` to parse AI responses
  - Calls `createBlocksDirectly()` to add blocks to workspace
  - Displays scratchblocks visual preview

- **components/blocks/blocks.jsx**
  - Simple presentational component (wraps workspace container)
  - No business logic

- **components/chatgpt-mock/simpleBlockCreator.js** (644 lines)
  - Direct workspace API integration
  - Creates actual Blockly block instances
  - Pattern matching for AI responses (move, turn, say, wait, etc.)
  - Connects blocks into scripts

### Layer 2: AI Block Generation (scratch-gui/src/lib)

**ai-block-generator.js** (605 lines)
- **Purpose:** Parse natural language → block definitions
- **Key Function:** `handleAISuggestion(text)`
- **Pattern Matching:** Uses regex to extract block commands from text
  - Handles: move, turn, wait, say, think, repeat, forever, etc.
- **Output:** Array of block definition objects
- **Features:**
  - Default value extraction (e.g., "move 10 steps" → STEPS: "10")
  - Block categorization (motion, looks, control, etc.)
  - Color definitions for each category

**ai-block-integration.js** (499 lines)
- **Purpose:** Integrate AI generator with Scratch blocks toolbox
- **Key Function:** `integrateAIBlockGenerator(blocksInstance)`
- **Features:**
  - Normalizes fuzzy AI output to known Scratch opcodes
  - XML manipulation for toolbox updates
  - Creates "AI Blocks" category in toolbox
  - Validates block types before adding

**ai-block-workspace-integration.js** (499 lines)
- **Purpose:** Create actual block instances in the workspace
- **Key Class:** `AIBlockWorkspaceIntegration`
- **Key Method:** `processTextToBlocks(text)`
- **Workflow:**
  1. Parse text using `handleAISuggestion()`
  2. Normalize to known block types
  3. Create XML for each block
  4. Use `ScratchBlocks.Xml.domToWorkspace()` to instantiate
  5. Connect blocks in sequence
  6. Highlight newly created blocks
- **Deduplication:** Tracks generated blocks, prevents duplicates

### Layer 3: Block Execution (scratch-vm)
**Location:** `/workspaces/codespaces-blank/scratch-vm/src/`

**engine/blocks.js** (1487 lines)
- **Purpose:** Runtime block storage and manipulation
- **Key Class:** `Blocks`
- **Responsibilities:**
  - Store all blocks in workspace (`_blocks` object)
  - Maintain script lists (top-level blocks)
  - Cache block inputs for performance
  - Handle block mutations (XML → internal format)
  - Track monitors and procedures

**blocks/** directory
- **scratch3_motion.js** - Motion block implementations
- **scratch3_looks.js** - Appearance block implementations
- **scratch3_control.js** - Loop and conditional implementations
- **scratch3_sound.js** - Audio block implementations
- **scratch3_event.js** - Event handler implementations
- **scratch3_sensing.js** - Input detection implementations
- **scratch3_operators.js** - Math and logic implementations
- **scratch3_data.js** - Variable and list implementations

**Each block file contains:**
```javascript
getPrimitives() {
  return {
    'opcode_name': this.functionName,
    ...
  }
}

functionName(args, util) {
  // Access args from block inputs: args.PARAM_NAME
  // Access target: util.target
  // Access utilities: util.ioQuery(), etc.
}
```

---

## AI Integration Flow

### User Interaction → Blocks Creation

```
User types in Maximus chat
    ↓
ChatGPTMock component (chatgpt-mock.jsx)
    ↓
Sends to Gemini API (if available) or mock response
    ↓
AI Response received
    ↓
extractBlocksFromResponse() → handleAISuggestion()
    ↓
Converts to scratchblocks visual format (for display)
    ↓
Calls createBlocksDirectly() (simpleBlockCreator.js)
    ↓
Pattern matching extracts block commands
    ↓
For each block:
  - Create workspace.newBlock(opcode)
  - Set input values (math_number, text shadow blocks)
  - Connect to previous block
  - Render and position
    ↓
Blocks appear in workspace, ready to run
```

### Key Functions in Pipeline

1. **handleAISuggestion(text)** - Pattern → Block definitions
   ```javascript
   Input: "move 10 steps, wait 2 seconds"
   Output: [
     { id: 'motion_movesteps', inputs: [STEPS], defaultValues: {STEPS: '10'} },
     { id: 'control_wait', inputs: [DURATION], defaultValues: {DURATION: '2'} }
   ]
   ```

2. **createBlocksDirectly(aiResponse)** - Creates workspace blocks
   ```javascript
   Iterates through regex matches:
   - /move.*?(\d+).*?steps/g → motion_movesteps
   - /turn.*?(left|right).*?(\d+)/g → motion_turnright/left
   - /say.*?"([^"]*)".*?for.*?(\d+)/g → looks_sayforsecs
   - ... more patterns
   ```

3. **AIBlockWorkspaceIntegration.createBlockXML(blockDef)** - XML generation
   ```javascript
   Creates: <block type="motion_movesteps">
             <value name="STEPS">
               <shadow type="math_number">
                 <field name="NUM">10</field>
               </shadow>
             </value>
           </block>
   ```

---

## Existing AI Features

### ✓ Already Implemented

1. **Maximus Chat Sidebar**
   - Integrated into GUI (components/gui/gui.jsx)
   - Toggle button visible in interface
   - Real Gemini API integration (with API key)
   - Mock responses fallback

2. **Block Generation from AI**
   - Parses AI responses for block commands
   - Creates functional blocks in workspace
   - Connects blocks into scripts
   - Visual scratchblocks preview

3. **Pattern Recognition**
   - Regex patterns for common commands
   - Supports: move, turn, say, think, wait, repeat, forever, etc.
   - Extracts numeric parameters and text values

4. **Block Categorization**
   - Maps blocks to Scratch categories (motion, looks, control, etc.)
   - Uses standard Scratch colors and conventions

5. **Workspace Integration**
   - Direct Blockly API usage
   - Creates shadow blocks for inputs
   - Connects blocks in sequence
   - Highlights newly created blocks

### ✗ Not Yet Implemented / Partial

1. **Complex Block Types**
   - Limited to simple command blocks
   - No if-then-else generation
   - No custom procedure generation
   - No loop internals (repeat/forever need manual sub-blocks)

2. **Block Editing Commands**
   - No "edit this block" instruction parsing
   - No "delete", "modify", "replace" commands
   - No block property editing from chat

3. **Advanced Pattern Matching**
   - No multi-line scripts from AI
   - No procedure/function definition
   - No variable creation instructions

4. **Error Handling**
   - Limited validation
   - No user feedback for invalid requests
   - No suggestion for fixes

---

## File Structure Summary

### scratch-gui/src/
```
├── containers/
│   ├── blocks.jsx (746 lines) ← MAIN BLOCKS CONTAINER
│   ├── gui.jsx (490 lines) ← App root, includes Maximus toggle
│   └── ... (paint-editor, stage, etc.)
├── components/
│   ├── blocks/
│   │   └── blocks.jsx ← Simple wrapper component
│   ├── chatgpt-mock/
│   │   ├── chatgpt-mock.jsx (482 lines) ← MAXIMUS INTERFACE
│   │   ├── simpleBlockCreator.js (644 lines) ← BLOCK CREATION
│   │   ├── functionalBlocksIntegration.js (413 lines)
│   │   └── roman-global-theme.css
│   ├── gui/
│   │   └── gui.jsx (490 lines) ← Includes Maximus visibility toggle
│   └── ... (other components)
├── lib/
│   ├── ai-block-generator.js (605 lines) ← PATTERN MATCHING
│   ├── ai-block-integration.js (499 lines)
│   ├── ai-block-workspace-integration.js (499 lines) ← WORKSPACE INTEGRATION
│   ├── ai-block-generator-broken.js (751 lines) [OLD/BROKEN]
│   ├── ai-block-generator-fixed.js (498 lines) [ALT VERSION]
│   ├── ai-block-test.js [TEST UTILITIES]
│   ├── make-toolbox-xml.js (811 lines) ← TOOLBOX GENERATION
│   ├── blocks.js [BLOCKLY WRAPPER]
│   ├── themes/ [COLOR SCHEMES]
│   └── ... (other utilities)
├── css/
│   ├── colors.css ← Theme colors (including dark "Roman" theme)
│   └── ... (other styles)
├── reducers/
│   ├── toolbox.js ← Redux state for toolbox
│   ├── custom-procedures.js
│   └── ... (other state)
├── examples/
│   └── ai-block-example.html ← STANDALONE DEMO
└── ... (other files)
```

### scratch-vm/src/
```
├── engine/
│   ├── blocks.js (1487 lines) ← BLOCK STORAGE/RUNTIME
│   ├── blocks-execute-cache.js
│   ├── blocks-runtime-cache.js
│   └── ... (runtime engine)
├── blocks/
│   ├── scratch3_motion.js ← Motion block implementations
│   ├── scratch3_looks.js
│   ├── scratch3_control.js
│   ├── scratch3_sound.js
│   ├── scratch3_event.js
│   ├── scratch3_sensing.js
│   ├── scratch3_operators.js
│   └── scratch3_data.js
├── extensions/
│   └── ... (extension system)
├── sprites/
│   └── ... (sprite definitions)
└── ... (other VM files)
```

---

## Block Lifecycle

### 1. Definition Phase (Scratch-Blocks)
- Block definition in toolbox XML
- Visual appearance (shape, color, label)
- Input/output ports defined

### 2. Creation Phase (Blockly/ScratchBlocks)
- User drags block from toolbox to workspace
- OR: AI creates block via `workspace.newBlock('opcode')`
- Block instance created with unique ID

### 3. Connection Phase
- Block snaps to previous/next blocks
- Input blocks connected to parameter slots
- Script formed

### 4. Serialization Phase
- Workspace serialized to JSON/XML
- Saved with project
- Can be shared, exported, imported

### 5. Deserialization & Validation Phase
- XML/JSON loaded into workspace
- Scratch-VM validates block opcodes exist
- Blocks reconstructed in editor

### 6. Execution Phase
- User clicks green flag
- VM traverses scripts starting from hat blocks
- Each block's opcode mapped to primitive function
- Function executes with block's argument values
- Next block executed in sequence

---

## Key Design Patterns

### 1. Redux State Management
- Toolbox state synchronized with Redux store
- `updateToolbox()` action triggers UI update
- Workspace metrics tracked

### 2. VM-UI Coupling
- ScratchBlocks wraps Blockly and provides Scratch runtime
- Blocks container directly accesses VM via props
- Two-way sync: VM→UI (visual feedback), UI→VM (block changes)

### 3. Delegation Pattern
- GUI component delegates to Blocks container
- Blocks container delegates to ScratchBlocks
- ScratchBlocks delegates to Blockly + VM integration

### 4. XML for Block Representation
- Internal format: XML strings
- Allows serialization and DOM manipulation
- ScratchBlocks.Xml utility for parsing/generation

### 5. AI → Pattern Matching → Block Creation
- AI generates free-form text
- Regex patterns extract structured commands
- Commands mapped to known block opcodes
- Workspace API used for instantiation

---

## Recent Changes (from Git)

### Commit "Everything other than AI" (70a07135)
- Added scratch-gui and scratch-vm directories
- Initial setup of mono-repo structure
- Created test files and examples

### Commit "Almost AI" (68f26643)
- Minimal changes to README.md and colors.css
- Small updates to theme system
- Most AI code already committed in previous version

---

## How to Extend with AI Command System

### To Add "Edit Block" Commands
1. Extend `BLOCK_PATTERNS` in `ai-block-generator.js`
2. Add patterns for: "change [block] to ...", "modify ...", "replace ..."
3. Create `updateBlockFromAI()` function in `ai-block-workspace-integration.js`
4. Implement block-finding logic (by opcode, position, or previous blocks)
5. Use `workspace.getBlockById()` → modify inputs → re-render

### To Add Block Deletion Commands
1. Parse "delete [block]" patterns
2. Find block: `workspace.getBlockById(blockId)`
3. Call `block.dispose()`
4. Update connected blocks

### To Add Procedure Commands
1. Extend AI generator to recognize "create function/procedure" patterns
2. Use `Procedures.createProcedureDefCallback_()` from ScratchBlocks
3. Add procedure definition block to workspace
4. Generate procedure call blocks

### To Add Loop Content Commands
1. When "repeat X" block created, detect if AI specifies loop content
2. Use `block.inputList` to access SUBSTACK input
3. Create sub-blocks and connect to SUBSTACK connection
4. Handle indentation in visual scratchblocks preview

---

## Key Files for AI Implementation

**To Modify AI Behavior:**
1. `src/lib/ai-block-generator.js` - Add/modify block patterns
2. `src/components/chatgpt-mock/simpleBlockCreator.js` - Add block creation logic
3. `src/lib/ai-block-workspace-integration.js` - Complex workspace operations

**To Integrate with UI:**
1. `src/containers/blocks.jsx` - Expose AI methods to workspace
2. `src/components/chatgpt-mock/chatgpt-mock.jsx` - Handle user input

**To Add Tests:**
1. `src/lib/ai-block-test.js` - Add test utilities
2. `examples/ai-block-example.html` - Standalone demo

---

## API Keys & Configuration

**Gemini API Key** (in chatgpt-mock.jsx):
```javascript
// ✅ Secure: Now using environment variables
const API_KEY = process.env.REACT_APP_GEMINI_API_KEY || process.env.GEMINI_API_KEY;
```
✅ Properly configured to use environment variables from `.env` file.
See `API_KEY_SETUP.md` for setup instructions.

**API Model:**
```javascript
const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash-lite" });
```

---

## Testing & Demo

**Standalone HTML Example:**
- Location: `/scratch-gui/examples/ai-block-example.html`
- Can be opened directly in browser
- Demonstrates block generation without full Scratch-GUI

**Console Commands Available:**
- `handleAISuggestion(text)` - Returns block definitions
- `processAISuggestion(text)` - Creates blocks in workspace
- `testAIBlockGeneration()` - Runs automated tests

---

## Color Scheme (Dark "Roman" Theme)

Applied in `src/containers/blocks.css`:
- Workspace background: #000000 (black)
- Accent color: #CC3333 (dark red)
- Block borders: #CC3333
- Text: #FFFFFF (white)
- Grid: transparent white lines

This gives the dark, Roman-empire aesthetic for "Maximus" character theme.

---

## Performance Considerations

1. **Block Deduplication:** Tracks blocks by ID + serialized defaults
2. **XML Parsing:** Uses DOMParser - could be optimized with streaming
3. **Regex Patterns:** Compiled at runtime - could be cached
4. **Workspace Rendering:** Blockly handles incremental updates
5. **AI Responses:** Async, doesn't block UI

---

## Security Notes

⚠️ **API Key Exposure:**
- Gemini API key hardcoded in source
- Visible in browser DevTools
- Should use backend proxy or environment-based configuration

⚠️ **AI Response Parsing:**
- Regex patterns could be exploited
- No input validation before block creation
- Consider sandboxing or validation layer

