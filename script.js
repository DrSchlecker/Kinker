document.addEventListener("DOMContentLoaded", function() {

    // Utility function for sorting nicknames alphabetically
    function getCombinedNickname(player1, player2) {
        const sortedNames = [player1, player2].sort();
        return `${sortedNames[0]}-${sortedNames[1]}`;
    }

    // Utility function to generate a random session code
    function generateSessionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

    // Function to save a response to Firebase
    function saveResponseToFirebase(player, questionId, answer) {
        firebase.database().ref(`responses/${getCombinedNickname(player, currentPlayer)}/${questionId}`).set({
            answer: answer
        }).catch(error => {
            console.error("Error saving response:", error);
        });
    }

    // Function to listen for changes in Firebase for both players
    function listenForAnswers(questionId, callback) {
        const combinedKey = getCombinedNickname(player1, player2);
        firebase.database().ref(`responses/${combinedKey}/player1/${questionId}`).on('value', (snapshot) => {
            const player1Answer = snapshot.val() ? snapshot.val().answer : null;
            firebase.database().ref(`responses/${combinedKey}/player2/${questionId}`).on('value', (snapshot) => {
                const player2Answer = snapshot.val() ? snapshot.val().answer : null;
                callback(player1Answer, player2Answer);
            });
        });
    }

    // Show loading spinner
    function showLoadingSpinner(show) {
        const spinner = document.getElementById('loading-spinner');
        spinner.style.display = show ? 'block' : 'none';
    }

    const questions = [
        { id: 1, title: "Question 1", body: "Explanation for Question 1" },
        { id: 2, title: "Question 2", body: "Explanation for Question 2" },
        { id: 3, title: "Question 3", body: "Explanation for Question 3" },
        // Add more questions as needed...
    ];

    let currentQuestionIndex = 0;
    let player1Responses = {};
    let player2Responses = {};
    let discardedCards = [];
    let matchedCards = JSON.parse(localStorage.getItem('matchedCards')) || [];
    let currentPlayer = 1;
    let gameMode = 1; // Default is Mode 1 (same questions for both players)
    let player1 = localStorage.getItem('playerNickname') || '';
    let player2 = ''; // To be set when the second player is identified

    function loadGameState() {
        const savedPlayer1 = localStorage.getItem('player1Responses');
        const savedPlayer2 = localStorage.getItem('player2Responses');
        const savedDiscarded = localStorage.getItem('discardedCards');
        if (savedPlayer1) player1Responses = JSON.parse(savedPlayer1);
        if (savedPlayer2) player2Responses = JSON.parse(savedPlayer2);
        if (savedDiscarded) discardedCards = JSON.parse(savedDiscarded);
        filterOutMatchedCards();
    }

    function filterOutMatchedCards() {
        questions = questions.filter(q => !matchedCards.some(m => m.id === q.id));
    }

    function saveGameState() {
        localStorage.setItem('player1Responses', JSON.stringify(player1Responses));
        localStorage.setItem('player2Responses', JSON.stringify(player2Responses));
        localStorage.setItem('discardedCards', JSON.stringify(discardedCards));
        localStorage.setItem('matchedCards', JSON.stringify(matchedCards));
    }

    function shuffle(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

    // Generate and display a session code for Mode 2
    function createSessionCode() {
        const sessionCode = generateSessionCode();
        document.getElementById('session-code').textContent = sessionCode;
        document.getElementById('session-code-display').style.display = 'block';
        firebase.database().ref(`sessions/${sessionCode}`).set({
            player1: player1,
            status: 'waiting'
        }).catch(error => {
            console.error("Error creating session code:", error);
        });
    }

    function displayNextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            document.getElementById('question-card').textContent = 'No more questions available.';
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        document.getElementById('question-card').innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
    }

    function handleAnswer(answer) {
        const currentQuestion = questions[currentQuestionIndex];

        if (gameMode === 1) { // Mode 1: Same question for both players
            if (currentPlayer === 1) {
                player1Responses[currentQuestion.id] = answer;
                saveResponseToFirebase(player1, currentQuestion.id, answer);
                currentPlayer = 2;
            } else {
                player2Responses[currentQuestion.id] = answer;
                saveResponseToFirebase(player2, currentQuestion.id, answer);
                currentPlayer = 1;
                currentQuestionIndex++;
            }
        }
    }

    document.getElementById('yes-button').addEventListener('click', () => handleAnswer('yes'));
    document.getElementById('no-button').addEventListener('click', () => handleAnswer('no'));

    document.getElementById('full-reset-button').addEventListener('click', () => {
        localStorage.clear();
        window.location.reload();
    });

    // Save nickname and register player
    document.getElementById('save-nickname-button').addEventListener('click', () => {
        const nickname = document.getElementById('nickname-input').value;
        if (nickname) {
            localStorage.setItem('playerNickname', nickname);
            player1 = nickname;
            alert('Nickname saved!');
        } else {
            alert('Please enter a valid nickname.');
        }
    });

    // Mode 2: Create a session code
    document.getElementById('mode2-button').addEventListener('click', () => {
        gameMode = 2;
        createSessionCode();
    });

    loadGameState();
    displayNextQuestion();
});
