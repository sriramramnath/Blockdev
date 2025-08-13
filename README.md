# Codyssey

Codyssey is a web-based visual programming environment inspired by Scratch, but supercharged with AI. Build programs using drag-and-drop blocks, and let **Maximus**, your AI coding companion, help you create them from natural language prompts.

## Features

- **AI-Powered Block Generation**  
  Describe what you want in plain English, and Maximus will suggest and generate blocks in the palette for you.  
  *Example:* Type `make a loop that counts to 10` and instantly get a ready-to-use loop block.

- **Scratch-Style Interface**  
  Drag, drop, snap, and rearrange blocks in an intuitive canvas.

- **Custom Block Categories**  
  Organize blocks by category for easy discovery.

- **Real-Time AI Chat**  
  Chat with Maximus in a sidebar to brainstorm, debug, or learn new concepts.

## How It Works

1. Type your request into Maximus’ chat box.
2. Maximus parses your request and maps it to matching block objects.
3. Blocks appear instantly in the block palette, ready to use.

## Tech Stack

- **Frontend**: HTML, CSS, JavaScript (or TypeScript if enabled)
- **Backend**: Works with any AI API endpoint
- **AI Integration**: Maximus uses natural language processing to map text into structured block definitions.

## Running

```bash
cd scratch-gui
lsof -i :8601
```