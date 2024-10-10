// Fragekarten Platzhalter (Du kannst später hier die tatsächlichen Fragen einfügen)
const questions = [
    { id: 1, text: "Frage 1" },
    { id: 2, text: "Frage 2" },
    { id: 3, text: "Frage 3" },
    { id: 4, text: "Frage 4" },
    { id: 5, text: "Frage 5" }
];

let currentQuestionIndex = 0;
let player1Responses = {};
let player2Responses = {};
let discardedCards = [];
let matchedCards = [];
let currentPlayer = 1;
let gameMode = 1; // Standardmäßig Modus 1 (gleiche Fragen)

// Prüfen ob Daten im Local Storage vorhanden sind, wenn ja, laden
function loadGameState() {
    const savedPlayer1 = localStorage.getItem('player1Responses');
    const savedPlayer2 = localStorage.getItem('player2Responses');
    const savedDiscarded = localStorage.getItem('discardedCards');
    const savedMatched = localStorage.getItem('matchedCards');
    
    if (savedPlayer1) player1Responses = JSON.parse(savedPlayer1);
    if (savedPlayer2) player2Responses = JSON.parse(savedPlayer2);
    if (savedDiscarded) discardedCards = JSON.parse(savedDiscarded);
    if (savedMatched) matchedCards = JSON.parse(savedMatched);
}

// Spielstatus speichern
function saveGameState() {
    localStorage.setItem('player1Responses', JSON.stringify(player1Responses));
    localStorage.setItem('player2Responses', JSON.stringify(player2Responses));
    localStorage.setItem('discardedCards', JSON.stringify(discardedCards));
    localStorage.setItem('matchedCards', JSON.stringify(matchedCards));
}

// Karten mischen
function shuffle(array) {
    for (let i = array.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [array[i], array[j]] = [array[j], array[i]];
    }
    return array;
}

// Nächste Frage anzeigen (abhängig vom Spielmodus)
function displayNextQuestion() {
    if (currentQuestionIndex >= questions.length) {
        document.getElementById('question-card').textContent = 'Keine weiteren Fragen verfügbar.';
        return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question-card').textContent = currentQuestion.text;

    if (gameMode === 1) {
        document.getElementById('info').textContent = `Spieler ${currentPlayer} antwortet...`;
    } else {
        document.getElementById('info').textContent = `Spieler ${currentPlayer} hat eine andere Frage.`;
    }
}

// Ja oder Nein Antwort verarbeiten (abhängig vom Spielmodus)
function handleAnswer(answer) {
    const currentQuestion = questions[currentQuestionIndex];

    if (gameMode === 1) { // Modus 1: Beide Spieler müssen dieselbe Frage beantworten
        if (currentPlayer === 1) {
            player1Responses[currentQuestion.id] = answer;
            currentPlayer = 2;
            document.getElementById('info').textContent = 'Spieler 2 ist dran...';
        } else {
            player2Responses[currentQuestion.id] = answer;
            currentPlayer = 1;
            currentQuestionIndex++;
            
            // Beide Spieler haben geantwortet - prüfen ob es ein Match gibt
            if (player1Responses[currentQuestion.id] === 'yes' && player2Responses[currentQuestion.id] === 'yes') {
                matchedCards.push(currentQuestion);
            } else {
                discardedCards.push(currentQuestion);
            }
        }
    } else if (gameMode === 2) { // Modus 2: Beide Spieler spielen unabhängig voneinander
        if (currentPlayer === 1) {
            player1Responses[currentQuestion.id] = answer;
            currentPlayer = 2;
        } else {
            player2Responses[currentQuestion.id] = answer;
            currentPlayer = 1;
        }
        
        // Wenn beide "Ja" geantwortet haben, verschiebe Karte vom Ablagestapel zum Match-Stapel
        if (player1Responses[currentQuestion.id] === 'yes' && player2Responses[currentQuestion.id] === 'yes') {
            const index = discardedCards.findIndex(card => card.id === currentQuestion.id);
            if (index !== -1) {
                discardedCards.splice(index, 1); // Entferne aus dem Ablagestapel
            }
            matchedCards.push(currentQuestion); // Füge in den Match-Stapel
        } else if (!player1Responses[currentQuestion.id] || !player2Responses[currentQuestion.id]) {
            discardedCards.push(currentQuestion); // Noch nicht beide geantwortet
        }
        currentQuestionIndex++;
    }
    
    saveGameState();
    displayNextQuestion();
}

// Reset für das Deck
function resetGame() {
    currentQuestionIndex = 0;
    player1Responses = {};
    player2Responses = {};
    discardedCards = [];
    matchedCards = [];
    shuffle(questions);
    saveGameState();
    displayNextQuestion();
}

// Event Listeners für die Buttons
document.getElementById('yes-button').addEventListener('click', () => handleAnswer('yes'));
document.getElementById('no-button').addEventListener('click', () => handleAnswer('no'));
document.getElementById('reset-button').addEventListener('click', resetGame);

// Spielmodus wählen
document.getElementById('mode1-button').addEventListener('click', () => {
    gameMode = 1;
    document.getElementById('card-container').style.display = 'block';
    document.getElementById('reset-button').style.display = 'inline';
    shuffle(questions);
    displayNextQuestion();
});
document.getElementById('mode2-button').addEventListener('click', () => {
    gameMode = 2;
    document.getElementById('card-container').style.display = 'block';
    document.getElementById('reset-button').style.display = 'inline';
    shuffle(questions);
    displayNextQuestion();
});

// Spiel initialisieren
loadGameState();
