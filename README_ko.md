# Hatsune

![Github All Releases](https://img.shields.io/github/downloads/ghj1214kr/hatsune/total?color=39c5bb&style=flat-square)

[English](https://github.com/ghj1214kr/hatsune#readme) | 한국어

데스크탑 음악 플레이어

![Screenshot](screenshot.png)

## 내려받기

[여기서 내려받으세요](https://github.com/ghj1214kr/hatsune/releases/latest).

## 업데이트

새 버전을 내려받아 기존 폴더에 덮어씌우세요.

## 설명서

### 창을 어떻게 끌어다 놓죠?

![Dragzone](dragzone.png)

표시된 영역을 잡고 끌어주세요.

### 키보드 단축키

- <kbd>Space</kbd> 또는 <kbd>Enter</kbd> : 재생/멈춤
- <kbd>L</kbd> : 1곡 반복 전환
- <kbd>S</kbd> : 무작위 섞기 전환
- <kbd>M</kbd> : 음소거 전환  
- <kbd><</kbd> : 이전 곡
- <kbd>></kbd> : 다음 곡
- <kbd>↑</kbd> : 음량 높이기
- <kbd>↓</kbd> : 음량 낮추기
- <kbd>←</kbd> : 5초 이전으로 탐색  
- <kbd>→</kbd> : 5초 다음으로 탐색  

### 기타 기능

커버 아트 또는 재생 중인 곡 정보에 오른쪽 클릭하면 클립보드에 복사할 수 있습니다.

### 뭔가 잘못됐어요!

<kbd>Ctrl</kbd> + <kbd>R</kbd>를 누르세요. 플레이어가 새로고침 됩니다.

## 권장 IDE 설정

- [VSCode](https://code.visualstudio.com/) + [ESLint](https://marketplace.visualstudio.com/items?itemName=dbaeumer.vscode-eslint) + [Prettier](https://marketplace.visualstudio.com/items?itemName=esbenp.prettier-vscode)

## 프로젝트 설정

### 설치

```bash
yarn
```

### 개발

```bash
yarn dev
```

### 빌드

```bash
# For windows
$ yarn build:win

# For macOS
$ yarn build:mac

# For Linux
$ yarn build:linux
```
