import React, { useState, useEffect, useRef } from 'react';
import styles from './chatgpt-mock.css';
// Use the centralized AI workspace integration instead of direct placement
import './roman-global-theme.css'; // Import global Roman theme
import { GoogleGenerativeAI } from '@google/generative-ai';
import { handleAISuggestion, createBlockJSON } from '../../lib/ai-block-generator';

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
    const messagesEndRef = useRef(null);

    // Initialize the Gemini API only when component becomes visible
    useEffect(() => {
        const initializeGemini = async () => {
            if (visible && !isInitialized) {
                // Using the provided API key
                const API_KEY = "AIzaSyBZwm4AOpDTnmF0LHzYpKz_4fON8fvqWpo";
                
                // For debugging purposes, let's check if we have an API key
                if (!API_KEY) {
                    console.warn("Missing Gemini API key. Using mock responses.");
                    setChat('mock'); // Set to mock mode
                    setIsInitialized(true);
                    return;
                }
                
                try {
                    console.log("Initializing Gemini API with key:", API_KEY.substring(0, 5) + "...");
                    
                    const genAI = new GoogleGenerativeAI(API_KEY);
                    const model = genAI.getGenerativeModel({ model: "gemini-2.5-flash" });
                    
                    // System prompt to set the character
                    const systemPrompt = "You are Maximus, A helpful and friendly assistant";
                    
                    // Try a simpler approach using a standard chat session
                    const chatSession = model.startChat();
                    
                    // Initial message using a simple string instead of complex object
                    await chatSession.sendMessage(systemPrompt);
                    
                    setChat(chatSession);
                    setIsInitialized(true);
                    console.log("Successfully connected to Gemini API");
                } catch (err) {
                    console.error("Error initializing Gemini API:", err);
                    console.warn("Falling back to mock responses due to API error");
                    setChat('mock'); // Fallback to mock mode
                    setIsInitialized(true);
                    setError(null); // Clear error and use mock instead
                }
            }
        };
        
        initializeGemini();
    }, [visible, isInitialized]);

    // Auto scroll to bottom when new messages arrive
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages]);

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
                throw new Error("Oracle connection not established");
            }

            let responseText = "";

            // Handle mock mode
            if (chat === 'mock') {
                // Enhanced mock responses that create a programming plan
                const mockResponses = [
                    `By the gods, I understand your quest! Here is my battle plan: First, when the green flag is clicked, we shall make the sprite move forward 10 steps. Then, we will turn right 90 degrees. After that, we shall say "Hello World!" to announce our presence. Finally, we will wait 2 seconds before repeating this glorious sequence forever.`,
                    
                    `Hark! Your request commands a strategic approach: When the banner is raised, the sprite must move forward 50 steps across the battlefield. Next, it shall play a triumphant sound to herald its advance. Then, we will make it think "Victory is mine!" while turning left 45 degrees. This sequence shall repeat until the end of time.`,
                    
                    `Lo! The spirits reveal this programming strategy: Upon the flag's command, the sprite will move 20 steps forward. Then it shall change color to show its transformation. Next, we will make it say "I am ready!" to the world. After a brief pause of 1 second, it will turn around and repeat this noble cycle forever.`,
                    
                    `Behold! The ancient scrolls speak of this solution: When the emerald standard is lifted, our digital warrior will move forward 30 steps. It will then emit a joyful beep sound. Following this, the sprite shall think "Onward to glory!" while rotating right 15 degrees. This heroic pattern will continue eternally.`,
                    
                    `By Jupiter's wisdom! Your challenge requires this tactical plan: First, when the flag signals battle, move the sprite forward 40 steps. Then make it say "For Rome!" with pride. Next, the sprite will turn left 60 degrees and wait 3 seconds. This glorious sequence shall loop forever in an endless dance of victory.`
                ];
                
                // Add some randomness to the response selection
                const randomIndex = Math.floor(Math.random() * mockResponses.length);
                responseText = mockResponses[randomIndex];
                
                // Add a small delay to simulate API response time
                await new Promise(resolve => setTimeout(resolve, 1500));
            } else {
                // Enhanced prompt for real AI to generate programming plans
                const enhancedPrompt = `${input.trim()}

Please respond as Maximus, a Roman Commander, and create a step-by-step programming plan using Scratch blocks. Your response should include specific actions like:
- "when green flag clicked" (always start with this)
- "move X steps" for movement
- "turn left/right X degrees" for rotation  
- "say [message]" or "think [message]" for communication
- "play sound" for audio
- "wait X seconds" for timing
- "repeat" or "forever" for loops
- specific numbers and messages

Be specific about the sequence of actions.`;

                try {
                    // Option 1: Using single string input
                    const result = await chat.sendMessage(enhancedPrompt);
                    const response = await result.response;
                    
                    // Get text directly
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
                    console.error("Error with Gemini API:", err);
                    responseText = "The Oracle's connection to the cosmos is interrupted.";
                }
            }
            
            // Parse the AI response to extract blocks
            const extractedBlocks = extractBlocksFromResponse(responseText);
            
            console.log('Extracted blocks for workspace placement:', extractedBlocks);
            
            // Debug: Check what's available in window
            console.log('Window properties:', Object.keys(window));
            console.log('ScratchBlocks available:', typeof window.ScratchBlocks);
            console.log('Blockly available:', typeof window.Blockly);
            
            // Try to get the workspace directly with better debugging
            let workspace = null;
            if (typeof window !== 'undefined') {
                // Check for ScratchBlocks first (most likely)
                if (window.ScratchBlocks && window.ScratchBlocks.getMainWorkspace) {
                    workspace = window.ScratchBlocks.getMainWorkspace();
                    console.log('Found ScratchBlocks workspace:', workspace);
                } else if (window.Blockly && window.Blockly.getMainWorkspace) {
                    workspace = window.Blockly.getMainWorkspace();
                    console.log('Found Blockly workspace:', workspace);
                } else {
                    // Try alternative paths
                    workspace = window.workspace || 
                               (window.scratchGui && window.scratchGui.workspace);
                    console.log('Found alternative workspace:', workspace);
                }
                
                // If still no workspace, try to wait and retry
                if (!workspace) {
                    console.log('No workspace found immediately, will try fallback method');
                }
            }
            
            // Always use the centralized integration to create real, functional blocks
            if (extractedBlocks.length > 0) {
                // Always add "when flag clicked" at the beginning
                const flagBlock = {
                    id: 'event_whenflagclicked', // real Scratch hat
                    type: 'hat',
                    label: 'when green flag clicked',
                    category: 'events',
                    inputs: []
                };

                const allBlocks = [flagBlock, ...extractedBlocks];

                if (onBlocksGenerated) {
                    onBlocksGenerated(allBlocks);
                } else if (typeof window !== 'undefined' && window.handleAIGeneratedBlocks) {
                    window.handleAIGeneratedBlocks(allBlocks);
                }

                // Also update toolbox suggestions if available
                if (typeof window !== 'undefined' && window.processAISuggestion) {
                    try {
                        const result = window.processAISuggestion(input);
                        console.log('AI toolbox update result:', result);
                    } catch (e) {
                        console.warn('Unable to update toolbox with AI blocks:', e);
                    }
                }

                const blockMessage = {
                    role: 'assistant',
                    content: `Hail! I have analyzed the strategy and forged ${allBlocks.length} blocks for your construction! The blocks are now positioned in your workspace, ready for battle!`
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

    // Function to extract blocks from AI response text
    const extractBlocksFromResponse = (text) => {
        console.log('Raw AI response text:', text);
        
        // Use the AI block generator to process the text
        const generatedBlocks = handleAISuggestion(text);
        console.log('Generated blocks from AI generator:', generatedBlocks);
        
        return generatedBlocks;
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
