// Estado del torneo
let tournament = {
    groups: [],
    matches: [],
    lastUpdated: new Date().toISOString()
};

// Cargar datos al abrir
function loadTournament() {
    const saved = localStorage.getItem('tournamentData');
    if (saved) {
        try {
            tournament = JSON.parse(saved);
            refreshUI();
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    }
}

function createGroup() {
    const groupName = document.getElementById('groupName').value.trim();
    const teamsText = document.getElementById('teamsInput').value.trim();

    if (!groupName || !teamsText) {
        showStatus('Completá el nombre del grupo y los equipos', 'error');
        return;
    }

    const teams = teamsText.split('\n').map(t => t.trim()).filter(t => t);

    if (teams.length < 2) {
        showStatus('Necesitás al menos 2 equipos', 'error');
        return;
    }

    const group = {
        id: Date.now(),
        name: groupName,
        teams: teams
    };

    tournament.groups.push(group);

    // Generar matches (todos contra todos)
    for (let i = 0; i < teams.length; i++) {
        for (let j = i + 1; j < teams.length; j++) {
            tournament.matches.push({
                id: Date.now() + Math.random(),
                groupId: group.id,
                team1: teams[i],
                team2: teams[j],
                score1: null,
                score2: null,
                played: false
            });
        }
    }

    saveTournament();
    document.getElementById('groupName').value = '';
    document.getElementById('teamsInput').value = '';
    showStatus('Grupo creado ✓', 'success');
    refreshUI();
}

function loadMatches() {
    const groupId = parseInt(document.getElementById('groupSelect').value);
    const matches = tournament.matches.filter(m => m.groupId === groupId);

    const list = document.getElementById('matchList');
    list.innerHTML = matches.map(m => `
                <div class="match-item" onclick="selectMatch(${m.id})">
                    <div class="match-info">
                        <strong>${m.team1}</strong> vs <strong>${m.team2}</strong>
                        <div class="match-status">
                            ${m.played ? `✓ ${m.score1} - ${m.score2}` : '⏳ Sin puntos'}
                        </div>
                    </div>
                </div>
            `).join('');

    updatePendingMatches(groupId);
}

let selectedMatchId = null;
function selectMatch(matchId) {
    selectedMatchId = matchId;
    const match = tournament.matches.find(m => m.id === matchId);
    if (match) {
        document.getElementById('score1').value = match.score1 || '';
        document.getElementById('score2').value = match.score2 || '';
    }
    loadMatches(); // Refresh para mostrar selección
}

function saveScore() {
    if (!selectedMatchId) {
        showStatus('Seleccioná un partido', 'error');
        return;
    }

    const score1 = parseInt(document.getElementById('score1').value);
    const score2 = parseInt(document.getElementById('score2').value);

    if (isNaN(score1) || isNaN(score2)) {
        showStatus('Ingresá números válidos', 'error');
        return;
    }

    const match = tournament.matches.find(m => m.id === selectedMatchId);
    match.score1 = score1;
    match.score2 = score2;
    match.played = true;

    saveTournament();
    showStatus('Puntaje cargado ✓', 'success');
    const groupId = parseInt(document.getElementById('groupSelect').value);
    loadMatches();
    updatePendingMatches(groupId);
    displayStandings();
}

function updatePendingMatches(groupId) {
    const pending = tournament.matches.filter(m => m.groupId === groupId && !m.played);
    const container = document.getElementById('pendingMatches');

    if (pending.length === 0) {
        container.innerHTML = '<p style="color: #27ae60;">✓ Todos los partidos tienen puntaje cargado</p>';
        return;
    }

    container.innerHTML = pending.map(m => `
                <div style="padding: 10px; border-bottom: 1px solid #eee;">
                    ${m.team1} vs ${m.team2}
                </div>
            `).join('');
}

function displayStandings() {
    const container = document.getElementById('standingsContainer');

    if (tournament.groups.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d;">No hay grupos creados todavía</p>';
        return;
    }

    let html = '';
    tournament.groups.forEach(group => {
        const groupMatches = tournament.matches.filter(m => m.groupId === group.id);
        const standings = {};

        // Inicializar standings
        group.teams.forEach(team => {
            standings[team] = { puntos: 0, pj: 0, gf: 0, gc: 0 };
        });

        // Procesar partidos jugados
        groupMatches.forEach(match => {
            if (match.played) {
                standings[match.team1].pj++;
                standings[match.team2].pj++;
                standings[match.team1].gf += match.score1;
                standings[match.team1].gc += match.score2;
                standings[match.team2].gf += match.score2;
                standings[match.team2].gc += match.score1;

                if (match.score1 > match.score2) {
                    standings[match.team1].puntos += 3;
                } else if (match.score2 > match.score1) {
                    standings[match.team2].puntos += 3;
                } else {
                    standings[match.team1].puntos += 1;
                    standings[match.team2].puntos += 1;
                }
            }
        });

        // Ordenar
        const sorted = Object.entries(standings)
            .sort((a, b) => {
                if (b[1].puntos !== a[1].puntos) return b[1].puntos - a[1].puntos;
                return (b[1].gf - b[1].gc) - (a[1].gf - a[1].gc);
            });

        html += `<h3 style="margin-top: 20px; margin-bottom: 10px; color: #2c3e50;">${group.name}</h3>`;
        html += '<table><tr><th>Equipo</th><th>Pts</th><th>PJ</th><th>GF</th><th>GC</th><th>Dif</th></tr>';

        sorted.forEach(([team, stats]) => {
            const dif = stats.gf - stats.gc;
            html += `<tr>
                        <td><strong>${team}</strong></td>
                        <td>${stats.puntos}</td>
                        <td>${stats.pj}</td>
                        <td>${stats.gf}</td>
                        <td>${stats.gc}</td>
                        <td>${dif > 0 ? '+' : ''}${dif}</td>
                    </tr>`;
        });

        html += '</table>';
    });

    container.innerHTML = html;
}

function refreshUI() {
    const select = document.getElementById('groupSelect');
    select.innerHTML = '<option value="">-- Seleccionar --</option>' +
        tournament.groups.map(g => `<option value="${g.id}">${g.name}</option>`).join('');
    displayStandings();
}

function saveTournament() {
    tournament.lastUpdated = new Date().toISOString();
    localStorage.setItem('tournamentData', JSON.stringify(tournament));
}

function downloadData() {
    const dataStr = JSON.stringify(tournament, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `torneo-truco-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
}

function uploadData() {
    const file = document.getElementById('fileInput').files[0];
    if (!file) {
        showStatus('Seleccioná un archivo', 'error');
        return;
    }

    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            tournament = JSON.parse(e.target.result);
            saveTournament();
            document.getElementById('uploadModal').classList.remove('show');
            document.getElementById('fileInput').value = '';
            showStatus('Datos cargados ✓', 'success');
            refreshUI();
        } catch (err) {
            showStatus('Error al cargar el archivo', 'error');
        }
    };
    reader.readAsText(file);
}

function resetAll() {
    if (confirm('¿Estás seguro? Se borrarán todos los datos.')) {
        tournament = { groups: [], matches: [], lastUpdated: new Date().toISOString() };
        saveTournament();
        showStatus('Torneo reiniciado', 'success');
        refreshUI();
    }
}

function showStatus(message, type) {
    const el = document.getElementById('status');
    el.textContent = message;
    el.className = type;
    el.style.display = 'block';
    setTimeout(() => el.style.display = 'none', 3000);
}

// Iniciar
loadTournament();
