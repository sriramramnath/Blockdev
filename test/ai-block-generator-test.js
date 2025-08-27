/**
 * Test and demonstration of the AI Block Generator
 * Run this file to see examples of how the AI suggestion system works
 */

import { handleAISuggestion, createBlockJSON } from '../src/lib/ai-block-generator.js';

// Test cases demonstrating various natural language inputs
const testCases = [
    // Loop patterns
    "add a loop that repeats 5 times",
    "create a repeat block",
    "make something that runs forever",
    "I need a loop that goes continuously",
    
    // Movement patterns  
    "move forward 20 steps",
    "make the sprite walk 15 pixels",
    "go ahead 30 units",
    
    // Turn patterns
    "turn left 90 degrees",
    "rotate right 45 degrees", 
    "spin left",
    
    // Control patterns
    "wait for 2 seconds",
    "pause for 1.5 seconds",
    "add a delay of 3 seconds",
    
    // Speech patterns
    "make it say hello",
    'say "Welcome to my game"',
    "make the character speak",
    
    // Thinking patterns
    'think "What should I do next?"',
    "make it think about something",
    
    // Sound patterns
    "play a sound",
    "make a beep sound",
    "add some music",
    
    // Conditional patterns
    "if something happens then do this",
    "check if condition is true",
    "when something occurs",
    
    // Variable patterns
    "create a variable called score",
    "make a variable named health", 
    "set lives to 3",
    
    // Event patterns
    "when green flag clicked",
    "start when flag is pressed",
    "when space key pressed",
    "key press detection for 'a'",
    
    // Sensing patterns
    "check if touching mouse",
    "detect collision with edge",
    "touching another sprite",
    
    // Math patterns
    "add 5 and 3",
    "multiply 4 times 7", 
    "subtract 10 from 15",
    "divide 20 by 4",
    
    // Random patterns
    "pick random number from 1 to 100",
    "generate random between 5 and 50",
    
    // Generic/unmatched patterns
    "do something special",
    "custom behavior",
    "unique action"
];

console.log('=== AI Block Generator Test Suite ===\n');

testCases.forEach((testCase, index) => {
    console.log(`Test ${index + 1}: "${testCase}"`);
    
    try {
        const blocks = handleAISuggestion(testCase);
        
        if (blocks.length > 0) {
            blocks.forEach((block, blockIndex) => {
                console.log(`  Generated Block ${blockIndex + 1}:`);
                console.log(`    ID: ${block.id}`);
                console.log(`    Type: ${block.type}`);
                console.log(`    Label: ${block.label}`);
                console.log(`    Category: ${block.category}`);
                console.log(`    Inputs: ${block.inputs?.length || 0}`);
                console.log(`    Tooltip: ${block.tooltip}`);
                console.log(`    Default Values:`, block.defaultValues || 'None');
                
                // Also show the JSON that would be passed to ScratchBlocks
                const blockJSON = createBlockJSON(block);
                console.log(`    ScratchBlocks JSON:`, JSON.stringify(blockJSON, null, 6));
            });
        } else {
            console.log('  No blocks generated');
        }
        
    } catch (error) {
        console.error(`  Error: ${error.message}`);
    }
    
    console.log(''); // Empty line for readability
});

console.log('=== Test Suite Complete ===');

// Specific test to verify default values are working
console.log('\n=== Default Values Test ===');
const defaultValueTests = [
    "move 10 steps",
    "say [I have moved 10 steps!] for 2 seconds",
    "repeat 5 times",
    "turn left 45 degrees",
    "wait 2.5 seconds",
    'say "Hello World"',
    "think [What should I do?] for 3 seconds",
    "pick random 1 to 100"
];

defaultValueTests.forEach(testCase => {
    console.log(`\nTesting: "${testCase}"`);
    const blocks = handleAISuggestion(testCase);
    blocks.forEach(block => {
        console.log(`  Label: ${block.label}`);
        console.log(`  Default Values:`, block.defaultValues);
        
        const blockJSON = createBlockJSON(block);
        console.log(`  Generated args0:`, blockJSON.args0);
    });
});

console.log('=== Default Values Test Complete ===');

// Example of how the blocks would be used in the real system
console.log('\n=== Example Integration ===');

const exampleText = "repeat 10 times and move forward 5 steps";
console.log(`Input: "${exampleText}"`);

const generatedBlocks = handleAISuggestion(exampleText);
console.log('Generated blocks that would be added to palette:');

generatedBlocks.forEach((block, index) => {
    console.log(`\nBlock ${index + 1}:`);
    console.log(`- Would appear in ${block.category} category`);
    console.log(`- Label: "${block.label}"`);
    console.log(`- Type: ${block.type}`);
    console.log(`- Tooltip: "${block.tooltip}"`);
    
    // Show how addBlockToPalette would be called
    console.log(`- Would call: addBlockToPalette(${JSON.stringify(block, null, 2)})`);
});

// Export for testing in browser console
if (typeof window !== 'undefined') {
    window.testAIBlocks = () => {
        testCases.forEach(testCase => {
            console.log(`Testing: "${testCase}"`);
            const blocks = handleAISuggestion(testCase);
            console.log('Generated blocks:', blocks);
        });
    };
    
    window.generateBlock = handleAISuggestion;
    console.log('\nFunctions available in browser console:');
    console.log('- testAIBlocks() - Run all test cases');
    console.log('- generateBlock(text) - Generate blocks from text');
}
