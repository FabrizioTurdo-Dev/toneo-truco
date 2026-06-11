let tournament = {
    groups: [],
    matches: [],
    lastUpdated: null
};

let selectedGroupId = null;

function loadData() {
    // Intenta cargar desde localStorage primero
    const saved = localStorage.getItem('tournamentData');
    if (saved) {
        try {
            tournament = JSON.parse(saved);
            renderUI();
        } catch (e) {
            console.error('Error cargando datos:', e);
        }
    } else {
        showEmpty();
    }
}

function renderUI() {
    renderGroupButtons();

    if (tournament.groups.length > 0 && !selectedGroupId) {
        selectedGroupId = tournament.groups[0].id;
    }

    renderStandings();
    renderMatches();
    updateTimestamp();
}

function renderGroupButtons() {
    const selector = document.getElementById('groupSelector');
    if (tournament.groups.length === 0) {
        selector.innerHTML = '<p style="color: #7f8c8d;">Aún no hay grupos creados</p>';
        return;
    }

    selector.innerHTML = tournament.groups.map(g => `
                <button class="group-btn ${g.id === selectedGroupId ? 'active' : ''}" onclick="selectGroup(${g.id})">
                    ${g.name}
                </button>
            `).join('');
}

function selectGroup(groupId) {
    selectedGroupId = groupId;
    renderGroupButtons();
    renderStandings();
    renderMatches();
}

function renderStandings() {
    const container = document.getElementById('standingsContainer');

    if (!selectedGroupId) {
        container.innerHTML = '<p style="color: #7f8c8d; padding: 20px; text-align: center;">Selecciona un grupo</p>';
        return;
    }

    const group = tournament.groups.find(g => g.id === selectedGroupId);
    if (!group) return;

    const groupMatches = tournament.matches.filter(m => m.groupId === selectedGroupId);
    const standings = {};

    // Inicializar
    group.teams.forEach(team => {
        standings[team] = { puntos: 0, pj: 0, gf: 0, gc: 0, dif: 0 };
    });

    // Procesar partidos
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

    // Calcular diferencia
    Object.keys(standings).forEach(team => {
        standings[team].dif = standings[team].gf - standings[team].gc;
    });

    // Ordenar
    const sorted = Object.entries(standings)
        .sort((a, b) => {
            if (b[1].puntos !== a[1].puntos) return b[1].puntos - a[1].puntos;
            return b[1].dif - a[1].dif;
        });

    if (sorted.length === 0) {
        container.innerHTML = '<p style="color: #7f8c8d; padding: 20px;">Sin datos aún</p>';
        return;
    }

    const medals = ['🥇', '🥈', '🥉'];
    let html = '<table><tr><th>#</th><th>Equipo</th><th>Pts</th><th>PJ</th><th>GF</th><th>GC</th><th>Dif</th></tr>';

    sorted.forEach(([team, stats], idx) => {
        const medal = medals[idx] || '';
        html += `<tr>
                    <td class="position">${medal} ${idx + 1}</td>
                    <td><strong>${team}</strong></td>
                    <td class="points">${stats.puntos}</td>
                    <td>${stats.pj}</td>
                    <td>${stats.gf}</td>
                    <td>${stats.gc}</td>
                    <td style="color: ${stats.dif > 0 ? '#27ae60' : stats.dif < 0 ? '#c0392b' : '#7f8c8d'}">${stats.dif > 0 ? '+' : ''}${stats.dif}</td>
                </tr>`;
    });

    html += '</table>';
    container.innerHTML = html;
}

function renderMatches() {
    if (!selectedGroupId) {
        document.getElementById('nextMatchesContainer').innerHTML = '';
        document.getElementById('allMatchesContainer').innerHTML = '';
        return;
    }

    const groupMatches = tournament.matches.filter(m => m.groupId === selectedGroupId);

    // Próximos (sin puntos)
    const pending = groupMatches.filter(m => !m.played);
    const nextContainer = document.getElementById('nextMatchesContainer');

    if (pending.length === 0) {
        nextContainer.innerHTML = '<p style="color: #27ae60; padding: 20px; text-align: center;">✓ Todos los partidos fueron jugados</p>';
    } else {
        nextContainer.innerHTML = pending.map(m => `
                    <div class="match-card">
                        <div class="match-header">Próximo partido</div>
                        <div class="teams">
                            <span class="team-name">${m.team1}</span>
                            <span class="score pending">⏳</span>
                            <span class="team-name" style="text-align: right;">${m.team2}</span>
                        </div>
                        <div class="match-status">Pendiente de carga</div>
                    </div>
                `).join('');
    }

    // Todos los partidos
    const allContainer = document.getElementById('allMatchesContainer');
    const played = groupMatches.filter(m => m.played);

    if (played.length === 0) {
        allContainer.innerHTML = '<p style="color: #7f8c8d; padding: 20px; text-align: center;">Aún no hay resultados</p>';
    } else {
        allContainer.innerHTML = played.map(m => `
                    <div class="match-card">
                        <div class="teams">
                            <span class="team-name">${m.team1}</span>
                            <div style="display: flex; gap: 4px;">
                                <span class="score played">${m.score1}</span>
                                <span style="color: #7f8c8d;">-</span>
                                <span class="score played">${m.score2}</span>
                            </div>
                            <span class="team-name" style="text-align: right;">${m.team2}</span>
                        </div>
                        <div class="match-status">
                            ${m.score1 > m.score2 ? `✓ Ganó ${m.team1}` : m.score2 > m.score1 ? `✓ Ganó ${m.team2}` : '• Empate'}
                        </div>
                    </div>
                `).join('');
    }
}

function updateTimestamp() {
    const el = document.getElementById('lastUpdated');
    if (tournament.lastUpdated) {
        const date = new Date(tournament.lastUpdated);
        const formatted = date.toLocaleString('es-AR', {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit'
        });
        el.textContent = `Última actualización: ${formatted}`;
    }
}

function showEmpty() {
    const html = '<p style="color: #7f8c8d; padding: 40px; text-align: center;">Los datos del torneo aún no están disponibles. Volvé en unos momentos.</p>';
    document.getElementById('standingsContainer').innerHTML = html;
    document.getElementById('nextMatchesContainer').innerHTML = '';
    document.getElementById('allMatchesContainer').innerHTML = '';
}

function refreshData() {
    loadData();
    showStatus('✓ Actualizado');
}

function showStatus(msg) {
    const status = document.createElement('div');
    status.style.cssText = 'position: fixed; top: 20px; right: 20px; background: #27ae60; color: white; padding: 12px 20px; border-radius: 6px; z-index: 1000;';
    status.textContent = msg;
    document.body.appendChild(status);
    setTimeout(() => status.remove(), 2000);
}

// Auto-refresh cada 30 segundos
setInterval(loadData, 30000);

// Cargar al abrir
loadData();
