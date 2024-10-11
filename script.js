document.addEventListener("DOMContentLoaded", function() {

    // Firebase Configuration (needed for both modes)
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
    let sessionCode = '';
    let currentQuestionIndex = 0;
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
    const mode2Name = document.getElementById('mode2-player-name');
    const mode2Session = document.getElementById('mode2-session');
    const gameLayout = document.getElementById('game-layout');
    const cardContainer = document.getElementById('card-container');
    const sessionCodeDisplay = document.getElementById('session-code-display');
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
    function saveGameProgressToFirebase(player1, player2) {
        const combinedKey = getCombinedNicknameKey(player1, player2);
        const gameState = {
            currentQuestionIndex: currentQuestionIndex,
            player1Responses: player1Responses,
            player2Responses: player2Responses,
            matchedCards: matchedCards
        };

        firebase.database().ref(`gameProgress/${combinedKey}`).set(gameState)
            .then(() => console.log(`Progress saved to Firebase for ${combinedKey}.`))
            .catch((error) => console.error("Error saving game progress to Firebase:", error));
    }

    // Load game progress from Firebase (shared for both modes)
    function loadGameProgressFromFirebase(player1, player2, callback) {
        const combinedKey = getCombinedNicknameKey(player1, player2);

        firebase.database().ref(`gameProgress/${combinedKey}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const gameState = snapshot.val();
                    currentQuestionIndex = gameState.currentQuestionIndex;
                    player1Responses = gameState.player1Responses || {};
                    player2Responses = gameState.player2Responses || {};
                    matchedCards = gameState.matchedCards || [];
                    updateMatchStack(); // Show matched cards on load
                    console.log(`Loaded progress from Firebase for ${combinedKey}.`);
                } else {
                    currentQuestionIndex = 0;
                    player1Responses = {};
                    player2Responses = {};
                    matchedCards = [];
                    console.log(`No saved game progress found for ${combinedKey}. Starting fresh.`);
                }
                callback(); // Proceed with the game after loading the state
            })
            .catch((error) => console.error("Error loading game progress from Firebase:", error));
    }

    // Event Listener for Mode 1 Button (Offline Mode with Same Questions)
    document.getElementById('mode1-button').addEventListener('click', () => {
        hideElement(landingPage);
        showElement(mode1Names);
    });

    // Save Player Names for Mode 1 and Start the Game
    document.getElementById('save-mode1-names').addEventListener('click', () => {
        player1 = document.getElementById('player1-name').value;
        player2 = document.getElementById('player2-name').value;

        if (player1 && player2) {
            hideElement(mode1Names);
            showElement(gameLayout);
            showElement(cardContainer);
            playerInfo.innerHTML = `Players: ${player1} and ${player2}`;
            gameMode = 1;  // Set game mode to 1 (offline)

            // Load game progress from Firebase and then start the game
            loadGameProgressFromFirebase(player1, player2, displayNextQuestionForPlayer);
        } else {
            alert('Please enter both player names.');
        }
    });

    // Display the next question for Player 1 or Player 2 (turn-based Mode 1)
    function displayNextQuestionForPlayer() {
        if (currentQuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available.';
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        const currentPlayerName = currentPlayer === 1 ? player1 : player2;

        // Show the current question and indicate whose turn it is
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${currentPlayerName}'s turn to answer.`;

        // Wait for the current player to answer before switching to the other player
    }

    // Handle Yes/No Answer and Alternate Turns (Offline Mode 1)
    document.getElementById('yes-button').addEventListener('click', () => {
        handleAnswer('yes');
    });
    
    document.getElementById('no-button').addEventListener('click', () => {
        handleAnswer('no');
    });

    function handleAnswer(answer) {
        const currentQuestion = questions[currentQuestionIndex];

        // Store answer for the current player
        if (currentPlayer === 1) {
            player1Responses[currentQuestion.id] = answer;
            currentPlayer = 2; // Switch to Player 2
        } else {
            player2Responses[currentQuestion.id] = answer;
            currentPlayer = 1; // Switch back to Player 1 and move to the next question

            // Check for a match if both players have answered
            if (player1Responses[currentQuestion.id] === 'yes' && player2Responses[currentQuestion.id] === 'yes') {
                matchedCards.push(currentQuestion);
                displayMatch(currentQuestion); // Show match animation
            }

            // Move to the next question
            currentQuestionIndex++;
        }

        // Save progress to Firebase after each answer
        saveGameProgressToFirebase(player1, player2);

        // Display the next question for the next player
        displayNextQuestionForPlayer();
    }

    // Display match animation and update the match stack
    function displayMatch(question) {
        questionCard.classList.add('matched');
        playerInfo.innerHTML = `It's a Match! Both players said Yes to: "${question.title}"`;

        setTimeout(() => {
            questionCard.classList.remove('matched');
            displayNextQuestionForPlayer(); // Move to the next question after animation
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

    // Mode 2 logic will be similar but without needing both players to answer the same question
    // They will each get random questions asynchronously, and matches will be tracked as they answer

    document.getElementById('mode2-button').addEventListener('click', () => {
        hideElement(landingPage);
        showElement(mode2Name);
    });

    // Save Player Name for Mode 2
    document.getElementById('save-mode2-name').addEventListener('click', () => {
        player1 = document.getElementById('player1-mode2-name').value;

        if (player1) {
            hideElement(mode2Name);
            showElement(mode2Session);
        } else {
            alert('Please enter your name.');
        }
    });

    // Create Session in Mode 2
    document.getElementById('create-session-button').addEventListener('click', () => {
        sessionCode = generateSessionCode();
        firebase.database().ref(`sessions/${sessionCode}`).set({
            player1: player1,
            status: 'waiting'
        }).then(() => {
            showElement(gameLayout);
            showElement(cardContainer);
            sessionCodeDisplay.classList.remove('hidden');
            document.getElementById('session-code').textContent = sessionCode;
            playerInfo.innerHTML = `Players: ${player1}`;
        }).catch((error) => {
            console.error("Error creating session: ", error);
        });
    });

    // Join Session in Mode 2
    document.getElementById('join-session-button').addEventListener('click', () => {
        const enteredCode = document.getElementById('join-session-code').value;
        if (!enteredCode) {
            alert("Please enter a valid session code.");
            return;
        }

        firebase.database().ref(`sessions/${enteredCode}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const sessionData = snapshot.val();
                if (sessionData.status === 'waiting') {
                    firebase.database().ref(`sessions/${enteredCode}`).update({
                        player2: player1,
                        status: 'in-progress'
                    }).then(() => {
                        sessionCode = enteredCode;
                        showElement(gameLayout);
                        showElement(cardContainer);
                        playerInfo.innerHTML = `Players: ${sessionData.player1} and ${player1}`;
                    }).catch((error) => {
                        console.error("Error joining session: ", error);
                    });
                } else {
                    alert("This session is already in progress.");
                }
            } else {
                alert("Session code not found.");
            }
        }).catch((error) => {
            console.error("Error fetching session: ", error);
        });
    });

    // **Back to Landing Page and Reset Everything**
    backToLandingButton.addEventListener('click', () => {
        // Hide all game and session-related elements
        hideElement(gameLayout);
        hideElement(cardContainer);
        hideElement(sessionCodeDisplay);
        hideElement(mode1Names);
        hideElement(mode2Name);
        hideElement(mode2Session);

        // Clear all dynamic content
        playerInfo.innerHTML = '';
        questionCard.innerHTML = '';
        currentQuestionIndex = 0; // Reset the question index
        player1 = '';
        player2 = '';
        currentPlayer = 1;  // Reset player turn
        sessionCode = '';  // Clear session code
        gameMode = 1;  // Reset the game mode to 1 by default

        // Show landing page again
        showElement(landingPage);
    });

    // Utility Functions
    function generateSessionCode() {
        const chars = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
        let result = '';
        for (let i = 0; i < 5; i++) {
            result += chars.charAt(Math.floor(Math.random() * chars.length));
        }
        return result;
    }

});
