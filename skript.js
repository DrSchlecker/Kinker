// Fragekarten Platzhalter (Du kannst später hier die tatsächlichen Fragen einfügen)
const questions = [
    { id: 1, text: "Frage 1" },
    { id: 2, text: "Frage 2" },
    { id: 3, text: "Frage 3" }
];

let currentQuestionIndex = 0;
let player1Responses = {}; // speichert die Antworten von Spieler 1
let player2Responses = {}; // speichert die Antworten von Spieler 2
let currentPlayer = 1; // welcher Spieler dran ist
let discardedCards = [];
let matchedCards = [];

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

// Nächste Frage anzeigen
function displayNextQuestion() {
    if (currentQuestionIndex >= questions.length) {
        document.getElementById('question-card').textContent = 'No further kinks available :(.';
        return;
    }
    
    const currentQuestion = questions[currentQuestionIndex];
    document.getElementById('question-card').textContent = currentQuestion.text;
    document.getElementById('info').textContent = `Spieler ${currentPlayer} antwortet...`;
}

// Ja oder Nein Antwort verarbeiten
function handleAnswer(answer) {
    const currentQuestion = questions[currentQuestionIndex];
    
    if (currentPlayer === 1) {
        player1Responses[currentQuestion.id] = answer;
        currentPlayer = 2;
        document.getElementById('info').textContent = 'Player 2's turn...';
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

// Spiel initialisieren
shuffle(questions);
loadGameState();
displayNextQuestion();
