# AI Command System Implementation Guide

## Quick Start: Where to Focus for AI Block Editing

If you want to implement an AI command system for **editing blocks** (not just creating them), focus on these files in order:

### 1. COMMAND PARSING (Start Here)
**File:** `/workspaces/codespaces-blank/scratch-gui/src/lib/ai-block-generator.js`

**What to do:**
- Add new regex patterns to `BLOCK_PATTERNS` array
- Examples to add:
  ```javascript
  {
    patterns: [
      /change.*?(\d+).*?steps.*?to.*?(\d+)/i,  // "change 10 steps to 50"
      /replace.*?move.*?with.*?(\d+).*?steps/i  // "replace move with 20 steps"
    ],
    generate: (match, text) => {
      return {
        id: 'motion_movesteps',
        type: 'command',
        label: 'move %1 steps',
        category: 'motion',
        inputs: [{type: 'input_value', name: 'STEPS'}],
        defaultValues: {STEPS: match[2]},  // NEW value
        tooltip: 'Move the sprite forward by the specified number of steps'
      };
    }
  }
  ```

**Key insight:** The `generate()` function returns a block definition. These are used by AI to suggest what changes to make.

---

### 2. BLOCK FINDING & MODIFICATION (Middle Layer)
**File:** `/workspaces/codespaces-blank/scratch-gui/src/lib/ai-block-workspace-integration.js`

**What to do:**
Add method to find and update existing blocks:

```javascript
// Find a block by criteria and update its values
async findAndUpdateBlock(pattern, newValues) {
  if (!this.workspace) throw new Error('Workspace not initialized');
  
  const topBlocks = this.workspace.getTopBlocks(false);
  
  for (const block of topBlocks) {
    // Walk through block chain
    let current = block;
    while (current) {
      // Check if this block matches pattern
      if (this.blockMatches(current, pattern)) {
        // Update input values
        this.updateBlockInputs(current, newValues);
        this.highlightNewBlock(current);
        return {
          success: true,
          block: current,
          message: `Updated ${current.type} block`
        };
      }
      current = current.getNextBlock();
    }
  }
  
  return {
    success: false,
    message: `No matching block found for pattern: ${pattern}`
  };
}

blockMatches(block, pattern) {
  // Check by opcode
  if (pattern.opcode && block.type === pattern.opcode) return true;
  
  // Check by position
  if (pattern.position === 'first') {
    const parent = block.getParent();
    return !parent || parent.type === 'event_whenflagclicked';
  }
  
  // Check by label/text content
  if (pattern.label) {
    const blockLabel = block.getFirstLineDescription?.();
    return blockLabel?.includes(pattern.label);
  }
  
  return false;
}

updateBlockInputs(block, newValues) {
  for (const [inputName, newValue] of Object.entries(newValues)) {
    const input = block.getInput(inputName);
    if (input && input.connection) {
      // Get or create shadow block
      let shadowBlock = input.connection.targetBlock();
      if (!shadowBlock) {
        shadowBlock = this.workspace.newBlock('math_number');
        shadowBlock.initSvg();
        input.connection.connect(shadowBlock.outputConnection);
      }
      
      // Update the value
      if (newValue !== undefined) {
        const fieldName = this.getFieldNameForInput(inputName);
        shadowBlock.setFieldValue(String(newValue), fieldName);
      }
    }
  }
  block.render();
}

getFieldNameForInput(inputName) {
  const fieldMap = {
    'STEPS': 'NUM',
    'DEGREES': 'NUM',
    'DURATION': 'NUM',
    'SECS': 'NUM',
    'MESSAGE': 'TEXT'
  };
  return fieldMap[inputName] || 'TEXT';
}
```

**Key insight:** Blockly's workspace API lets you find blocks and modify their inputs. Use `getInput()`, `getNextBlock()`, etc.

---

### 3. AI RESPONSE PROCESSING (User-Facing)
**File:** `/workspaces/codespaces-blank/scratch-gui/src/components/chatgpt-mock/chatgpt-mock.jsx`

**What to do:**
Extend `handleSendMessage()` to detect edit commands:

```javascript
const handleSendMessage = async () => {
  const input = input.trim();
  
  // NEW: Check for edit commands
  const editCommands = [
    /^edit|change|update|modify|replace/i,
    /^set.*?to/i,
    /^delete|remove|remove/i
  ];
  
  if (editCommands.some(cmd => cmd.test(input))) {
    // Handle as edit command, not creation
    await handleEditCommand(input);
    return;
  }
  
  // Existing creation logic...
  // ...
};

async function handleEditCommand(input) {
  try {
    // Example patterns:
    // "change first move to 20 steps"
    // "edit the wait block to 5 seconds"
    // "delete the last block"
    
    const changeMatch = input.match(/change.*?(first|last|move|wait|say).*?to.*?(\d+)/i);
    if (changeMatch) {
      const blockType = changeMatch[1].toLowerCase();
      const newValue = changeMatch[2];
      
      const result = await this.blocksIntegration.findAndUpdateBlock(
        {label: blockType},
        {STEPS: newValue, DURATION: newValue, DEGREES: newValue}
      );
      
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.success 
          ? `Updated the ${blockType} block to ${newValue}`
          : `Could not find a ${blockType} block to edit`
      }]);
    }
    
    const deleteMatch = input.match(/delete|remove.*(first|last|all)?.*?block/i);
    if (deleteMatch) {
      const result = await this.blocksIntegration.deleteBlock(deleteMatch[1] || 'last');
      setMessages(prev => [...prev, {
        role: 'assistant',
        content: result.success ? 'Block deleted' : 'Could not delete block'
      }]);
    }
  } catch (error) {
    console.error('Error handling edit command:', error);
  }
}
```

**Key insight:** Parse AI responses for edit intent (change, delete, modify) separately from creation intent (make, create, add).

---

### 4. DELETION HELPER (Workspace Operations)
**Add to `AIBlockWorkspaceIntegration` class:**

```javascript
async deleteBlock(which = 'last') {
  try {
    if (!this.workspace) throw new Error('Workspace not initialized');
    
    const topBlocks = this.workspace.getTopBlocks(false);
    if (topBlocks.length === 0) {
      return {success: false, message: 'No blocks to delete'};
    }
    
    let blockToDelete;
    
    if (which === 'first') {
      blockToDelete = topBlocks[0];
    } else if (which === 'last') {
      // Find the last block in the last script
      let current = topBlocks[topBlocks.length - 1];
      while (current.getNextBlock()) {
        current = current.getNextBlock();
      }
      blockToDelete = current;
    } else if (which === 'all') {
      topBlocks.forEach(block => this.deleteBlockRecursive(block));
      return {success: true, message: 'All blocks deleted'};
    }
    
    if (blockToDelete) {
      this.deleteBlockRecursive(blockToDelete);
      return {success: true, message: `Deleted ${blockToDelete.type} block`};
    }
    
    return {success: false, message: 'No block found to delete'};
  } catch (error) {
    return {success: false, message: error.message};
  }
}

deleteBlockRecursive(block) {
  // First delete all child blocks (substacks)
  if (block.inputList) {
    block.inputList.forEach(input => {
      if (input.type === 5) { // STATEMENT input (substack)
        let child = input.connection?.targetBlock();
        while (child) {
          const next = child.getNextBlock();
          child.dispose();
          child = next;
        }
      }
    });
  }
  
  // Then delete this block
  block.dispose();
}
```

---

## Recommended Implementation Order

### Phase 1: Simple Edit Commands (1-2 hours)
1. Add "change [block] to [value]" pattern in `ai-block-generator.js`
2. Implement `findAndUpdateBlock()` in workspace integration
3. Add pattern detection in chatgpt-mock component
4. Test: "change move to 50 steps"

### Phase 2: Block Deletion (30 mins - 1 hour)
1. Implement `deleteBlock()` method
2. Parse "delete [block]" patterns
3. Test: "delete the wait block", "remove last block"

### Phase 3: Advanced Editing (2-3 hours)
1. Add parameter swapping: "swap move and wait"
2. Add insertion: "add repeat 10 after move"
3. Add replacement: "replace wait with move"
4. Handle multiple blocks: "change all waits to 1 second"

### Phase 4: Error Handling & UX (1-2 hours)
1. Add validation for valid block opcodes
2. Add confirmation prompts for destructive operations
3. Add undo/redo support
4. Provide helpful error messages

---

## Testing Your Implementation

**Console Testing:**
```javascript
// Test finding a block
const result = await window.aiBlockIntegration.findAndUpdateBlock(
  {label: 'move'},
  {STEPS: '50'}
);
console.log(result);

// Test deletion
const deleteResult = await window.aiBlockIntegration.deleteBlock('last');
console.log(deleteResult);
```

**Unit Tests to Add:**
```javascript
// In src/lib/ai-block-workspace-integration.test.js
describe('Block Editing', () => {
  test('should find and update move block', async () => {
    // Create a test workspace
    // Add a move block
    // Call findAndUpdateBlock
    // Verify the STEPS value changed
  });
  
  test('should delete last block', async () => {
    // Add 2 blocks
    // Delete last
    // Verify only 1 block remains
  });
  
  test('should handle no matching blocks', async () => {
    // Search for non-existent block
    // Verify returns error message
  });
});
```

---

## API Reference

### AIBlockWorkspaceIntegration Methods

```javascript
// Existing methods
processTextToBlocks(text)          // Create blocks from text
addBlockToWorkspace(blockDef)      // Add single block
createBlockInstance(blockDef)      // Create block instance
connectBlocksInSequence(blocks)    // Connect multiple blocks
highlightNewBlock(block)           // Visual feedback
clearGeneratedBlocks()             // Remove all AI blocks

// New methods to add
findAndUpdateBlock(pattern, values)   // Find & modify block
deleteBlock(which)                    // Delete block(s)
deleteBlockRecursive(block)           // Delete block + children
blockMatches(block, pattern)          // Check if block matches
updateBlockInputs(block, values)      // Update input values
getFieldNameForInput(inputName)       // Map input to field
```

---

## Common Pitfalls

1. **Forgetting to call `block.render()`** after changing field values
   - Blockly doesn't automatically re-render; you must call it explicitly

2. **Not handling connected blocks**
   - Deleting a block doesn't automatically disconnect following blocks
   - Use `block.dispose()` which handles disconnection

3. **Shadow blocks vs. real blocks**
   - Input values are stored in "shadow" blocks (temporary placeholders)
   - Regular blocks are user-placed blocks
   - You need to handle both cases

4. **Opcode vs. Type**
   - `block.type` = the opcode (e.g., 'motion_movesteps')
   - Use this to identify block type, not "label"

5. **Not initializing SVG**
   - New blocks need `initSvg()` and `render()` calls
   - Without these, blocks won't appear visually

---

## Example: Complete "Edit Move Block" Command

```javascript
// Full implementation of "change first move to 50 steps"

// 1. In ai-block-generator.js - Add pattern
{
  patterns: [/change.*?move.*?to.*?(\d+).*?steps/i],
  generate: (match, text) => ({
    id: 'motion_movesteps',
    type: 'command',
    action: 'edit',  // NEW: Mark as edit intent
    targetIndex: 0,  // First move block
    defaultValues: {STEPS: match[1]}
  })
}

// 2. In chatgpt-mock.jsx - Detect and handle
const editMatch = input.match(/change.*?move.*?to.*?(\d+).*?steps/i);
if (editMatch) {
  const result = await this.blocksIntegration.findAndUpdateBlock(
    {opcode: 'motion_movesteps', position: 'first'},
    {STEPS: editMatch[1]}
  );
  setMessages(prev => [...prev, {
    role: 'assistant',
    content: `Changed the first move block to ${editMatch[1]} steps`
  }]);
}

// 3. In ai-block-workspace-integration.js
async findAndUpdateBlock(pattern, newValues) {
  const block = this.workspace.getTopBlocks(false)[0];  // First block
  while (block) {
    if (block.type === 'motion_movesteps') {
      this.updateBlockInputs(block, {STEPS: newValues.STEPS});
      this.highlightNewBlock(block);
      return {success: true, block};
    }
    block = block.getNextBlock();
  }
  return {success: false};
}
```

---

## Resources

- **Blockly API:** https://developers.google.com/blockly/reference/js
- **Scratch-Blocks:** https://github.com/scratchfoundation/scratch-blocks
- **Scratch-VM:** https://github.com/scratchfoundation/scratch-vm

Key Blockly methods:
- `workspace.getBlockById(id)` - Get block by ID
- `block.getInput(name)` - Get input connection
- `block.getNextBlock()` - Get next connected block
- `block.getParent()` - Get parent block
- `block.setFieldValue(value, fieldName)` - Set field
- `block.dispose()` - Delete block
- `block.render()` - Redraw block

