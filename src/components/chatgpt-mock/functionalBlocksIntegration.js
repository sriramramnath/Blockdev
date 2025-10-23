/**
 * Enhanced AI Block Generator for Functional Scratch Blocks
 * This integrates with scratchblocks for visual rendering AND creates actual workspace blocks
 */

// Import required Scratch VM and workspace functionality
const createFunctionalBlocks = (aiResponse, workspace) => {
    if (!workspace || !aiResponse) {
        console.warn('No workspace or AI response provided');
        return [];
    }

    const functionalBlocks = [];
    const sentences = aiResponse.split(/[.!?]+/).map(s => s.trim()).filter(s => s);
    
    sentences.forEach((sentence, index) => {
        const lowerSentence = sentence.toLowerCase();
        
        // Create actual functional blocks based on AI response
        
        // Motion blocks
        const moveMatch = lowerSentence.match(/move.*?(\d+).*?steps?/);
        if (moveMatch) {
            const blockData = {
                type: 'motion_movesteps',
                inputs: {
                    STEPS: {
                        shadow: {
                            type: 'math_number',
                            fields: {
                                NUM: [moveMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 100 + (index * 50)
            };
            functionalBlocks.push(blockData);
        }
        
        // Turn blocks
        const turnRightMatch = lowerSentence.match(/turn.*?right.*?(\d+).*?degrees?/);
        if (turnRightMatch) {
            const blockData = {
                type: 'motion_turnright',
                inputs: {
                    DEGREES: {
                        shadow: {
                            type: 'math_number',
                            fields: {
                                NUM: [turnRightMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 150 + (index * 50)
            };
            functionalBlocks.push(blockData);
        }
        
        const turnLeftMatch = lowerSentence.match(/turn.*?left.*?(\d+).*?degrees?/);
        if (turnLeftMatch) {
            const blockData = {
                type: 'motion_turnleft',
                inputs: {
                    DEGREES: {
                        shadow: {
                            type: 'math_number',
                            fields: {
                                NUM: [turnLeftMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 150 + (index * 50)
            };
            functionalBlocks.push(blockData);
        }
        
        // Say blocks
        const sayMatch = lowerSentence.match(/say.*?['""]([^'""]*)['""].*?(?:for.*?(\d+).*?seconds?)?/);
        if (sayMatch) {
            const blockData = {
                type: sayMatch[2] ? 'looks_sayforsecs' : 'looks_say',
                inputs: {
                    MESSAGE: {
                        shadow: {
                            type: 'text',
                            fields: {
                                TEXT: [sayMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 200 + (index * 50)
            };
            
            if (sayMatch[2]) {
                blockData.inputs.SECS = {
                    shadow: {
                        type: 'math_number',
                        fields: {
                            NUM: [sayMatch[2], null]
                        }
                    }
                };
            }
            
            functionalBlocks.push(blockData);
        }
        
        // Think blocks
        const thinkMatch = lowerSentence.match(/think.*?['""]([^'""]*)['""].*?(?:for.*?(\d+).*?seconds?)?/);
        if (thinkMatch) {
            const blockData = {
                type: thinkMatch[2] ? 'looks_thinkforsecs' : 'looks_think',
                inputs: {
                    MESSAGE: {
                        shadow: {
                            type: 'text',
                            fields: {
                                TEXT: [thinkMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 250 + (index * 50)
            };
            
            if (thinkMatch[2]) {
                blockData.inputs.SECS = {
                    shadow: {
                        type: 'math_number',
                        fields: {
                            NUM: [thinkMatch[2], null]
                        }
                    }
                };
            }
            
            functionalBlocks.push(blockData);
        }
        
        // Wait blocks
        const waitMatch = lowerSentence.match(/wait.*?(\d+(?:\.\d+)?).*?seconds?/);
        if (waitMatch) {
            const blockData = {
                type: 'control_wait',
                inputs: {
                    DURATION: {
                        shadow: {
                            type: 'math_number',
                            fields: {
                                NUM: [waitMatch[1], null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 300 + (index * 50)
            };
            functionalBlocks.push(blockData);
        }
        
        // Sound blocks
        if (lowerSentence.includes('play') && lowerSentence.includes('sound')) {
            const blockData = {
                type: 'sound_play',
                inputs: {
                    SOUND_MENU: {
                        shadow: {
                            type: 'sound_sounds_menu',
                            fields: {
                                SOUND_MENU: ['pop', null]
                            }
                        }
                    }
                },
                x: 100 + (index * 20),
                y: 350 + (index * 50)
            };
            functionalBlocks.push(blockData);
        }
    });
    
    return functionalBlocks;
};

// Function to add blocks to the actual workspace
const addBlocksToWorkspace = (blocks, workspace) => {
    if (!workspace || !blocks || blocks.length === 0) {
        console.warn('Cannot add blocks: invalid workspace or blocks');
        return;
    }
    
    try {
        // Add a "when flag clicked" event block first
        const flagBlock = workspace.newBlock('event_whenflagclicked');
        flagBlock.initSvg();
        flagBlock.render();
        flagBlock.moveBy(50, 50);
        
        let previousBlock = flagBlock;
        
        // Add each functional block and connect them
        blocks.forEach((blockData, index) => {
            console.log('Creating block:', blockData.type, 'with inputs:', blockData.inputs);
            
            const block = workspace.newBlock(blockData.type);
            
            // Initialize the block first
            block.initSvg();
            
            // Set inputs if they exist
            if (blockData.inputs) {
                Object.keys(blockData.inputs).forEach(inputName => {
                    const inputData = blockData.inputs[inputName];
                    console.log(`Setting input ${inputName}:`, inputData);
                    
                    if (inputData.shadow) {
                        try {
                            // Create shadow block
                            const shadowBlock = workspace.newBlock(inputData.shadow.type);
                            shadowBlock.initSvg();
                            
                            // Set field values properly
                            if (inputData.shadow.fields) {
                                Object.keys(inputData.shadow.fields).forEach(fieldName => {
                                    const fieldValue = inputData.shadow.fields[fieldName][0];
                                    console.log(`Setting field ${fieldName} to:`, fieldValue);
                                    
                                    // Use the proper method to set field values
                                    if (shadowBlock.getField && shadowBlock.getField(fieldName)) {
                                        shadowBlock.getField(fieldName).setValue(fieldValue);
                                    } else if (shadowBlock.setFieldValue) {
                                        shadowBlock.setFieldValue(fieldValue, fieldName);
                                    }
                                });
                            }
                            
                            shadowBlock.render();
                            
                            // Connect shadow block to main block
                            const input = block.getInput(inputName);
                            if (input && input.connection && shadowBlock.outputConnection) {
                                input.connection.connect(shadowBlock.outputConnection);
                                console.log(`Connected shadow block to input ${inputName}`);
                            } else {
                                console.warn(`Could not connect shadow block to input ${inputName}`);
                            }
                        } catch (shadowError) {
                            console.error('Error creating shadow block:', shadowError);
                        }
                    }
                });
            }
            
            // Render the main block after setting inputs
            block.render();
            
            // Position the block
            const xPos = blockData.x || (50 + index * 20);
            const yPos = blockData.y || (100 + index * 50);
            block.moveBy(xPos, yPos);
            console.log(`Positioned block at (${xPos}, ${yPos})`);
            
            // Connect to previous block if possible
            if (previousBlock && previousBlock.nextConnection && block.previousConnection) {
                try {
                    previousBlock.nextConnection.connect(block.previousConnection);
                    console.log('Connected block to previous block');
                } catch (connectionError) {
                    console.warn('Could not connect blocks:', connectionError);
                }
            }
            
            previousBlock = block;
        });
        
        // Force a render of the entire workspace
        workspace.render();
        
        console.log(`Successfully added ${blocks.length + 1} blocks to workspace`);
        
    } catch (error) {
        console.error('Error adding blocks to workspace:', error);
    }
};

// Enhanced integration function with better error handling
const integrateAIWithScratchWorkspace = (aiResponse) => {
    console.log('Integrating AI response with Scratch workspace');
    
    // Try to get the workspace using multiple methods
    let workspace = null;
    
    if (typeof window !== 'undefined') {
        // Try ScratchBlocks first
        if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
            workspace = window.ScratchBlocks.getMainWorkspace();
            console.log('Found ScratchBlocks workspace:', workspace);
        }
        // Try Blockly
        else if (window.Blockly && window.Blockly.getMainWorkspace) {
            workspace = window.Blockly.getMainWorkspace();
            console.log('Found Blockly workspace:', workspace);
        }
        // Try direct workspace reference
        else if (window.workspace) {
            workspace = window.workspace;
            console.log('Found direct workspace reference:', workspace);
        }
        // Try through ScratchGui
        else if (window.scratchGui && window.scratchGui.workspace) {
            workspace = window.scratchGui.workspace;
            console.log('Found workspace through ScratchGui:', workspace);
        }
    }
    
    if (!workspace) {
        console.warn('Could not find Scratch workspace for functional block creation');
        return [];
    }
    
    // Create functional blocks
    const functionalBlocks = createFunctionalBlocks(aiResponse, workspace);
    console.log('Created functional blocks:', functionalBlocks);
    
    // Add blocks to workspace
    if (functionalBlocks.length > 0) {
        addBlocksToWorkspace(functionalBlocks, workspace);
        
        // Try an alternative approach if the first one doesn't work
        setTimeout(() => {
            tryAlternativeBlockCreation(functionalBlocks, workspace, aiResponse);
        }, 500);
    }
    
    return functionalBlocks;
};

// Alternative block creation method
const tryAlternativeBlockCreation = (functionalBlocks, workspace, aiResponse) => {
    console.log('Trying alternative block creation method...');
    
    // Check if the blocks have proper values
    const allBlocks = workspace.getAllBlocks();
    let needsFixing = false;
    
    allBlocks.forEach(block => {
        if (block.type.includes('motion_') || block.type.includes('control_')) {
            const inputs = block.inputList;
            inputs.forEach(input => {
                if (input.connection && input.connection.targetBlock()) {
                    const targetBlock = input.connection.targetBlock();
                    if (targetBlock.type === 'math_number') {
                        const field = targetBlock.getField('NUM');
                        if (field && (!field.getValue() || field.getValue() === '')) {
                            needsFixing = true;
                            console.log('Found empty number field in block:', block.type);
                        }
                    }
                }
            });
        }
    });
    
    if (needsFixing) {
        console.log('Some blocks need fixing, attempting to set values directly...');
        
        // Extract numbers from the AI response again
        const numbers = aiResponse.match(/\d+/g);
        let numberIndex = 0;
        
        allBlocks.forEach(block => {
            if (block.type.includes('motion_') || block.type.includes('control_')) {
                const inputs = block.inputList;
                inputs.forEach(input => {
                    if (input.connection && input.connection.targetBlock()) {
                        const targetBlock = input.connection.targetBlock();
                        if (targetBlock.type === 'math_number' && numbers && numberIndex < numbers.length) {
                            const field = targetBlock.getField('NUM');
                            if (field && (!field.getValue() || field.getValue() === '')) {
                                try {
                                    field.setValue(numbers[numberIndex]);
                                    console.log(`Set value ${numbers[numberIndex]} in block ${block.type}`);
                                    numberIndex++;
                                } catch (e) {
                                    console.warn('Could not set field value:', e);
                                }
                            }
                        }
                    }
                });
            }
        });
        
        // Force re-render
        workspace.render();
    }
};

// Export functions for use in the component
export {
    createFunctionalBlocks,
    addBlocksToWorkspace,
    integrateAIWithScratchWorkspace
};
