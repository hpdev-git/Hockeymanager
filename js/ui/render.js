(function (namespace) {
  function escapeHtml(value) {
    return String(value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function displayValue(value) {
    return value === undefined || value === null || value === "" ? "-" : value;
  }

  function renderSummary(game, league, progress, manager, managerTeam) {
    return [
      linkedMetric("Liiga", league.name, "openLeague", "data-league-id", league.id),
      linkedMetric("Manageri", manager.name, "openManager", "data-manager-id", manager.id),
      //metric("Oma joukkue", managerTeam ? managerTeam.shortName : "-"),
      //metric("Joukkueet", league.teamIds.length),
      //metric("Ottelut", progress.played + " / " + progress.total),
      //metric("Kausi", game.season)
    ].join("");
  }

  function metric(label, value) {
    return (
      '<div class="metric">' +
      '<span class="label">' + escapeHtml(label) + "</span>" +
      '<span class="value">' + escapeHtml(value) + "</span>" +
      "</div>"
    );
  }

  function linkedMetric(label, value, action, dataName, dataValue) {
    return (
      '<div class="metric">' +
      '<span class="label">' + escapeHtml(label) + "</span>" +
      '<button class="link-button value metric-link" data-action="' + escapeHtml(action) + '" ' +
      dataName + '="' + escapeHtml(dataValue) + '">' + escapeHtml(value) + "</button>" +
      "</div>"
    );
  }

  function teamStyle(team) {
    return "--team-primary: " + team.colors.primary + "; --team-secondary: " + team.colors.secondary;
  }

  function getTeamCoach(team, coachesById) {
    return team.coachId ? coachesById[team.coachId] : null;
  }

  function isGoalie(player) {
    return player.type === "goalie" || player.position === "G";
  }

  function renderStandings(rows, managerTeamId) {
    return (
      '<table aria-label="Sarjataulukko">' +
      "<thead><tr>" +
      "<th>Joukkue</th><th>O</th><th>V</th><th>JAV</th><th>JAT</th><th>H</th><th>TM</th><th>PM</th><th>P</th>" +
      "</tr></thead>" +
      "<tbody>" +
      rows.map(function (row) {
        var managerMarker = row.teamId === managerTeamId
          ? '<span class="manager-star" title="Manageroitava joukkue" aria-label="Manageroitava joukkue">&#11088;</span>'
          : "";

        return (
          "<tr>" +
          '<td><span class="team-cell">' + managerMarker + '<button class="link-button" data-action="openTeam" data-team-id="' + escapeHtml(row.teamId) + '">' + escapeHtml(row.teamName) + "</button></span></td>" +
          "<td>" + row.played + "</td>" +
          "<td>" + row.wins + "</td>" +
          "<td>" + row.overtimeWins + "</td>" +
          "<td>" + row.overtimeLosses + "</td>" +
          "<td>" + row.losses + "</td>" +
          "<td>" + row.goalsFor + "</td>" +
          "<td>" + row.goalsAgainst + "</td>" +
          "<td><strong>" + row.points + "</strong></td>" +
          "</tr>"
        );
      }).join("") +
      "</tbody>" +
      "</table>"
    );
  }

  function renderPointLeaders(leaders) {
    if (!leaders.length) {
      return '<p class="empty-state">Ei pistetilastoja</p>';
    }

    return (
      '<table aria-label="Pistepörssi">' +
      "<thead><tr>" +
      "<th>Pelaaja</th><th>O</th><th>M</th><th>S</th><th>P</th><th>RM</th>" +
      "</tr></thead>" +
      "<tbody>" +
      leaders.map(function (row) {
        return (
          "<tr>" +
          '<td><button class="link-button" data-action="openPlayer" data-player-id="' + escapeHtml(row.playerId) + '" data-team-id="' + escapeHtml(row.teamId) + '">' + escapeHtml(row.playerName) + "</button>" +
          '<span class="table-sub">#' + escapeHtml(displayValue(row.jerseyNumber)) + " / " + escapeHtml(row.teamShortName) + " / " + escapeHtml(row.position) + "</span></td>" +
          "<td>" + row.games + "</td>" +
          "<td>" + row.goals + "</td>" +
          "<td>" + row.assists + "</td>" +
          "<td><strong>" + row.points + "</strong></td>" +
          "<td>" + row.penaltyMinutes + "</td>" +
          "</tr>"
        );
      }).join("") +
      "</tbody>" +
      "</table>"
    );
  }

  function renderGoalieStats(rows) {
    if (!rows.length) {
      return '<p class="empty-state">Ei maalivahtitilastoja</p>';
    }

    return (
      '<table aria-label="Maalivahtitilastot">' +
      "<thead><tr>" +
      "<th>Maalivahti</th><th>O</th><th>V</th><th>NP</th><th>T%</th><th>PMK</th>" +
      "</tr></thead>" +
      "<tbody>" +
      rows.map(function (row) {
        return (
          "<tr>" +
          '<td><button class="link-button" data-action="openPlayer" data-player-id="' + escapeHtml(row.playerId) + '" data-team-id="' + escapeHtml(row.teamId) + '">' + escapeHtml(row.playerName) + "</button>" +
          '<span class="table-sub">#' + escapeHtml(displayValue(row.jerseyNumber)) + " / " + escapeHtml(row.teamShortName) + "</span></td>" +
          "<td>" + row.games + "</td>" +
          "<td>" + row.wins + "</td>" +
          "<td>" + row.shutouts + "</td>" +
          "<td>" + formatDecimal(row.savePercentage, 1) + "</td>" +
          "<td>" + formatDecimal(row.goalsAgainstAverage, 2) + "</td>" +
          "</tr>"
        );
      }).join("") +
      "</tbody>" +
      "</table>"
    );
  }

  function formatDecimal(value, digits) {
    return Number(value || 0).toFixed(digits);
  }

  function formatGoalStrength(event) {
    if (event.isPowerPlayGoal || event.strength === "powerPlay") {
      return " (YV)";
    }

    if (event.isShortHandedGoal || event.strength === "shortHanded") {
      return " (AV)";
    }

    return "";
  }

  function renderGameDetails(game, home, away) {
    var lines = [];
    var events = game.scoringEvents || [];
    var penalties = game.penaltyEvents || [];
    var goalieStats = game.goalieStats || {};

    if (!game.played) {
      return "";
    }

    if (events.length) {
        lines.push("Maalit:");
        events.map(function (event) {
            var team = event.teamId === home.id ? home.shortName : away.shortName;
            var assists = (event.assistNames || []).length
                ? (event.assistNames.length == 1 ? ", syöttäjä " : ", syöttäjät: ") + event.assistNames.join(", ")
              : ", ei syöttäjää";

            lines.push((event.time ? event.time + " " : "") + team + " " + event.scorerName + formatGoalStrength(event) + assists);
        });
        lines.push(" ");
    }

    if (penalties.length) {
        lines.push("Jäähyt:");
        penalties.map(function (event) {
            var team = event.teamId === home.id ? home.shortName : away.shortName;
            lines.push(
                (event.time ? event.time + " " : "") +
                team + " " + event.playerName + " " +
                (event.minutes == 4 ? "2 + 2" : event.minutes) + " min, " + event.reason
            );
        });
        lines.push(" ");
    }

      if (goalieStats.home && goalieStats.away) {
        lines.push("Maalivahdit:");
        lines.push(
            home.shortName + " " + goalieStats.home.goalieName + " " + formatDecimal(goalieStats.home.savePercentage, 1) + "%" +
            " (torjunnat: " + goalieStats.home.saves + "/" + goalieStats.home.shotsAgainst + ")" 
        );
        lines.push(
            away.shortName + " " + goalieStats.away.goalieName + " " + formatDecimal(goalieStats.away.savePercentage, 1) + "%" +
            " (torjunnat: " + goalieStats.away.saves + "/" + goalieStats.away.shotsAgainst + ")" 
        );
        lines.push(" ");
      }

      if (game.shots) {
          lines.push("Laukaukset:");
          lines.push(home.shortName + " " + game.shots.home + " - " + away.shortName + " " + game.shots.away);
      }

    if (!lines.length) {
      return "";
    }

    return '<div class="game-details">' + lines.map(function (line) {
      return "<span>" + escapeHtml(line) + "</span>";
    }).join("") + "</div>";
  }

  function renderSchedule(league, teamsById, nextGame) {
    return (
      '<div class="schedule">' +
      namespace.Schedule.flatten(league.rounds).map(function (game) {
        var home = teamsById[game.homeId];
        var away = teamsById[game.awayId];
        var score = game.played
          ? game.homeGoals + "-" + game.awayGoals + (game.overtime ? " JA" : "")
          : "-";
        var isNext = nextGame && game.id === nextGame.id;

        return (
          '<div class="game' + (isNext ? " next" : "") + '">' +
          '<span class="round">R' + game.round + "</span>" +
          '<span class="matchup">' + escapeHtml(home.name) + " - " + escapeHtml(away.name) + "</span>" +
          '<span class="score">' + escapeHtml(score) + "</span>" +
          renderGameDetails(game, home, away) +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderTeamRatings(team) {
    return (
      '<div class="ratings">' +
      '<span>HYK<strong>' + team.ratings.attack + "</strong></span>" +
      '<span>PUO<strong>' + team.ratings.defense + "</strong></span>" +
      '<span>MV<strong>' + team.ratings.goalie + "</strong></span>" +
      "</div>"
    );
  }

  function groupPlayers(players) {
    var groups = {
      goalies: [],
      defenders: [],
      forwards: []
    };

    players.forEach(function (player) {
      if (isGoalie(player)) {
        groups.goalies.push(player);
      } else if (player.position === "D") {
        groups.defenders.push(player);
      } else {
        groups.forwards.push(player);
      }
    });

    return groups;
  }

  function formatPlayerSkills(player) {
    var attributes = player.attributes || {};

    if (isGoalie(player)) {
      return "TOR " + displayValue(attributes.saving) +
        " / REA " + displayValue(attributes.reactions) +
        " / POT " + displayValue(attributes.potential);
    }

    return "LUI " + displayValue(attributes.skating) +
      " / LAU " + displayValue(attributes.shooting) +
      " / POT " + displayValue(attributes.potential);
  }

  function renderPlayerRow(player) {
    return (
      '<div class="player-row">' +
      '<div class="player-main">' +
      '<button class="link-button player-link" data-action="openPlayer" data-player-id="' + escapeHtml(player.id) + '" data-team-id="' + escapeHtml(player.teamId) + '">' + escapeHtml(player.name) + "</button>" +
      "<span>#" + escapeHtml(displayValue(player.jerseyNumber)) + " / " + escapeHtml(player.position) + " / " + escapeHtml(player.handedness) + " / " + escapeHtml(player.nationality) + "</span>" +
      "</div>" +
      '<span class="player-meta">' + escapeHtml(formatPlayerSkills(player)) + "</span>" +
      "</div>"
    );
  }

  function renderPlayerGroup(title, players) {
    if (!players.length) {
      return "";
    }

    return (
      '<section class="roster-group">' +
      '<div class="section-head compact">' +
      "<h2>" + escapeHtml(title) + ' <span class="muted-count">(' + players.length + ")</span></h2>" +
      "</div>" +
      '<div class="player-list">' + players.map(renderPlayerRow).join("") + "</div>" +
      "</section>"
    );
  }

  function renderRosterSection(players, team) {
    var groups = groupPlayers(players);

    if (!players.length) {
      return '<section class="roster-section"><div class="section-head"><h2>Kokoonpano</h2></div><p class="empty-state">Ei pelaajia.</p></section>';
    }

    return (
      '<section class="roster-section">' +
        '<div class="section-head"><h2>Kokoonpano</h2><span class="muted-count">' + players.length + " pelaajaa</span></div>" +
        '<div class="rating-band">' + renderTeamRatings(team) + "</div>" +
      renderPlayerGroup("Maalivahdit", groups.goalies) +
      renderPlayerGroup("Puolustajat", groups.defenders) +
      renderPlayerGroup("Hyökkääjät", groups.forwards) +
      "</section>"
    );
  }

  function renderTeamSelection(root, league, teamsById, manager, actions) {
    document.getElementById("season-status").textContent = "Valitse joukkue";

      document.body.style.backgroundColor = "#9d9d9d";

    root.innerHTML =
      '<section class="manager-select">' +
      '<div class="select-copy">' +
      "<h2>Valitse manageroitava joukkue</h2>" +
      "</div>" +
      '<div class="manager-name-field">' +
      '<label class="field-label" for="manager-name">Managerin nimi</label>' +
      '<input class="text-input" id="manager-name" type="text" maxlength="40" value="' + escapeHtml(manager.name) + '" autocomplete="name">' +
      "</div>" +
      '<div class="teams team-select-grid">' +
      league.teamIds.map(function (teamId) {
        var team = teamsById[teamId];

        return (
          '<article class="team team-select" style="' + teamStyle(team) + '">' +
          '<div class="swatch"></div>' +
          "<h3>" + escapeHtml(team.name) + "</h3>" +
          '<p class="muted">' + escapeHtml(team.city) + " / " + escapeHtml(displayValue(team.arena)) + "</p>" +
          renderTeamRatings(team) +
          '<button class="button stretch" data-action="selectTeam" data-team-id="' + escapeHtml(team.id) + '">Valitse joukkue</button>' +
          "</article>"
        );
      }).join("") +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function renderInfoItem(label, value) {
    return (
      '<div class="info-item">' +
      '<span class="label">' + escapeHtml(label) + "</span>" +
      '<strong>' + escapeHtml(displayValue(value)) + "</strong>" +
      "</div>"
    );
  }

  function renderInfoActionItem(label, value, action, dataName, dataValue) {
    return (
      '<div class="info-item">' +
      '<span class="label">' + escapeHtml(label) + "</span>" +
      '<button class="link-button info-link" data-action="' + escapeHtml(action) + '" ' +
      dataName + '="' + escapeHtml(dataValue) + '">' + escapeHtml(displayValue(value)) + "</button>" +
      "</div>"
    );
  }

  function formatPointSystem(points) {
    return "V " + points.win +
      " / JAV " + points.overtimeWin +
      " / JAT " + points.overtimeLoss +
      " / H " + points.loss;
  }

  function renderChampionHistory(history, teamsById) {
    if (!history.length) {
      return '<p class="empty-state">Ei pelattuja kausia vielä.</p>';
    }

    return (
      '<div class="history-list">' +
      history.map(function (record) {
        var team = teamsById[record.championTeamId];
        var teamName = record.championTeamName || (team && team.name) || "Tuntematon";
        var teamShortName = record.championShortName || (team && team.shortName) || "-";
        var teamStyleAttr = team ? ' style="' + teamStyle(team) + '"' : "";

        return (
            '<div class="history-row"' + teamStyleAttr + ">" +
            
          '<span class="history-swatch"></span>' +
          '<button class="link-button history-team" data-action="openTeam" data-team-id="' + escapeHtml(record.championTeamId) + '">' +
          escapeHtml(teamName) + " (" + escapeHtml(teamShortName) + ")" +
            "</button>" +
            '<span class="season-pill">Kausi ' + escapeHtml(record.season) + " (" + getYear(record.season) + ")</span>" +
          //'<span class="history-points">' + escapeHtml(record.points) + " p</span>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderManagerChampionships(championships, teamsById) {
    if (!championships.length) {
      return '<p class="empty-state">Ei saavutettuja mestaruuksia vielä.</p>';
    }

    return (
      '<div class="history-list">' +
      championships.map(function (record) {
        var team = teamsById[record.championTeamId];
        var teamName = record.championTeamName || (team && team.name) || "Tuntematon";
        var teamStyleAttr = team ? ' style="' + teamStyle(team) + '"' : "";

        return (
          '<div class="history-row"' + teamStyleAttr + ">" +
          '<span class="season-pill">Kausi ' + escapeHtml(record.season) + "</span>" +
          '<span class="history-swatch"></span>' +
          '<span class="history-team">' +
          escapeHtml(record.leagueName || "-") + " / " + escapeHtml(teamName) +
          "</span>" +
          '<span class="history-points">' + escapeHtml(record.points) + " p</span>" +
          "</div>"
        );
      }).join("") +
      "</div>"
    );
  }

  function renderManagerDetail(root, game, league, teamsById, actions) {
    var manager = namespace.GameState.getManager(game);
    var managedTeam = namespace.GameState.getManagedTeam(game);
    var championships = namespace.GameState.getManagerChampionships(game);
    var seasons = Math.max(1, game.season - manager.startedSeason + 1);

    root.innerHTML =
      '<section class="team-detail manager-detail" style="--team-primary: var(--accent); --team-secondary: var(--gold)">' +
      '<div class="detail-hero">' +
      '<div class="swatch"></div>' +
      '<div class="detail-title">' +
      '<span class="label">Manageri</span>' +
      "<h2>" + escapeHtml(manager.name) + "</h2>" +
      '<p class="muted">' + escapeHtml(displayValue(managedTeam ? managedTeam.name : null)) + " / " + escapeHtml(league.name) + "</p>" +
      "</div>" +
      '<span class="badge">' + escapeHtml(manager.reputation) + "</span>" +
      "</div>" +
      '<div class="detail-grid">' +
      renderInfoItem("Kansallisuus", manager.nationality) +
      renderInfoItem("Tyyli", manager.style) +
      renderInfoItem("Maine", manager.reputation) +
    "</div>" +
    '<div class="detail-grid">' +
    renderInfoItem("Aloituskausi", manager.startedSeason) +
    renderInfoItem("Kaudet", seasons) +
      renderInfoItem("Nykyinen joukkue", managedTeam ? managedTeam.name : null) +
      renderInfoItem("Mestaruudet", championships.length) +
      "</div>" +
      '<section class="history-section">' +
      '<div class="section-head"><h2>Mestaruudet</h2></div>' +
      renderManagerChampionships(championships, teamsById) +
      "</section>" +
      '<div class="actions">' +
      '<button class="button secondary" data-action="backToDashboard">Takaisin</button>' +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function renderLeagueDetail(root, game, league, teamsById, actions) {
    var progress = namespace.GameState.getProgress(league);
    var history = namespace.GameState.getLeagueHistory(game, league.id);

      document.body.style.backgroundColor = league.colors.primary;

    root.innerHTML =
      '<section class="team-detail league-detail" style="--team-primary: var(--accent); --team-secondary: var(--gold)">' +
      '<div class="detail-hero">' +
      '<div class="detail-title">' +
      '<span class="label">Liiga</span>' +
      "<h2>" + escapeHtml(league.name) + "</h2>" +
      "</div>" +
      '<img class="league-logo" src="img/leagues/' + escapeHtml(league.id) + '.svg" alt="logo" />' +
      "</div>" +
    '<div class="detail-grid">' +
    renderInfoItem("Perustettu", league.foundedYear) +
      renderInfoItem("Maa", league.country) +
      renderInfoItem("Taso", league.level) +
      renderInfoItem("Palkinto", league.trophyName) +
    renderInfoItem("Joukkueet", league.teamIds.length) +
    "</div>" +
    '<div class="section-head"><h2>Sarjasysteemi</h2></div>' +
    '<div class="detail-grid">' +
      renderInfoItem("Ottelut", progress.played + " / " + progress.total) +
      renderInfoItem("Kohtaamiset", league.settings.gamesAgainstEachOpponent) +
      renderInfoItem("Pistejako", formatPointSystem(league.settings.points)) +
      "</div>" +
      '<section class="history-section">' +
      '<div class="section-head"><h2>Mestarit</h2></div>' +
      renderChampionHistory(history, teamsById) +
      "</section>" +
      '<div class="actions">' +
      '<button class="button secondary" data-action="backToDashboard">Takaisin</button>' +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function formatRating(value) {
    return displayValue(value) + " / 10";
  }

  function renderPlayerSkillItems(player) {
    var attributes = player.attributes || {};

    if (isGoalie(player)) {
      return (
        renderInfoItem("Reaktiot", formatRating(attributes.reactions)) +
        renderInfoItem("Ketteryys", formatRating(attributes.agility)) +
        renderInfoItem("Torjuminen", formatRating(attributes.saving)) +
        renderInfoItem("Syöttäminen", formatRating(attributes.passing)) +
        renderInfoItem("Potentiaali", formatRating(attributes.potential))
      );
    }

    return (
      renderInfoItem("Luistelutaito", formatRating(attributes.skating)) +
      renderInfoItem("Laukaisutaito", formatRating(attributes.shooting)) +
      renderInfoItem("Syöttäminen", formatRating(attributes.passing)) +
      renderInfoItem("Mailankäsittely", formatRating(attributes.stickhandling)) +
      renderInfoItem("Taklaaminen", formatRating(attributes.checking)) +
      renderInfoItem("Pelinäkemys", formatRating(attributes.vision)) +
      renderInfoItem("Aloitukset", formatRating(attributes.faceoffs)) +
      renderInfoItem("Kunto", formatRating(attributes.stamina)) +
      renderInfoItem("Potentiaali", formatRating(attributes.potential))
    );
  }

  function renderPlayerDetail(root, game, league, teamsById, playersById, playerId, sourceTeamId, actions) {
    var player = playersById[playerId];
    var sourceTeam = player ? teamsById[player.teamId] : teamsById[sourceTeamId] || null;
    var style = sourceTeam ? teamStyle(sourceTeam) : "--team-primary: var(--accent); --team-secondary: var(--gold)";

    if (!player) {
      root.innerHTML =
        '<section class="team-detail" style="' + style + '">' +
        '<p class="empty-state">Pelaajaa ei löytynyt.</p>' +
        '<div class="actions"><button class="button secondary" data-action="backToDashboard">Takaisin</button></div>' +
        "</section>";
      bind(root, actions);
      return;
    }

    root.innerHTML =
      '<section class="team-detail player-detail" style="' + style + '">' +
      '<div class="detail-hero">' +
      '<div class="swatch"></div>' +
      '<div class="detail-title">' +
      '<span class="label">Pelaaja</span>' +
      "<h2>" + escapeHtml(player.name) + "</h2>" +
      '<p class="muted">' + escapeHtml(displayValue(sourceTeam ? sourceTeam.name : null)) + " / " + escapeHtml(league.name) + "</p>" +
      "</div>" +
      '<span class="badge">' + escapeHtml(isGoalie(player) ? "Maalivahti" : player.position) + "</span>" +
      "</div>" +
      '<div class="detail-grid">' +
    renderInfoItem("Syntymäaika", getDate(player.birthDate) + " (" + getAge(player.birthDate, game.season) + " vuotta)") +
    renderInfoItem("Kansallisuus", player.nationality) +
    renderInfoItem("Joukkue", sourceTeam ? sourceTeam.name : null) +
    "</div>" +
    '<div class="detail-grid">' +
    (isGoalie(player) ? "" : renderInfoItem("Pelipaikka", player.position)) +
    renderInfoItem("Kätisyys", player.handedness) +
    renderInfoItem("Pelinumero", player.jerseyNumber) +
    "</div>" +
    '<div class="section-head"><h2>Pelitaidot</h2></div>' +
    '<div class="detail-grid player-skills">' +
      renderPlayerSkillItems(player) +
      "</div>" +
      '<div class="actions">' +
      (sourceTeam ? '<button class="button secondary" data-action="backToTeam">Takaisin joukkueeseen</button>' : '<button class="button secondary" data-action="backToDashboard">Takaisin</button>') +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function renderCoachDetail(root, game, league, teamsById, coachesById, coachId, sourceTeamId, actions) {
    var coach = coachesById[coachId];
    var coachedTeams = game.teams.filter(function (team) {
      return team.coachId === coachId;
    });
    var sourceTeam = teamsById[sourceTeamId] || coachedTeams[0] || null;

    if (!coach) {
      root.innerHTML =
        '<section class="team-detail" style="--team-primary: var(--accent); --team-secondary: var(--gold)">' +
        '<p class="empty-state">Valmentajaa ei löytynyt.</p>' +
        '<div class="actions"><button class="button secondary" data-action="backToDashboard">Takaisin</button></div>' +
        "</section>";
      bind(root, actions);
      return;
    }

    root.innerHTML =
      '<section class="team-detail coach-detail" style="--team-primary: var(--accent); --team-secondary: var(--gold)">' +
      '<div class="detail-hero">' +
      '<div class="swatch"></div>' +
      '<div class="detail-title">' +
      '<span class="label">Valmentaja</span>' +
      "<h2>" + escapeHtml(coach.name) + "</h2>" +
      '<p class="muted">' + escapeHtml(displayValue(sourceTeam ? sourceTeam.name : null)) + " / " + escapeHtml(league.name) + "</p>" +
      "</div>" +
      '<img class="logo" src="img/coaches/' + escapeHtml(coach.id) + '.svg" alt="coach">' +
      "</div>" +
      '<div class="detail-grid">' +
      renderInfoItem("Syntymäaika", getDate(coach.birthDate) + " (" + getAge(coach.birthDate, game.season) + " vuotta)") +
      renderInfoItem("Kansallisuus", coach.nationality) +
    renderInfoItem("Joukkue", sourceTeam ? sourceTeam.name : null) +
    "</div>" +
    '<div class="section-head"><h2>Valmennustaidot</h2></div>' + 
    '<div class="detail-grid">' +
      renderInfoItem("Hyökkäys", coach.skills.offense + " / 10") +
      renderInfoItem("Puolustus", coach.skills.defense + " / 10") +
      renderInfoItem("Maalivahdit", coach.skills.goalie + " / 10") +
      renderInfoItem("Erikoistilanteet", coach.skills.specialTeams + " / 10") +
      "</div>" +
      '<div class="actions">' +
      (sourceTeam ? '<button class="button secondary" data-action="backToTeam">Takaisin joukkueeseen</button>' : '<button class="button secondary" data-action="backToDashboard">Takaisin</button>') +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function renderTeamDetail(root, game, league, teamsById, coachesById, teamId, actions) {
    var team = teamsById[teamId] || teamsById[game.managerTeamId] || teamsById[league.teamIds[0]];
    var coach = getTeamCoach(team, coachesById);
    var rows = namespace.Standings.calculate(league, teamsById);
    var row = rows.find(function (standingRow) {
      return standingRow.teamId === team.id;
    });
    var players = namespace.GameState.getPlayersByTeamId(game, team.id);

      document.body.style.backgroundColor = team.colors.primary;

    root.innerHTML =
      '<section class="team-detail" style="' + teamStyle(team) + '">' +
      '<div class="detail-hero">' +
      '<div class="swatch"></div>' +
      '<div class="detail-title">' +
      '<span class="label">Joukkue</span>' +
      "<h2>" + escapeHtml(team.name) + "</h2>" +
      '<p class="muted">' + escapeHtml(team.city) + " / " + escapeHtml(league.name) + "</p>" +
      "</div>" +
      (team.id === game.managerTeamId ? '<span class="badge">Manageroitava</span>' : "") +
      "</div>" +
      '<div class="detail-grid">' +
    renderInfoItem("Perustettu", team.foundedYear) +
      renderInfoItem("Kaupunki", team.city) +
      renderInfoItem("Halli", team.arena) +
    renderInfoItem("Lyhenne", team.shortName) +
    "</div>" +
    '<div class="detail-grid">' +
      (coach
        ? renderInfoActionItem("Päävalmentaja", coach.name, "openCoach", "data-coach-id", coach.id)
        : renderInfoItem("Päävalmentaja", team.coach)) +
    "</div>" +
    '<div class="detail-grid">' +
      renderInfoItem("Ottelut", row ? row.played : 0) +
    renderInfoItem("Maaliero", row ? namespace.Standings.goalDiff(row) : 0) +
    renderInfoItem("Pisteet", row ? row.points : 0) +
      "</div>" +
      renderRosterSection(players, team) +
      '<div class="actions">' +
      '<button class="button secondary" data-action="backToDashboard">Takaisin</button>' +
      (team.id !== game.managerTeamId ? '<button class="button" data-action="selectTeam" data-team-id="' + escapeHtml(team.id) + '">Vaihda managerijoukkueeksi</button>' : "") +
      "</div>" +
      "</section>";

    bind(root, actions);
  }

  function bind(root, actions) {
    root.querySelectorAll("[data-action]").forEach(function (button) {
      var actionName = button.getAttribute("data-action");
      button.addEventListener("click", function () {
        if (actions[actionName]) {
          actions[actionName](button);
        }
      });
    });
  }

  function getYear(season) {
      return (2026 + (season - 1)).toString() + "-" + (2026 + season).toString();
  }

    function getAge(bday, season) {
        var currentYear = (2026 + (season - 1));
        var birthYear = new Date(bday).getFullYear();
        var age = currentYear - birthYear;
        return age.toString();
    }

    function getDate(date) {
        return new Date(date).toLocaleDateString("fi-FI", { day: "numeric", month: "numeric", year: "numeric" });
    }

  function render(root, game, actions, uiState) {
    var league = namespace.GameState.getCurrentLeague(game);
    var coachesById = namespace.GameState.getCoachesById(game);
    var playersById = namespace.GameState.getPlayersById(game);
    var teamsById = namespace.GameState.getTeamsById(game);
    var progress = namespace.GameState.getProgress(league);
    var rows = namespace.Standings.calculate(league, teamsById);
    var pointLeaders = namespace.PlayerStats.calculatePointLeaders(league, game.players || [], teamsById).slice(0, 10);
    var goalieStats = namespace.PlayerStats.calculateGoalieStats(league, game.players || [], teamsById).slice(0, 10);
    var manager = namespace.GameState.getManager(game);
    var managerTeam = namespace.GameState.getManagedTeam(game);
    var simulationDisabled = progress.complete ? " disabled" : "";
    var newSeasonDisabled = progress.complete ? "" : " disabled";

    if (!game.managerTeamId) {
      renderTeamSelection(root, league, teamsById, manager, actions);
      return;
    }

    if (uiState && uiState.selectedManager) {
      renderManagerDetail(root, game, league, teamsById, actions);
      return;
    }

    if (uiState && uiState.selectedCoachId) {
      renderCoachDetail(
        root,
        game,
        league,
        teamsById,
        coachesById,
        uiState.selectedCoachId,
        uiState.selectedTeamId,
        actions
      );
      return;
    }

    if (uiState && uiState.selectedLeagueId) {
      var selectedLeague = game.leagues.find(function (leagueItem) {
        return leagueItem.id === uiState.selectedLeagueId;
      }) || league;
      renderLeagueDetail(root, game, selectedLeague, teamsById, actions);
      return;
    }

    if (uiState && uiState.selectedPlayerId) {
      renderPlayerDetail(
        root,
        game,
        league,
        teamsById,
        playersById,
        uiState.selectedPlayerId,
        uiState.selectedTeamId,
        actions
      );
      return;
    }

    if (uiState && uiState.selectedTeamId) {
      renderTeamDetail(root, game, league, teamsById, coachesById, uiState.selectedTeamId, actions);
      return;
    }

    var manager = namespace.GameState.getManager(game);

    document.getElementById("season-status").textContent = manager.name + " / Kausi " + game.season + " (" + getYear(game.season) + ")";

    document.body.style.backgroundColor = league.colors.primary;

    root.innerHTML =
      '<section class="summary">' + renderSummary(game, league, progress, manager, managerTeam) + "</section>" +
      '<section class="actions" aria-label="Toiminnot">' +
      '<div>' +
      '<button class="button" data-action="simulateNext"' + simulationDisabled + ">Simuloi seuraava peli</button>" +
      '<button class="button secondary" data-action="simulateRound"' + simulationDisabled + ">Simuloi kierros</button>" +
      '</div><div>' +
      '<button class="button secondary" data-action="startNextSeason" title="Uusi kausi avautuu, kun kaikki ottelut on pelattu."' + newSeasonDisabled + ">Seuraava kausi</button>" +
      '<button class="button danger" data-action="restartGame">Aloita ura alusta</button>' +
      '</div>' +
      "</section>" +
      '<section class="layout dashboard-layout">' +
      '<article class="panel standings-panel">' +
      '<div class="panel-head"><h2>Sarjataulukko</h2></div>' +
      '<div class="panel-body">' + renderStandings(rows, game.managerTeamId) + "</div>" +
      "</article>" +
      '<article class="panel leaderboard-panel">' +
      '<div class="panel-head"><h2>Pistepörssi</h2></div>' +
      '<div class="panel-body">' + renderPointLeaders(pointLeaders) + "</div>" +
      "</article>" +
      '<article class="panel goalie-panel">' +
      '<div class="panel-head"><h2>Maalivahtitilastot</h2></div>' +
      '<div class="panel-body">' + renderGoalieStats(goalieStats) + "</div>" +
      "</article>" +
      '<article class="panel schedule-panel">' +
      '<div class="panel-head"><h2>Otteluohjelma</h2></div>' +
      '<div class="panel-body">' + renderSchedule(league, teamsById, progress.nextGame) + "</div>" +
      "</article>" +
      "</section>";

    bind(root, actions);
  }

  namespace.Renderer = {
    render: render
  };
})(window.HockeyManager = window.HockeyManager || {});
