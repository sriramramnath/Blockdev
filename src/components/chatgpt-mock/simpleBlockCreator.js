/**
 * Simple and Direct Block Creator for Codyssey Workspace
 * This approach directly creates blocks using the Codyssey workspace API
 */

// Simple function to create blocks directly in the workspace
const createBlocksDirectly = (aiResponse) => {
    console.log('Creating blocks directly from AI response:', aiResponse);
    
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
        // Clear existing AI-generated blocks (optional)
        // This prevents accumulation of old blocks

        // Detect event block type
        const lowerResponse = aiResponse.toLowerCase();
        let eventBlock = null;
        let yOffset = 150;
        let lastBlock = null;

        if (lowerResponse.includes('when this sprite clicked')) {
            eventBlock = workspace.newBlock('event_whenthisspriteclicked');
        } else {
            eventBlock = workspace.newBlock('event_whenflagclicked');
        }
        eventBlock.initSvg();
        eventBlock.render();
        eventBlock.moveBy(100, 100);
        createdBlocks.push(eventBlock);
        lastBlock = eventBlock;

        // Extract commands from the AI response
        
        // Move commands
        const moveMatches = [...lowerResponse.matchAll(/move.*?(\d+).*?steps?/g)];
        moveMatches.forEach(match => {
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

        // Repeat/forever control blocks
        const repeatMatch = /repeat (\d+)/.exec(lowerResponse);
        if (repeatMatch) {
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
        if (/repeat forever|forever/.test(lowerResponse)) {
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
        console.log(`Successfully created ${createdBlocks.length} blocks`);
        
    } catch (error) {
        console.error('Error creating blocks:', error);
    }
    
    return createdBlocks;
};

// Export for use
if (typeof window !== 'undefined') {
    window.createBlocksDirectly = createBlocksDirectly;
}

export { createBlocksDirectly };
