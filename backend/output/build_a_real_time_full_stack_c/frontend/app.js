// Remove appState and apiHelper as they are replaced by Socket.IO and direct DOM manipulation
// const appState = { messages: [] }; // No longer needed in this form
// const apiHelper = { ... }; // No longer needed

const UI = {
    showToast: (message) => {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '50%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        toast.style.background = '#333';
        toast.style.color = '#fff';
        toast.style.padding = '1em';
        toast.style.borderRadius = '0.5em';
        toast.style.zIndex = '1000'; // Ensure toast is on top
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 2000);
    },
    showLoading: (show) => {
        const loading = document.getElementById('loading');
        if (loading) { // Add null check for safety
            loading.style.display = show ? 'block' : 'none';
        }
    },
    // New function to display a message in the chat log
    displayMessage: (message, isOwnMessage = false) => {
        const messageList = document.getElementById('message-list');
        const listItem = document.createElement('li');
        const timestamp = new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
        
        let messageContent = `<strong>${message.username}</strong>: ${message.text}`;
        if (message.id === 'system') { // Style system messages differently
            listItem.style.fontStyle = 'italic';
            listItem.style.color = '#666';
            messageContent = `<em>${message.text}</em>`;
        }

        listItem.innerHTML = `${messageContent} <span style="font-size: 0.8em; color: #888;">(${timestamp})</span>`;
        
        if (isOwnMessage) {
            listItem.style.textAlign = 'right';
            listItem.style.backgroundColor = '#e0f7fa'; // Light blue background for own messages
        } else if (message.id !== 'system') {
            listItem.style.backgroundColor = '#f0f0f0'; // Light grey for other users' messages
        }
        
        messageList.appendChild(listItem);
        // Auto-scroll to the latest message
        messageList.scrollTop = messageList.scrollHeight;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const messageForm = document.getElementById('message-form');
    const messageInput = document.getElementById('message-input');
    const messageList = document.getElementById('message-list');

    let userId = null; // Store the user's unique ID from the server
    let username = null; // Store the user's chosen username

    // Initialize Socket.IO connection
    const socket = io(); // Connects to the host that served the page

    UI.showLoading(true);

    // Prompt for username
    while (!username || username.trim() === '') {
        username = prompt('Please enter your username:');
        if (!username) { // User cancelled prompt
            UI.showToast('Username is required to join the chat.');
            UI.showLoading(false);
            return; // Exit if no username
        }
    }
    UI.showLoading(false);

    // Emit 'join' event to the server
    socket.emit('join', username);

    // Listen for 'joined' event from the server to get the user's ID
    socket.on('joined', (id) => {
        userId = id;
        UI.showToast(`Welcome, ${username}!`);
        // After joining, fetch initial messages
        fetchInitialMessages();
    });

    // Listen for incoming messages from the server
    socket.on('message', (msg) => {
        // Differentiate between own messages and others' messages
        const isOwnMessage = msg.id === userId;
        UI.displayMessage(msg, isOwnMessage);
    });

    // Handle form submission to send messages
    messageForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const messageText = messageInput.value.trim();
        if (messageText && userId) { // Ensure user is joined and has an ID
            socket.emit('message', messageText); // Emit message to server
            messageInput.value = ''; // Clear input field
        } else if (!userId) {
            UI.showToast('Please wait, joining chat...');
        }
    });

    // Function to fetch initial messages from the backend
    async function fetchInitialMessages() {
        UI.showLoading(true);
        try {
            const response = await fetch('/messages'); // Use the new GET /messages endpoint
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            const data = await response.json();
            if (data.success) {
                messageList.innerHTML = ''; // Clear existing messages
                data.messages.forEach((message) => {
                    // For initial load, we don't know if they are 'own' messages from this session
                    // so we display them as generic messages.
                    UI.displayMessage(message, false);
                });
            } else {
                UI.showToast(data.error || 'Failed to load messages.');
            }
        } catch (error) {
            console.error('Error fetching initial messages:', error);
            UI.showToast('Error loading initial messages.');
        } finally {
            UI.showLoading(false);
        }
    }

    // Handle disconnects
    socket.on('disconnect', () => {
        UI.showToast('Disconnected from chat server.');
        userId = null; // Reset user ID on disconnect
    });

    socket.on('connect_error', (error) => {
        console.error('Socket.IO connection error:', error);
        UI.showToast('Could not connect to chat server.');
    });
});