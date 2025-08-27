/**
 * Demo script to test AI Block Generation
 * Run this in the browser console to test the system
 */

// Test function to simulate user input and check block generation
function testAIBlockGeneration() {
    console.log('Testing AI Block Generation System...');
    
    // Test cases
    const testInputs = [
        "make the sprite move forward 10 steps",
        "turn right 90 degrees and say hello",
        "move 20 steps then wait 2 seconds",
        "make a simple animation: move forward 30 steps, turn left 45 degrees, say 'I'm moving!' and repeat forever"
    ];
    
    testInputs.forEach((input, index) => {
        console.log(`\nTest ${index + 1}: "${input}"`);
        
        // Simulate the AI response parsing
        if (typeof window !== 'undefined' && window.handleAIGeneratedBlocks) {
            // This would normally come from the ChatGPT component
            const mockBlocks = [
                {
                    id: 'event_whenflagclicked',
                    type: 'hat',
                    label: 'when ⚑ clicked',
                    category: 'events',
                    inputs: [],
                    tooltip: 'Start the program when the green flag is clicked'
                },
                {
                    id: 'motion_movesteps',
                    type: 'command',
                    label: 'move 10 steps',
                    category: 'motion',
                    inputs: [{ name: 'STEPS', value: '10' }],
                    tooltip: 'Move the sprite forward by 10 steps'
                }
            ];
            
            console.log('Generated blocks:', mockBlocks);
            window.handleAIGeneratedBlocks(mockBlocks);
        } else {
            console.log('AI block handler not available');
        }
    });
}

// Export for use in browser
if (typeof window !== 'undefined') {
    window.testAIBlockGeneration = testAIBlockGeneration;
    console.log('AI Block Generation test function loaded. Run testAIBlockGeneration() to test.');
}

export { testAIBlockGeneration };
