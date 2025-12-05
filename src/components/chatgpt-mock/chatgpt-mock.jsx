import React, { useState, useEffect, useRef } from 'react';
import styles from './chatgpt-mock.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleAISuggestion, createBlockJSON } from '../../lib/ai-block-generator';
import scratchblocks from 'scratchblocks';
import { createBlocksDirectly } from './simpleBlockCreator';
import { detectGameType, generateGameDescription, templateToBlockCommands, GAME_TEMPLATES } from './gameTemplates';

const ChatGPTMock = ({ visible = false, onClose, onBlocksGenerated }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hey! I\'m here to help you build some blocks. What do you want to create?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chat, setChat] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [generatedBlocks, setGeneratedBlocks] = useState('');
    const [selectedModel, setSelectedModel] = useState('gemini-2.5-flash');
    const messagesEndRef = useRef(null);
    const blocksContainerRef = useRef(null);
    const initializingRef = useRef(false);

    // Model mapping: display name -> actual model ID
    const modelOptions = [
        { displayName: 'Taurus 1.0 Pro', modelId: 'gemini-3-pro-preview' },
        { displayName: 'Taurus 1.0', modelId: 'gemini-2.5-flash' },
        { displayName: 'Taurus 1.0 mini', modelId: 'gemini-2.5-flash-lite' }
    ];

    // Initialize the Gemini API only when component becomes visible or model changes
    useEffect(() => {
        const initializeGemini = async () => {
            if (visible && !initializingRef.current) {
                initializingRef.current = true;
                const API_KEY = "AIzaSyD_gROd6T5w-pSi9aYl47sTEsWgr2dR6pY";
                if (!API_KEY) {
                    console.warn("Missing Gemini API key. Using mock responses.");
                    setChat('mock');
                    setIsInitialized(true);
                    setError("Missing Gemini API key.");
                    initializingRef.current = false;
                    return;
                }
                try {
                    console.log("Initializing Gemini API with key:", API_KEY.substring(0, 5) + "...");
                    console.log("Using model:", selectedModel);
                    const genAI = new GoogleGenerativeAI(API_KEY);
                    const model = genAI.getGenerativeModel({ model: selectedModel });
                    const systemPrompt = `You are Taurus, a chill game design assistant who helps create Scratch games. You understand FULL GAME CONCEPTS, not just individual blocks.

GAME DESIGN MODE: When users ask for a complete game (like "make a catching game" or "create a maze game"), you should:
1. Understand the game genre and mechanics
2. Design all necessary sprites and their behaviors
3. Create complete event handlers and game loops
4. Set up variables for scoring, lives, etc.
5. Respond with a COMPLETE game plan in natural language

COMMON GAME PATTERNS YOU KNOW:
- Catching Game: Sprite at bottom moves left/right, objects fall from top, catch them for points
- Chase Game: Sprite chases another sprite, avoid obstacles, timer-based
- Maze Game: Navigate through maze, reach goal, avoid walls
- Clicker Game: Click sprite for points, animations on click
- Drawing Game: Follow mouse, pen down to draw, clear button
- Platformer: Move left/right, jump, gravity, platforms
- Avoid Game: Dodge falling objects, move around, game over on hit

When describing a game, use natural language to describe:
- What each sprite should do
- When things should happen (events)
- How things should move
- What variables to track
- The complete game flow

BLOCK COMMAND MODE: You can still create specific blocks when asked:
- Motion: "move X steps", "turn left/right X degrees", "go to x: X y: Y"
- Looks: "say [message]", "show", "hide", "change size by X"
- Sound: "play sound [name]"
- Events: "when flag clicked", "when sprite clicked", "broadcast [message]"
- Control: "wait X seconds", "repeat X", "forever", "if-then"
- Sensing: "ask [question] and wait", "touching [object]", "key pressed"
- Pen: "pen down", "pen up", "clear"
- Variables: "set [var] to X", "change [var] by X"
- Delete: "delete all", "delete the move block", "delete last block"
- Update: "change move to 20", "change wait to 2"

LOOP SYNTAX: Both formats work - "move 10 steps forever" OR "forever: move 10 steps"

Be conversational, understand context, and think like a game designer!`;
                    const chatSession = model.startChat();
                    await chatSession.sendMessage(systemPrompt);
                    setChat(chatSession);
                    setIsInitialized(true);
                    setError(null);
                    console.log("Successfully connected to Gemini API");
                    initializingRef.current = false;
                } catch (err) {
                    console.error("Error initializing Gemini API:", err);
                    setError("Gemini API initialization failed: " + (err && err.message ? err.message : JSON.stringify(err)));
                    setChat('mock');
                    setIsInitialized(true);
                    initializingRef.current = false;
                }
            }
        };
        
        initializeGemini();
        
        // Cleanup function to reset initialization flag if component unmounts or model changes
        return () => {
            initializingRef.current = false;
        };
    }, [visible, selectedModel]);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Function to convert AI response to proper scratchblocks format
    const convertToScratchblocks = (text) => {
        if (!text || typeof text !== 'string') return '';

        console.log('Converting text to scratchblocks:', text);

        const lowerText = text.toLowerCase();

        // Check for delete commands first - return empty to avoid creating blocks
        if ((lowerText.includes('delete') || lowerText.includes('clear')) &&
            (lowerText.includes('all') || lowerText.includes('everything'))) {
            return '';
        }

        // Check for forever loops with nested blocks
        const foreverLoopMatch = lowerText.match(/forever:\s*(.+?)(?=\.|$)/);
        if (foreverLoopMatch) {
            const nestedCommands = foreverLoopMatch[1];
            const nestedBlocks = [];

            // Parse nested commands
            const moveMatches = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            moveMatches.forEach(m => nestedBlocks.push(`  move (${m[1]}) steps`));

            const turnLeftMatches = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            turnLeftMatches.forEach(m => nestedBlocks.push(`  turn ccw (${m[1]}) degrees`));

            const turnRightMatches = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            turnRightMatches.forEach(m => nestedBlocks.push(`  turn cw (${m[1]}) degrees`));

            const waitMatches = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            waitMatches.forEach(m => nestedBlocks.push(`  wait (${m[1]}) seconds`));

            const sayMatches = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            sayMatches.forEach(m => {
                if (m[2]) {
                    nestedBlocks.push(`  say [${m[1]}] for (${m[2]}) seconds`);
                } else {
                    nestedBlocks.push(`  say [${m[1]}]`);
                }
            });

            return 'when flag clicked\nforever\n' + nestedBlocks.join('\n');
        }

        // Check for repeat loops with nested blocks
        const repeatLoopMatch = lowerText.match(/repeat (\d+):\s*(.+?)(?=\.|$)/);
        if (repeatLoopMatch) {
            const times = repeatLoopMatch[1];
            const nestedCommands = repeatLoopMatch[2];
            const nestedBlocks = [];

            // Parse nested commands
            const moveMatches = [...nestedCommands.matchAll(/move.*?(\d+).*?steps?/g)];
            moveMatches.forEach(m => nestedBlocks.push(`  move (${m[1]}) steps`));

            const turnLeftMatches = [...nestedCommands.matchAll(/turn.*?left.*?(\d+).*?degrees?/g)];
            turnLeftMatches.forEach(m => nestedBlocks.push(`  turn ccw (${m[1]}) degrees`));

            const turnRightMatches = [...nestedCommands.matchAll(/turn.*?right.*?(\d+).*?degrees?/g)];
            turnRightMatches.forEach(m => nestedBlocks.push(`  turn cw (${m[1]}) degrees`));

            const waitMatches = [...nestedCommands.matchAll(/wait.*?(\d+(?:\.\d+)?).*?seconds?/g)];
            waitMatches.forEach(m => nestedBlocks.push(`  wait (${m[1]}) seconds`));

            const sayMatches = [...nestedCommands.matchAll(/say.*?['""]([^'""]*)['""](?:.*?for.*?(\d+).*?seconds?)?/g)];
            sayMatches.forEach(m => {
                if (m[2]) {
                    nestedBlocks.push(`  say [${m[1]}] for (${m[2]}) seconds`);
                } else {
                    nestedBlocks.push(`  say [${m[1]}]`);
                }
            });

            return `when flag clicked\nrepeat (${times})\n` + nestedBlocks.join('\n');
        }

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
            
            const turnLeftMatch = lowerSentence.match(/turn.*?left.*?(\d+).*?degrees?/);
            if (turnLeftMatch) {
                blockCommands.push(`turn ccw (${turnLeftMatch[1]}) degrees`);
                console.log(`Found turn left command: turn ccw (${turnLeftMatch[1]}) degrees`);
            }
            
            // Looks commands with better text extraction
            const sayMatch = lowerSentence.match(/say.*?['""]([^'""]*)['""].*?(?:for.*?(\d+).*?seconds?)?/);
            if (sayMatch) {
                if (sayMatch[2]) {
                    blockCommands.push(`say [${sayMatch[1]}] for (${sayMatch[2]}) seconds`);
                    console.log(`Found say with time: say [${sayMatch[1]}] for (${sayMatch[2]}) seconds`);
                } else {
                    blockCommands.push(`say [${sayMatch[1]}]`);
                    console.log(`Found say command: say [${sayMatch[1]}]`);
                }
            }
            
            const thinkMatch = lowerSentence.match(/think.*?['""]([^'""]*)['""].*?(?:for.*?(\d+).*?seconds?)?/);
            if (thinkMatch) {
                if (thinkMatch[2]) {
                    blockCommands.push(`think [${thinkMatch[1]}] for (${thinkMatch[2]}) seconds`);
                    console.log(`Found think with time: think [${thinkMatch[1]}] for (${thinkMatch[2]}) seconds`);
                } else {
                    blockCommands.push(`think [${thinkMatch[1]}]`);
                    console.log(`Found think command: think [${thinkMatch[1]}]`);
                }
            }
            
            // Sound commands
            if (lowerSentence.includes('play') && lowerSentence.includes('sound')) {
                blockCommands.push('play sound [pop v]');
                console.log('Found play sound command');
            }
            
            // Control commands with precise number extraction
            const waitMatch = lowerSentence.match(/wait.*?(\d+(?:\.\d+)?).*?seconds?/);
            if (waitMatch) {
                blockCommands.push(`wait (${waitMatch[1]}) seconds`);
                console.log(`Found wait command: wait (${waitMatch[1]}) seconds`);
            }
            
            const repeatMatch = lowerSentence.match(/repeat.*?(\d+)/);
            if (repeatMatch) {
                blockCommands.push(`repeat (${repeatMatch[1]})`);
                console.log(`Found repeat command: repeat (${repeatMatch[1]})`);
            }
            
            if (lowerSentence.includes('forever') || (lowerSentence.includes('repeat') && lowerSentence.includes('forever'))) {
                blockCommands.push('forever');
                console.log('Found forever command');
            }
        });

        console.log('All extracted block commands:', blockCommands);

        // Build the complete scratchblocks script
        let scratchblocksCode = '';
        if (blockCommands.length > 0) {
            scratchblocksCode = 'when flag clicked\n' + blockCommands.join('\n');
            
            // Handle control structures properly
            let formattedCode = '';
            let indentLevel = 0;
            const lines = scratchblocksCode.split('\n');
            
            for (let i = 0; i < lines.length; i++) {
                const line = lines[i].trim();
                
                if (line.includes('repeat') || line.includes('forever')) {
                    formattedCode += '  '.repeat(indentLevel) + line + '\n';
                    indentLevel++;
                } else if (line === 'end' || i === lines.length - 1) {
                    if (indentLevel > 0 && line === 'end') {
                        indentLevel--;
                    }
                    if (line !== 'end') {
                        formattedCode += '  '.repeat(indentLevel) + line + '\n';
                    }
                } else {
                    formattedCode += '  '.repeat(indentLevel) + line + '\n';
                }
            }
            
            scratchblocksCode = formattedCode.trim();
        }

        // Fallback for simple cases or when no specific commands are found
        if (!scratchblocksCode) {
            scratchblocksCode = 'when flag clicked\nsay [Hello, World!]';
        }

        console.log('Final generated scratchblocks code:', scratchblocksCode);
        return scratchblocksCode;
    };

    // Function to render scratchblocks using the proper API
    const renderScratchblocks = () => {
        if (blocksContainerRef.current && generatedBlocks) {
            console.log('Rendering scratchblocks with code:', generatedBlocks);
            
            // Clear previous content
            blocksContainerRef.current.innerHTML = '';
            
            // Create pre element with blocks class (required by scratchblocks)
            const preElement = document.createElement('pre');
            preElement.className = 'blocks';
            preElement.textContent = generatedBlocks;
            blocksContainerRef.current.appendChild(preElement);
            
            // Use scratchblocks to render the visual blocks
            try {
                // Use a more specific selector to avoid conflicts
                const selector = `#${blocksContainerRef.current.id || 'blocks-container'} pre.blocks`;
                
                // Add an ID if it doesn't exist
                if (!blocksContainerRef.current.id) {
                    blocksContainerRef.current.id = 'blocks-container-' + Date.now();
                }
                
                // Use the proper scratchblocks API with more explicit options
                scratchblocks.renderMatching(`#${blocksContainerRef.current.id} pre.blocks`, {
                    style: 'scratch3',
                    languages: ['en'],
                    scale: 0.8,
                    wrap: true
                });
                
                console.log('Successfully rendered scratchblocks with selector:', `#${blocksContainerRef.current.id} pre.blocks`);
                
                // Debug: Log the rendered HTML
                setTimeout(() => {
                    console.log('Rendered blocks HTML:', blocksContainerRef.current.innerHTML);
                }, 100);
                
            } catch (error) {
                console.error('Error rendering scratchblocks:', error);
                // Enhanced fallback: show both raw code and formatted text
                preElement.innerHTML = `
                    <div style="
                        background: #f0f0f0;
                        padding: 12px;
                        border-radius: 6px;
                        font-family: 'Courier New', monospace;
                        font-size: 12px;
                        line-height: 1.4;
                        color: #333;
                        white-space: pre-wrap;
                        border: 1px solid #ddd;
                    ">
                        <strong>Scratchblocks rendering failed. Raw code:</strong><br><br>
                        ${generatedBlocks.replace(/\n/g, '<br>')}
                    </div>
                `;
            }
        }
    };

    // Function to extract blocks from AI response text
    const extractBlocksFromResponse = (text) => {
        console.log('Raw AI response text:', text);
        
        // Use the AI block generator to process the text
        const generatedBlocks = handleAISuggestion(text);
        console.log('Generated blocks from AI generator:', generatedBlocks);
        
        return generatedBlocks;
    };

    // Effect to render blocks when generatedBlocks changes
    useEffect(() => {
        if (generatedBlocks) {
            // Small delay to ensure DOM is ready
            setTimeout(renderScratchblocks, 100);
        }
    }, [generatedBlocks]);

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading && input.trim()) {
            handleSendMessage();
        }
    };

    const handleModelChange = (e) => {
        const newModel = e.target.value;
        setSelectedModel(newModel);
        setIsInitialized(false);
        setChat(null);
        setError(null);
        initializingRef.current = false;
        // Clear messages except the initial greeting
        setMessages([
            {
                role: 'assistant',
                content: 'Hey! I\'m here to help you build some blocks. What do you want to create?'
            }
        ]);
    };

    const handleSendMessage = async () => {
        // Check for delete commands
        const lowerInput = input.trim().toLowerCase();

        // Delete all
        if ((lowerInput.includes('delete') || lowerInput.includes('clear') || lowerInput.includes('remove')) &&
            (lowerInput.includes('all') || lowerInput.includes('everything'))) {
            if (window.deleteAllBlocks) {
                window.deleteAllBlocks();
            }
            setMessages(prev => [...prev,
                { role: 'user', content: input },
                { role: 'assistant', content: 'All blocks deleted! Ready for a fresh start.' }
            ]);
            setInput('');
            setGeneratedBlocks('');
            return;
        }

        // Change/update block values
        if (lowerInput.includes('change') && (lowerInput.includes('to') || lowerInput.includes('='))) {
            if (window.updateBlockValue) {
                // Match patterns like "change move to 20" or "change turn left to 45"
                const changeMatch = lowerInput.match(/change\s+(?:the\s+)?(move|turn left|turn right|wait|size|repeat)(?:\s+block)?\s+to\s+(\d+)/);
                if (changeMatch) {
                    const blockType = changeMatch[1];
                    const newValue = changeMatch[2];
                    const result = window.updateBlockValue(blockType, newValue);
                    const message = result.count > 0
                        ? `Updated ${result.count} ${blockType} block(s) to ${newValue}.`
                        : `Couldn't find any ${blockType} blocks to update.`;

                    setMessages(prev => [...prev,
                        { role: 'user', content: input },
                        { role: 'assistant', content: message }
                    ]);
                    setInput('');
                    setGeneratedBlocks('');
                    return;
                }
            }
        }

        // Delete specific blocks
        if (lowerInput.includes('delete') || lowerInput.includes('remove')) {
            if (window.deleteSpecificBlocks) {
                // Extract what to delete (everything after "delete" or "remove")
                const deleteMatch = lowerInput.match(/(?:delete|remove)\s+(?:the\s+)?(.+)/);
                if (deleteMatch) {
                    const result = window.deleteSpecificBlocks(deleteMatch[1]);
                    const message = result.count > 0
                        ? `Deleted ${result.count} block(s).`
                        : `Couldn't find any blocks matching "${deleteMatch[1]}". Try being more specific!`;

                    setMessages(prev => [...prev,
                        { role: 'user', content: input },
                        { role: 'assistant', content: message }
                    ]);
                    setInput('');
                    setGeneratedBlocks('');
                    return;
                }
            }
        }

        // Custom rule: handle 'move X steps for each click' and similar requests
        const clickMoveMatch = input.trim().match(/move (\d+) steps? (for|on|each)? (every )?(click|mouse click|sprite click|when clicked)/i);
        if (clickMoveMatch) {
            const steps = clickMoveMatch[1];
            const preview = [
                'when this sprite clicked',
                `move ${steps} steps`
            ].join('\n');
            setGeneratedBlocks(preview);
            createBlocksDirectly(preview);
            setMessages(prev => [...prev, { role: 'assistant', content: `Blocks created for: when this sprite clicked, move ${steps} steps` }]);
            setIsLoading(false);
            return;
        }
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        // If the user input is a sequence of simple block commands (comma/and-separated), use it directly
        // Accepts: move X steps, turn [left|right] X degrees, turn X degrees (default right), wait X seconds, say/think
        const simpleBlockPattern = /^(move \d+ steps|turn (left|right)? ?\d+ degrees|turn \d+ degrees|wait \d+ seconds|say ".*"|say '.*'|think ".*"|think '.*')$/i;
        // Split by comma or 'and', trim, and check if all are simple block commands
        const commands = input.split(/,| and /i).map(cmd => cmd.trim()).filter(Boolean);
        // Normalize 'turn 90 degrees' to 'turn right 90 degrees' if no direction
        const normalizedCommands = commands.map(cmd => {
            const match = /^turn (\d+) degrees$/i.exec(cmd);
            if (match) {
                return `turn right ${match[1]} degrees`;
            }
            return cmd;
        });
        if (normalizedCommands.length > 0 && normalizedCommands.every(cmd => simpleBlockPattern.test(cmd))) {
            // Compose scratchblocks preview
            const preview = ['when flag clicked', ...normalizedCommands].join('\n');
            setGeneratedBlocks(preview);
            // Compose direct block creation string
            createBlocksDirectly(`when flag clicked, ${normalizedCommands.join(', ')}`);
            setMessages(prev => [...prev, { role: 'assistant', content: `Blocks created for: ${normalizedCommands.join(', ')}` }]);
            setIsLoading(false);
            return;
        }

        // Otherwise, use the AI as before
        try {
            if (!chat) {
                throw new Error("Oracle connection not established");
            }
            let responseText = "";
            // Handle mock mode
            if (chat === 'mock') {
                const mockResponses = [
                    `move 10 steps, turn right 90 degrees`,
                    `move 50 steps, turn left 45 degrees`,
                    `move 20 steps, turn right 180 degrees`,
                    `move 30 steps, turn right 15 degrees`,
                    `move 40 steps, turn left 60 degrees`
                ];
                const randomIndex = Math.floor(Math.random() * mockResponses.length);
                responseText = mockResponses[randomIndex];
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                // Enhanced prompt - supports both game-level and block-level requests
                const enhancedPrompt = `${input.trim()}

RESPONSE FORMAT:
If the user is asking for a COMPLETE GAME (e.g., "make a catching game", "create a platformer"), respond with:
1. A brief description of the game concept
2. Detailed instructions for what each sprite should do
3. All the block sequences needed in natural language

If the user is asking for SPECIFIC BLOCKS, respond ONLY with the block commands directly, no intro text.

BLOCK COMMANDS REFERENCE:
- Events: "when flag clicked", "when this sprite clicked"
- Motion: "move X steps", "turn left/right X degrees", "go to x: X y: Y"
- Looks: "say [message]", "think [message]", "show", "hide", "change size by X"
- Sound: "play sound [name]"
- Control: "wait X seconds", "repeat X" or "forever"
- Sensing: "ask [question] and wait", "touching [object]"
- Pen: "pen down", "pen up", "clear"
- Variables: "set variable [name] to X", "change variable [name] by X"

LOOP SYNTAX OPTIONS:
- Natural: "move 10 steps forever" OR "move 10 steps repeat 5"
- Colon: "forever: move 10 steps" OR "repeat 5: move 10 steps"

SPECIAL COMMANDS:
- Delete: "delete all", "delete the move block", "delete last block"
- Update: "change move to 20", "change wait to 2"

For games, think about: sprites, events, game loop, scoring, collision detection, and win/lose conditions.
Be creative and design complete, playable games!`;
                try {
                    const result = await chat.sendMessage(enhancedPrompt);
                    const response = await result.response;
                    if (typeof response.text === 'function') {
                        responseText = response.text();
                    } else if (response.text) {
                        responseText = response.text;
                    } else if (response.candidates && response.candidates[0]) {
                        const candidate = response.candidates[0];
                        if (candidate.content && candidate.content.parts && candidate.content.parts[0]) {
                            responseText = candidate.content.parts[0].text;
                        }
                    } else {
                        console.log("Response structure:", JSON.stringify(response));
                        responseText = "Hmm, I'm not sure what to say here.";
                    }
                } catch (err) {
                    console.error("Error with Gemini API (sendMessage):", err);
                    setError("Gemini API sendMessage failed: " + (err && err.message ? err.message : JSON.stringify(err)));
                    responseText = "Sorry, having some connection issues right now.";
                }
            }
            // Parse the AI response to extract blocks (for backward compatibility)
            const extractedBlocks = extractBlocksFromResponse(responseText);
            // Generate scratchblocks code from the response for visual display
            const scratchblocksCode = convertToScratchblocks(responseText);
            setGeneratedBlocks(scratchblocksCode);
            // Create functional blocks in the actual workspace (SIMPLE DIRECT METHOD)
            const functionalBlocks = createBlocksDirectly(responseText);
            // Only show a message about the blocks created
            if (functionalBlocks.length > 0 || extractedBlocks.length > 0) {
                const totalBlocks = Math.max(functionalBlocks.length, extractedBlocks.length);
                const blockMessage = {
                    role: 'assistant',
                    content: `Nice! I created ${totalBlocks + 1} blocks for you. They're now in your workspace and you can see a preview below.`
                };
                setMessages(prev => [...prev, blockMessage]);
            }
            const assistantMessage = { 
                role: 'assistant', 
                content: responseText
            };
            setMessages(prev => [...prev, assistantMessage]);
        } catch (err) {
            console.error("Error sending message to Oracle:", err);
            setMessages(prev => [
                ...prev, 
                { 
                    role: 'assistant', 
                    content: "Oops, something went wrong on my end. Try asking again!" 
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    // If not visible, don't render anything
    if (!visible) return null;

    return (
        <div className={styles.chatgptContainer}>
            <div className={styles.header}>
                <span className={styles.headerTitle}>Taurus</span>
                {onClose && (
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                )}
            </div>
            <div className={styles.modelSelector}>
                <label htmlFor="model-select" className={styles.modelLabel}>Model:</label>
                <select 
                    id="model-select"
                    className={styles.modelSelect}
                    value={selectedModel}
                    onChange={handleModelChange}
                    disabled={isLoading}
                >
                    {modelOptions.map(option => (
                        <option key={option.modelId} value={option.modelId}>
                            {option.displayName}
                        </option>
                    ))}
                </select>
            </div>
            <div className={styles.messagesContainer}>
                {messages.map((message, index) => (
                    <div key={index} className={styles.message}>
                        <div className={message.role === 'assistant' ? styles.assistant : styles.user}>
                            {message.content}
                        </div>
                    </div>
                ))}
                {isLoading && (
                    <div className={styles.message}>
                        <div className={styles.assistant}>
                            <div className={styles.loadingDots}>
                                <span></span>
                                <span></span>
                                <span></span>
                            </div>
                        </div>
                    </div>
                )}
                {error && (
                    <div className={styles.message}>
                        <div className={`${styles.assistant} ${styles.error}`}>
                            {error}
                        </div>
                    </div>
                )}
                <div ref={messagesEndRef} />
            </div>
            <div className={styles.inputArea}>
                <input 
                    type="text" 
                    className={styles.input} 
                    placeholder="What do you want to build?"
                    value={input}
                    onChange={handleInputChange}
                    onKeyDown={handleKeyDown}
                    disabled={isLoading || error !== null}
                />
                <button 
                    className={styles.sendButton} 
                    onClick={handleSendMessage}
                    disabled={isLoading || !input.trim() || error !== null}
                >
                    ➤
                </button>
            </div>

        </div>
    );
};

export default ChatGPTMock;
