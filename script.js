document.addEventListener("DOMContentLoaded", function() {

    // Firebase Configuration (provided by you)
    const firebaseConfig = {
        apiKey: "AIzaSyC7ATp5cSVxkLNvKU5ZS0nFLEY63jWaZJU",
        authDomain: "kinker-2024.firebaseapp.com",
        databaseURL: "https://kinker-2024-default-rtdb.europe-west1.firebasedatabase.app",
        projectId: "kinker-2024",
        storageBucket: "kinker-2024.appspot.com",
        messagingSenderId: "986360648193",
        appId: "1:986360648193:web:065d171dc2c5354d7ee600"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app();
    }

    const database = firebase.database();

    let player1 = '';
    let player2 = '';
    let currentPlayer = 1;  // For Mode 1, alternates between 1 and 2 for turn-based play
    let gameMode = 1; // Default Mode 1
    let player1QuestionIndex = 0;
    let player2QuestionIndex = 0;
    let player1Responses = {};
    let player2Responses = {};
    let matchedCards = [];
    const questions = [
        { id: 1, title: "Question 1", body: "Explanation for Question 1" },
        { id: 2, title: "Question 2", body: "Explanation for Question 2" },
        { id: 3, title: "Question 3", body: "Explanation for Question 3" },
        // Add more questions as needed...
    ];

    // HTML elements
    const landingPage = document.getElementById('landing-page');
    const mode1Names = document.getElementById('mode1-player-names');
    const gameLayout = document.getElementById('game-layout');
    const cardContainer = document.getElementById('card-container');
    const playerInfo = document.getElementById('player-info');
    const questionCard = document.getElementById('question-card');
    const backToLandingButton = document.getElementById('back-to-landing');
    const matchStack = document.getElementById('match-stack');

    // Utility to show/hide elements
    function showElement(element) {
        element.classList.remove('hidden');
    }

    function hideElement(element) {
        element.classList.add('hidden');
    }

    // Function to generate a combined nickname key for Firebase
    function getCombinedNicknameKey(player1, player2) {
        const sortedNames = [player1, player2].sort();
        return `${sortedNames[0]}-${sortedNames[1]}`;
    }

    // Save game progress to Firebase (shared for both modes)
    function saveGameProgressToFirebase() {
        const combinedKey = getCombinedNicknameKey(player1, player2);
        const gameState = {
            player1QuestionIndex: player1QuestionIndex,
            player2QuestionIndex: player2QuestionIndex,
            player1Responses: player1Responses,
            player2Responses: player2Responses,
            matchedCards: matchedCards
        };

        firebase.database().ref(`gameProgress/${combinedKey}`).set(gameState)
            .then(() => console.log(`Progress saved to Firebase for ${combinedKey}.`))
            .catch((error) => console.error("Error saving game progress to Firebase:", error));
    }

    // Load game progress from Firebase (shared for both modes)
    function loadGameProgressFromFirebase(callback) {
        const combinedKey = getCombinedNicknameKey(player1, player2);

        firebase.database().ref(`gameProgress/${combinedKey}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const gameState = snapshot.val();
                    player1QuestionIndex = gameState.player1QuestionIndex;
                    player2QuestionIndex = gameState.player2QuestionIndex;
                    player1Responses = gameState.player1Responses || {};
                    player2Responses = gameState.player2Responses || {};
                    matchedCards = gameState.matchedCards || [];
                    updateMatchStack(); // Show matched cards on load
                    console.log(`Loaded progress from Firebase for ${combinedKey}.`);
                } else {
                    player1QuestionIndex = 0;
                    player2QuestionIndex = 0;
                    player1Responses = {};
                    player2Responses = {};
                    matchedCards = [];
                    console.log(`No saved game progress found for ${combinedKey}. Starting fresh.`);
                }
                callback(); // Proceed with the game after loading the state
            })
            .catch((error) => console.error("Error loading game progress from Firebase:", error));
    }

    // Function to check for a match
    function checkForMatch(questionId) {
        if (player1Responses[questionId] === 'yes' && player2Responses[questionId] === 'yes') {
            const matchedQuestion = questions.find(q => q.id === questionId);
            matchedCards.push(matchedQuestion);
            displayMatch(matchedQuestion); // Show match animation
            saveGameProgressToFirebase();  // Save the match to Firebase
        }
    }

    // Display match animation and update the match stack
    function displayMatch(question) {
        questionCard.classList.add('matched');
        playerInfo.innerHTML = `It's a Match! Both players said Yes to: "${question.title}"`;

        setTimeout(() => {
            questionCard.classList.remove('matched');
        }, 4000);

        // Update match stack
        updateMatchStack();
    }

    // Update the match stack display
    function updateMatchStack() {
        matchStack.innerHTML = '';
        matchedCards.forEach((question, index) => {
            const matchItem = document.createElement('div');
            matchItem.textContent = `Match ${index + 1}: ${question.title}`;
            matchStack.appendChild(matchItem);
        });
    }

    // Function to start or resume the game based on player names
    function startOrResumeGame() {
        player1 = document.getElementById('player1-name').value;
        player2 = document.getElementById('player2-name').value;

        if (player1 && player2) {
            hideElement(mode1Names);
            showElement(gameLayout);
            showElement(cardContainer);
            playerInfo.innerHTML = `Players: ${player1} and ${player2}`;

            // Load game progress from Firebase and resume the game
            loadGameProgressFromFirebase(() => {
                displayNextQuestionForPlayer1();  // Start game with Player 1
            });
        } else {
            alert('Please enter both player names.');
        }
    }

    // Mode 1: Player 1 answers and then Player 2 answers the same question
    function displayNextQuestionForPlayer1() {
        if (player1QuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available.';
            return;
        }

        const currentQuestion = questions[player1QuestionIndex];
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${player1}'s turn to answer.`;
    }

    function displayNextQuestionForPlayer2() {
        if (player2QuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available.';
            return;
        }

        const currentQuestion = questions[player2QuestionIndex];
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${player2}'s turn to answer.`;
    }

    // Handle Yes/No Answer for Player 1 and Player 2
    document.getElementById('yes-button').addEventListener('click', () => handleAnswer('yes'));
    document.getElementById('no-button').addEventListener('click', () => handleAnswer('no'));

    function handleAnswer(answer) {
        const currentQuestionIndex = currentPlayer === 1 ? player1QuestionIndex : player2QuestionIndex;
        const currentQuestion = questions[currentQuestionIndex];

        if (currentPlayer === 1) {
            player1Responses[currentQuestion.id] = answer;
            currentPlayer = 2; // Switch to Player 2
            player1QuestionIndex++;
            checkForMatch(currentQuestion.id);  // Check if it's a match
            saveGameProgressToFirebase(); // Save progress
            displayNextQuestionForPlayer2();  // Now it's Player 2's turn
        } else {
            player2Responses[currentQuestion.id] = answer;
            currentPlayer = 1; // Switch back to Player 1
            player2QuestionIndex++;
            checkForMatch(currentQuestion.id);  // Check if it's a match
            saveGameProgressToFirebase(); // Save progress
            displayNextQuestionForPlayer1();  // Now it's Player 1's turn
        }
    }

    // Starting the game for Mode 1
    document.getElementById('save-mode1-names').addEventListener('click', startOrResumeGame);

    // **Back to Landing Page and Reset Everything**
    backToLandingButton.addEventListener('click', () => {
        // Hide all game and session-related elements
        hideElement(gameLayout);
        hideElement(cardContainer);

        // Clear all dynamic content
        playerInfo.innerHTML = '';
        questionCard.innerHTML = '';
        player1 = '';
        player2 = '';
        currentPlayer = 1;  // Reset player turn

        // Show landing page again
        showElement(landingPage);
    });
});
