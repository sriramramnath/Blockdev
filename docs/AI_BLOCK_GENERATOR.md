# AI Block Generator for Scratch-like Editor

This system allows users to generate Scratch blocks using natural language descriptions. When a user enters a request in the AI sidebar, the system parses the text and creates appropriate block objects that can be added to the block palette.

## Core Function

### `handleAISuggestion(text)`

This is the main function that parses natural language requests and generates block objects.

**Parameters:**
- `text` (string): Natural language description of the desired block

**Returns:**
- Array of block objects with structure:
  ```javascript
  {
    id: string,           // Unique block identifier
    type: string,         // Block type (command, reporter, boolean, hat, loop, conditional)
    label: string,        // Display text for the block
    category: string,     // Block category (motion, looks, sound, events, control, sensing, operators, variables)
    inputs: array,        // Input definitions for the block
    tooltip: string       // Help text for the block
  }
  ```

## Block Types

The system can generate several types of blocks:

- **Command blocks**: Execute actions (move, say, wait)
- **Reporter blocks**: Return values (math operations, random numbers)
- **Boolean blocks**: Return true/false (touching, key pressed)
- **Hat blocks**: Start scripts (when flag clicked, when key pressed)
- **Loop blocks**: Repeat code (repeat, forever)
- **Conditional blocks**: Execute code based on conditions (if-then)

## Supported Natural Language Patterns

### Loops
- "repeat 5 times", "loop 10 times"
- "forever", "continuously", "keep doing"
- "run multiple times"

### Movement
- "move forward 20 steps", "go ahead 15 pixels"
- "walk 10 units"

### Rotation
- "turn left 90 degrees", "rotate right 45"
- "spin left", "turn right"

### Timing
- "wait 2 seconds", "pause for 1.5 seconds"
- "delay 3 seconds"

### Speech/Display
- 'say "Hello"', "make it speak"
- 'think "Hmm..."', "make it think"

### Sound
- "play sound", "make noise", "beep"
- "play music"

### Conditionals
- "if then", "when something happens"
- "check if"

### Variables
- "create variable called score", "set health to 100"
- "make variable named lives"

### Events
- "when green flag clicked", "when space key pressed"
- "start program", "key press"

### Sensing
- "touching mouse", "detect collision"
- "hitting edge", "colliding with sprite"

### Math/Operators
- "add 5 and 3", "multiply 4 times 7"
- "subtract", "divide"
- "random number from 1 to 10"

## Integration with Scratch Editor

### Basic Integration

```javascript
import { handleAISuggestion } from './lib/ai-block-generator';

// In your blocks container component
function processUserRequest(text) {
    const blocks = handleAISuggestion(text);
    
    blocks.forEach(block => {
        addBlockToPalette(block);
    });
}
```

### Full Integration

```javascript
import { setupAIBlockIntegration } from './lib/ai-block-integration';

class Blocks extends React.Component {
    componentDidMount() {
        // ... existing setup ...
        
        // Add AI block generation capability
        setupAIBlockIntegration(this);
    }
    
    // Now you can call:
    // this.processAISuggestion(text)
}
```

### Adding Blocks to Palette

The `addBlockToPalette(block)` function needs to:

1. Create a block definition using `createBlockJSON(block)`
2. Register it with ScratchBlocks: `ScratchBlocks.defineBlocksWithJsonArray([blockJSON])`
3. Update the toolbox XML to include the new block
4. Refresh the toolbox display

## Example Usage

```javascript
// User types: "repeat 5 times"
const blocks = handleAISuggestion("repeat 5 times");

// Returns:
[
  {
    id: "ai_block_abc123",
    type: "loop", 
    label: "repeat 5",
    category: "control",
    inputs: [{ type: "input_value", name: "TIMES" }],
    tooltip: "Run the blocks inside this loop a specified number of times"
  }
]

// Add to palette
blocks.forEach(block => addBlockToPalette(block));
```

## UI Integration

Create an AI sidebar component:

```javascript
function AISidebar({ onProcessSuggestion }) {
    const [input, setInput] = useState('');
    
    const handleSubmit = () => {
        const result = onProcessSuggestion(input);
        if (result.success) {
            alert(`Added ${result.blocksAdded} blocks to palette!`);
            setInput('');
        }
    };
    
    return (
        <div className="ai-sidebar">
            <h3>AI Block Generator</h3>
            <textarea 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Describe the block you want... (e.g., 'repeat 10 times', 'move forward 20 steps')"
            />
            <button onClick={handleSubmit}>Generate Block</button>
            
            <div className="examples">
                <h4>Try saying:</h4>
                <ul>
                    <li>"repeat 5 times"</li>
                    <li>"move forward 20 steps"</li>
                    <li>"say hello"</li>
                    <li>"when space key pressed"</li>
                    <li>"if touching mouse then"</li>
                </ul>
            </div>
        </div>
    );
}
```

## Testing

Run the test file to see all supported patterns:

```javascript
import './test/ai-block-generator-test.js';
// Check console for test results
```

Or test individual patterns:

```javascript
const blocks = handleAISuggestion("move forward 10 steps");
console.log(blocks);
```

## Extending the System

To add new block patterns:

1. Add a new pattern object to `BLOCK_PATTERNS` array in `ai-block-generator.js`
2. Define regex patterns that match the natural language
3. Create a generator function that returns the appropriate block object
4. Test with various phrasings

Example:

```javascript
{
    patterns: [
        /\b(new pattern)\b/i,
        /\b(alternative phrasing)\b/i
    ],
    generate: (match, text) => ({
        id: generateBlockId(),
        type: BLOCK_TYPES.COMMAND,
        label: 'my new block',
        category: 'control',
        inputs: [],
        tooltip: 'Description of what this block does'
    })
}
```

## Browser Console Testing

When loaded in browser, these functions are available:

- `testAIBlocks()` - Run all test cases
- `generateBlock(text)` - Generate blocks from text
- `handleAISuggestion(text)` - Direct access to main function

## Notes

- The system generates unique IDs for each block to avoid conflicts
- Blocks are categorized by their primary function (motion, control, etc.)
- Input validation and error handling prevent crashes from malformed requests
- The system is extensible and can be enhanced with more sophisticated NLP
- Generated blocks include appropriate tooltips and help text
