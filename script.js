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
    let currentPlayer = 1;  // Alternates between 1 and 2 for turn-based play
    let sessionKey = ''; // Key for storing game progress in Firebase
    let player1QuestionIndex = 0;
    let player2QuestionIndex = 0;
    let player1Responses = {};
    let player2Responses = {};
    let matchedCards = [];
    let notMatchedCards = [];
    
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
    const joinSessionForm = document.getElementById('join-session-form');
    const gameLayout = document.getElementById('game-layout');
    const cardContainer = document.getElementById('card-container');
    const playerInfo = document.getElementById('playerInfo');
    const questionCard = document.getElementById('question-card');
    const backToLandingButton = document.getElementById('back-to-landing');
    const matchStack = document.getElementById('match-stack');
    const resetButton = document.getElementById('reset-non-matched');
    const mode1Button = document.getElementById('mode1-button');
    const mode2Button = document.getElementById('mode2-button');


    // Add event listeners to handle the button clicks
    mode1Button.addEventListener('click', () => {
        console.log("Mode 1 button clicked");
     // Hide the landing page and show the form for Mode 1
        hideElement(landingPage);
        showElement(mode1Names);  // Assuming you want to show the mode1 player input form
    });

    mode2Button.addEventListener('click', () => {
        console.log("Mode 2 button clicked");
        // Hide the landing page and show the form for Mode 2
        hideElement(landingPage);
        showElement(mode2Name);  // Assuming you want to show the mode2 player input form
    });
    // Utility to show/hide elements
    function showElement(element) {
        element.classList.remove('hidden');
    }

    function hideElement(element) {
        element.classList.add('hidden');
    }

    // Improved Input Validation for names
    function validatePlayerNames(player1, player2) {
        if (!player1 || !player2) {
            alert('Please enter both player names.');
            return false;
        }
        if (player1.length > 20 || player2.length > 20) {
            alert('Player names should not exceed 20 characters.');
            return false;
        }
        return true;
    }

    // Generate a session key for Firebase based on sorted player names
    function getCombinedNicknameKey(player1, player2) {
        const sortedNames = [player1, player2].sort();
        return `${sortedNames[0]}-${sortedNames[1]}`;
    }

    // **Firebase Save/Load: Split data into smaller chunks**
    function savePlayerProgressToFirebase() {
        firebase.database().ref(`gameProgress/${sessionKey}/players`).set({
            player1QuestionIndex: player1QuestionIndex,
            player2QuestionIndex: player2QuestionIndex,
            player1Responses: player1Responses,
            player2Responses: player2Responses
        })
        .then(() => console.log("Player progress saved."))
        .catch((error) => console.error("Error saving player progress:", error));
    }

    function saveMatchedCardsToFirebase() {
        firebase.database().ref(`gameProgress/${sessionKey}/matches`).set({
            matchedCards: matchedCards,
            notMatchedCards: notMatchedCards
        })
        .then(() => console.log("Match data saved."))
        .catch((error) => console.error("Error saving matched cards:", error));
    }

    function loadGameProgressFromFirebase(callback) {
        firebase.database().ref(`gameProgress/${sessionKey}`).once('value')
        .then((snapshot) => {
            if (snapshot.exists()) {
                const gameState = snapshot.val();
                const players = gameState.players || {};
                const matches = gameState.matches || {};

                player1QuestionIndex = players.player1QuestionIndex || 0;
                player2QuestionIndex = players.player2QuestionIndex || 0;
                player1Responses = players.player1Responses || {};
                player2Responses = players.player2Responses || {};
                matchedCards = matches.matchedCards || [];
                notMatchedCards = matches.notMatchedCards || [];

                updateMatchStack(); // Update the display for matched cards
                console.log("Game progress loaded.");
            } else {
                console.log("No saved progress found. Starting a new game.");
            }
            callback(); // Proceed with game
        })
        .catch((error) => console.error("Error loading game progress:", error));
    }

    // **Enhanced Match Check with Dynamic Feedback**
    function checkForMatch(questionId) {
        if (!matchedCards.some(q => q.id === questionId)) {
            if (player1Responses[questionId] === 'yes' && player2Responses[questionId] === 'yes') {
                const matchedQuestion = questions.find(q => q.id === questionId);
                matchedCards.push(matchedQuestion);
                displayMatch(matchedQuestion);
                saveMatchedCardsToFirebase();  // Save match to Firebase
            } else {
                console.log("No match for question:", questionId);
                if (!notMatchedCards.includes(questionId)) {
                    notMatchedCards.push(questionId);  // Track non-matched cards
                    saveMatchedCardsToFirebase();
                }
            }
        }
    }

    // **Dynamic Feedback (Turn Feedback and Save Notifications)**
    function displayMatch(question) {
        questionCard.classList.add('matched');
        playerInfo.innerHTML = `It's a Match! Both players said Yes to: "${question.title}"`;

        setTimeout(() => {
            questionCard.classList.remove('matched');
        }, 4000);

        updateMatchStack();
    }

    function updateMatchStack() {
        matchStack.innerHTML = '';
        matchedCards.forEach((question, index) => {
            const matchItem = document.createElement('div');
            matchItem.textContent = `Match ${index + 1}: ${question.title}`;
            matchStack.appendChild(matchItem);
        });
    }

    // **Reset Non-Matched Cards Feature**
   if (resetButton) { resetButton.addEventListener('click', () => {
        notMatchedCards = [];  // Clear non-matched cards
        saveMatchedCardsToFirebase();  // Save the reset state
        alert("All non-matched cards have been reset. You can play through them again.");
    });
                   } else {
                            console.error('resetButton not working')
   }
    // **Mode 1 Start/Resume Game with Improved Error Handling**
    function startOrResumeGameMode1() {
        player1 = document.getElementById('player1-name').value;
        player2 = document.getElementById('player2-name').value;

        if (validatePlayerNames(player1, player2)) {
            sessionKey = getCombinedNicknameKey(player1, player2);
            hideElement(mode1Names);
            showElement(gameLayout);
            showElement(cardContainer);
            playerInfo.innerHTML = `Players: ${player1} and ${player2}`;
            
            // Load game progress from Firebase
            loadGameProgressFromFirebase(() => {
                displayNextQuestionForPlayer1();
            });
        }
    }

    // **Switch Between Player Turns with Dynamic Feedback**
    function displayNextQuestionForPlayer1() {
        if (player1QuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available for Player 1.';
            return;
        }

        const currentQuestion = questions[player1QuestionIndex];
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${player1}'s turn to answer.`;

        // Feedback on question load and turn switch
        console.log(`Player 1 is answering: ${currentQuestion.title}`);
    }

    function displayNextQuestionForPlayer2() {
        if (player2QuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available for Player 2.';
            return;
        }

        const currentQuestion = questions[player2QuestionIndex];
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${player2}'s turn to answer.`;

        console.log(`Player 2 is answering: ${currentQuestion.title}`);
    }

    // **Enhanced Handle Answer Logic (Mode 1)**
    document.getElementById('yes-button').addEventListener('click', () => handleAnswerMode1('yes'));
    document.getElementById('no-button').addEventListener('click', () => handleAnswerMode1('no'));

    function handleAnswerMode1(answer) {
        // Feedback on turn switch
        console.log(`Player ${currentPlayer} answered: ${answer}`);

        // Check if it's Player 1's turn
        if (currentPlayer === 1) {
            if (player1QuestionIndex < questions.length) {
                const currentQuestion = questions[player1QuestionIndex];
                player1Responses[currentQuestion.id] = answer;
                currentPlayer = 2; // Switch to Player 2
                player1QuestionIndex++;
                checkForMatch(currentQuestion.id);
                savePlayerProgressToFirebase();
                displayNextQuestionForPlayer2();  // Player 2's turn
            }
        } else {
            // Check if it's Player 2's turn
            if (player2QuestionIndex < questions.length) {
                const currentQuestion = questions[player2QuestionIndex];
                player2Responses[currentQuestion.id] = answer;
                currentPlayer = 1; // Switch to Player 1
                player2QuestionIndex++;
                checkForMatch(currentQuestion.id);
                savePlayerProgressToFirebase();
                displayNextQuestionForPlayer1();  // Player 1's turn
            }
        }
    }

    // Start game event listener
    document.getElementById('save-mode1-names').addEventListener('click', startOrResumeGameMode1);

    // **Back to Landing Page Button (Reset Everything)**
    backToLandingButton.addEventListener('click', () => {
        hideElement(gameLayout);
        hideElement(cardContainer);
        playerInfo.innerHTML = '';
        questionCard.innerHTML = '';
        player1 = '';
        player2 = '';
        currentPlayer = 1;
        sessionKey = '';
        player1QuestionIndex = 0;
        player2QuestionIndex = 0;
        showElement(landingPage);
    });

});
