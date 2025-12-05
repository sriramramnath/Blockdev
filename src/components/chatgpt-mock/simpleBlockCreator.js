/**
 * Simple and Direct Block Creator for Scratch Workspace
 * This approach directly creates blocks using the Scratch workspace API
 */

// Helper function to delete all blocks in workspace
const deleteAllBlocks = () => {
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
    }

    if (!workspace) {
        console.error('No workspace found');
        return false;
    }

    workspace.clear();
    console.log('All blocks deleted');
    return true;
};

// Helper function to update/change block values
const updateBlockValue = (blockType, newValue) => {
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
    }

    if (!workspace) {
        console.error('No workspace found');
        return { success: false, count: 0 };
    }

    const allBlocks = workspace.getAllBlocks();
    let updatedCount = 0;

    // Map block types
    const typeMap = {
        'move': 'motion_movesteps',
        'turn left': 'motion_turnleft',
        'turn right': 'motion_turnright',
        'wait': 'control_wait',
        'size': 'looks_setsizeto',
        'repeat': 'control_repeat'
    };

    const targetType = typeMap[blockType] || blockType;

    allBlocks.forEach(block => {
        if (block.type === targetType) {
            // Find the input field and update it
            let inputName = null;
            if (block.type === 'motion_movesteps') inputName = 'STEPS';
            else if (block.type === 'motion_turnleft' || block.type === 'motion_turnright') inputName = 'DEGREES';
            else if (block.type === 'control_wait') inputName = 'DURATION';
            else if (block.type === 'looks_setsizeto') inputName = 'SIZE';
            else if (block.type === 'control_repeat') inputName = 'TIMES';

            if (inputName) {
                const input = block.getInput(inputName);
                if (input && input.connection && input.connection.targetBlock()) {
                    const numberBlock = input.connection.targetBlock();
                    if (numberBlock.type === 'math_number') {
                        numberBlock.setFieldValue(newValue, 'NUM');
                        updatedCount++;
                    }
                }
            }
        }
    });

    console.log(`Updated ${updatedCount} block(s) to value ${newValue}`);
    return { success: true, count: updatedCount };
};

// Helper function to delete specific blocks
const deleteSpecificBlocks = (blockDescription) => {
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
    }

    if (!workspace) {
        console.error('No workspace found');
        return { success: false, count: 0 };
    }

    const allBlocks = workspace.getAllBlocks();
    const lowerDesc = blockDescription.toLowerCase();
    let deletedCount = 0;

    // Map common descriptions to block types
    const blockTypeMap = {
        'move': 'motion_movesteps',
        'turn left': 'motion_turnleft',
        'turn right': 'motion_turnright',
        'turn': ['motion_turnleft', 'motion_turnright'],
        'say': ['looks_say', 'looks_sayforsecs'],
        'think': ['looks_think', 'looks_thinkforsecs'],
        'wait': 'control_wait',
        'repeat': 'control_repeat',
        'forever': 'control_forever',
        'when flag clicked': 'event_whenflagclicked',
        'flag': 'event_whenflagclicked',
        'when clicked': 'event_whenthisspriteclicked'
    };

    // Check for "last block" or "last X blocks"
    if (lowerDesc.includes('last')) {
        const countMatch = lowerDesc.match(/last (\d+)/);
        const count = countMatch ? parseInt(countMatch[1]) : 1;

        // Get all top-level blocks (not nested inside other blocks)
        const topBlocks = allBlocks.filter(block => !block.getParent());

        // Sort by position (assuming blocks added later are further down)
        topBlocks.sort((a, b) => {
            const aPos = a.getRelativeToSurfaceXY();
            const bPos = b.getRelativeToSurfaceXY();
            return bPos.y - aPos.y; // Higher Y values are lower on screen
        });

        // Delete the last N blocks
        for (let i = 0; i < Math.min(count, topBlocks.length); i++) {
            topBlocks[i].dispose(true);
            deletedCount++;
        }

        console.log(`Deleted ${deletedCount} last block(s)`);
        return { success: true, count: deletedCount };
    }

    // Check for specific block types
    let targetTypes = [];
    for (const [key, types] of Object.entries(blockTypeMap)) {
        if (lowerDesc.includes(key)) {
            targetTypes = Array.isArray(types) ? types : [types];
            break;
        }
    }

    if (targetTypes.length > 0) {
        // Delete all blocks of the specified type(s)
        allBlocks.forEach(block => {
            if (targetTypes.includes(block.type)) {
                block.dispose(true);
                deletedCount++;
            }
        });

        console.log(`Deleted ${deletedCount} block(s) of type ${targetTypes.join(', ')}`);
        return { success: true, count: deletedCount };
    }

    // If no specific type found, try to delete by keyword in the block
    allBlocks.forEach(block => {
        const blockText = block.toString().toLowerCase();
        if (blockText.includes(lowerDesc)) {
            block.dispose(true);
            deletedCount++;
        }
    });

    console.log(`Deleted ${deletedCount} block(s) matching "${blockDescription}"`);
    return { success: true, count: deletedCount };
};

// Helper function to create a block and connect it
const createAndConnectBlock = (workspace, blockType, params, parentBlock, isNested = false) => {
    const block = workspace.newBlock(blockType);
    block.initSvg();

    // Apply parameters based on block type
    if (params) {
        if (params.steps && blockType === 'motion_movesteps') {
            const stepsInput = block.getInput('STEPS');
            if (stepsInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(params.steps, 'NUM');
                numberBlock.render();
                stepsInput.connection.connect(numberBlock.outputConnection);
            }
        } else if (params.degrees && (blockType === 'motion_turnleft' || blockType === 'motion_turnright')) {
            const degreesInput = block.getInput('DEGREES');
            if (degreesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(params.degrees, 'NUM');
                numberBlock.render();
                degreesInput.connection.connect(numberBlock.outputConnection);
            }
        } else if (params.times && blockType === 'control_repeat') {
            const timesInput = block.getInput('TIMES');
            if (timesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(params.times, 'NUM');
                numberBlock.render();
                timesInput.connection.connect(numberBlock.outputConnection);
            }
        } else if (params.message && (blockType.startsWith('looks_say') || blockType.startsWith('looks_think'))) {
            const messageInput = block.getInput('MESSAGE');
            if (messageInput) {
                const textBlock = workspace.newBlock('text');
                textBlock.initSvg();
                textBlock.setFieldValue(params.message, 'TEXT');
                textBlock.render();
                messageInput.connection.connect(textBlock.outputConnection);
            }
            if (params.duration) {
                const secsInput = block.getInput('SECS');
                if (secsInput) {
                    const numberBlock = workspace.newBlock('math_number');
                    numberBlock.initSvg();
                    numberBlock.setFieldValue(params.duration, 'NUM');
                    numberBlock.render();
                    secsInput.connection.connect(numberBlock.outputConnection);
                }
            }
        } else if (params.seconds && blockType === 'control_wait') {
            const durationInput = block.getInput('DURATION');
            if (durationInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(params.seconds, 'NUM');
                numberBlock.render();
                durationInput.connection.connect(numberBlock.outputConnection);
            }
        }
    }

    block.render();

    // Connect to parent block
    if (parentBlock) {
        if (isNested && parentBlock.getInput('SUBSTACK')) {
            // Connect inside a loop/control structure
            const substackConnection = parentBlock.getInput('SUBSTACK').connection;
            if (substackConnection && block.previousConnection) {
                substackConnection.connect(block.previousConnection);
            }
        } else if (parentBlock.nextConnection && block.previousConnection) {
            // Connect below the parent block
            parentBlock.nextConnection.connect(block.previousConnection);
        }
    }

    return block;
};

// Simple function to create blocks directly in the workspace
const createBlocksDirectly = (aiResponse) => {
    console.log('========================================');
    console.log('Creating blocks from AI response:', aiResponse);
    console.log('========================================');

    // Check if user wants to delete blocks
    const lowerResponse = aiResponse.toLowerCase();
    if (lowerResponse.includes('delete') || lowerResponse.includes('clear') || lowerResponse.includes('remove all')) {
        if (lowerResponse.includes('all') || lowerResponse.includes('everything')) {
            deleteAllBlocks();
            return [];
        }
    }

    // Get the workspace
    let workspace = null;
    if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
        workspace = window.ScratchBlocks.getMainWorkspace();
    } else if (window.Blockly && window.Blockly.getMainWorkspace) {
        workspace = window.Blockly.getMainWorkspace();
    }

    if (!workspace) {
        console.error('No workspace found');
        return [];
    }

    const createdBlocks = [];
    
    try {
        // Check if there are any actual commands to create (skip if empty or just delete response)
        const hasCommands = lowerResponse.match(/move|turn|say|think|wait|repeat|forever|play|show|hide|size|go to|point|glide|change|set|if|broadcast|ask|answer|touching|key|mouse|reset/);

        if (!hasCommands) {
            console.log('No block commands found in response, skipping block creation');
            return [];
        }

        // Find existing blocks to connect to
        const allBlocks = workspace.getAllBlocks();
        let eventBlock = null;
        let lastBlock = null;
        let yOffset = 150;

        // Determine which event block to use or find
        const needsSpriteClickedEvent = lowerResponse.includes('when this sprite clicked');
        const targetEventType = needsSpriteClickedEvent ? 'event_whenthisspriteclicked' : 'event_whenflagclicked';

        // Look for existing event block of the target type
        eventBlock = allBlocks.find(block => block.type === targetEventType);

        if (eventBlock) {
            console.log(`Found existing ${targetEventType} block, will add to it`);
            // Find the last block in this stack
            lastBlock = eventBlock;
            while (lastBlock.getNextBlock()) {
                lastBlock = lastBlock.getNextBlock();
            }
            // Get position for new blocks
            const pos = lastBlock.getRelativeToSurfaceXY();
            yOffset = pos.y + 50;
        } else {
            // Create new event block if none exists
            console.log(`Creating new ${targetEventType} block`);
            if (needsSpriteClickedEvent) {
                eventBlock = workspace.newBlock('event_whenthisspriteclicked');
            } else {
                eventBlock = workspace.newBlock('event_whenflagclicked');
            }
            eventBlock.initSvg();
            eventBlock.render();
            eventBlock.moveBy(100, 100);
            createdBlocks.push(eventBlock);
            lastBlock = eventBlock;
        }

        // Extract commands from the AI response

        // Track which parts of the response we've processed to avoid duplicates
        let processedRanges = [];

        // Helper to check if a match has already been processed
        const isProcessed = (match) => {
            const start = match.index;
            const end = start + match[0].length;
            return processedRanges.some(range =>
                (start >= range.start && start < range.end) ||
                (end > range.start && end <= range.end)
            );
        };

        // Helper to mark a match as processed
        const markProcessed = (match) => {
            processedRanges.push({
                start: match.index,
                end: match.index + match[0].length
            });
        };

        // Parse natural language loops FIRST (e.g., "move 10 steps forever" or "move 10 steps, turn left 15 degrees forever")
        // Strip any intro text and match the actual command
        const cleanedResponse = lowerResponse.replace(/^.*?(?=move|turn|wait|say|show|hide|pen)/i, '').trim();
        const cleanedStartIndex = lowerResponse.toLowerCase().indexOf(cleanedResponse.toLowerCase());
        const foreverPattern = /^(.+?)\s+forever\s*$/i;
        const naturalForeverMatch = cleanedResponse.match(foreverPattern);

        if (naturalForeverMatch) {
            console.log('✓ Matched natural forever loop:', naturalForeverMatch[0]);
            console.log('✓ Nested commands:', naturalForeverMatch[1]);
            console.log('✓ Creating forever block with natural language syntax');
            
            // Mark the entire loop content as processed to prevent duplicate parsing
            if (cleanedStartIndex !== -1 && naturalForeverMatch.index !== undefined) {
                const matchIndex = cleanedStartIndex + naturalForeverMatch.index;
                processedRanges.push({
                    start: matchIndex,
                    end: matchIndex + naturalForeverMatch[0].length
                });
            }
            
            const foreverBlock = workspace.newBlock('control_forever');
            foreverBlock.initSvg();
            foreverBlock.render();
            foreverBlock.moveBy(100, yOffset);

            if (lastBlock && lastBlock.nextConnection && foreverBlock.previousConnection) {
                lastBlock.nextConnection.connect(foreverBlock.previousConnection);
            }

            createdBlocks.push(foreverBlock);

            // Parse nested commands from the captured group
            const nestedCommands = naturalForeverMatch[1];
            let nestedLastBlock = null;

            // Parse all commands inside
            const nestedMoves = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            nestedMoves.forEach(match => {
                const steps = match[1];
                const moveBlock = createAndConnectBlock(workspace, 'motion_movesteps', { steps },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(moveBlock);
                nestedLastBlock = moveBlock;
            });

            const nestedTurnLeft = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            nestedTurnLeft.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnleft', { degrees },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedTurnRight = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            nestedTurnRight.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnright', { degrees },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedWaits = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            nestedWaits.forEach(match => {
                const seconds = match[1];
                const waitBlock = createAndConnectBlock(workspace, 'control_wait', { seconds },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(waitBlock);
                nestedLastBlock = waitBlock;
            });

            const nestedSays = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            nestedSays.forEach(match => {
                const message = match[1];
                const duration = match[2];
                const blockType = duration ? 'looks_sayforsecs' : 'looks_say';
                const sayBlock = createAndConnectBlock(workspace, blockType, { message, duration },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(sayBlock);
                nestedLastBlock = sayBlock;
            });

            lastBlock = foreverBlock;
            yOffset += 50;

            // Skip the rest of the parsing since we handled everything
            console.log(`Successfully created ${createdBlocks.length} blocks`);
            return createdBlocks;
        }

        // Parse natural language repeat loops (e.g., "move 10 steps repeat 5" or "move 10 steps, turn left repeat 3")
        // Use the same cleaned response
        const repeatPattern = /^(.+?)\s+repeat\s+(\d+)(?:\s+times?)?\s*$/i;
        const naturalRepeatMatch = cleanedResponse.match(repeatPattern);

        if (naturalRepeatMatch) {
            console.log('✓ Matched natural repeat loop:', naturalRepeatMatch[0]);
            console.log('✓ Nested commands:', naturalRepeatMatch[1]);
            console.log('✓ Creating repeat block with natural language syntax');
            
            // Mark the entire loop content as processed to prevent duplicate parsing
            if (cleanedStartIndex !== -1 && naturalRepeatMatch.index !== undefined) {
                const matchIndex = cleanedStartIndex + naturalRepeatMatch.index;
                processedRanges.push({
                    start: matchIndex,
                    end: matchIndex + naturalRepeatMatch[0].length
                });
            }
            
            const times = naturalRepeatMatch[2];
            console.log(`Creating repeat block for ${times} times with natural language syntax`);
            const repeatBlock = workspace.newBlock('control_repeat');
            repeatBlock.initSvg();

            const timesInput = repeatBlock.getInput('TIMES');
            if (timesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(times, 'NUM');
                numberBlock.render();
                timesInput.connection.connect(numberBlock.outputConnection);
            }

            repeatBlock.render();
            repeatBlock.moveBy(100, yOffset);

            if (lastBlock && lastBlock.nextConnection && repeatBlock.previousConnection) {
                lastBlock.nextConnection.connect(repeatBlock.previousConnection);
            }

            createdBlocks.push(repeatBlock);

            // Parse nested commands
            const nestedCommands = naturalRepeatMatch[1];
            let nestedLastBlock = null;

            const nestedMoves = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            nestedMoves.forEach(match => {
                const steps = match[1];
                const moveBlock = createAndConnectBlock(workspace, 'motion_movesteps', { steps },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(moveBlock);
                nestedLastBlock = moveBlock;
            });

            const nestedTurnLeft = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            nestedTurnLeft.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnleft', { degrees },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedTurnRight = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            nestedTurnRight.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnright', { degrees },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedWaits = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            nestedWaits.forEach(match => {
                const seconds = match[1];
                const waitBlock = createAndConnectBlock(workspace, 'control_wait', { seconds },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(waitBlock);
                nestedLastBlock = waitBlock;
            });

            const nestedSays = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            nestedSays.forEach(match => {
                const message = match[1];
                const duration = match[2];
                const blockType = duration ? 'looks_sayforsecs' : 'looks_say';
                const sayBlock = createAndConnectBlock(workspace, blockType, { message, duration },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(sayBlock);
                nestedLastBlock = sayBlock;
            });

            lastBlock = repeatBlock;
            yOffset += 50;

            // Skip the rest of the parsing
            console.log(`Successfully created ${createdBlocks.length} blocks`);
            return createdBlocks;
        }

        // Move commands
        const moveMatches = [...lowerResponse.matchAll(/move.*?(\d+).*?steps?/g)];
        moveMatches.forEach(match => {
            // Skip if this match was already processed as part of a loop
            if (isProcessed(match)) {
                return;
            }
            const steps = match[1];
            console.log(`Creating move block with ${steps} steps`);
            
            const moveBlock = workspace.newBlock('motion_movesteps');
            moveBlock.initSvg();
            
            // Get the STEPS input and set its value
            const stepsInput = moveBlock.getInput('STEPS');
            if (stepsInput) {
                // Create a number block for the input
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(steps, 'NUM');
                numberBlock.render();
                
                // Connect the number block to the move block
                stepsInput.connection.connect(numberBlock.outputConnection);
            }
            
            moveBlock.render();
            moveBlock.moveBy(100, yOffset);
            
            // Connect to previous block
            if (lastBlock && lastBlock.nextConnection && moveBlock.previousConnection) {
                lastBlock.nextConnection.connect(moveBlock.previousConnection);
            }
            
            createdBlocks.push(moveBlock);
            lastBlock = moveBlock;
            yOffset += 50;
        });
        
        // Turn right commands
        const turnRightMatches = [...lowerResponse.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
        turnRightMatches.forEach(match => {
            // Skip if this match was already processed as part of a loop
            if (isProcessed(match)) {
                return;
            }
            const degrees = match[1];
            console.log(`Creating turn right block with ${degrees} degrees`);
            
            const turnBlock = workspace.newBlock('motion_turnright');
            turnBlock.initSvg();
            
            // Get the DEGREES input and set its value
            const degreesInput = turnBlock.getInput('DEGREES');
            if (degreesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(degrees, 'NUM');
                numberBlock.render();
                
                degreesInput.connection.connect(numberBlock.outputConnection);
            }
            
            turnBlock.render();
            turnBlock.moveBy(100, yOffset);
            
            // Connect to previous block
            if (lastBlock && lastBlock.nextConnection && turnBlock.previousConnection) {
                lastBlock.nextConnection.connect(turnBlock.previousConnection);
            }
            
            createdBlocks.push(turnBlock);
            lastBlock = turnBlock;
            yOffset += 50;
        });
        
        // Turn left commands
        const turnLeftMatches = [...lowerResponse.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
        turnLeftMatches.forEach(match => {
            // Skip if this match was already processed as part of a loop
            if (isProcessed(match)) {
                return;
            }
            const degrees = match[1];
            console.log(`Creating turn left block with ${degrees} degrees`);
            
            const turnBlock = workspace.newBlock('motion_turnleft');
            turnBlock.initSvg();
            
            const degreesInput = turnBlock.getInput('DEGREES');
            if (degreesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(degrees, 'NUM');
                numberBlock.render();
                
                degreesInput.connection.connect(numberBlock.outputConnection);
            }
            
            turnBlock.render();
            turnBlock.moveBy(100, yOffset);
            
            if (lastBlock && lastBlock.nextConnection && turnBlock.previousConnection) {
                lastBlock.nextConnection.connect(turnBlock.previousConnection);
            }
            
            createdBlocks.push(turnBlock);
            lastBlock = turnBlock;
            yOffset += 50;
        });
        
        // Wait commands
        const waitMatches = [...lowerResponse.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
        waitMatches.forEach(match => {
            // Skip if this match was already processed as part of a loop
            if (isProcessed(match)) {
                return;
            }
            const seconds = match[1];
            console.log(`Creating wait block with ${seconds} seconds`);
            
            const waitBlock = workspace.newBlock('control_wait');
            waitBlock.initSvg();
            
            const durationInput = waitBlock.getInput('DURATION');
            if (durationInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(seconds, 'NUM');
                numberBlock.render();
                
                durationInput.connection.connect(numberBlock.outputConnection);
            }
            
            waitBlock.render();
            waitBlock.moveBy(100, yOffset);
            
            if (lastBlock && lastBlock.nextConnection && waitBlock.previousConnection) {
                lastBlock.nextConnection.connect(waitBlock.previousConnection);
            }
            
            createdBlocks.push(waitBlock);
            lastBlock = waitBlock;
            yOffset += 50;
        });
        
        // Say commands
        const sayMatches = [...lowerResponse.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
        sayMatches.forEach(match => {
            // Skip if this match was already processed as part of a loop
            if (isProcessed(match)) {
                return;
            }
            const message = match[1];
            const duration = match[2];
            console.log(`Creating say block with message "${message}"${duration ? ` for ${duration} seconds` : ''}`);
            
            const sayBlock = workspace.newBlock(duration ? 'looks_sayforsecs' : 'looks_say');
            sayBlock.initSvg();
            
            // Set message
            const messageInput = sayBlock.getInput('MESSAGE');
            if (messageInput) {
                const textBlock = workspace.newBlock('text');
                textBlock.initSvg();
                textBlock.setFieldValue(message, 'TEXT');
                textBlock.render();
                
                messageInput.connection.connect(textBlock.outputConnection);
            }
            
            // Set duration if applicable
            if (duration) {
                const secsInput = sayBlock.getInput('SECS');
                if (secsInput) {
                    const numberBlock = workspace.newBlock('math_number');
                    numberBlock.initSvg();
                    numberBlock.setFieldValue(duration, 'NUM');
                    numberBlock.render();
                    
                    secsInput.connection.connect(numberBlock.outputConnection);
                }
            }
            
            sayBlock.render();
            sayBlock.moveBy(100, yOffset);
            
            if (lastBlock && lastBlock.nextConnection && sayBlock.previousConnection) {
                lastBlock.nextConnection.connect(sayBlock.previousConnection);
            }
            
            createdBlocks.push(sayBlock);
            lastBlock = sayBlock;
            yOffset += 50;
        });

        // Looks: change color effect by X
        const changeColorMatches = [...lowerResponse.matchAll(/change color effect by (\d+)/g)];
        changeColorMatches.forEach(match => {
            const value = match[1];
            const block = workspace.newBlock('looks_changeeffectby');
            block.initSvg();
            block.setFieldValue('COLOR', 'EFFECT');
            block.setFieldValue(value, 'CHANGE');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        });

        // Looks: set costume to X
        const setCostumeMatch = /set costume to ['"]?([^'"]+)['"]?/i.exec(lowerResponse);
        if (setCostumeMatch) {
            const costume = setCostumeMatch[1];
            const block = workspace.newBlock('looks_switchcostumeto');
            block.initSvg();
            block.setFieldValue(costume, 'COSTUME');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Sound: start sound X
        const startSoundMatch = /start sound ['"]?([^'"]+)['"]?/i.exec(lowerResponse);
        if (startSoundMatch) {
            const sound = startSoundMatch[1];
            const block = workspace.newBlock('sound_playuntildone');
            block.initSvg();
            block.setFieldValue(sound, 'SOUND_MENU');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Sound: stop all sounds
        if (/stop all sounds/.test(lowerResponse)) {
            const block = workspace.newBlock('sound_stopallsounds');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Control: if <condition>
        const ifMatch = /if ([^,]+),? then/i.exec(lowerResponse);
        if (ifMatch) {
            const block = workspace.newBlock('control_if');
            block.initSvg();
            // For demo, just set condition as text (real use: parse condition)
            block.setFieldValue(ifMatch[1], 'CONDITION');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Control: if-else
        const ifElseMatch = /if ([^,]+),? then (.+?) else (.+)/i.exec(lowerResponse);
        if (ifElseMatch) {
            const block = workspace.newBlock('control_if_else');
            block.initSvg();
            block.setFieldValue(ifElseMatch[1], 'CONDITION');
            block.setFieldValue(ifElseMatch[2], 'SUBSTACK');
            block.setFieldValue(ifElseMatch[3], 'SUBSTACK2');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Control: wait until <condition>
        const waitUntilMatch = /wait until ([^\.\n]+)/i.exec(lowerResponse);
        if (waitUntilMatch) {
            const block = workspace.newBlock('control_wait_until');
            block.initSvg();
            block.setFieldValue(waitUntilMatch[1], 'CONDITION');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Control: stop all
        if (/stop all/.test(lowerResponse)) {
            const block = workspace.newBlock('control_stop');
            block.initSvg();
            block.setFieldValue('all', 'STOP_OPTION');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Sensing: ask and wait
        const askMatch = /ask ['"]?([^'"]+)['"]? and wait/i.exec(lowerResponse);
        if (askMatch) {
            const block = workspace.newBlock('sensing_askandwait');
            block.initSvg();
            block.setFieldValue(askMatch[1], 'QUESTION');
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Sensing: key pressed
        const keyPressedMatch = /when (\w+) key pressed/i.exec(lowerResponse);
        if (keyPressedMatch) {
            const block = workspace.newBlock('event_whenkeypressed');
            block.initSvg();
            block.setFieldValue(keyPressedMatch[1], 'KEY_OPTION');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Operators: multiply, divide, random
        const mulMatch = /multiply (\d+) and (\d+)/.exec(lowerResponse);
        if (mulMatch) {
            const a = mulMatch[1], b = mulMatch[2];
            const block = workspace.newBlock('operator_multiply');
            block.initSvg();
            block.setFieldValue(a, 'NUM1');
            block.setFieldValue(b, 'NUM2');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }
        const divMatch = /divide (\d+) by (\d+)/.exec(lowerResponse);
        if (divMatch) {
            const a = divMatch[1], b = divMatch[2];
            const block = workspace.newBlock('operator_divide');
            block.initSvg();
            block.setFieldValue(a, 'NUM1');
            block.setFieldValue(b, 'NUM2');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }
        if (/pick random/.test(lowerResponse)) {
            const block = workspace.newBlock('operator_random');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Variables: show/hide variable
        const showVarMatch = /show variable (\w+)/.exec(lowerResponse);
        if (showVarMatch) {
            const block = workspace.newBlock('data_showvariable');
            block.initSvg();
            block.setFieldValue(showVarMatch[1], 'VARIABLE');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }
        const hideVarMatch = /hide variable (\w+)/.exec(lowerResponse);
        if (hideVarMatch) {
            const block = workspace.newBlock('data_hidevariable');
            block.initSvg();
            block.setFieldValue(hideVarMatch[1], 'VARIABLE');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Variables: reporter block
        const reporterVarMatch = /variable reporter (\w+)/.exec(lowerResponse);
        if (reporterVarMatch) {
            const block = workspace.newBlock('data_variable');
            block.initSvg();
            block.setFieldValue(reporterVarMatch[1], 'VARIABLE');
            block.render();
            block.moveBy(100, yOffset);
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }
        // Think commands
        const thinkMatches = [...lowerResponse.matchAll(/think.*?['"]([^'"]*)['"](?:.*?for.*?(\d+).*?seconds?)?/g)];
        thinkMatches.forEach(match => {
            const message = match[1];
            const duration = match[2];
            console.log(`Creating think block with message "${message}"${duration ? ` for ${duration} seconds` : ''}`);
            const thinkBlock = workspace.newBlock(duration ? 'looks_thinkforsecs' : 'looks_think');
            thinkBlock.initSvg();
            const messageInput = thinkBlock.getInput('MESSAGE');
            if (messageInput) {
                const textBlock = workspace.newBlock('text');
                textBlock.initSvg();
                textBlock.setFieldValue(message, 'TEXT');
                textBlock.render();
                messageInput.connection.connect(textBlock.outputConnection);
            }
            if (duration) {
                const secsInput = thinkBlock.getInput('SECS');
                if (secsInput) {
                    const numberBlock = workspace.newBlock('math_number');
                    numberBlock.initSvg();
                    numberBlock.setFieldValue(duration, 'NUM');
                    numberBlock.render();
                    secsInput.connection.connect(numberBlock.outputConnection);
                }
            }
            thinkBlock.render();
            thinkBlock.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && thinkBlock.previousConnection) {
                lastBlock.nextConnection.connect(thinkBlock.previousConnection);
            }
            createdBlocks.push(thinkBlock);
            lastBlock = thinkBlock;
            yOffset += 50;
        });

        // Play sound commands
        const playSoundMatches = [...lowerResponse.matchAll(/play sound ['"]?([^'"]*)['"]?/g)];
        playSoundMatches.forEach(match => {
            const soundName = match[1] || 'meow';
            console.log(`Creating play sound block with sound "${soundName}"`);
            const soundBlock = workspace.newBlock('sound_play');
            soundBlock.initSvg();
            const soundInput = soundBlock.getInput('SOUND_MENU');
            if (soundInput) {
                soundBlock.setFieldValue(soundName, 'SOUND_MENU');
            }
            soundBlock.render();
            soundBlock.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && soundBlock.previousConnection) {
                lastBlock.nextConnection.connect(soundBlock.previousConnection);
            }
            createdBlocks.push(soundBlock);
            lastBlock = soundBlock;
            yOffset += 50;
        });

        // Parse forever loops with nested blocks
        // Format: "forever: move 10 steps, turn left 15 degrees"
        const foreverLoopMatch = lowerResponse.match(/forever:\s*(.+?)(?=\.|$)/);
        if (foreverLoopMatch) {
            console.log('Creating forever block with nested content');
            
            // Mark the entire loop content as processed to prevent duplicate parsing
            if (foreverLoopMatch.index !== undefined) {
                processedRanges.push({
                    start: foreverLoopMatch.index,
                    end: foreverLoopMatch.index + foreverLoopMatch[0].length
                });
            }
            
            const foreverBlock = workspace.newBlock('control_forever');
            foreverBlock.initSvg();
            foreverBlock.render();
            foreverBlock.moveBy(100, yOffset);

            if (lastBlock && lastBlock.nextConnection && foreverBlock.previousConnection) {
                lastBlock.nextConnection.connect(foreverBlock.previousConnection);
            }

            createdBlocks.push(foreverBlock);

            // Parse nested blocks
            const nestedCommands = foreverLoopMatch[1];
            let nestedLastBlock = null;

            // Parse move commands inside
            const nestedMoves = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            nestedMoves.forEach(match => {
                const steps = match[1];
                const moveBlock = createAndConnectBlock(workspace, 'motion_movesteps', { steps },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(moveBlock);
                nestedLastBlock = moveBlock;
            });

            // Parse turn commands inside
            const nestedTurnLeft = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            nestedTurnLeft.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnleft', { degrees },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedTurnRight = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            nestedTurnRight.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnright', { degrees },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            // Parse wait commands inside
            const nestedWaits = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            nestedWaits.forEach(match => {
                const seconds = match[1];
                const waitBlock = createAndConnectBlock(workspace, 'control_wait', { seconds },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(waitBlock);
                nestedLastBlock = waitBlock;
            });

            // Parse say commands inside
            const nestedSays = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            nestedSays.forEach(match => {
                const message = match[1];
                const duration = match[2];
                const blockType = duration ? 'looks_sayforsecs' : 'looks_say';
                const sayBlock = createAndConnectBlock(workspace, blockType, { message, duration },
                    nestedLastBlock || foreverBlock, !nestedLastBlock);
                createdBlocks.push(sayBlock);
                nestedLastBlock = sayBlock;
            });

            lastBlock = foreverBlock;
            yOffset += 50;
        }

        // Parse repeat loops with nested blocks
        // Format: "repeat 5: move 10 steps, turn left 15 degrees"
        const repeatLoopMatch = lowerResponse.match(/repeat (\d+):\s*(.+?)(?=\.|$)/);
        if (repeatLoopMatch) {
            const times = repeatLoopMatch[1];
            console.log(`Creating repeat block for ${times} times with nested content`);
            
            // Mark the entire loop content as processed to prevent duplicate parsing
            if (repeatLoopMatch.index !== undefined) {
                processedRanges.push({
                    start: repeatLoopMatch.index,
                    end: repeatLoopMatch.index + repeatLoopMatch[0].length
                });
            }
            
            const repeatBlock = workspace.newBlock('control_repeat');
            repeatBlock.initSvg();

            const timesInput = repeatBlock.getInput('TIMES');
            if (timesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(times, 'NUM');
                numberBlock.render();
                timesInput.connection.connect(numberBlock.outputConnection);
            }

            repeatBlock.render();
            repeatBlock.moveBy(100, yOffset);

            if (lastBlock && lastBlock.nextConnection && repeatBlock.previousConnection) {
                lastBlock.nextConnection.connect(repeatBlock.previousConnection);
            }

            createdBlocks.push(repeatBlock);

            // Parse nested blocks
            const nestedCommands = repeatLoopMatch[2];
            let nestedLastBlock = null;

            // Parse move commands inside
            const nestedMoves = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            nestedMoves.forEach(match => {
                const steps = match[1];
                const moveBlock = createAndConnectBlock(workspace, 'motion_movesteps', { steps },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(moveBlock);
                nestedLastBlock = moveBlock;
            });

            // Parse turn commands inside
            const nestedTurnLeft = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            nestedTurnLeft.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnleft', { degrees },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            const nestedTurnRight = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            nestedTurnRight.forEach(match => {
                const degrees = match[1];
                const turnBlock = createAndConnectBlock(workspace, 'motion_turnright', { degrees },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(turnBlock);
                nestedLastBlock = turnBlock;
            });

            // Parse wait commands inside
            const nestedWaits = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            nestedWaits.forEach(match => {
                const seconds = match[1];
                const waitBlock = createAndConnectBlock(workspace, 'control_wait', { seconds },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(waitBlock);
                nestedLastBlock = waitBlock;
            });

            // Parse say commands inside
            const nestedSays = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            nestedSays.forEach(match => {
                const message = match[1];
                const duration = match[2];
                const blockType = duration ? 'looks_sayforsecs' : 'looks_say';
                const sayBlock = createAndConnectBlock(workspace, blockType, { message, duration },
                    nestedLastBlock || repeatBlock, !nestedLastBlock);
                createdBlocks.push(sayBlock);
                nestedLastBlock = sayBlock;
            });

            lastBlock = repeatBlock;
            yOffset += 50;
        }

        // Standalone repeat/forever blocks (without colon syntax)
        const repeatMatch = /repeat (\d+)(?!:)/.exec(lowerResponse);
        if (repeatMatch && !repeatLoopMatch) {
            const times = repeatMatch[1];
            console.log(`Creating repeat block for ${times} times`);
            const repeatBlock = workspace.newBlock('control_repeat');
            repeatBlock.initSvg();
            const timesInput = repeatBlock.getInput('TIMES');
            if (timesInput) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(times, 'NUM');
                numberBlock.render();
                timesInput.connection.connect(numberBlock.outputConnection);
            }
            repeatBlock.render();
            repeatBlock.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && repeatBlock.previousConnection) {
                lastBlock.nextConnection.connect(repeatBlock.previousConnection);
            }
            createdBlocks.push(repeatBlock);
            lastBlock = repeatBlock;
            yOffset += 50;
        }
        if (/(?:repeat )?forever(?!:)/.test(lowerResponse) && !foreverLoopMatch) {
            console.log('Creating forever block');
            const foreverBlock = workspace.newBlock('control_forever');
            foreverBlock.initSvg();
            foreverBlock.render();
            foreverBlock.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && foreverBlock.previousConnection) {
                lastBlock.nextConnection.connect(foreverBlock.previousConnection);
            }
            createdBlocks.push(foreverBlock);
            lastBlock = foreverBlock;
            yOffset += 50;
        }

        // Sensing: touching color
        const touchingColorMatch = /touching color (#[0-9a-f]{6}|[a-z]+)/.exec(lowerResponse);
        if (touchingColorMatch) {
            const color = touchingColorMatch[1];
            console.log(`Creating sensing_touchingcolor block with color ${color}`);
            const senseBlock = workspace.newBlock('sensing_touchingcolor');
            senseBlock.initSvg();
            senseBlock.setFieldValue(color, 'COLOR');
            senseBlock.render();
            senseBlock.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && senseBlock.previousConnection) {
                lastBlock.nextConnection.connect(senseBlock.previousConnection);
            }
            createdBlocks.push(senseBlock);
            lastBlock = senseBlock;
            yOffset += 50;
        }

        // Operators: add, subtract
        const addMatch = /add (\d+) and (\d+)/.exec(lowerResponse);
        if (addMatch) {
            const a = addMatch[1], b = addMatch[2];
            console.log(`Creating operator_add block for ${a} + ${b}`);
            const opBlock = workspace.newBlock('operator_add');
            opBlock.initSvg();
            opBlock.setFieldValue(a, 'NUM1');
            opBlock.setFieldValue(b, 'NUM2');
            opBlock.render();
            opBlock.moveBy(100, yOffset);
            createdBlocks.push(opBlock);
            lastBlock = opBlock;
            yOffset += 50;
        }
        const subMatch = /subtract (\d+) from (\d+)/.exec(lowerResponse);
        if (subMatch) {
            const a = subMatch[2], b = subMatch[1];
            console.log(`Creating operator_subtract block for ${a} - ${b}`);
            const opBlock = workspace.newBlock('operator_subtract');
            opBlock.initSvg();
            opBlock.setFieldValue(a, 'NUM1');
            opBlock.setFieldValue(b, 'NUM2');
            opBlock.render();
            opBlock.moveBy(100, yOffset);
            createdBlocks.push(opBlock);
            lastBlock = opBlock;
            yOffset += 50;
        }

        // Variables: set, change
        const setVarMatch = /set variable (\w+) to (\d+)/.exec(lowerResponse);
        if (setVarMatch) {
            const varName = setVarMatch[1], value = setVarMatch[2];
            console.log(`Creating data_setvariableto block for ${varName} = ${value}`);
            const setBlock = workspace.newBlock('data_setvariableto');
            setBlock.initSvg();
            setBlock.setFieldValue(varName, 'VARIABLE');
            setBlock.setFieldValue(value, 'VALUE');
            setBlock.render();
            setBlock.moveBy(100, yOffset);
            createdBlocks.push(setBlock);
            lastBlock = setBlock;
            yOffset += 50;
        }
        const changeVarMatch = /change variable (\w+) by (\d+)/.exec(lowerResponse);
        if (changeVarMatch) {
            const varName = changeVarMatch[1], value = changeVarMatch[2];
            console.log(`Creating data_changevariableby block for ${varName} += ${value}`);
            const changeBlock = workspace.newBlock('data_changevariableby');
            changeBlock.initSvg();
            changeBlock.setFieldValue(varName, 'VARIABLE');
            changeBlock.setFieldValue(value, 'VALUE');
            changeBlock.render();
            changeBlock.moveBy(100, yOffset);
            createdBlocks.push(changeBlock);
            lastBlock = changeBlock;
            yOffset += 50;
        }

        // More Looks blocks
        if (/\bshow\b/.test(lowerResponse)) {
            const block = workspace.newBlock('looks_show');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        if (/\bhide\b/.test(lowerResponse)) {
            const block = workspace.newBlock('looks_hide');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        const changeSizeMatch = /change size by (-?\d+)/.exec(lowerResponse);
        if (changeSizeMatch) {
            const value = changeSizeMatch[1];
            const block = workspace.newBlock('looks_changesizeby');
            block.initSvg();
            const input = block.getInput('CHANGE');
            if (input) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(value, 'NUM');
                numberBlock.render();
                input.connection.connect(numberBlock.outputConnection);
            }
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        const setSizeMatch = /set size to (\d+)/.exec(lowerResponse);
        if (setSizeMatch) {
            const value = setSizeMatch[1];
            const block = workspace.newBlock('looks_setsizeto');
            block.initSvg();
            const input = block.getInput('SIZE');
            if (input) {
                const numberBlock = workspace.newBlock('math_number');
                numberBlock.initSvg();
                numberBlock.setFieldValue(value, 'NUM');
                numberBlock.render();
                input.connection.connect(numberBlock.outputConnection);
            }
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // More Motion blocks
        const gotoXYMatch = /go to x:?\s*(-?\d+)\s*y:?\s*(-?\d+)/.exec(lowerResponse);
        if (gotoXYMatch) {
            const x = gotoXYMatch[1], y = gotoXYMatch[2];
            const block = workspace.newBlock('motion_gotoxy');
            block.initSvg();
            const xInput = block.getInput('X');
            const yInput = block.getInput('Y');
            if (xInput) {
                const xNum = workspace.newBlock('math_number');
                xNum.initSvg();
                xNum.setFieldValue(x, 'NUM');
                xNum.render();
                xInput.connection.connect(xNum.outputConnection);
            }
            if (yInput) {
                const yNum = workspace.newBlock('math_number');
                yNum.initSvg();
                yNum.setFieldValue(y, 'NUM');
                yNum.render();
                yInput.connection.connect(yNum.outputConnection);
            }
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        if (/point in direction 90|point right/.test(lowerResponse)) {
            const block = workspace.newBlock('motion_pointindirection');
            block.initSvg();
            const input = block.getInput('DIRECTION');
            if (input) {
                const num = workspace.newBlock('math_number');
                num.initSvg();
                num.setFieldValue('90', 'NUM');
                num.render();
                input.connection.connect(num.outputConnection);
            }
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Sensing blocks
        if (/ask .+ and wait/.test(lowerResponse)) {
            const askMatch = /ask ['"]([^'"]+)['"] and wait/.exec(lowerResponse);
            if (askMatch) {
                const question = askMatch[1];
                const block = workspace.newBlock('sensing_askandwait');
                block.initSvg();
                const input = block.getInput('QUESTION');
                if (input) {
                    const textBlock = workspace.newBlock('text');
                    textBlock.initSvg();
                    textBlock.setFieldValue(question, 'TEXT');
                    textBlock.render();
                    input.connection.connect(textBlock.outputConnection);
                }
                block.render();
                block.moveBy(100, yOffset);
                if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                    lastBlock.nextConnection.connect(block.previousConnection);
                }
                createdBlocks.push(block);
                lastBlock = block;
                yOffset += 50;
            }
        }

        if (/reset timer/.test(lowerResponse)) {
            const block = workspace.newBlock('sensing_resettimer');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        // Events
        if (/broadcast ['"]([^'"]+)['"]/.test(lowerResponse)) {
            const broadcastMatch = /broadcast ['"]([^'"]+)['"]/.exec(lowerResponse);
            if (broadcastMatch) {
                const message = broadcastMatch[1];
                const block = workspace.newBlock('event_broadcast');
                block.initSvg();
                const input = block.getInput('BROADCAST_INPUT');
                if (input) {
                    const textBlock = workspace.newBlock('text');
                    textBlock.initSvg();
                    textBlock.setFieldValue(message, 'TEXT');
                    textBlock.render();
                    input.connection.connect(textBlock.outputConnection);
                }
                block.render();
                block.moveBy(100, yOffset);
                if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                    lastBlock.nextConnection.connect(block.previousConnection);
                }
                createdBlocks.push(block);
                lastBlock = block;
                yOffset += 50;
            }
        }

        // Pen blocks
        if (/pen down/.test(lowerResponse)) {
            const block = workspace.newBlock('pen_penDown');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        if (/pen up/.test(lowerResponse)) {
            const block = workspace.newBlock('pen_penUp');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        if (/clear/.test(lowerResponse) && !lowerResponse.includes('delete')) {
            const block = workspace.newBlock('pen_clear');
            block.initSvg();
            block.render();
            block.moveBy(100, yOffset);
            if (lastBlock && lastBlock.nextConnection && block.previousConnection) {
                lastBlock.nextConnection.connect(block.previousConnection);
            }
            createdBlocks.push(block);
            lastBlock = block;
            yOffset += 50;
        }

        console.log(`Successfully created ${createdBlocks.length} blocks`);
        
    } catch (error) {
        console.error('Error creating blocks:', error);
    }
    
    return createdBlocks;
};

// Export for use
if (typeof window !== 'undefined') {
    window.createBlocksDirectly = createBlocksDirectly;
    window.deleteAllBlocks = deleteAllBlocks;
    window.deleteSpecificBlocks = deleteSpecificBlocks;
    window.updateBlockValue = updateBlockValue;
}

export { createBlocksDirectly, deleteAllBlocks, deleteSpecificBlocks, updateBlockValue };
