/**
 * Game Templates and Patterns for Quick Game Generation
 * These templates provide complete game structures that can be instantiated
 */

export const GAME_TEMPLATES = {
    // Simple catching game where objects fall and player catches them
    CATCHING_GAME: {
        name: "Catching Game",
        description: "Player moves left/right at bottom, catches falling objects for points",
        sprites: [
            {
                name: "Player",
                defaultSprite: "Cat",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "go to x: 0 y: -140",
                            "show",
                            "forever: if key left arrow pressed then move -10 steps, if key right arrow pressed then move 10 steps"
                        ]
                    }
                ]
            },
            {
                name: "FallingObject",
                defaultSprite: "Ball",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "forever: go to x: pick random -220 to 220 y: 180",
                            "show",
                            "repeat until y position < -180: change y by -5",
                            "if touching Player then change score by 1, play sound pop",
                            "wait 1 second"
                        ]
                    }
                ]
            }
        ],
        variables: ["score"],
        instructions: "Use arrow keys to move left and right. Catch the falling objects to score points!"
    },

    // Click the sprite to score points
    CLICKER_GAME: {
        name: "Clicker Game",
        description: "Click sprite to gain points, sprite reacts to clicks",
        sprites: [
            {
                name: "Clickable",
                defaultSprite: "Button",
                scripts: [
                    {
                        event: "when this sprite clicked",
                        blocks: [
                            "change score by 1",
                            "play sound pop",
                            "change size by 10",
                            "wait 0.1 seconds",
                            "change size by -10",
                            "move 10 steps",
                            "turn right 15 degrees"
                        ]
                    },
                    {
                        event: "when flag clicked",
                        blocks: [
                            "set score to 0",
                            "go to x: 0 y: 0",
                            "show"
                        ]
                    }
                ]
            }
        ],
        variables: ["score"],
        instructions: "Click the sprite as many times as you can!"
    },

    // Chase game where one sprite chases another
    CHASE_GAME: {
        name: "Chase Game",
        description: "Player tries to catch/avoid another sprite",
        sprites: [
            {
                name: "Player",
                defaultSprite: "Cat",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "go to x: 0 y: 0",
                            "forever: if key up arrow pressed then change y by 5",
                            "if key down arrow pressed then change y by -5",
                            "if key left arrow pressed then change x by -5",
                            "if key right arrow pressed then change x by 5",
                            "if touching Mouse then say You win! for 2 seconds, stop all"
                        ]
                    }
                ]
            },
            {
                name: "Target",
                defaultSprite: "Mouse",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "forever: point towards Player",
                            "move 2 steps",
                            "if on edge bounce"
                        ]
                    }
                ]
            }
        ],
        variables: [],
        instructions: "Use arrow keys to move. Try to catch/avoid the other sprite!"
    },

    // Drawing/art game
    DRAWING_GAME: {
        name: "Drawing Game",
        description: "Follow mouse and draw with pen",
        sprites: [
            {
                name: "Pen",
                defaultSprite: "Pencil",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "clear",
                            "pen up",
                            "forever: go to mouse pointer",
                            "if mouse down then pen down else pen up"
                        ]
                    },
                    {
                        event: "when space key pressed",
                        blocks: [
                            "clear",
                            "pen up"
                        ]
                    }
                ]
            }
        ],
        variables: [],
        instructions: "Click and drag to draw. Press space to clear!"
    },

    // Simple platformer movement
    PLATFORMER_BASIC: {
        name: "Basic Platformer",
        description: "Left/right movement with jumping",
        sprites: [
            {
                name: "Player",
                defaultSprite: "Cat",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "set gravity to -2",
                            "set yVelocity to 0",
                            "go to x: -200 y: -100",
                            "forever: if key left arrow pressed then change x by -5",
                            "if key right arrow pressed then change x by 5",
                            "change yVelocity by gravity",
                            "change y by yVelocity",
                            "if y position < -140 then set y to -140, set yVelocity to 0"
                        ]
                    },
                    {
                        event: "when space key pressed",
                        blocks: [
                            "if y position = -140 then set yVelocity to 15"
                        ]
                    }
                ]
            }
        ],
        variables: ["gravity", "yVelocity"],
        instructions: "Use arrow keys to move left/right. Press space to jump!"
    },

    // Avoid falling objects
    AVOID_GAME: {
        name: "Avoid Game",
        description: "Dodge falling objects, game over on collision",
        sprites: [
            {
                name: "Player",
                defaultSprite: "Cat",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "go to x: 0 y: -140",
                            "set lives to 3",
                            "forever: if key left arrow pressed then change x by -10",
                            "if key right arrow pressed then change x by 10"
                        ]
                    }
                ]
            },
            {
                name: "Obstacle",
                defaultSprite: "Rock",
                scripts: [
                    {
                        event: "when flag clicked",
                        blocks: [
                            "forever: go to x: pick random -220 to 220 y: 180",
                            "show",
                            "repeat until y position < -180: change y by -8",
                            "if touching Player then change lives by -1, say Ouch!",
                            "if lives < 1 then say Game Over!, stop all",
                            "hide",
                            "wait 0.5 seconds"
                        ]
                    }
                ]
            }
        ],
        variables: ["lives"],
        instructions: "Use arrow keys to dodge falling obstacles. Don't run out of lives!"
    }
};

/**
 * Detects what type of game the user is asking for based on keywords
 */
export function detectGameType(userInput) {
    const input = userInput.toLowerCase();

    if (input.includes('catch') || input.includes('falling')) {
        return 'CATCHING_GAME';
    }
    if (input.includes('click') || input.includes('clicker') || input.includes('tap')) {
        return 'CLICKER_GAME';
    }
    if (input.includes('chase') || input.includes('tag') || input.includes('follow')) {
        return 'CHASE_GAME';
    }
    if (input.includes('draw') || input.includes('paint') || input.includes('pen')) {
        return 'DRAWING_GAME';
    }
    if (input.includes('platform') || input.includes('jump')) {
        return 'PLATFORMER_BASIC';
    }
    if (input.includes('avoid') || input.includes('dodge')) {
        return 'AVOID_GAME';
    }

    return null;
}

/**
 * Generates a natural language description of a game template
 * This can be fed directly to the block creator
 */
export function generateGameDescription(templateKey) {
    const template = GAME_TEMPLATES[templateKey];
    if (!template) return null;

    let description = `${template.description}\n\n`;

    // Add variable setup
    if (template.variables && template.variables.length > 0) {
        description += "Variables needed: " + template.variables.join(", ") + "\n\n";
    }

    // Add sprite scripts
    template.sprites.forEach((sprite, index) => {
        description += `Sprite ${index + 1} (${sprite.name}):\n`;
        sprite.scripts.forEach(script => {
            description += `  ${script.event}\n`;
            script.blocks.forEach(block => {
                description += `    ${block}\n`;
            });
        });
        description += "\n";
    });

    return description;
}

/**
 * Converts a game template into executable block commands
 * Returns an array of command strings that can be processed by createBlocksDirectly
 */
export function templateToBlockCommands(templateKey) {
    const template = GAME_TEMPLATES[templateKey];
    if (!template) return [];

    const commands = [];

    // For now, we'll focus on the first sprite's first script as a starting point
    // In a full implementation, this would handle multiple sprites
    if (template.sprites.length > 0) {
        const firstSprite = template.sprites[0];
        if (firstSprite.scripts.length > 0) {
            firstSprite.scripts.forEach(script => {
                const eventBlock = script.event;
                const blocks = script.blocks.join(', ');
                commands.push(`${eventBlock}, ${blocks}`);
            });
        }
    }

    return commands;
}

/**
 * Gets a simple example game command
 */
export function getExampleGame() {
    return "Make a simple game where I click the cat and it moves and makes a sound";
}
