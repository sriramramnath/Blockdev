/**
 * Debug helper to check block values in the workspace
 * Run this in the browser console after generating blocks
 */

function debugBlockValues() {
    console.log('=== Debugging Block Values ===');
    
    // Try to get workspace
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
    }
    
    if (!workspace) {
        console.log('❌ Could not find workspace');
        return;
    }
    
    console.log('✅ Found workspace:', workspace);
    
    const allBlocks = workspace.getAllBlocks();
    console.log(`📦 Total blocks in workspace: ${allBlocks.length}`);
    
    allBlocks.forEach((block, index) => {
        console.log(`\n--- Block ${index + 1}: ${block.type} ---`);
        
        // Check inputs
        if (block.inputList && block.inputList.length > 0) {
            block.inputList.forEach((input, inputIndex) => {
                console.log(`Input ${inputIndex}: ${input.name}`);
                
                if (input.connection && input.connection.targetBlock()) {
                    const targetBlock = input.connection.targetBlock();
                    console.log(`  Connected to: ${targetBlock.type}`);
                    
                    if (targetBlock.type === 'math_number') {
                        const field = targetBlock.getField('NUM');
                        if (field) {
                            console.log(`  📊 Number value: "${field.getValue()}"`);
                            if (!field.getValue() || field.getValue() === '') {
                                console.log('  ⚠️  Empty number field detected!');
                            }
                        }
                    } else if (targetBlock.type === 'text') {
                        const field = targetBlock.getField('TEXT');
                        if (field) {
                            console.log(`  📝 Text value: "${field.getValue()}"`);
                        }
                    }
                } else {
                    console.log(`  No connection for input: ${input.name}`);
                }
            });
        } else {
            console.log('  No inputs');
        }
        
        // Check fields
        if (block.getFieldValue) {
            try {
                const fields = Object.keys(block.fieldRow_ || {});
                if (fields.length > 0) {
                    console.log('  Fields:', fields.map(f => `${f}: "${block.getFieldValue(f)}"`));
                }
            } catch (e) {
                // Ignore field errors
            }
        }
    });
    
    console.log('\n=== End Debug ===');
}

// Add to window for easy access
if (typeof window !== 'undefined') {
    window.debugBlockValues = debugBlockValues;
    console.log('✅ Debug function added to window.debugBlockValues()');
}

// Auto-export for module use
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { debugBlockValues };
}
