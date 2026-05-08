(function (namespace) {
  function isGoalie(player) {
    return player.type === "goalie" || player.position === "G";
  }

  function createSkaterRow(player, team) {
    return {
      playerId: player.id,
      playerName: player.name,
      jerseyNumber: player.jerseyNumber,
      teamId: player.teamId,
      teamName: team ? team.name : "-",
      teamShortName: team ? team.shortName : "-",
      position: player.position,
      games: 0,
      goals: 0,
      assists: 0,
      points: 0,
      penaltyMinutes: 0
    };
  }

  function createGoalieRow(player, team) {
    return {
      playerId: player.id,
      playerName: player.name,
      jerseyNumber: player.jerseyNumber,
      teamId: player.teamId,
      teamName: team ? team.name : "-",
      teamShortName: team ? team.shortName : "-",
      games: 0,
      wins: 0,
      shutouts: 0,
      shotsAgainst: 0,
      saves: 0,
      goalsAgainst: 0,
      minutes: 0,
      savePercentage: 0,
      goalsAgainstAverage: 0
    };
  }

  function groupSkatersByTeam(players) {
    return (players || []).reduce(function (map, player) {
      if (isGoalie(player)) {
        return map;
      }

      if (!map[player.teamId]) {
        map[player.teamId] = [];
      }

      map[player.teamId].push(player);
      return map;
    }, {});
  }

  function buildSkaterRows(players, teamsById) {
    return (players || []).reduce(function (map, player) {
      if (!isGoalie(player)) {
        map[player.id] = createSkaterRow(player, teamsById[player.teamId]);
      }

      return map;
    }, {});
  }

  function buildGoalieRows(players, teamsById) {
    return (players || []).reduce(function (map, player) {
      if (isGoalie(player)) {
        map[player.id] = createGoalieRow(player, teamsById[player.teamId]);
      }

      return map;
    }, {});
  }

  function addTeamGame(rowsByPlayerId, skatersByTeamId, teamId) {
    (skatersByTeamId[teamId] || []).forEach(function (player) {
      if (rowsByPlayerId[player.id]) {
        rowsByPlayerId[player.id].games += 1;
      }
    });
  }

  function applyScoringEvent(rowsByPlayerId, event) {
    var scorer = rowsByPlayerId[event.scorerId];

    if (scorer) {
      scorer.goals += 1;
      scorer.points += 1;
    }

    (event.assistIds || []).forEach(function (playerId) {
      var assister = rowsByPlayerId[playerId];

      if (assister) {
        assister.assists += 1;
        assister.points += 1;
      }
    });
  }

  function applyPenaltyEvent(rowsByPlayerId, event) {
    var player = rowsByPlayerId[event.playerId];

    if (player) {
      player.penaltyMinutes += event.minutes || 0;
    }
  }

  function applyGoalieResult(row, stats, teamId, winnerTeamId, minutes) {
    if (!row) {
      return;
    }

    row.games += 1;
    row.wins += teamId === winnerTeamId ? 1 : 0;
    row.shutouts += stats.goalsAgainst === 0 ? 1 : 0;
    row.shotsAgainst += stats.shotsAgainst || 0;
    row.saves += stats.saves || 0;
    row.goalsAgainst += stats.goalsAgainst || 0;
    row.minutes += stats.minutes || minutes;
  }

  function applyGoalieGame(rowsByPlayerId, game) {
    var goalieStats = game.goalieStats || {};
    var winnerTeamId = game.homeGoals > game.awayGoals ? game.homeId : game.awayId;
    var minutes = game.overtime ? 65 : 60;

    if (goalieStats.home && goalieStats.home.playerId) {
      applyGoalieResult(
        rowsByPlayerId[goalieStats.home.playerId],
        goalieStats.home,
        game.homeId,
        winnerTeamId,
        minutes
      );
    }

    if (goalieStats.away && goalieStats.away.playerId) {
      applyGoalieResult(
        rowsByPlayerId[goalieStats.away.playerId],
        goalieStats.away,
        game.awayId,
        winnerTeamId,
        minutes
      );
    }
  }

  function finalizeGoalieRow(row) {
    row.savePercentage = row.shotsAgainst > 0
      ? Math.round((row.saves / row.shotsAgainst) * 1000) / 10
      : 0;
    row.goalsAgainstAverage = row.minutes > 0
      ? Math.round((row.goalsAgainst * 60 / row.minutes) * 100) / 100
      : 0;

    return row;
  }

  function calculatePointLeaders(league, players, teamsById) {
    var rowsByPlayerId = buildSkaterRows(players, teamsById);
    var skatersByTeamId = groupSkatersByTeam(players);

    namespace.Schedule.flatten(league.rounds).forEach(function (game) {
      if (!game.played) {
        return;
      }

      addTeamGame(rowsByPlayerId, skatersByTeamId, game.homeId);
      addTeamGame(rowsByPlayerId, skatersByTeamId, game.awayId);
      (game.scoringEvents || []).forEach(function (event) {
        applyScoringEvent(rowsByPlayerId, event);
      });
      (game.penaltyEvents || []).forEach(function (event) {
        applyPenaltyEvent(rowsByPlayerId, event);
      });
    });

    return Object.keys(rowsByPlayerId).map(function (playerId) {
      return rowsByPlayerId[playerId];
    }).filter(function (row) {
      return row.points > 0 || row.penaltyMinutes > 0;
    }).sort(function (a, b) {
      return (
        b.points - a.points ||
        b.goals - a.goals ||
        b.assists - a.assists ||
        b.penaltyMinutes - a.penaltyMinutes ||
        a.playerName.localeCompare(b.playerName)
      );
    });
  }

  function calculateGoalieStats(league, players, teamsById) {
    var rowsByPlayerId = buildGoalieRows(players, teamsById);

    namespace.Schedule.flatten(league.rounds).forEach(function (game) {
      if (!game.played || !game.goalieStats) {
        return;
      }

      applyGoalieGame(rowsByPlayerId, game);
    });

    return Object.keys(rowsByPlayerId).map(function (playerId) {
      return finalizeGoalieRow(rowsByPlayerId[playerId]);
    }).filter(function (row) {
      return row.games > 0;
    }).sort(function (a, b) {
      return (
        b.savePercentage - a.savePercentage ||
        a.goalsAgainstAverage - b.goalsAgainstAverage ||
        b.wins - a.wins ||
        b.shutouts - a.shutouts ||
        a.playerName.localeCompare(b.playerName)
      );
    });
  }

  namespace.PlayerStats = {
    calculatePointLeaders: calculatePointLeaders,
    calculateGoalieStats: calculateGoalieStats
  };
})(window.HockeyManager = window.HockeyManager || {});
