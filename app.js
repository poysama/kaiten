// Board Game Wheel Spinner App
// Main Application Logic

class BoardGameSpinner {
    constructor() {
        this.data = null;
        this.canvas = null;
        this.ctx = null;
        this.spinning = false;
        this.currentRotation = 0;
        this.selectedGame = null;

        this.init();
    }

    async init() {
        // Load data from localStorage or initialize with defaults
        await this.loadData();

        // Setup canvas
        this.setupCanvas();

        // Setup event listeners
        this.setupEventListeners();

        // Initial render
        this.updateUI();
        this.drawWheel();

        // Display build info
        this.displayBuildInfo();

        // Load latest data from server (non-blocking)
        this.loadFromServer().catch(err => {
            console.log('Could not load from server on init:', err);
        });
    }

    displayBuildInfo() {
        // Get build info from GitHub API
        const buildInfoElement = document.getElementById('buildInfo');

        // Try to get the current commit info
        fetch('https://api.github.com/repos/poysama/kaiten/commits?per_page=1')
            .then(response => response.json())
            .then(data => {
                if (data && data.length > 0) {
                    const commit = data[0];
                    const shortSha = commit.sha.substring(0, 7);
                    const date = new Date(commit.commit.author.date).toLocaleDateString();
                    buildInfoElement.textContent = `v${date} • ${shortSha}`;
                } else {
                    buildInfoElement.textContent = 'Build: Unknown';
                }
            })
            .catch(() => {
                // Fallback if API fails
                buildInfoElement.textContent = `Build: ${new Date().toISOString().split('T')[0]}`;
            });
    }

    // ================== DATA MANAGEMENT ==================

    async loadData() {
        try {
            // Try localStorage first
            const localData = localStorage.getItem('boardGameSpinnerData');
            if (localData) {
                this.data = JSON.parse(localData);
            } else {
                // Load initial data from data.json
                const response = await fetch('data.json');
                this.data = await response.json();
                this.saveToLocalStorage();
            }
        } catch (error) {
            console.error('Error loading data:', error);
            // Fallback to default data structure
            this.data = this.getDefaultData();
            this.saveToLocalStorage();
        }

        // Initialize stats for games if not present
        this.data.games.forEach(game => {
            if (!this.data.stats.gamesPlayed[game.id]) {
                this.data.stats.gamesPlayed[game.id] = 0;
            }
            if (!this.data.stats.gamesSkipped[game.id]) {
                this.data.stats.gamesSkipped[game.id] = 0;
            }
        });

        // Check if we need to reset reroll counter (new day)
        this.checkRerollReset();
    }

    getDefaultData() {
        return {
            games: [],
            players: [],
            stats: {
                gamesPlayed: {},
                gamesSkipped: {},
                lastPlayed: {},
                rerollsToday: 0,
                lastRerollDate: null
            },
            session: {
                code: ''
            }
        };
    }

    saveToLocalStorage() {
        try {
            localStorage.setItem('boardGameSpinnerData', JSON.stringify(this.data));
        } catch (error) {
            console.error('Error saving to localStorage:', error);
        }
    }

    checkRerollReset() {
        const today = new Date().toDateString();
        if (this.data.stats.lastRerollDate !== today) {
            this.data.stats.rerollsToday = 0;
            this.data.stats.lastRerollDate = today;
            this.saveToLocalStorage();
        }
    }

    getRerollLimit() {
        return Math.max(1, this.data.players.length);
    }

    // ================== CANVAS & WHEEL ==================

    setupCanvas() {
        this.canvas = document.getElementById('wheelCanvas');
        this.ctx = this.canvas.getContext('2d');
    }

    drawWheel() {
        if (!this.ctx || this.data.games.length === 0) {
            this.drawEmptyWheel();
            return;
        }

        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;
        const games = this.data.games;
        const sliceAngle = (Math.PI * 2) / games.length;

        // Clear canvas
        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);

        // Draw each slice
        games.forEach((game, index) => {
            const startAngle = this.currentRotation + (sliceAngle * index);
            const endAngle = startAngle + sliceAngle;

            // Draw slice
            this.ctx.beginPath();
            this.ctx.moveTo(centerX, centerY);
            this.ctx.arc(centerX, centerY, radius, startAngle, endAngle);
            this.ctx.closePath();

            // Alternate colors (blue shades)
            const colors = ['#2175d9', '#4a9eff', '#174d8a', '#5eb3ff'];
            this.ctx.fillStyle = colors[index % colors.length];
            this.ctx.fill();

            // Add border
            this.ctx.strokeStyle = '#ffffff';
            this.ctx.lineWidth = 3;
            this.ctx.stroke();

            // Add text
            this.ctx.save();
            this.ctx.translate(centerX, centerY);
            this.ctx.rotate(startAngle + sliceAngle / 2);
            this.ctx.textAlign = 'center';
            this.ctx.fillStyle = '#ffffff';
            this.ctx.font = 'bold 16px Arial';

            // Wrap text if too long
            const gameName = game.name;
            const maxWidth = radius * 0.7;
            const words = gameName.split(' ');
            let line = '';
            let lines = [];

            words.forEach(word => {
                const testLine = line + word + ' ';
                const metrics = this.ctx.measureText(testLine);
                if (metrics.width > maxWidth && line !== '') {
                    lines.push(line.trim());
                    line = word + ' ';
                } else {
                    line = testLine;
                }
            });
            lines.push(line.trim());

            // Draw wrapped text
            const lineHeight = 20;
            const startY = radius * 0.6 - ((lines.length - 1) * lineHeight / 2);
            lines.forEach((textLine, i) => {
                this.ctx.fillText(textLine, startY + (i * lineHeight), 0);
            });

            this.ctx.restore();
        });

        // Draw center circle
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, 40, 0, Math.PI * 2);
        this.ctx.fillStyle = '#ff8c00';
        this.ctx.fill();
        this.ctx.strokeStyle = '#ffffff';
        this.ctx.lineWidth = 4;
        this.ctx.stroke();
    }

    drawEmptyWheel() {
        const centerX = this.canvas.width / 2;
        const centerY = this.canvas.height / 2;
        const radius = Math.min(centerX, centerY) - 20;

        this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
        this.ctx.beginPath();
        this.ctx.arc(centerX, centerY, radius, 0, Math.PI * 2);
        this.ctx.fillStyle = '#e0e0e0';
        this.ctx.fill();
        this.ctx.strokeStyle = '#666666';
        this.ctx.lineWidth = 3;
        this.ctx.stroke();

        this.ctx.fillStyle = '#666666';
        this.ctx.font = 'bold 24px Arial';
        this.ctx.textAlign = 'center';
        this.ctx.fillText('Add games in Admin', centerX, centerY);
    }

    spinWheel() {
        if (this.spinning || this.data.games.length === 0) return;

        const rerollLimit = this.getRerollLimit();
        const spinBtn = document.getElementById('spinBtn');

        this.spinning = true;
        spinBtn.disabled = true;

        // Random spin duration and rotation
        const spinDuration = 3000 + Math.random() * 2000;
        const spinRotations = 5 + Math.random() * 5;
        const totalRotation = spinRotations * Math.PI * 2;

        const startTime = Date.now();
        const startRotation = this.currentRotation;

        const animate = () => {
            const elapsed = Date.now() - startTime;
            const progress = Math.min(elapsed / spinDuration, 1);

            // Easing function for smooth deceleration
            const easeOut = 1 - Math.pow(1 - progress, 3);

            this.currentRotation = startRotation + (totalRotation * easeOut);
            this.drawWheel();

            if (progress < 1) {
                requestAnimationFrame(animate);
            } else {
                this.spinning = false;
                spinBtn.disabled = false;
                this.selectWinner();
            }
        };

        animate();
    }

    selectWinner() {
        if (this.data.games.length === 0) return;

        const sliceAngle = (Math.PI * 2) / this.data.games.length;

        // The pointer is at the top of the wheel, which is at angle -π/2 in canvas coordinates
        const pointerAngle = -Math.PI / 2;

        // Calculate the angle from the start of game 0 to the pointer
        let angleFromStart = pointerAngle - this.currentRotation;

        // Normalize to 0-2π range (handle negative angles correctly)
        angleFromStart = ((angleFromStart % (Math.PI * 2)) + (Math.PI * 2)) % (Math.PI * 2);

        // Find which slice the pointer is pointing at
        const selectedIndex = Math.floor(angleFromStart / sliceAngle) % this.data.games.length;

        this.selectedGame = this.data.games[selectedIndex];
        this.showResultModal();
    }

    // ================== RESULT MODAL ==================

    showResultModal() {
        const modal = document.getElementById('resultModal');
        const gameName = document.getElementById('resultGameName');
        const rerollBtn = document.getElementById('rerollBtn');

        gameName.textContent = this.selectedGame.name;

        // Check reroll limit
        const rerollLimit = this.getRerollLimit();
        if (this.data.stats.rerollsToday >= rerollLimit) {
            rerollBtn.disabled = true;
            rerollBtn.textContent = 'No Rerolls Left';
        } else {
            rerollBtn.disabled = false;
            rerollBtn.innerHTML = `
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                    <path d="M21.5 2v6h-6M2.5 22v-6h6M2 11.5a10 10 0 0 1 18.8-4.3M22 12.5a10 10 0 0 1-18.8 4.2"/>
                </svg>
                Reroll (${this.data.stats.rerollsToday}/${rerollLimit})
            `;
        }

        modal.classList.add('active');
    }

    hideResultModal() {
        const modal = document.getElementById('resultModal');
        modal.classList.remove('active');
    }

    confirmGame() {
        if (!this.selectedGame) return;

        // Update stats
        this.data.stats.gamesPlayed[this.selectedGame.id] =
            (this.data.stats.gamesPlayed[this.selectedGame.id] || 0) + 1;
        this.data.stats.lastPlayed[this.selectedGame.id] = new Date().toISOString();

        this.saveToLocalStorage();
        this.saveToServer();
        this.hideResultModal();
        this.updateUI();
    }

    skipGame() {
        if (!this.selectedGame) return;

        // Update skip stats
        this.data.stats.gamesSkipped[this.selectedGame.id] =
            (this.data.stats.gamesSkipped[this.selectedGame.id] || 0) + 1;

        this.saveToLocalStorage();
        this.saveToServer();
        this.hideResultModal();
        this.updateUI();
    }

    rerollGame() {
        const rerollLimit = this.getRerollLimit();
        if (this.data.stats.rerollsToday >= rerollLimit) {
            alert('No rerolls left today!');
            return;
        }

        this.data.stats.rerollsToday++;
        this.saveToLocalStorage();
        this.hideResultModal();
        this.updateUI();

        // Spin again
        setTimeout(() => this.spinWheel(), 300);
    }

    // ================== SERVER API ==================

    async saveToServer() {
        try {
            // Prepare data to save (without session info)
            const dataToSave = {
                games: this.data.games,
                players: this.data.players,
                stats: this.data.stats
            };

            const response = await fetch('/api/data', {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json'
                },
                body: JSON.stringify(dataToSave)
            });

            if (response.ok) {
                console.log('Data synced to server successfully');
                return true;
            } else {
                const error = await response.json();
                console.error('Server sync failed:', error);
                return false;
            }
        } catch (error) {
            console.error('Error syncing to server:', error);
            return false;
        }
    }

    async loadFromServer() {
        try {
            const response = await fetch('/api/data');

            if (response.ok) {
                const serverData = await response.json();

                // Merge server data with local data
                this.data.games = serverData.games || [];
                this.data.players = serverData.players || [];
                this.data.stats = serverData.stats || {
                    gamesPlayed: {},
                    gamesSkipped: {},
                    lastPlayed: {},
                    rerollsToday: 0,
                    lastRerollDate: null
                };

                this.saveToLocalStorage();
                this.updateUI();
                this.drawWheel();
                console.log('Data loaded from server successfully');
                return true;
            } else {
                console.error('Failed to load from server');
                return false;
            }
        } catch (error) {
            console.error('Error loading from server:', error);
            return false;
        }
    }

    // ================== ADMIN FUNCTIONS ==================

    addPlayer(name) {
        if (!name || name.trim() === '') return;

        const player = {
            id: this.generateId(name),
            name: name.trim()
        };

        this.data.players.push(player);
        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
    }

    removePlayer(id) {
        this.data.players = this.data.players.filter(p => p.id !== id);
        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
    }

    addGame(name) {
        if (!name || name.trim() === '') return;

        const game = {
            id: this.generateId(name),
            name: name.trim()
        };

        this.data.games.push(game);

        // Initialize stats for new game
        this.data.stats.gamesPlayed[game.id] = 0;
        this.data.stats.gamesSkipped[game.id] = 0;

        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
        this.drawWheel();
    }

    removeGame(id) {
        this.data.games = this.data.games.filter(g => g.id !== id);

        // Remove stats
        delete this.data.stats.gamesPlayed[id];
        delete this.data.stats.gamesSkipped[id];
        delete this.data.stats.lastPlayed[id];

        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
        this.drawWheel();
    }

    generateId(name) {
        return name.toLowerCase()
            .replace(/[^a-z0-9]+/g, '-')
            .replace(/^-|-$/g, '') +
            '-' + Date.now();
    }

    createSession(code) {
        if (!code || code.trim() === '') {
            alert('Please enter a session code');
            return;
        }

        this.data.session.code = code.trim();
        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
        alert(`Session "${code}" created!`);
    }

    exportData() {
        const dataStr = JSON.stringify(this.data, null, 2);
        const blob = new Blob([dataStr], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = url;
        a.download = 'board-game-spinner-data.json';
        a.click();
        URL.revokeObjectURL(url);
    }

    importData(file) {
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                this.data = JSON.parse(e.target.result);
                this.saveToLocalStorage();
                this.updateUI();
                this.drawWheel();
                alert('Data imported successfully!');
            } catch (error) {
                alert('Error importing data. Please check the file format.');
                console.error(error);
            }
        };
        reader.readAsText(file);
    }

    resetStats() {
        if (!confirm('Reset all statistics? This will clear play counts, skips, and reroll counter. Games and players will be kept.')) {
            return;
        }

        // Reset all stats
        this.data.stats = {
            gamesPlayed: {},
            gamesSkipped: {},
            lastPlayed: {},
            rerollsToday: 0,
            lastRerollDate: null
        };

        // Initialize stats for existing games
        this.data.games.forEach(game => {
            this.data.stats.gamesPlayed[game.id] = 0;
            this.data.stats.gamesSkipped[game.id] = 0;
        });

        this.saveToLocalStorage();
        this.saveToServer();
        this.updateUI();
        alert('Statistics have been reset!');
    }

    resetData() {
        if (!confirm('Are you sure you want to reset all data? This cannot be undone!')) {
            return;
        }

        this.data = this.getDefaultData();
        this.saveToLocalStorage();
        this.updateUI();
        this.drawWheel();
        alert('All data has been reset!');
    }

    // ================== UI UPDATES ==================

    updateUI() {
        this.updateRerollCounter();
        this.updateSessionInfo();
        this.updateStatsView();
        this.updateLeaderboardView();
        this.updateAdminView();
    }

    updateRerollCounter() {
        const rerollCount = document.getElementById('rerollCount');
        const rerollLimit = document.getElementById('rerollLimit');

        rerollCount.textContent = this.data.stats.rerollsToday;
        rerollLimit.textContent = this.getRerollLimit();
    }

    updateSessionInfo() {
        const sessionCode = document.getElementById('sessionCode');
        if (this.data.session.code) {
            sessionCode.textContent = `Session: ${this.data.session.code}`;
        } else {
            sessionCode.textContent = '';
        }
    }

    updateStatsView() {
        // Summary stats
        const totalPlayed = Object.values(this.data.stats.gamesPlayed).reduce((a, b) => a + b, 0);
        const totalSkipped = Object.values(this.data.stats.gamesSkipped).reduce((a, b) => a + b, 0);
        const neverSelected = this.data.games.filter(g =>
            (this.data.stats.gamesPlayed[g.id] || 0) === 0
        ).length;

        document.getElementById('totalPlayed').textContent = totalPlayed;
        document.getElementById('totalSkipped').textContent = totalSkipped;
        document.getElementById('neverSelected').textContent = neverSelected;

        // Stats table
        const tbody = document.getElementById('statsTableBody');
        tbody.innerHTML = '';

        this.data.games.forEach(game => {
            const played = this.data.stats.gamesPlayed[game.id] || 0;
            const skipped = this.data.stats.gamesSkipped[game.id] || 0;
            const lastPlayed = this.data.stats.lastPlayed[game.id];

            const row = document.createElement('tr');
            row.innerHTML = `
                <td>${game.name}</td>
                <td>${played}</td>
                <td>${skipped}</td>
                <td>${lastPlayed ? new Date(lastPlayed).toLocaleDateString() : 'Never'}</td>
            `;
            tbody.appendChild(row);
        });
    }

    updateLeaderboardView() {
        // Most played games
        const mostPlayed = [...this.data.games]
            .filter(g => (this.data.stats.gamesPlayed[g.id] || 0) > 0)
            .sort((a, b) =>
                (this.data.stats.gamesPlayed[b.id] || 0) -
                (this.data.stats.gamesPlayed[a.id] || 0)
            );

        const mostPlayedList = document.getElementById('mostPlayedList');
        mostPlayedList.innerHTML = '';

        if (mostPlayed.length === 0) {
            mostPlayedList.innerHTML = '<p style="color: #666;">No games played yet</p>';
        } else {
            mostPlayed.forEach((game, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="rank">#${index + 1}</span>
                    <span class="name">${game.name}</span>
                    <span class="score">${this.data.stats.gamesPlayed[game.id]} plays</span>
                `;
                mostPlayedList.appendChild(item);
            });
        }

        // Never played games
        const neverPlayed = this.data.games.filter(g =>
            (this.data.stats.gamesPlayed[g.id] || 0) === 0
        );

        const neverPlayedList = document.getElementById('neverPlayedList');
        neverPlayedList.innerHTML = '';

        if (neverPlayed.length === 0) {
            neverPlayedList.innerHTML = '<p style="color: #666;">All games have been played!</p>';
        } else {
            neverPlayed.forEach((game, index) => {
                const item = document.createElement('div');
                item.className = 'leaderboard-item';
                item.innerHTML = `
                    <span class="rank">#${index + 1}</span>
                    <span class="name">${game.name}</span>
                    <span class="score">Never played</span>
                `;
                neverPlayedList.appendChild(item);
            });
        }
    }

    updateAdminView() {
        // Players list
        const playersList = document.getElementById('playersList');
        playersList.innerHTML = '';

        if (this.data.players.length === 0) {
            playersList.innerHTML = '<li style="color: #666; padding: 1rem;">No players added yet</li>';
        } else {
            this.data.players.forEach(player => {
                const li = document.createElement('li');
                li.className = 'admin-list-item';
                li.innerHTML = `
                    <span class="item-name">${player.name}</span>
                    <button class="btn-delete" onclick="app.removePlayer('${player.id}')">Remove</button>
                `;
                playersList.appendChild(li);
            });
        }

        // Games list
        const gamesList = document.getElementById('gamesList');
        gamesList.innerHTML = '';

        if (this.data.games.length === 0) {
            gamesList.innerHTML = '<li style="color: #666; padding: 1rem;">No games added yet</li>';
        } else {
            this.data.games.forEach(game => {
                const li = document.createElement('li');
                li.className = 'admin-list-item';
                li.innerHTML = `
                    <span class="item-name">${game.name}</span>
                    <button class="btn-delete" onclick="app.removeGame('${game.id}')">Remove</button>
                `;
                gamesList.appendChild(li);
            });
        }
    }

    // ================== EVENT LISTENERS ==================

    setupEventListeners() {
        // Navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.addEventListener('click', (e) => {
                e.preventDefault();
                const view = link.dataset.view;
                this.switchView(view);
            });
        });

        // Spinner controls
        document.getElementById('spinBtn').addEventListener('click', () => this.spinWheel());
        document.getElementById('confirmBtn').addEventListener('click', () => this.confirmGame());
        document.getElementById('skipBtn').addEventListener('click', () => this.skipGame());
        document.getElementById('rerollBtn').addEventListener('click', () => this.rerollGame());

        // Sync button
        document.getElementById('syncBtn').addEventListener('click', async () => {
            const success = await this.loadFromServer();
            if (success) {
                alert('Data loaded from server successfully!');
            } else {
                alert('Failed to load data from server. Check console for details.');
            }
        });

        // Admin - Players
        document.getElementById('addPlayerBtn').addEventListener('click', () => {
            const input = document.getElementById('newPlayerName');
            this.addPlayer(input.value);
            input.value = '';
        });

        document.getElementById('newPlayerName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const input = document.getElementById('newPlayerName');
                this.addPlayer(input.value);
                input.value = '';
            }
        });

        // Admin - Games
        document.getElementById('addGameBtn').addEventListener('click', () => {
            const nameInput = document.getElementById('newGameName');
            this.addGame(nameInput.value);
            nameInput.value = '';
        });

        document.getElementById('newGameName').addEventListener('keypress', (e) => {
            if (e.key === 'Enter') {
                const nameInput = document.getElementById('newGameName');
                this.addGame(nameInput.value);
                nameInput.value = '';
            }
        });

        // Admin - Session
        document.getElementById('createSessionBtn').addEventListener('click', () => {
            const input = document.getElementById('sessionCodeInput');
            this.createSession(input.value);
            input.value = '';
        });

        document.getElementById('joinSessionBtn').addEventListener('click', async () => {
            const input = document.getElementById('sessionCodeInput');
            this.data.session.code = input.value.trim();
            this.saveToLocalStorage();
            const success = await this.loadFromServer();
            if (success) {
                alert('Session joined! Data loaded from server.');
            } else {
                alert('Failed to join session. Check console for details.');
            }
            input.value = '';
        });

        // Admin - Data management
        document.getElementById('exportDataBtn').addEventListener('click', () => this.exportData());

        document.getElementById('importDataBtn').addEventListener('click', () => {
            document.getElementById('importFileInput').click();
        });

        document.getElementById('importFileInput').addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (file) {
                this.importData(file);
            }
        });

        document.getElementById('resetStatsBtn').addEventListener('click', () => this.resetStats());
        document.getElementById('resetDataBtn').addEventListener('click', () => this.resetData());
    }

    switchView(viewName) {
        // Update navigation
        document.querySelectorAll('.nav-link').forEach(link => {
            link.classList.remove('active');
        });
        document.querySelector(`[data-view="${viewName}"]`).classList.add('active');

        // Update views
        document.querySelectorAll('.view').forEach(view => {
            view.classList.remove('active');
        });
        document.getElementById(`${viewName}View`).classList.add('active');
    }
}

// Initialize app when DOM is loaded
let app;
document.addEventListener('DOMContentLoaded', () => {
    app = new BoardGameSpinner();
});
