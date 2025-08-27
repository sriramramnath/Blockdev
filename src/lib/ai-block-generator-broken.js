/**
 * AI Block Generator for Scratch-like Editor
 * Parses natural language requests and generates appropriate block objects for the palette
 */

// Block cate    // Loop patterns
    {
        patterns: [
            /\b(repeat|loop|for)\b\s*(\d+)\s*(times?)?\b/i,
            /\b(do|execute)\b\s*(repeatedly|again)\b/i,
            /\brun\b\s*(\d+)?\s*(multiple|several)?\s*times?\b/i
        ],
        generate: (match, text) => {
            const times = (match[2] || match[1] || '10').trim();
            return {
                // Use built-in repeat block so default value shows
                id: 'control_repeat',
                type: BLOCK_TYPES.LOOP,
                label: 'repeat %1',
                category: 'control',
                inputs: [{
                    type: 'input_value',
                    name: 'TIMES'
                }],
                defaultValues: {
                    TIMES: times
                },
                tooltip: 'Run the blocks inside this loop a specified number of times'
            };
        }
    },
    
    // Forever loop
    {
        patterns: [
            /\b(forever|continuously|endless|infinite)\b.*?\b(loop|repeat)\b/i,
            /\bkeep\s+(doing|running|executing)\b/i,
            /\brunning?\s+(forever|continuously)\b/i
        ],
        generate: () => ({
            id: 'control_forever',
            type: BLOCK_TYPES.LOOP,
            label: 'forever',
            category: 'control',
            inputs: [],
            tooltip: 'Run the blocks inside this loop forever'
        })
    },

// Block categories an
    motion: {
        id: 'motion',
        color: '#4C97FF',
        secondaryColor: '#4280D7',
        tertiaryColor: '#3373CC'
    },
    looks: {
        id: 'looks',
        color: '#9966FF',
        secondaryColor: '#855CD6',
        tertiaryColor: '#774DCB'
    },
    sound: {
        id: 'sound',
        color: '#CF63CF',
        secondaryColor: '#C94FC9',
        tertiaryColor: '#BD42BD'
    },
    events: {
        id: 'events',
        color: '#FFBF00',
        secondaryColor: '#E6AC00',
        tertiaryColor: '#CC9900'
    },
    control: {
        id: 'control',
        color: '#FFAB19',
        secondaryColor: '#EC9C13',
        tertiaryColor: '#CF8B17'
    },
    sensing: {
        id: 'sensing',
        color: '#5CB3D6',
        secondaryColor: '#47A8D1',
        tertiaryColor: '#2E8EB8'
    },
    operators: {
        id: 'operators',
        color: '#59C059',
        secondaryColor: '#46B946',
        tertiaryColor: '#389438'
    },
    variables: {
        id: 'variables',
        color: '#FF8C1A',
        secondaryColor: '#FF8000',
        tertiaryColor: '#DB6E00'
    }
};

// Block type constants
const BLOCK_TYPES = {
    COMMAND: 'command',
    REPORTER: 'reporter',
    BOOLEAN: 'boolean',
    HAT: 'hat',
    LOOP: 'loop',
    CONDITIONAL: 'conditional'
};

/**
 * Generates a unique block ID
 */
function generateBlockId() {
    return 'ai_block_' + Math.random().toString(36).substr(2, 9);
}

/**
 * Creates a block JSON definition for Scratch-blocks
 */
function createBlockJSON(blockInfo) {
    const category = BLOCK_CATEGORIES[blockInfo.category] || BLOCK_CATEGORIES.control;
    
    const blockJSON = {
        type: blockInfo.id,
        message0: blockInfo.label,
        args0: [],
        colour: category.color,
        colourSecondary: category.secondaryColor,
        colourTertiary: category.tertiaryColor,
        tooltip: blockInfo.tooltip || '',
        helpUrl: ''
    };

    // Process inputs and create args0 array
    if (blockInfo.inputs && blockInfo.inputs.length > 0) {
        blockInfo.inputs.forEach((input, index) => {
            if (input.type === 'input_value') {
                blockJSON.args0.push({
                    type: 'input_value',
                    name: input.name
                });
            } else if (input.type === 'field_dropdown') {
                blockJSON.args0.push({
                    type: 'field_dropdown',
                    name: input.name,
                    options: input.options || [['option', 'option']]
                });
            } else if (input.type === 'field_variable') {
                blockJSON.args0.push({
                    type: 'field_variable',
                    name: input.name,
                    variable: blockInfo.defaultValues?.[input.name] || 'variable'
                });
            }
        });
    }

    // Set block shape and connections based on type
    switch (blockInfo.type) {
        case BLOCK_TYPES.COMMAND:
            blockJSON.previousStatement = null;
            blockJSON.nextStatement = null;
            break;
        case BLOCK_TYPES.REPORTER:
            blockJSON.output = 'String';
            blockJSON.outputShape = 3; // Round shape
            break;
        case BLOCK_TYPES.BOOLEAN:
            blockJSON.output = 'Boolean';
            blockJSON.outputShape = 2; // Hexagonal shape
            break;
        case BLOCK_TYPES.HAT:
            blockJSON.nextStatement = null;
            blockJSON.extensions = ['shape_hat'];
            break;
        case BLOCK_TYPES.LOOP:
            blockJSON.previousStatement = null;
            blockJSON.nextStatement = null;
            blockJSON.message1 = '%1';
            blockJSON.args1 = [{
                type: 'input_statement',
                name: 'SUBSTACK'
            }];
            break;
        case BLOCK_TYPES.CONDITIONAL:
            blockJSON.previousStatement = null;
            blockJSON.nextStatement = null;
            blockJSON.message1 = '%1';
            blockJSON.args1 = [{
                type: 'input_statement',
                name: 'SUBSTACK'
            }];
            break;
    }

    return blockJSON;
}

/**
 * Pattern matching for different types of block requests
 */
const BLOCK_PATTERNS = [
    // Loop patterns
    {
        patterns: [
            /\b(repeat|loop|for)\b.*?(\d+)?\s*(times?)?\b/i,
            /\b(do|execute)\b.*?\b(repeatedly|again)\b/i,
            /\brun.*?\b(multiple|several)\s+times?\b/i
        ],
        generate: (match, text) => {
            const times = match[2] || '10';
            return {
                // Use built-in repeat block so default value shows
                id: 'control_repeat',
                type: BLOCK_TYPES.LOOP,
                label: 'repeat %1',
                category: 'control',
                inputs: [{
                    type: 'input_value',
                    name: 'TIMES'
                }],
                defaultValues: {
                    TIMES: times
                },
                tooltip: 'Run the blocks inside this loop a specified number of times'
            };
        }
    },
    
    // Forever loop
    {
        patterns: [
            /\b(forever|continuously|endless|infinite)\b.*?\b(loop|repeat)\b/i,
            /\bkeep\s+(doing|running|executing)\b/i,
            /\brunning?\s+(forever|continuously)\b/i
        ],
        generate: () => ({
            id: 'control_forever',
            type: BLOCK_TYPES.LOOP,
            label: 'forever',
            category: 'control',
            inputs: [],
            tooltip: 'Run the blocks inside this loop forever'
        })
    },

    // Movement patterns
    {
        patterns: [
            /\b(move|go|walk|step)\b\s*(\d+)\s*(steps?|pixels?|units?)?\b/i,
            /\b(forward|ahead)\b\s*(\d+)\b/i,
            /\b(move|go|walk|step)\b\s*(forward|ahead)?\s*(\d+)\s*(steps?|pixels?|units?)?\b/i
        ],
        generate: (match, text) => {
            const steps = (match[2] || match[3] || '10').trim();
            return {
                id: 'motion_movesteps', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'move %1 steps',
                category: 'motion',
                inputs: [{
                    type: 'input_value',
                    name: 'STEPS'
                }],
                defaultValues: {
                    STEPS: steps
                },
                tooltip: 'Move the sprite forward by the specified number of steps'
            };
        }
    },

    // Turn patterns
    {
        patterns: [
            /\b(turn|rotate)\s+(left|right)\b\s*(\d+)\s*(degrees?)?\b/i,
            /\b(spin|twist)\b\s*(left|right)\b\s*(\d+)?\s*(degrees?)?\b/i
        ],
        generate: (match, text) => {
            const direction = match[2].toLowerCase();
            const degrees = (match[3] || '15').trim();
            const blockType = direction === 'left' ? 'motion_turnleft' : 'motion_turnright';
            const symbol = direction === 'left' ? '↺' : '↻';
            return {
                id: blockType, // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: `turn ${symbol} %1 degrees`,
                category: 'motion',
                inputs: [{
                    type: 'input_value',
                    name: 'DEGREES'
                }],
                defaultValues: {
                    DEGREES: degrees
                },
                tooltip: `Turn the sprite ${direction} by the specified number of degrees`
            };
        }
    },

    // Wait patterns
    {
        patterns: [
            /\b(wait|pause|delay)\b.*?(\d+(?:\.\d+)?)\s*(seconds?|secs?)?\b/i,
            /\bstop\s+for\b.*?(\d+(?:\.\d+)?)\b/i
        ],
        generate: (match, text) => {
            const seconds = (match[2] || '1').trim();
            return {
                id: 'control_wait', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'wait %1 seconds',
                category: 'control',
                inputs: [{
                    type: 'input_value',
                    name: 'DURATION'
                }],
                defaultValues: {
                    DURATION: seconds
                },
                tooltip: 'Wait for the specified number of seconds'
            };
        }
    },

    // Say/think patterns
    {
        patterns: [
            /\bsay\s+\[([^\]]+)\]\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i,
            /\bsay\s+"([^"]+)"\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i,
            /\bsay\s+([^"]+)\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i
        ],
        generate: (match, text) => {
            const rawMessage = (match[1] || 'Hello!');
            const message = rawMessage.trim();
            const seconds = (match[2] || '2').trim();
            return {
                id: 'looks_sayforsecs', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'say %1 for %2 seconds',
                category: 'looks',
                inputs: [
                    {
                        type: 'input_value',
                        name: 'MESSAGE'
                    },
                    {
                        type: 'input_value', 
                        name: 'SECS'
                    }
                ],
                defaultValues: {
                    MESSAGE: message,
                    SECS: seconds
                },
                tooltip: 'Display a speech bubble with the message for the specified time'
            };
        }
    },

    // Regular say patterns
    {
        patterns: [
            /\b(say|speak|tell)\b.*?"([^"]+)"/i,
            /\b(say|speak|tell)\b.*?\b(hello|hi|goodbye)\b/i,
            /\bmake.*?\bsay\b/i
        ],
        generate: (match, text) => {
            const message = (match[2] || 'Hello!').trim();
            return {
                id: 'looks_say', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'say %1',
                category: 'looks',
                inputs: [{
                    type: 'input_value',
                    name: 'MESSAGE'
                }],
                defaultValues: {
                    MESSAGE: message
                },
                tooltip: 'Display a speech bubble with the specified message'
            };
        }
    },

    // Think patterns
    {
        patterns: [
            /\bthink\s+\[([^\]]+)\]\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i,
            /\bthink\s+"([^"]+)"\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i,
            /\bthink\s+([^"]+)\s+for\s+(\d+(?:\.\d+)?)\s*seconds?/i
        ],
        generate: (match, text) => {
            const message = (match[1] || 'Hmm...').trim();
            const seconds = (match[2] || '2').trim();
            return {
                id: 'looks_thinkforsecs', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'think %1 for %2 seconds',
                category: 'looks',
                inputs: [
                    {
                        type: 'input_value',
                        name: 'MESSAGE'
                    },
                    {
                        type: 'input_value',
                        name: 'SECS'
                    }
                ],
                defaultValues: {
                    MESSAGE: message,
                    SECS: seconds
                },
                tooltip: 'Display a thought bubble with the message for the specified time'
            };
        }
    },

    // Regular think patterns
    {
        patterns: [
            /\b(think|consider)\b.*?"([^"]+)"/i,
            /\bmake.*?\bthink\b/i
        ],
        generate: (match, text) => {
            const message = (match[2] || 'Hmm...').trim();
            return {
                id: 'looks_think', // Use existing Scratch block type
                type: BLOCK_TYPES.COMMAND,
                label: 'think %1',
                category: 'looks',
                inputs: [{
                    type: 'input_value',
                    name: 'MESSAGE'
                }],
                defaultValues: {
                    MESSAGE: message
                },
                tooltip: 'Display a thought bubble with the specified message'
            };
        }
    },

    // Sound patterns
    {
        patterns: [
            /\b(play|sound|audio)\b.*?\b(sound|note|music)\b/i,
            /\bmake.*?\b(noise|sound)\b/i,
            /\b(beep|meow|pop)\b/i
        ],
        generate: (match, text) => {
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.COMMAND,
                label: 'play sound until done',
                category: 'sound',
                inputs: [{
                    type: 'input_value',
                    name: 'SOUND_MENU'
                }],
                tooltip: 'Play a sound and wait until it finishes'
            };
        }
    },

    // Conditional patterns
    {
        patterns: [
            /\bif\b.*?\bthen\b/i,
            /\bwhen\b.*?\bhappens?\b/i,
            /\bcheck\s+if\b/i
        ],
        generate: () => ({
            id: generateBlockId(),
            type: BLOCK_TYPES.CONDITIONAL,
            label: 'if %1 then',
            category: 'control',
            inputs: [{
                type: 'input_value',
                name: 'CONDITION',
                check: 'Boolean'
            }],
            tooltip: 'Run the blocks inside if the condition is true'
        })
    },

    // Variable patterns
    {
        patterns: [
            /\b(variable|store|save)\b.*?\b(called|named)\s+(\w+)/i,
            /\b(create|make)\s+.*?\b(variable|value)\b/i,
            /\bset\s+(\w+)\s+to\b/i
        ],
        generate: (match, text) => {
            const varName = match[3] || match[1] || 'my variable';
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.COMMAND,
                label: 'set [%1] to %2',
                category: 'variables',
                inputs: [
                    {
                        type: 'field_variable',
                        name: 'VARIABLE'
                    },
                    {
                        type: 'input_value',
                        name: 'VALUE'
                    }
                ],
                defaultValues: {
                    VARIABLE: varName,
                    VALUE: '0'
                },
                tooltip: `Set the variable "${varName}" to the specified value`
            };
        }
    },

    // Event patterns
    {
        patterns: [
            /\bwhen\s+(green\s+flag|flag)\s+(clicked|pressed)/i,
            /\bstart\s+when\b.*?\bflag\b/i,
            /\bbegin\s+program\b/i
        ],
        generate: () => ({
            id: 'event_whenflagclicked',
            type: BLOCK_TYPES.HAT,
            label: 'when green flag clicked',
            category: 'events',
            inputs: [],
            tooltip: 'Run the blocks below when the green flag is clicked'
        })
    },

    // Key press patterns
    {
        patterns: [
            /\bwhen\s+(\w+)\s+key\s+(pressed|clicked)/i,
            /\bkey\s+press\b.*?\b(\w+)\b/i
        ],
        generate: (match, text) => {
            const key = match[1] || match[3] || 'space';
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.HAT,
                label: 'when [%1] key pressed',
                category: 'events',
                inputs: [{
                    type: 'field_dropdown',
                    name: 'KEY_OPTION',
                    options: [
                        ['space', 'space'],
                        ['up arrow', 'up arrow'],
                        ['down arrow', 'down arrow'],
                        ['left arrow', 'left arrow'],
                        ['right arrow', 'right arrow'],
                        ['a', 'a'],
                        ['b', 'b'],
                        ['c', 'c'],
                        ['d', 'd'],
                        ['w', 'w'],
                        ['s', 's']
                    ]
                }],
                defaultValues: {
                    KEY_OPTION: key
                },
                tooltip: `Run the blocks below when the ${key} key is pressed`
            };
        }
    },

    // Sensing patterns
    {
        patterns: [
            /\b(touching|hitting|colliding)\b.*?\b(mouse|edge|sprite)\b/i,
            /\bdetect\s+(collision|touch)\b/i
        ],
        generate: (match, text) => {
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.BOOLEAN,
                label: 'touching %1 ?',
                category: 'sensing',
                inputs: [{
                    type: 'input_value',
                    name: 'TOUCHINGOBJECTMENU'
                }],
                tooltip: 'Check if the sprite is touching something'
            };
        }
    },

    // Math/operator patterns
    {
        patterns: [
            /\b(add|plus|sum)\b.*?(\d+).*?(\d+)/i,
            /\b(subtract|minus)\b.*?(\d+).*?(\d+)/i,
            /\b(multiply|times)\b.*?(\d+).*?(\d+)/i,
            /\b(divide|division)\b.*?(\d+).*?(\d+)/i
        ],
        generate: (match, text) => {
            const operators = {
                add: '+', plus: '+', sum: '+',
                subtract: '-', minus: '-',
                multiply: '*', times: '*',
                divide: '/', division: '/'
            };
            const op = operators[match[1].toLowerCase()] || '+';
            const num1 = match[2] || '1';
            const num2 = match[3] || '1';
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.REPORTER,
                label: '%1 ' + op + ' %2',
                category: 'operators',
                inputs: [
                    { type: 'input_value', name: 'NUM1' },
                    { type: 'input_value', name: 'NUM2' }
                ],
                defaultValues: {
                    NUM1: num1,
                    NUM2: num2
                },
                tooltip: `Perform ${match[1]} operation on two numbers`
            };
        }
    },

    // Random number pattern
    {
        patterns: [
            /\b(random|rand)\s+(number|int)\b.*?(\d+).*?(\d+)/i,
            /\bpick\s+random\b.*?(\d+).*?(\d+)/i
        ],
        generate: (match, text) => {
            const from = match[3] || match[1] || '1';
            const to = match[4] || match[2] || '10';
            return {
                id: generateBlockId(),
                type: BLOCK_TYPES.REPORTER,
                label: 'pick random %1 to %2',
                category: 'operators',
                inputs: [
                    { type: 'input_value', name: 'FROM' },
                    { type: 'input_value', name: 'TO' }
                ],
                defaultValues: {
                    FROM: from,
                    TO: to
                },
                tooltip: 'Generate a random number between two values'
            };
        }
    }
];

/**
 * Main function to handle AI suggestions and generate blocks
 * @param {string} text - The natural language input from the user
 * @returns {Array<Object>} Array of block objects to be added to the palette
 */
function handleAISuggestion(text) {
    const blocks = [];
    const processedText = text.toLowerCase().trim();
    
    // Try to match patterns and generate blocks
    for (const pattern of BLOCK_PATTERNS) {
        for (const regex of pattern.patterns) {
            const match = processedText.match(regex);
            if (match) {
                try {
                    const block = pattern.generate(match, processedText);
                    if (block) {
                        blocks.push(block);
                        // Only generate one block per pattern match to avoid duplicates
                        break;
                    }
                } catch (error) {
                    console.warn('Error generating block from pattern:', error);
                }
            }
        }
    }
    
    // If no specific patterns matched, create a generic command block
    if (blocks.length === 0) {
        blocks.push({
            id: generateBlockId(),
            type: BLOCK_TYPES.COMMAND,
            label: 'custom action',
            category: 'control',
            inputs: [],
            tooltip: `Custom block created from: "${text}"`
        });
    }
    
    return blocks;
}

/**
 * Function to add a block to the palette (to be implemented in the main application)
 * This would need to interface with the actual Scratch-blocks system
 * @param {Object} block - Block object to add to the palette
 */
function addBlockToPalette(block) {
    // This function needs to be implemented to actually add blocks to the Scratch editor
    // It would typically:
    // 1. Create the block definition using ScratchBlocks.defineBlocksWithJsonArray
    // 2. Update the toolbox XML to include the new block
    // 3. Refresh the toolbox display
    
    console.log('Adding block to palette:', block);
    
    // Placeholder implementation - in a real implementation, this would:
    // - Access the ScratchBlocks instance
    // - Create the block definition
    // - Update the toolbox
    // - Trigger a refresh
    
    if (typeof window !== 'undefined' && window.ScratchBlocks) {
        try {
            // Create block definition
            const blockJSON = createBlockJSON(block);
            
            // Define the block
            window.ScratchBlocks.defineBlocksWithJsonArray([blockJSON]);
            
            // The toolbox would need to be updated here
            console.log('Block added successfully:', blockJSON);
        } catch (error) {
            console.error('Error adding block to palette:', error);
        }
    } else {
        console.warn('ScratchBlocks not available - block definition created but not added to palette');
    }
}

// Export functions for use in the main application
export {
    handleAISuggestion,
    addBlockToPalette,
    createBlockJSON,
    BLOCK_CATEGORIES,
    BLOCK_TYPES
};
