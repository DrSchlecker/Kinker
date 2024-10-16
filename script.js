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
    let sessionKey = ''; // Key for storing game progress in Firebase
    let player1QuestionIndex = 0;
    let player2QuestionIndex = 0;
    let player1Responses = {};
    let player2Responses = {};
    let answeredQuestions = [];
    let matchedCards = [];
    const questions = [
        { id: 1, title: "Question 1", body: "Explanation for Question 1" },
        { id: 2, title: "Question 2", body: "Explanation for Question 2" },
        { id: 4, title: "Question 4", body: "Explanation for Question 4" },
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

    // Save game progress to Firebase
    function saveGameProgressToFirebase() {
        const gameState = {
            player1QuestionIndex: player1QuestionIndex,
            player2QuestionIndex: player2QuestionIndex,
            player1Responses: player1Responses,
            player2Responses: player2Responses,
            matchedCards: matchedCards
        };

        firebase.database().ref(`gameProgress/${sessionKey}`).set(gameState)
            .then(() => console.log(`Progress saved to Firebase for session ${sessionKey}.`))
            .catch((error) => console.error("Error saving game progress to Firebase:", error));
    }

    // Load game progress from Firebase
    function loadGameProgressFromFirebase(callback) {
        firebase.database().ref(`gameProgress/${sessionKey}`).once('value')
            .then((snapshot) => {
                if (snapshot.exists()) {
                    const gameState = snapshot.val();
                    player1QuestionIndex = gameState.player1QuestionIndex;
                    player2QuestionIndex = gameState.player2QuestionIndex;
                    player1Responses = gameState.player1Responses || {};
                    player2Responses = gameState.player2Responses || {};
                    matchedCards = gameState.matchedCards || [];
                    updateMatchStack(); // Show matched cards on load
                    console.log(`Loaded progress from Firebase for session ${sessionKey}.`);
                } else {
                    player1QuestionIndex = 0;
                    player2QuestionIndex = 0;
                    player1Responses = {};
                    player2Responses = {};
                    matchedCards = [];
                    console.log(`No saved game progress found for session ${sessionKey}. Starting fresh.`);
                }
                callback(); // Proceed with the game after loading the state
            })
            .catch((error) => console.error("Error loading game progress from Firebase:", error));
    }

    // Check for matches
    function checkForMatch(questionId) {
        // Ensure this question hasn't already been matched
    if (!matchedCards.some(q => q.id === questionId)) {
        if (player1Responses[questionId] === 'yes' && player2Responses[questionId] === 'yes') {
            const matchedQuestion = questions.find(q => q.id === questionId);
            matchedCards.push(matchedQuestion);
            displayMatch(matchedQuestion); // Show match animation
            saveGameProgressToFirebase();  // Save the match to Firebase
        } else {
            console.log("This question has already been matched.");
        }
    }}

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

    // Event listener for Mode 1 button
    document.getElementById('mode1-button').addEventListener('click', () => {
        hideElement(landingPage);
        showElement(mode1Names); // Show player name input for Mode 1
    });

    // Event listener for Mode 2 button
    document.getElementById('mode2-button').addEventListener('click', () => {
        hideElement(landingPage);
        showElement(mode2Name);  // Show player name input for Mode 2
        showElement(joinSessionForm); // Show the "Join Session" form
    });

    // Function to start or resume the game based on player names (Mode 1)
    function startOrResumeGameMode1() {
        player1 = document.getElementById('player1-name').value;
        player2 = document.getElementById('player2-name').value;

        if (player1 && player2) {
            sessionKey = getCombinedNicknameKey(player1, player2); // Use names as the session key
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

    // Handle Yes/No Answer for Player 1 and Player 2 (Mode 1)
    document.getElementById('yes-button').addEventListener('click', () => handleAnswerMode1('yes'));
    document.getElementById('no-button').addEventListener('click', () => handleAnswerMode1('no'));

 function handleAnswerMode1(answer) {
    // Check if it's Player 1's turn
    if (currentPlayer === 1) {
        // Check if there are still questions left for Player 1
        if (player1QuestionIndex < questions.length) {
            const currentQuestion = questions[player1QuestionIndex];
            
            if (currentQuestion) {
                player1Responses[currentQuestion.id] = answer;
                currentPlayer = 2; // Switch to Player 2
                player1QuestionIndex++;
                checkForMatch(currentQuestion.id);  // Check if it's a match
                saveGameProgressToFirebase(); // Save progress
                displayNextQuestionForPlayer2();  // Now it's Player 2's turn
            } else {
                console.error("Invalid question for Player 1.");
            }
        } else {
            // No more questions for Player 1
            console.log("Player 1 has answered all available questions.");
            questionCard.innerHTML = 'No more questions available for Player 1.';
        }
    } 
    // Check if it's Player 2's turn
    else {
        // Check if there are still questions left for Player 2
        if (player2QuestionIndex < questions.length) {
            const currentQuestion = questions[player2QuestionIndex];
            
            if (currentQuestion) {
                player2Responses[currentQuestion.id] = answer;
                currentPlayer = 1; // Switch back to Player 1
                player2QuestionIndex++;
                checkForMatch(currentQuestion.id);  // Check if it's a match
                saveGameProgressToFirebase(); // Save progress
                displayNextQuestionForPlayer1();  // Now it's Player 1's turn
            } else {
                console.error("Invalid question for Player 2.");
            }
        } else {
            // No more questions for Player 2
            console.log("Player 2 has answered all available questions.");
            questionCard.innerHTML = 'No more questions available for Player 2.';
        }
    }
}


    // Starting the game for Mode 1
    document.getElementById('save-mode1-names').addEventListener('click', startOrResumeGameMode1);

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

        // Reset session key and progress
        sessionKey = '';
        player1QuestionIndex = 0;
        player2QuestionIndex = 0;

        // Show landing page again
        showElement(landingPage);
    });

    // **Mode 2: Player 1 creates session by entering both names**
    document.getElementById('create-session-button').addEventListener('click', () => {
        player1 = document.getElementById('player1-mode2-name').value;
        player2 = document.getElementById('player2-mode2-name').value;

        if (player1 && player2) {
            sessionKey = getCombinedNicknameKey(player1, player2); // Generate session key based on both players' names
            firebase.database().ref(`sessions/${sessionKey}`).set({
                player1: player1,
                player2: player2,
                status: 'waiting'
            }).then(() => {
                console.log(`Session created: ${sessionKey}`);
                hideElement(mode2Name);
                showElement(gameLayout);
                showElement(cardContainer);
                playerInfo.innerHTML = `Players: ${player1} and waiting for ${player2}...`;
            }).catch((error) => {
                console.error("Error creating session: ", error);
            });
        } else {
            alert('Please enter both player names.');
        }
    });

    // **Mode 2: Player 2 joins session by entering both names**
    document.getElementById('join-session-button').addEventListener('click', () => {
        player1 = document.getElementById('player1-join-name').value;
        player2 = document.getElementById('player2-join-name').value;

        if (player1 && player2) {
            sessionKey = getCombinedNicknameKey(player1, player2);
            firebase.database().ref(`sessions/${sessionKey}`).once('value').then((snapshot) => {
                if (snapshot.exists()) {
                    const sessionData = snapshot.val();
                    if (sessionData.status === 'waiting' || sessionData.status === 'in-progress') {
                        firebase.database().ref(`sessions/${sessionKey}`).update({
                            status: 'in-progress'
                        }).then(() => {
                            console.log(`Player 2 (${player2}) joined the session.`);
                            hideElement(mode2Name);
                            showElement(gameLayout);
                            showElement(cardContainer);
                            hideElement (joinSessionForm);
                            playerInfo.innerHTML = `Players: ${sessionData.player1} and ${player2}`;

                            // Load the saved game progress and resume
                            loadGameProgressFromFirebase(() => {
                                displayNextQuestionForMode2();
                            });
                        }).catch((error) => {
                            console.error("Error joining session: ", error);
                        });
                    } else {
                        alert("This session is already completed or invalid.");
                    }
                } else {
                    alert("Session code not found.");
                }
            }).catch((error) => {
                console.error("Error fetching session: ", error);
            });
        } else {
            alert("Please enter both player names.");
        }
    });

  // Arrays to track answered questions for each player independently
let player1AnsweredQuestions = [];
let player2AnsweredQuestions = [];

// Function to handle answers in Mode 2
function handleAnswerMode2(player, answer) {
    // Determine which player is answering and track their progress
    const playerAnsweredQuestions = player === 1 ? player1AnsweredQuestions : player2AnsweredQuestions;
    const playerResponses = player === 1 ? player1Responses : player2Responses;

    // Filter questions for the current player (unanswered questions)
    const availableQuestions = questions.filter(q => !playerAnsweredQuestions.includes(q.id));

    // If there are available questions, proceed
    if (availableQuestions.length > 0) {
        // Get a random question from the available pool
        const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];

        if (randomQuestion) {
            // Save the player's response
            playerResponses[randomQuestion.id] = answer;
            playerAnsweredQuestions.push(randomQuestion.id); // Mark this question as answered by the player

            // Check for a match after both players have answered this question
            checkForMatch(randomQuestion.id);

            // Save the game progress after the answer
            saveGameProgressToFirebase();

            // Display the next question for this player (if there are more unanswered questions)
            if (availableQuestions.length > 1) {
                displayNextQuestionForPlayer(player);
            } else {
                questionCard.innerHTML = `No more questions available for Player ${player}.`;
            }
        } else {
            console.error("Failed to load a valid question.");
        }
    } else {
        questionCard.innerHTML = `No more questions available for Player ${player}.`;
    }
}

// Function to display the next question for the current player
function displayNextQuestionForPlayer(player) {
    const playerAnsweredQuestions = player === 1 ? player1AnsweredQuestions : player2AnsweredQuestions;

    // Filter available questions (unanswered questions)
    const availableQuestions = questions.filter(q => !playerAnsweredQuestions.includes(q.id));

    // Display a random question from the available pool
    if (availableQuestions.length > 0) {
        const randomQuestion = availableQuestions[Math.floor(Math.random() * availableQuestions.length)];
        questionCard.innerHTML = `<h3>${randomQuestion.title}</h3><p>${randomQuestion.body}</p>`;
    } else {
        questionCard.innerHTML = `No more questions available for Player ${player}.`;
    }
}

// Function to check for matches when both players answer the same question
function checkForMatch(questionId) {
    const player1Answer = player1Responses[questionId];
    const player2Answer = player2Responses[questionId];

    // If both players answered 'yes' to the same question, it's a match
    if (player1Answer === 'yes' && player2Answer === 'yes') {
        const matchedQuestion = questions.find(q => q.id === questionId);
        if (matchedQuestion && !matchedCards.includes(matchedQuestion)) {
            matchedCards.push(matchedQuestion);
            displayMatch(matchedQuestion);
        }
    }
}

    

    // Handle Yes/No Answer in Mode 2
document.getElementById('yes-button').addEventListener('click', () => {
    handleAnswerMode2(currentPlayer, 'yes');
});

document.getElementById('no-button').addEventListener('click', () => {
    handleAnswerMode2(currentPlayer, 'no');
});


});
