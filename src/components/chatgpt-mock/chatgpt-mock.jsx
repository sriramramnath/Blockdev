import React, { useState, useEffect, useRef } from 'react';
import styles from './chatgpt-mock.css';
import './roman-global-theme.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleAISuggestion, createBlockJSON } from '../../lib/ai-block-generator';
import scratchblocks from 'scratchblocks';
import { createBlocksDirectly } from './simpleBlockCreator';

const ChatGPTMock = ({ visible = false, onClose, onBlocksGenerated }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Hey there! What question would you like to ask Maximus?'
        }
    ]);
    const [input, setInput] = useState('');
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);
    const [chat, setChat] = useState(null);
    const [isInitialized, setIsInitialized] = useState(false);
    const [generatedBlocks, setGeneratedBlocks] = useState('');
    const messagesEndRef = useRef(null);
    const blocksContainerRef = useRef(null);

    // Initialize the Gemini API only when component becomes visible
    useEffect(() => {
        const initializeGemini = async () => {
            if (visible && !isInitialized) {
                const API_KEY = "AIzaSyBZwm4AOpDTnmF0LHzYpKz_4fON8fvqWpo";
                if (!API_KEY) {
                    console.warn("Missing Gemini API key. Using mock responses.");
                    setChat('mock');
                    setIsInitialized(true);
                    setError("Missing Gemini API key.");
                    return;
                }
                try {
                    console.log("Initializing Gemini API with key:", API_KEY.substring(0, 5) + "...");
                    const genAI = new GoogleGenerativeAI(API_KEY);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    const systemPrompt = "You are Maximus, A helpful and friendly assistant";
                    const chatSession = model.startChat();
                    await chatSession.sendMessage(systemPrompt);
                    setChat(chatSession);
                    setIsInitialized(true);
                    setError(null);
                    console.log("Successfully connected to Gemini API");
                } catch (err) {
                    console.error("Error initializing Gemini API:", err);
                    setError("Gemini API initialization failed: " + (err && err.message ? err.message : JSON.stringify(err)));
                    setChat('mock');
                    setIsInitialized(true);
                }
            }
        };
        
        initializeGemini();
    }, [visible, isInitialized]);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

    // Function to convert AI response to proper scratchblocks format
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

    const handleSendMessage = async () => {
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
                    `By the gods, I understand your quest! Here is my battle plan: when flag clicked, move 10 steps, turn right 90 degrees, say "Hello World!" for 2 seconds, wait 1 second, repeat forever.`,
                    `Hark! Your request commands a strategic approach: when flag clicked, move 50 steps, play sound "pop", think "Victory is mine!" for 2 seconds, turn left 45 degrees, repeat forever.`,
                    `Lo! The spirits reveal this programming strategy: when flag clicked, move 20 steps, change color effect by 25, say "I am ready!" for 1 second, wait 1 second, turn right 180 degrees, repeat forever.`,
                    `Behold! The ancient scrolls speak of this solution: when flag clicked, move 30 steps, play sound "meow", think "Onward to glory!" for 2 seconds, turn right 15 degrees, wait 2 seconds, repeat forever.`,
                    `By Jupiter's wisdom! Your challenge requires this tactical plan: when flag clicked, move 40 steps, say "For Rome!" for 1 second, turn left 60 degrees, change size by 10, wait 3 seconds, repeat forever.`
                ];
                const randomIndex = Math.floor(Math.random() * mockResponses.length);
                responseText = mockResponses[randomIndex];
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                // Enhanced prompt for real AI to generate programming plans
                const enhancedPrompt = `${input.trim()}

Please respond as Maximus, a Roman Commander, and create a step-by-step programming plan using Scratch blocks. Format your response with clear block commands like:

- "when flag clicked" (to start the program)
- "move X steps" (for movement with specific numbers)
- "turn left X degrees" or "turn right X degrees" (for rotation with specific numbers)
- "say [message] for X seconds" or "say [message]" (for speech)
- "think [message] for X seconds" or "think [message]" (for thoughts)
- "play sound [sound name]" (for audio)
- "wait X seconds" (for timing)
- "change [effect] by X" (for visual effects)
- "set [property] to X" (for setting values)
- "repeat X" or "repeat forever" (for loops)

Be specific with numbers and messages. Structure your response to clearly show the sequence of blocks that should be created.`;
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
                        responseText = "The Oracle's response is enigmatic.";
                    }
                } catch (err) {
                    console.error("Error with Gemini API (sendMessage):", err);
                    setError("Gemini API sendMessage failed: " + (err && err.message ? err.message : JSON.stringify(err)));
                    responseText = "The Oracle's connection to the cosmos is interrupted.";
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
                    content: `Hail! I have analyzed the strategy and forged ${totalBlocks + 1} blocks for your construction! The blocks are now positioned in your workspace and shown below as a visual preview.`
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
                    content: "Maximus is busy right now, but feel free to ask him any questions later!" 
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
                <span className={styles.headerDecor}></span>
                Maximus
                <span className={styles.headerDecor}></span>
                {onClose && (
                    <button className={styles.closeButton} onClick={onClose}>
                        ×
                    </button>
                )}
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
                    placeholder="Ask your question to the Maximus..."
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
