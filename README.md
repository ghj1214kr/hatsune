# Hatsune

![Github All Releases](https://img.shields.io/github/downloads/ghj1214kr/hatsune/total?color=39c5bb&style=flat-square)

English | [한국어](https://github.com/ghj1214kr/hatsune/blob/main/README_ko.md)

Desktop music player

![Screenshot](screenshot.png)

## Download

[Download from here](https://github.com/ghj1214kr/hatsune/releases/latest).

## Update

Download new version and overwrite an existing folder.

## Instructions

### How to drag window?

![Dragzone](dragzone.png)

Drag the marked area.

### Keyboard shortcuts

- <kbd>Space</kbd> or <kbd>Enter</kbd> : Play/Pause
- <kbd>L</kbd> : Toggle loop
- <kbd>S</kbd> : Toggle shuffle
- <kbd>M</kbd> : Toggle mute
- <kbd><</kbd> : Previous track
- <kbd>></kbd> : Next track
- <kbd>↑</kbd> : Volume up
- <kbd>↓</kbd> : Volume down
- <kbd>←</kbd> : Seek backward 5 seconds  
- <kbd>→</kbd> : Seek forward 5 seconds  

### Other functions

Right-click on cover art or playing track information to copy it to the clipboard.

### Something is going wrong!

Press <kbd>Ctrl</kbd> + <kbd>R</kbd>. Player will be refreshed.

## Recommended IDE Setup

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## Project Setup

### Install

```bash
yarn
```

### Development

```bash
yarn dev
```

### Build

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
