# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a web-based Go territory counting practice game built with p5.js. Players are presented with random Go board positions and must determine which side (black or white) is winning by counting territory. The game includes a customizable timer and tracks scoring progress.

## Architecture

- **index.html**: Main game page that loads all components
- **about.html**: Information page explaining the game rules and mechanics
- **graphics.js**: Core game logic using p5.js for rendering and interaction
- **boards.js**: Contains 100+ hand-crafted Go board positions as string data
- **p5.min.js**: Local copy of p5.js library (version unclear from filename)
- **style.css**: Minimal styling for centering the main game canvas
- **about.css**: Styling for the about page with readable text layout

## Key Components

### Game Engine (graphics.js)
- Uses p5.js setup/draw pattern for real-time rendering
- Responsive canvas sizing based on window dimensions
- Board positions are randomly selected, flipped, rotated, and color-inverted for variety
- Timer system with customizable seconds per board
- Score tracking with localStorage persistence
- Keyboard (arrow keys) and mouse input handling

### Board Data (boards.js)
- 100+ manually created Go positions stored as multi-line strings
- Each position uses 'X' for black stones, 'O' for white stones, '.' for empty points
- Positions are designed to have clear territorial outcomes
- Many positions include similar variants with opposite results to prevent memorization

## Development

This is a client-side only project with no build process, testing framework, or package management. Files can be opened directly in a browser or served via any static file server.

The game uses browser localStorage to remember timer settings between sessions.