document.addEventListener("DOMContentLoaded", function() {

    // Firebase Configuration (needed for Mode 2)
    const firebaseConfig = {
        apiKey: "YOUR_API_KEY",
        authDomain: "YOUR_AUTH_DOMAIN",
        databaseURL: "YOUR_DATABASE_URL",
        projectId: "YOUR_PROJECT_ID",
        storageBucket: "YOUR_STORAGE_BUCKET",
        messagingSenderId: "YOUR_MESSAGING_SENDER_ID",
        appId: "YOUR_APP_ID"
    };

    if (!firebase.apps.length) {
        firebase.initializeApp(firebaseConfig);
    } else {
        firebase.app();
    }

    const database = firebase.database();

    let player1 = '';
    let player2 = '';
    let currentPlayer = 1;  // This will toggle between 1 and 2
    let gameMode = 1; // Default Mode 1
    let sessionCode = '';
    let currentQuestionIndex = 0;

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

    // Utility to show/hide elements
    function showElement(element) {
        element.classList.remove('hidden');
    }

    function hideElement(element) {
        element.classList.add('hidden');
    }

    // Event Listener for Mode 1 Button (Offline Mode)
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
            displayNextQuestion();  // Start the game with the first question
        } else {
            alert('Please enter both player names.');
        }
    });

    // Display the next question and handle player turns (Offline Mode 1)
    function displayNextQuestion() {
        if (currentQuestionIndex >= questions.length) {
            questionCard.innerHTML = 'No more questions available.';
            return;
        }

        const currentQuestion = questions[currentQuestionIndex];
        const currentPlayerName = currentPlayer === 1 ? player1 : player2;

        // Show the current question and indicate whose turn it is
        questionCard.innerHTML = `<h3>${currentQuestion.title}</h3><p>${currentQuestion.body}</p>`;
        playerInfo.innerHTML = `It's ${currentPlayerName}'s turn to answer.`;

        // After this player answers, switch to the other player for the next turn
    }

    // Handle Yes/No Answer and Alternate Turns (Offline Mode 1)
    document.getElementById('yes-button').addEventListener('click', () => {
        handleAnswer('yes');
    });
    
    document.getElementById('no-button').addEventListener('click', () => {
        handleAnswer('no');
    });

    function handleAnswer(answer) {
        // Log the answer (in reality, you could save these locally if needed)
        console.log(`${currentPlayer === 1 ? player1 : player2} answered: ${answer}`);

        // Move to the next question
        currentQuestionIndex++;

        // Switch players: toggle between 1 and 2
        currentPlayer = currentPlayer === 1 ? 2 : 1;

        // Display the next question and update whose turn it is
        displayNextQuestion();
    }

    // Event Listener for Mode 2 Button (Online Mode)
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

    // Go back to landing page
    backToLandingButton.addEventListener('click', () => {
        hideElement(gameLayout);
        hideElement(cardContainer);
        hideElement(sessionCodeDisplay);
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
