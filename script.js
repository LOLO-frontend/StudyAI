const API_KEY = "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";
let studyContext = "";
let quizData = [];

// Switch tabs
function switchTab(tabName) {
    document.querySelectorAll(".tab").forEach((t, i) => {
        t.classList.toggle("active", ["explanation", "quiz", "concepts"][i] === tabName);
    });
    document.querySelectorAll(".panel").forEach(p => {
        p.classList.toggle("active", p.id === tabName);
    });
}

// Call Claude API
async function callClaude(prompt) {
    const res = await fetch("https://api.groq.com/openai/v1/chat/completions", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${API_KEY}`
        },
        body: JSON.stringify({
            model: "llama-3.3-70b-versatile",
            max_tokens: 1000,
            messages: [{ role: "user", content: prompt }]
        })
    });

    const data = await res.json();
    console.log("API response:", data);

    if (data.error) {
        console.error("API error:", data.error.message);
        throw new Error(data.error.message);
    }

    return data.choices[0].message.content;
}

// Explain text
async function explainText() {
    const text = document.getElementById("studyText").value.trim();
    if (!text) return alert("Please paste some study material first!");

    studyContext = text;
    switchTab("explanation");
    document.getElementById("explanation").innerHTML = `<p class="loading">Explaining...</p>`;

    try {
        const reply = await callClaude(`
            You are a helpful tutor for students in grades 6-12 in Broward County Public Schools.
            Explain the following material in simple, clear language that a middle or high school student can understand.
            Break it down step by step. Be encouraging and friendly. Also if student try and paste any text that is hateful
            do not generate anything for it. Dont generate any quizzes or keywords for it.

            Material: ${text}
        `);

        document.getElementById("explanation").innerHTML = `
            <div class="card">
                <div class="card-label">Simple Explanation</div>
                <p>${reply.replace(/\n/g, "<br>")}</p>
            </div>
        `;

        // Auto generate key concepts too
        generateConcepts(text);

    } catch (err) {
        document.getElementById("explanation").innerHTML = `<p class="placeholder-text">Something went wrong. Check your API key.</p>`;
    }
}

// Generate key concepts
async function generateConcepts(text) {
    try {
        const reply = await callClaude(`
            Extract 5-8 key concepts or vocabulary words from this text.
            Return ONLY a JSON array of strings, nothing else. Example: ["concept1", "concept2"]
            
            Text: ${text}
        `);

        const concepts = JSON.parse(reply.replace(/```json|```/g, "").trim());
        const tags = concepts.map(c => `<span class="concept-tag">${c}</span>`).join("");

        document.getElementById("concepts").innerHTML = `
            <div class="card">
                <div class="card-label">Key Concepts</div>
                <div class="concepts">${tags}</div>
            </div>
        `;
    } catch (err) {
        document.getElementById("concepts").innerHTML = `<p class="placeholder-text">Could not extract concepts.</p>`;
    }
}

// Generate quiz
async function generateQuiz() {
    const text = document.getElementById("studyText").value.trim();
    if (!text) return alert("Please paste some study material first!");

    studyContext = text;
    switchTab("quiz");
    document.getElementById("quiz").innerHTML = `<p class="loading">Generating quiz...</p>`;

    try {
        const reply = await callClaude(`
            Create 3 multiple choice quiz questions based on this study material for a grades 6-12 student.
            Return ONLY a JSON array with this exact format, nothing else:
            [
              {
                "question": "Question text here?",
                "options": ["A) option", "B) option", "C) option", "D) option"],
                "answer": "A) correct option"
              }
            ]

            Material: ${text}
        `);

        quizData = JSON.parse(reply.replace(/```json|```/g, "").trim());
        renderQuiz();

    } catch (err) {
        document.getElementById("quiz").innerHTML = `<p class="placeholder-text">Something went wrong. Try again.</p>`;
    }
}

// Render quiz questions
function renderQuiz() {
    const html = quizData.map((q, i) => `
        <div class="quiz-card">
            <div class="q-num">QUESTION ${i + 1} OF ${quizData.length}</div>
            <div class="q-text">${q.question}</div>
            <div class="options">
                ${q.options.map(opt => `
                    <div class="option" onclick="checkAnswer(this, '${opt.replace(/'/g, "\\'")}', '${q.answer.replace(/'/g, "\\'")}')">
                        ${opt}
                    </div>
                `).join("")}
            </div>
        </div>
    `).join("");

    document.getElementById("quiz").innerHTML = html;
}

// Check answer
function checkAnswer(el, selected, correct) {
    const options = el.parentElement.querySelectorAll(".option");
    options.forEach(o => o.style.pointerEvents = "none");
    if (selected === correct) {
        el.classList.add("correct");
    } else {
        el.classList.add("wrong");
        options.forEach(o => {
            if (o.textContent.trim() === correct) o.classList.add("correct");
        });
    }
}

// Follow-up question
async function askFollowup() {
    const input = document.getElementById("followupInput");
    const question = input.value.trim();
    if (!question) return;
    if (!studyContext) return alert("Please explain some material first!");

    input.value = "";
    switchTab("explanation");

    const current = document.getElementById("explanation").innerHTML;
    document.getElementById("explanation").innerHTML = current + `<p class="loading">Thinking...</p>`;

    try {
        const reply = await callClaude(`
            You are a helpful tutor for grades 6-12 students in Broward County Public Schools.
            The student has been studying this material: ${studyContext}
            
            They are now asking: ${question}
            
            Answer clearly and simply, in a way a middle or high school student would understand.
        `);

        const loading = document.getElementById("explanation").querySelector(".loading");
        if (loading) loading.remove();

        document.getElementById("explanation").innerHTML += `
            <div class="card">
                <div class="card-label">Follow-up Answer</div>
                <p>${reply.replace(/\n/g, "<br>")}</p>
            </div>
        `;

    } catch (err) {
        document.getElementById("explanation").querySelector(".loading").textContent = "Something went wrong.";
    }
}