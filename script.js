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
        firebase.database().ref(`responses/${getCombinedNickname(player1, player2)}/${questionId}`).set({
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
    let sessionCode = ''; // To store the session code if Player 2 is joining

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
        const filteredQuestions = questions.filter(q => !matchedCards.some(m => m.id === q.id));
        return filteredQuestions;
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
        sessionCode = generateSessionCode();
        document.getElementById('session-code').textContent = sessionCode;
        document.getElementById('session-code-display').style.display = 'block';
        document.getElementById('join-game-button').style.display = 'none'; // Hide join button for Player 1
        document.getElementById('join-game-code').style.display = 'none'; // Hide code input for Player 1
        firebase.database().ref(`sessions/${sessionCode}`).set({
            player1: player1,
            status: 'waiting'
        }).catch(error => {
            console.error("Error creating session code:", error);
        });
    }

    // Join a game session using the session code (Player 2)
    function joinGameWithCode() {
        const enteredCode = document.getElementById('join-game-code').value;
        if (!enteredCode) {
            alert("Please enter a valid session code.");
            return;
        }

        // Show the spinner while waiting to join
        showLoadingSpinner(true);

        // Check if the session exists in Firebase
        firebase.database().ref(`sessions/${enteredCode}`).once('value', (snapshot) => {
            if (snapshot.exists()) {
                const sessionData = snapshot.val();
                if (sessionData.status === 'waiting') {
                    // Add Player 2 to the session
                    firebase.database().ref(`sessions/${enteredCode}`).update({
                        player2: player2,
                        status: 'in-progress'
                    }).then(() => {
                        alert("Successfully joined the game!");
                        sessionCode = enteredCode; // Save the session code for Player 2
                        startGame(); // Start the game for Player 2
                        showLoadingSpinner(false); // Hide the spinner once the game starts
                    }).catch(error => {
                        console.error("Error updating session with Player 2:", error);
                        showLoadingSpinner(false); // Hide spinner on error
                    });
                } else {
                    alert("This session is already in progress.");
                    showLoadingSpinner(false); // Hide spinner if session already in progress
                }
            } else {
                alert("Session code not found. Please check the code and try again.");
                showLoadingSpinner(false); // Hide spinner if session code not found
            }
        }).catch(error => {
            console.error("Error joining session:", error);
            showLoadingSpinner(false); // Hide spinner on error
        });
    }

    // Function to start the game (for both Player 1 and Player 2)
    function startGame() {
        document.getElementById('card-container').style.display = 'block';
        document.getElementById('reset-button').style.display = 'inline';
        displayNextQuestion();
    }

    const filteredQuestions = filterOutMatchedCards(); // Call the function and get the filtered questions
    function displayNextQuestion() {
        if (currentQuestionIndex >= filteredQuestions.length) {
            document.getElementById('question-card').textContent = 'No more questions available.';
            return;
        }
        const currentQuestion = filteredQuestions[currentQuestionIndex];
        document.getElementById('question-card').innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
    }

    function handleAnswer(answer) {
        const currentQuestion = filteredQuestions[currentQuestionIndex];

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
            player2 = nickname; // Assuming Player 2 is on the same device, update this if needed
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

    // Mode 2: Join game with a session code
    document.getElementById('join-game-button').addEventListener('click', () => {
        joinGameWithCode();
    });

    // Show the session code input and join button for Player 2 when Mode 2 is selected
    document.getElementById('mode2-button').addEventListener('click', () => {
        document.getElementById('join-game-button').style.display = 'block';
        document.getElementById('join-game-code').style.display = 'block';
    });

    loadGameState();
    displayNextQuestion();
});
