document.addEventListener("DOMContentLoaded", function() {


    document.getElementById('full-reset-button').addEventListener('click', fullReset);

    let questions = [
        { id: 1, title: "Frage 1", body: "Erklärung zur Frage 1" },
        { id: 2, title: "Frage 2", body: "Erklärung zur Frage 2" },
        { id: 3, title: "Frage 3", body: "Erklärung zur Frage 3" },
        { id: 4, title: "Frage 4", body: "Erklärung zur Frage 4" },
        { id: 5, title: "Frage 5", body: "Erklärung zur Frage 4" },
        { id: 6, title: "Frage 6", body: "Erklärung zur Frage 4" },
        { id: 7, title: "Frage 7", body: "Erklärung zur Frage 4" },
        { id: 8, title: "Frage 8", body: "Erklärung zur Frage 4" },
        { id: 9, title: "Frage 9", body: "Erklärung zur Frage 5" }
    ];

    let currentQuestionIndex = 0;
    let player1Responses = {};
    let player2Responses = {};
    let discardedCards = [];
    let matchedCards = JSON.parse(localStorage.getItem('matchedCards')) || [];
    let currentPlayer = 1;
    let gameMode = 1; // Standardmäßig Modus 1 (gleiche Fragen)

    // Prüfen ob Daten im Local Storage vorhanden sind, wenn ja, laden
    function loadGameState() {
        const savedPlayer1 = localStorage.getItem('player1Responses');
        const savedPlayer2 = localStorage.getItem('player2Responses');
        const savedDiscarded = localStorage.getItem('discardedCards');
        
        if (savedPlayer1) player1Responses = JSON.parse(savedPlayer1);
        if (savedPlayer2) player2Responses = JSON.parse(savedPlayer2);
        if (savedDiscarded) discardedCards = JSON.parse(savedDiscarded);
        
        filterOutMatchedCards();  // Entferne bereits gematchte Karten aus dem Spiel
    }

    // Entferne gematchte Karten aus dem Fragen-Deck
    function filterOutMatchedCards() {
        questions = questions.filter(question => !matchedCards.some(match => match.id === question.id));
    }

    // Spielstatus speichern
    function saveGameState() {
        localStorage.setItem('player1Responses', JSON.stringify(player1Responses));
        localStorage.setItem('player2Responses', JSON.stringify(player2Responses));
        localStorage.setItem('discardedCards', JSON.stringify(discardedCards));
        localStorage.setItem('matchedCards', JSON.stringify(matchedCards));  // Gematchte Karten speichern
    }

    // Karten mischen
    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Funktion, um Antworten in Firebase zu speichern
    function saveAnswerToFirebase(player, questionId, answer) {
        firebase.database().ref('responses/player' + player + '/' + questionId).set({
            answer: answer
        });
    }

    // Funktion, um Antworten aus Firebase zu lesen und Matches zu überprüfen
    function listenForAnswers(questionId) {
        firebase.database().ref('responses/player1/' + questionId).on('value', (snapshot) => {
            const player1Answer = snapshot.val() ? snapshot.val().answer : null;
            firebase.database().ref('responses/player2/' + questionId).on('value', (snapshot) => {
                const player2Answer = snapshot.val() ? snapshot.val().answer : null;
                checkMatch(player1Answer, player2Answer, questions.find(q => q.id === questionId));
            });
        });
    }

    // Match überprüfen und visuell anzeigen
    function checkMatch(player1Answer, player2Answer, question) {
        const alreadyMatched = matchedCards.some(match => match.id === question.id);

        if (player1Answer === 'yes' && player2Answer === 'yes' && !alreadyMatched) {
            matchedCards.push(question);  // Match speichern
            displayMatch(question);  // Match-Animation anzeigen
            filterOutMatchedCards();  // Entferne gematchte Karten aus dem Deck
        } else if (!alreadyMatched) {
            discardedCards.push(question);
        }
        saveGameState();
    }

    // Match-Animation und Anzeige
    function displayMatch(question) {
        const questionCard = document.getElementById('question-card');
        questionCard.innerHTML = `<h3>${question.title}</h3><p>${question.body}</p>`;
        questionCard.classList.add('matched');  // Match-Animation starten

        document.getElementById('info').textContent = `Match! Beide Spieler haben Ja gesagt zu: "${question.title}"`;

        // Nach 4 Sekunden die Animation entfernen und zur nächsten Frage wechseln
        setTimeout(() => {
            questionCard.classList.remove('matched');
            displayNextQuestion();  // Zeigt die nächste Frage an
        }, 4000);

        // Match-Stapel aktualisieren
        updateMatchStack();
    }

    // Match-Stapel anzeigen (nur Überschrift)
    function updateMatchStack() {
        const matchStackContainer = document.getElementById('match-stack');
        matchStackContainer.innerHTML = '';  // Vorherige Einträge leeren

        matchedCards.forEach((question, index) => {
            const matchItem = document.createElement('div');
            matchItem.textContent = `Match ${index + 1}: ${question.title}`;
            matchStackContainer.appendChild(matchItem);
        });
    }

    // Nächste Frage anzeigen (abhängig vom Spielmodus)
    function displayNextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            document.getElementById('question-card').textContent = 'Keine weiteren Fragen verfügbar.';
            return;
        }
        
        const currentQuestion = questions[currentQuestionIndex];
        document.getElementById('question-card').innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;

        if (gameMode === 1) {
            document.getElementById('info').textContent = `Spieler ${currentPlayer} antwortet...`;
        } else {
            document.getElementById('info').textContent = `Spieler ${currentPlayer} hat eine andere Frage.`;
        }

        // Überprüfe die Antworten in Firebase
        listenForAnswers(currentQuestion.id);
    }

    // Ja oder Nein Antwort verarbeiten (abhängig vom Spielmodus)
    function handleAnswer(answer) {
        const currentQuestion = questions[currentQuestionIndex];

        if (gameMode === 1) {  // Modus 1: Beide Spieler müssen dieselbe Frage beantworten
            if (currentPlayer === 1) {
                player1Responses[currentQuestion.id] = answer;
                saveAnswerToFirebase(1, currentQuestion.id, answer);
                currentPlayer = 2;
                document.getElementById('info').textContent = 'Spieler 2 ist dran...';
            } else {
                player2Responses[currentQuestion.id] = answer;
                saveAnswerToFirebase(2, currentQuestion.id, answer);
                currentPlayer = 1;
                currentQuestionIndex++;

                // Überprüfen, ob beide geantwortet haben
                listenForAnswers(currentQuestion.id);
            }
        } else if (gameMode === 2) {  // Modus 2: Beide Spieler spielen unabhängig voneinander
            if (currentPlayer === 1) {
                player1Responses[currentQuestion.id] = answer;
                saveAnswerToFirebase(1, currentQuestion.id, answer);
                currentPlayer = 2;
            } else {
                player2Responses[currentQuestion.id] = answer;
                saveAnswerToFirebase(2, currentQuestion.id, answer);
                currentPlayer = 1;
            }
            currentQuestionIndex++;
            listenForAnswers(currentQuestion.id);
        }

        saveGameState();
        displayNextQuestion();
    }

    // Reset für das Deck (nur nicht gematchte Karten)
    function resetGame() {
        currentQuestionIndex = 0;
        player1Responses = {};  // Spieler 1 Antworten zurücksetzen
        player2Responses = {};  // Spieler 2 Antworten zurücksetzen
        discardedCards = [];    // Ablagestapel leeren
        shuffle(questions);     // Karten neu mischen
        saveGameState();        // Neuen Zustand speichern
        displayNextQuestion();  // Nächste Frage anzeigen
    }

    // Vollständiger Reset (inklusive Match-Stapel und Antworten)
    function fullReset() {
        matchedCards = [];      // Gematchte Karten zurücksetzen
        player1Responses = {};  // Antworten von Spieler 1 zurücksetzen
        player2Responses = {};  // Antworten von Spieler 2 zurücksetzen
        discardedCards = [];    // Ablagestapel zurücksetzen
        currentQuestionIndex = 0; // Index zurücksetzen
        shuffle(questions);      // Fragen neu mischen

        // Local Storage löschen
        localStorage.removeItem('player1Responses');
        localStorage.removeItem('player2Responses');
        localStorage.removeItem('discardedCards');
        localStorage.removeItem('matchedCards');

        // Firebase-Daten löschen (beide Spieler)
        firebase.database().ref('responses/player1').remove();
        firebase.database().ref('responses/player2').remove();

        // Match-Stapel leeren
        updateMatchStack();  // Aktualisiert die Match-Stapel-Anzeige
        displayNextQuestion();  // Zeigt die erste Frage nach dem Reset an
    }

    // Event Listeners für die Buttons
    document.getElementById('yes-button').addEventListener('click', () => handleAnswer('yes'));
    document.getElementById('no-button').addEventListener('click', () => handleAnswer('no'));
    document.getElementById('reset-button').addEventListener('click', resetGame);
    document.getElementById('full-reset-button').addEventListener('click', fullReset);

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
});
