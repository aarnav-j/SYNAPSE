const appState = {
    timers: []
};

const apiHelper = {
    headers: {
        'Content-Type': 'application/json'
    },
    async post(url, data) {
        const response = await fetch(url, {
            method: 'POST',
            headers: this.headers,
            body: JSON.stringify(data)
        });
        return response.json();
    },
    async get(url) {
        const response = await fetch(url);
        return response.json();
    },
    async delete(url) {
        const response = await fetch(url, {
            method: 'DELETE'
        });
        return response.json();
    }
};

const UI = {
    showToast(message) {
        const toast = document.createElement('div');
        toast.textContent = message;
        toast.style.position = 'fixed';
        toast.style.top = '50%';
        toast.style.left = '50%';
        toast.style.transform = 'translate(-50%, -50%)';
        toast.style.background = '#fff';
        toast.style.border = '1px solid #ccc';
        toast.style.padding = '1em';
        toast.style.borderRadius = '0.5em';
        toast.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        document.body.appendChild(toast);
        setTimeout(() => {
            toast.remove();
        }, 2000);
    },
    showLoading() {
        const loading = document.createElement('div');
        loading.textContent = 'Loading...';
        loading.style.position = 'fixed';
        loading.style.top = '50%';
        loading.style.left = '50%';
        loading.style.transform = 'translate(-50%, -50%)';
        loading.style.background = '#fff';
        loading.style.border = '1px solid #ccc';
        loading.style.padding = '1em';
        loading.style.borderRadius = '0.5em';
        loading.style.boxShadow = '0 0 10px rgba(0, 0, 0, 0.1)';
        document.body.appendChild(loading);
        return loading;
    }
};

document.addEventListener('DOMContentLoaded', async () => {
    const timerList = document.getElementById('timer-list');
    const createTimerForm = document.getElementById('create-timer-form');

    createTimerForm.addEventListener('submit', async (e) => {
        e.preventDefault();
        const timerValue = document.getElementById('timer-value').value;
        if (timerValue <= 0) {
            UI.showToast('Invalid timer value');
            return;
        }
        const loading = UI.showLoading();
        try {
            const response = await apiHelper.post('/api/timers', { value: timerValue });
            appState.timers.push(response);
            const timerListItem = document.createElement('li');
            timerListItem.textContent = `Timer ${appState.timers.length}: ${timerValue} seconds`;
            timerList.appendChild(timerListItem);
            UI.showToast('Timer created successfully');
        } catch (error) {
            UI.showToast('Error creating timer');
        } finally {
            loading.remove();
        }
    });

    const getTimers = async () => {
        try {
            const response = await apiHelper.get('/api/timers');
            appState.timers = response;
            timerList.innerHTML = '';
            appState.timers.forEach((timer) => {
                const timerListItem = document.createElement('li');
                timerListItem.textContent = `Timer ${appState.timers.indexOf(timer) + 1}: ${timer.value} seconds`;
                timerList.appendChild(timerListItem);
            });
        } catch (error) {
            UI.showToast('Error fetching timers');
        }
    };

    getTimers();

    timerList.addEventListener('click', async (e) => {
        if (e.target.tagName === 'LI') {
            const timerId = appState.timers[e.target.dataset.index].id;
            const loading = UI.showLoading();
            try {
                await apiHelper.delete(`/api/timers/${timerId}`);
                appState.timers = appState.timers.filter((timer) => timer.id !== timerId);
                timerList.innerHTML = '';
                appState.timers.forEach((timer) => {
                    const timerListItem = document.createElement('li');
                    timerListItem.textContent = `Timer ${appState.timers.indexOf(timer) + 1}: ${timer.value} seconds`;
                    timerList.appendChild(timerListItem);
                });
                UI.showToast('Timer deleted successfully');
            } catch (error) {
                UI.showToast('Error deleting timer');
            } finally {
                loading.remove();
            }
        }
    });
});