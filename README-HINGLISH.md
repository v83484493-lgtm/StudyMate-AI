# StudyMate AI — Beginner setup (Hinglish)

Ye project HTML/CSS/JavaScript frontend aur Node.js/Express backend use karta hai. AI response Gemma API se aata hai. Dedicated GPU ki zaroorat nahi, kyunki model hosted API par run hota hai.

## Pehli baar setup

1. Node.js 18 ya usse newer version install karo: https://nodejs.org/
2. VS Code mein `StudyMate-AI` folder open karo.
3. Terminal > New Terminal kholo.
4. Ye command run karo:

   ```bash
   npm install
   ```

5. `.env.example` ki copy banao aur uska naam `.env` rakho.
6. `.env` file mein apni API key paste karo. API key yahan se lo: https://aistudio.google.com/
7. Start karo:

   ```bash
   npm start
   ```

8. Browser mein http://localhost:3000 kholo.

## Use kaise karein

- Topic ya question type karo.
- Study mode choose karo: Explain, Notes, ya Quiz.
- Ask Gemma dabao.

## Agar error aaye

- `GEMMA_API_KEY` error: `.env` file aur key check karo.
- Model/API error: account access, model availability aur hackathon rules verify karo.
- `fetch is not defined`: Node.js version check karo; Node 18+ chahiye.
- Port busy: `.env` mein `PORT=3001` set karke http://localhost:3001 kholo.

## Security aur hackathon rules

- `.env` ko GitHub par kabhi commit mat karo.
- API key ko screenshot, frontend code ya public chat mein share mat karo.
- Hosted Gemma API sirf tab use karo jab event ke rules allow karte hon. Agar local/open-weight execution compulsory ho, organizer ke rules ke mutabik setup badalna hoga.
- API availability, rate limits aur possible charges account/terms par depend karte hain.
- AI output galat ho sakta hai; important information verify karo.

## Demo pitch

"StudyMate AI is a Gemma-powered study assistant. Students can ask questions, generate short notes, or create practice quizzes. We built a simple, accessible web interface to make learning easier."
