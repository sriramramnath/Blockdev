/**
 * Debug helper for testing block placement
 */
window.debugBlockPlacement = function() {
    console.log('=== DEBUG BLOCK PLACEMENT ===');
    
    // Check what's available in window
    console.log('ScratchBlocks available:', typeof window.ScratchBlocks);
    console.log('Blockly available:', typeof window.Blockly);
    
    // Try to get workspace
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
        console.log('Found ScratchBlocks workspace:', workspace);
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
        console.log('Found Blockly workspace:', workspace);
    } else {
        console.log('No workspace found');
        return;
    }
    
    if (workspace) {
        console.log('Workspace type:', workspace.constructor.name);
        console.log('Workspace methods:', Object.getOwnPropertyNames(workspace.__proto__));
        
        // Try to create a simple block manually
        try {
            const blockXML = '<xml><block type="motion_movesteps" x="100" y="100"><value name="STEPS"><shadow type="math_number"><field name="NUM">10</field></shadow></value></block></xml>';
            console.log('Test XML:', blockXML);
            
            const xmlDoc = new DOMParser().parseFromString(blockXML, 'text/xml');
            const blockElement = xmlDoc.documentElement.firstChild;
            console.log('Parsed XML element:', blockElement);
            
            if (window.ScratchBlocks && window.ScratchBlocks.Xml && window.ScratchBlocks.Xml.domToBlock) {
                const testBlock = window.ScratchBlocks.Xml.domToBlock(blockElement, workspace);
                console.log('Created test block:', testBlock);
                
                if (testBlock) {
                    // Try to highlight it
                    setTimeout(() => {
                        if (workspace.glowBlock) {
                            workspace.glowBlock(testBlock.id, true);
                            setTimeout(() => {
                                workspace.glowBlock(testBlock.id, false);
                            }, 2000);
                        }
                    }, 500);
                }
            }
        } catch (error) {
            console.error('Error creating test block:', error);
        }
    }
};

console.log('Debug helper loaded. Call window.debugBlockPlacement() to test.');
