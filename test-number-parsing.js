/**
 * Test script to verify scratchblocks number parsing
 */

// Mock the convertToScratchblocks function for testing
const convertToScratchblocks = (text) => {
    if (!text || typeof text !== 'string') return '';

    console.log('Converting text to scratchblocks:', text);

    const sentences = text.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    const blockCommands = [];

    sentences.forEach(sentence => {
        const lowerSentence = sentence.toLowerCase();
        
        // Motion commands with more robust number extraction
        const moveMatch = lowerSentence.match(/move.*?(\d+).*?steps?/);
        if (moveMatch) {
            blockCommands.push(`move (${moveMatch[1]}) steps`);
            console.log(`Found move command: move (${moveMatch[1]}) steps`);
        }
        
        const turnRightMatch = lowerSentence.match(/turn.*?right.*?(\d+).*?degrees?/);
        if (turnRightMatch) {
            blockCommands.push(`turn cw (${turnRightMatch[1]}) degrees`);
            console.log(`Found turn right command: turn cw (${turnRightMatch[1]}) degrees`);
        }
        
        const waitMatch = lowerSentence.match(/wait.*?(\d+(?:\.\d+)?).*?seconds?/);
        if (waitMatch) {
            blockCommands.push(`wait (${waitMatch[1]}) seconds`);
            console.log(`Found wait command: wait (${waitMatch[1]}) seconds`);
        }
    });

    console.log('All extracted block commands:', blockCommands);

    // Build the complete scratchblocks script
    let scratchblocksCode = '';
    if (blockCommands.length > 0) {
        scratchblocksCode = 'when flag clicked\n' + blockCommands.join('\n');
    }

    if (!scratchblocksCode) {
        scratchblocksCode = 'when flag clicked\nsay [Hello, World!]';
    }

    console.log('Final generated scratchblocks code:', scratchblocksCode);
    return scratchblocksCode;
};

// Test cases
console.log('=== Testing Scratchblocks Number Parsing ===\n');

const testCases = [
    "move 10 steps, turn right 90 degrees, wait 1 second",
    "By the gods! Here is the plan: when flag clicked, move 10 steps, turn right 90 degrees, wait 1 second",
    "First, move forward 20 steps. Then turn left 45 degrees. Finally, wait 2 seconds.",
    "Move the sprite 50 steps and turn it right by 180 degrees"
];

testCases.forEach((testCase, index) => {
    console.log(`\n--- Test Case ${index + 1} ---`);
    console.log('Input:', testCase);
    const result = convertToScratchblocks(testCase);
    console.log('Output:', result);
    console.log('---\n');
});

console.log('Testing complete!');
