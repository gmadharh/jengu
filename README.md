# Jengu

A Voice-First GitHub AI Assistant.

![Next.js](https://img.shields.io/badge/Next.js-black?style=for-the-badge&logo=next.js&logoColor=white)
![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![TailwindCSS](https://img.shields.io/badge/Tailwind_CSS-38B2AC?style=for-the-badge&logo=tailwind-css&logoColor=white)
![TypeScript](https://img.shields.io/badge/TypeScript-007ACC?style=for-the-badge&logo=typescript&logoColor=white)

## Project Overview

Jengu is an intelligent voice interface for exploring GitHub repositories. By integrating real-time voice transcription with an autonomous LLM agent (LangGraph), Jengu allows users to naturally ask for complex repository data. The AI acts as a sophisticated orchestrator—fetching data via the GitHub API, synthesizing an audio response, and simultaneously synchronizing a rich graphical overlay (charts and tables) on the user's screen.

## Features

- **Voice-Driven Interaction**: Speak directly to Jengu to query GitHub without touching a keyboard.
- **Agentic UI Synchronization**: The audio response is perfectly timed with responsive React data visualizations (Recharts).
- **GitHub OAuth Integration**: Securely authenticate to view private repositories and bypass public API rate limits.
- **Robust Error Handling**: Gracefully handles transcription ambiguities, missing repositories, and microphone permission issues.
- **DigitalOcean Ready**: Architected as a stateless application for seamless deployment to DigitalOcean App Platform.

## Technologies Used

- **Framework**: Next.js App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS
- **Voice SDK**: Vapi Web SDK
- **AI Agent Engine**: LangGraph.js / LangChain
- **LLM**: Llama 3.3 (via DigitalOcean Serverless Inference)
- **Data Visualization**: Recharts
- **Authentication**: NextAuth.js (Auth.js)
- **API Client**: Octokit

## Getting Started

### Prerequisites
- Node.js 18+
- A GitHub OAuth Application (Client ID & Secret)
- A GitHub Personal Access Token (PAT)
- A Vapi Assistant ID and Public Key

### Installation

1. Clone the repository and install dependencies:
```bash
npm install
```

2. Copy the example environment variables file and fill in your keys:
```bash
cp .env.example .env
```

3. Run the development server:
```bash
npm run dev
```

Open `http://localhost:3000` to interact with Jengu.
