import React, { useState, useEffect, useRef } from 'react';
import styles from './chatgpt-mock.css';
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleAISuggestion, createBlockJSON } from '../../lib/ai-block-generator';
import scratchblocks from 'scratchblocks';
import { createBlocksDirectly } from './simpleBlockCreator';

const ChatGPTMock = ({ visible = true, onClose, onBlocksGenerated }) => {
    const [messages, setMessages] = useState([
        {
            role: 'assistant',
            content: 'Ask me to create blocks.'
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
                const API_KEY = "AIzaSyAkysoby9gcgbfYPIz-6AhdOEs9BHypp4c";
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
                    const systemPrompt = `You are a minimal AI assistant for Codyssey, a visual programming platform.

CRITICAL RULES:
1. Keep responses SHORT (1-2 sentences max in DISPLAY)
2. NO themes, NO roleplay, NO verbose explanations
3. Be direct and helpful
4. ALWAYS use this exact format:

[DISPLAY]
Brief, helpful response here.
[/DISPLAY]

[BLOCKS]
when flag clicked
move 10 steps
turn left 90 degrees
[/BLOCKS]

BLOCK SYNTAX:
- when flag clicked
- move [X] steps
- turn left [X] degrees / turn right [X] degrees
- say [message] for [X] seconds
- wait [X] seconds
- repeat [X] / repeat forever

EXAMPLE:
User: "move 10 steps and turn left"

[DISPLAY]
I'll create blocks to move forward 10 steps and turn left 90 degrees.
[/DISPLAY]

[BLOCKS]
when flag clicked
move 10 steps
turn left 90 degrees
[/BLOCKS]`;
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

            // Motion commands
            const moveMatch = lowerSentence.match(/move.*?(\d+).*?steps?/);
            if (moveMatch) {
                blockCommands.push(`move (${moveMatch[1]}) steps`);
            }

            const turnRightMatch = lowerSentence.match(/turn.*?right.*?(\d+).*?degrees?/);
            if (turnRightMatch) {
                blockCommands.push(`turn cw (${turnRightMatch[1]}) degrees`);
            }

            const turnLeftMatch = lowerSentence.match(/turn.*?left.*?(\d+).*?degrees?/);
            if (turnLeftMatch) {
                blockCommands.push(`turn ccw (${turnLeftMatch[1]}) degrees`);
            }

            // Looks commands
            const sayMatch = lowerSentence.match(/say.*?['""]([^'""]*)['""].*?(?:for.*?(\d+).*?seconds?)?/);
            if (sayMatch) {
                if (sayMatch[2]) {
                    blockCommands.push(`say [${sayMatch[1]}] for (${sayMatch[2]}) seconds`);
                } else {
                    blockCommands.push(`say [${sayMatch[1]}]`);
                }
            }

            // Control commands
            const waitMatch = lowerSentence.match(/wait.*?(\d+(?:\.\d+)?).*?seconds?/);
            if (waitMatch) {
                blockCommands.push(`wait (${waitMatch[1]}) seconds`);
            }

            const repeatMatch = lowerSentence.match(/repeat.*?(\d+)/);
            if (repeatMatch) {
                blockCommands.push(`repeat (${repeatMatch[1]})`);
            }

            if (lowerSentence.includes('forever')) {
                blockCommands.push('forever');
            }
        });

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

    // Function to extract blocks from AI response text
    const extractBlocksFromResponse = (text) => {
        console.log('Raw AI response text:', text);

        // Use the AI block generator to process the text
        const generatedBlocks = handleAISuggestion(text);
        console.log('Generated blocks from AI generator:', generatedBlocks);

        return generatedBlocks;
    };

    const handleInputChange = (e) => {
        setInput(e.target.value);
    };

    const handleKeyDown = (e) => {
        if (e.key === 'Enter' && !isLoading && input.trim()) {
            handleSendMessage();
        }
    };

    const handleSendMessage = async () => {
        if (!input.trim() || isLoading) return;

        const userMessage = { role: 'user', content: input };
        setMessages(prev => [...prev, userMessage]);
        setInput('');
        setIsLoading(true);

        try {
            if (!chat) {
                throw new Error("AI connection not established");
            }

            let responseText = "";

            // Handle mock mode
            if (chat === 'mock') {
                const mockResponses = [
                    `I understand your request! Here's what I'll create: when flag clicked, move 10 steps, turn right 90 degrees, say "Hello World!" for 2 seconds.`,
                    `Got it! I'll create these blocks: when flag clicked, move 50 steps, wait 1 second, turn left 45 degrees.`,
                    `Here's a programming solution: when flag clicked, move 20 steps, say "Ready!" for 1 second, wait 1 second, turn right 180 degrees.`
                ];
                const randomIndex = Math.floor(Math.random() * mockResponses.length);
                responseText = mockResponses[randomIndex];
                await new Promise(resolve => setTimeout(resolve, 1000));
            } else {
                // Enhanced prompt for real AI with structured response format
                const enhancedPrompt = `${input.trim()}

Remember to format your response with [DISPLAY] and [BLOCKS] sections.`;

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
                        responseText = "The AI's response format was unexpected.";
                    }
                } catch (err) {
                    console.error("Error with Gemini API:", err);
                    setError("Gemini API failed: " + (err && err.message ? err.message : JSON.stringify(err)));
                    responseText = "Sorry, I encountered an error processing your request.";
                }
            }

            // Parse structured response
            const displayMatch = responseText.match(/\[DISPLAY\]([\s\S]*?)\[\/DISPLAY\]/);
            const blocksMatch = responseText.match(/\[BLOCKS\]([\s\S]*?)\[\/BLOCKS\]/);

            const displayText = displayMatch ? displayMatch[1].trim() : responseText;
            const blocksText = blocksMatch ? blocksMatch[1].trim() : '';

            console.log('Parsed display text:', displayText);
            console.log('Parsed blocks text:', blocksText);

            // Create functional blocks from the [BLOCKS] section
            if (blocksText) {
                try {
                    const functionalBlocks = createBlocksDirectly(blocksText);
                    console.log(`Created ${functionalBlocks.length} blocks from structured response`);

                    // Pass blocks to parent component if callback exists
                    if (onBlocksGenerated && functionalBlocks.length > 0) {
                        onBlocksGenerated(functionalBlocks);
                    }
                } catch (err) {
                    console.error("Error creating blocks from structured response:", err);
                }
            }

            // Display only the user-friendly part
            const assistantMessage = {
                role: 'assistant',
                content: displayText
            };
            setMessages(prev => [...prev, assistantMessage]);

        } catch (err) {
            console.error("Error sending message:", err);
            setMessages(prev => [
                ...prev,
                {
                    role: 'assistant',
                    content: "Sorry, I'm having trouble right now. Please try again later!"
                }
            ]);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className={styles.chatgptContainer}>
            <div className={styles.header}>
                <span className={styles.headerDecor}></span>
                AI Assistant
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
                    placeholder="Describe blocks to create..."
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
