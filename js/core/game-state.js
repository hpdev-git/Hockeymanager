(function (namespace) {
  function clone(value) {
    return JSON.parse(JSON.stringify(value));
  }

  function createLeague(seedLeague) {
    var league = clone(seedLeague);
    league.rounds = namespace.Schedule.generateRoundRobin(
      league.teamIds,
      league.settings.gamesAgainstEachOpponent
    );
    return league;
  }

  function createDefaultManager() {
    return {
      id: "manager-1",
      name: "Pelaaja Manageri",
      nationality: "Suomi",
      startedSeason: 1,
      style: "Tasapainoinen",
      reputation: "Tulokas"
    };
  }

  function createNewGame(seedData) {
    return {
      version: 1,
      season: 1,
      createdAt: new Date().toISOString(),
      currentLeagueId: seedData.leagues[0].id,
      manager: createDefaultManager(),
      managerTeamId: null,
      seasonHistory: [],
      coaches: clone(seedData.coaches || []),
      players: clone(seedData.players || []),
      teams: clone(seedData.teams),
      leagues: seedData.leagues.map(createLeague)
    };
  }

  function isTeamInCurrentLeague(game, teamId) {
    var league = getCurrentLeague(game);
    return Boolean(league && league.teamIds.indexOf(teamId) !== -1);
  }

  function hasChampionRecord(history, leagueId, season) {
    return history.some(function (record) {
      return record.leagueId === leagueId && record.season === season;
    });
  }

  function createChampionRecord(game, league) {
    var progress = getProgress(league);

    if (!progress.complete) {
      return null;
    }

    var teamsById = getTeamsById(game);
    var champion = namespace.Standings.calculate(league, teamsById)[0];
    var managedTeam = getManagedTeam(game);

    if (!champion) {
      return null;
    }

    return {
      season: game.season,
      leagueId: league.id,
      leagueName: league.name,
      championTeamId: champion.teamId,
      championTeamName: champion.teamName,
      championShortName: champion.shortName,
      managerTeamId: game.managerTeamId,
      managerTeamName: managedTeam ? managedTeam.name : null,
      managerChampion: champion.teamId === game.managerTeamId,
      points: champion.points,
      wins: champion.wins + champion.overtimeWins,
      goalDiff: namespace.Standings.goalDiff(champion)
    };
  }

  function createNextSeason(game, seedData) {
    var normalizedGame = normalizeGame(game, seedData);
    var completedLeague = getCurrentLeague(normalizedGame);

    if (!completedLeague || !getProgress(completedLeague).complete) {
      return normalizedGame;
    }

    var nextGameState = createNewGame(seedData);
    var leagueExists = nextGameState.leagues.some(function (league) {
      return league.id === normalizedGame.currentLeagueId;
    });
    var seasonHistory = clone(normalizedGame.seasonHistory || []);
    var championRecord = completedLeague ? createChampionRecord(normalizedGame, completedLeague) : null;

    if (
      championRecord &&
      !hasChampionRecord(seasonHistory, championRecord.leagueId, championRecord.season)
    ) {
      seasonHistory.push(championRecord);
    }

    nextGameState.season = (normalizedGame.season || 1) + 1;
    nextGameState.currentLeagueId = leagueExists ? normalizedGame.currentLeagueId : nextGameState.currentLeagueId;
    nextGameState.manager = clone(normalizedGame.manager);
    nextGameState.seasonHistory = seasonHistory;
    nextGameState.coaches = clone(normalizedGame.coaches);
    nextGameState.players = clone(normalizedGame.players || []);
    nextGameState.teams = clone(normalizedGame.teams);
    nextGameState.managerTeamId = isTeamInCurrentLeague(nextGameState, normalizedGame.managerTeamId)
      ? normalizedGame.managerTeamId
      : null;

    return nextGameState;
  }

  function mergeTeam(seedTeam, savedTeam) {
    if (!savedTeam) {
      return clone(seedTeam);
    }

    return Object.assign({}, seedTeam, savedTeam, {
      colors: Object.assign({}, seedTeam.colors, savedTeam.colors || {}),
      ratings: Object.assign({}, seedTeam.ratings, savedTeam.ratings || {})
    });
  }

  function mergeManager(savedManager) {
    return Object.assign({}, createDefaultManager(), savedManager || {});
  }

  function mergeCoach(seedCoach, savedCoach) {
    if (!savedCoach) {
      return clone(seedCoach);
    }

    return Object.assign({}, seedCoach, savedCoach, {
      skills: Object.assign({}, seedCoach.skills, savedCoach.skills || {})
    });
  }

  function mergePlayer(seedPlayer, savedPlayer) {
    if (!savedPlayer) {
      return clone(seedPlayer);
    }

    return Object.assign({}, seedPlayer, savedPlayer, {
      attributes: Object.assign({}, seedPlayer.attributes, savedPlayer.attributes || {})
    });
  }

  function mergeLeague(seedLeague, savedLeague) {
    if (!savedLeague) {
      return createLeague(seedLeague);
    }

    var nextLeague = Object.assign({}, seedLeague, savedLeague);
    nextLeague.teamIds = (savedLeague.teamIds || seedLeague.teamIds).slice();
    nextLeague.settings = Object.assign({}, seedLeague.settings, savedLeague.settings || {});
    nextLeague.settings.points = Object.assign(
      {},
      seedLeague.settings.points,
      (savedLeague.settings && savedLeague.settings.points) || {}
    );
    nextLeague.rounds = savedLeague.rounds || namespace.Schedule.generateRoundRobin(
      nextLeague.teamIds,
      nextLeague.settings.gamesAgainstEachOpponent
    );

    return nextLeague;
  }

  function normalizeGame(savedGame, seedData) {
    if (!savedGame || !savedGame.teams || !savedGame.leagues) {
      return createNewGame(seedData);
    }

    var nextGameState = clone(savedGame);
    var seedTeamIds = seedData.teams.map(function (team) {
      return team.id;
    });
    var seedCoaches = seedData.coaches || [];
    var seedCoachIds = seedCoaches.map(function (coach) {
      return coach.id;
    });
    var seedPlayers = seedData.players || [];
    var seedPlayerIds = seedPlayers.map(function (player) {
      return player.id;
    });

    if (!Array.isArray(nextGameState.coaches)) {
      nextGameState.coaches = [];
    }

    if (!Array.isArray(nextGameState.players)) {
      nextGameState.players = [];
    }

    var savedTeamsById = nextGameState.teams.reduce(function (map, team) {
      map[team.id] = team;
      return map;
    }, {});
    var savedCoachesById = nextGameState.coaches.reduce(function (map, coach) {
      map[coach.id] = coach;
      return map;
    }, {});
    var savedPlayersById = nextGameState.players.reduce(function (map, player) {
      map[player.id] = player;
      return map;
    }, {});
    var seedLeagueIds = seedData.leagues.map(function (league) {
      return league.id;
    });
    var savedLeaguesById = nextGameState.leagues.reduce(function (map, league) {
      map[league.id] = league;
      return map;
    }, {});
    var customSavedTeams = nextGameState.teams.filter(function (team) {
      return seedTeamIds.indexOf(team.id) === -1;
    });
    var customSavedCoaches = nextGameState.coaches.filter(function (coach) {
      return seedCoachIds.indexOf(coach.id) === -1;
    });
    var customSavedPlayers = nextGameState.players.filter(function (player) {
      return seedPlayerIds.indexOf(player.id) === -1;
    });
    var customSavedLeagues = nextGameState.leagues.filter(function (league) {
      return seedLeagueIds.indexOf(league.id) === -1;
    });

    if (typeof nextGameState.managerTeamId === "undefined") {
      nextGameState.managerTeamId = null;
    }

    nextGameState.manager = mergeManager(nextGameState.manager);

    if (!Array.isArray(nextGameState.seasonHistory)) {
      nextGameState.seasonHistory = [];
    }

    nextGameState.teams = seedData.teams.map(function (seedTeam) {
      return mergeTeam(seedTeam, savedTeamsById[seedTeam.id]);
    }).concat(customSavedTeams);
    nextGameState.coaches = seedCoaches.map(function (seedCoach) {
      return mergeCoach(seedCoach, savedCoachesById[seedCoach.id]);
    }).concat(customSavedCoaches);
    nextGameState.players = seedPlayers.map(function (seedPlayer) {
      return mergePlayer(seedPlayer, savedPlayersById[seedPlayer.id]);
    }).concat(customSavedPlayers);
    nextGameState.leagues = seedData.leagues.map(function (seedLeague) {
      return mergeLeague(seedLeague, savedLeaguesById[seedLeague.id]);
    }).concat(customSavedLeagues);

    if (!nextGameState.currentLeagueId || !getCurrentLeague(nextGameState)) {
      nextGameState.currentLeagueId = seedData.leagues[0].id;
    }

    return nextGameState;
  }

  function getTeamsById(game) {
    return game.teams.reduce(function (map, team) {
      map[team.id] = team;
      return map;
    }, {});
  }

  function getCoachesById(game) {
    return (game.coaches || []).reduce(function (map, coach) {
      map[coach.id] = coach;
      return map;
    }, {});
  }

  function getPlayersByTeamId(game, teamId) {
    return (game.players || []).filter(function (player) {
      return player.teamId === teamId;
    });
  }

  function getPlayersByTeamIdMap(game) {
    return (game.players || []).reduce(function (map, player) {
      if (!map[player.teamId]) {
        map[player.teamId] = [];
      }

      map[player.teamId].push(player);
      return map;
    }, {});
  }

  function getPlayersById(game) {
    return (game.players || []).reduce(function (map, player) {
      map[player.id] = player;
      return map;
    }, {});
  }

  function getCurrentLeague(game) {
    return game.leagues.find(function (league) {
      return league.id === game.currentLeagueId;
    });
  }

  function getManagedTeam(game) {
    return getTeamsById(game)[game.managerTeamId] || null;
  }

  function getManager(game) {
    return mergeManager(game.manager);
  }

  function getLeagueHistory(game, leagueId) {
    var history = clone(game.seasonHistory || []);
    var currentLeague = getCurrentLeague(game);
    var currentChampion = currentLeague && currentLeague.id === leagueId
      ? createChampionRecord(game, currentLeague)
      : null;

    if (
      currentChampion &&
      !hasChampionRecord(history, currentChampion.leagueId, currentChampion.season)
    ) {
      history.push(currentChampion);
    }

    return history.filter(function (record) {
      return record.leagueId === leagueId;
    }).sort(function (a, b) {
      return b.season - a.season;
    });
  }

  function getManagerChampionships(game) {
    var history = clone(game.seasonHistory || []);
    var currentLeague = getCurrentLeague(game);
    var currentChampion = currentLeague ? createChampionRecord(game, currentLeague) : null;

    if (
      currentChampion &&
      !hasChampionRecord(history, currentChampion.leagueId, currentChampion.season)
    ) {
      history.push(currentChampion);
    }

    return history.filter(function (record) {
      if (typeof record.managerChampion === "boolean") {
        return record.managerChampion;
      }

      return record.championTeamId === game.managerTeamId;
    }).sort(function (a, b) {
      return b.season - a.season;
    });
  }

  function setManagerTeam(game, teamId) {
    var nextGameState = clone(game);
    var league = getCurrentLeague(nextGameState);

    if (league.teamIds.indexOf(teamId) === -1) {
      return nextGameState;
    }

    nextGameState.managerTeamId = teamId;
    return nextGameState;
  }

  function setManagerName(game, name) {
    var nextGameState = clone(game);
    var cleanName = String(name || "").replace(/\s+/g, " ").trim().slice(0, 40);

    nextGameState.manager = mergeManager(nextGameState.manager);

    if (cleanName) {
      nextGameState.manager.name = cleanName;
    }

    return nextGameState;
  }

  function getProgress(league) {
    var games = namespace.Schedule.flatten(league.rounds);
    var played = games.filter(function (game) {
      return game.played;
    }).length;
    var nextGame = games.find(function (game) {
      return !game.played;
    });

    return {
      played: played,
      total: games.length,
      nextGame: nextGame || null,
      complete: played >= games.length
    };
  }

  function replaceGame(league, gameId, replacement) {
    league.rounds.forEach(function (round) {
      round.games = round.games.map(function (game) {
        return game.id === gameId ? replacement : game;
      });
    });
  }

  function simulateNextGame(game) {
    var nextGameState = clone(game);
    var league = getCurrentLeague(nextGameState);
    var teamsById = getTeamsById(nextGameState);
    var playersByTeamId = getPlayersByTeamIdMap(nextGameState);
    var progress = getProgress(league);

    if (!progress.nextGame) {
      return nextGameState;
    }

    replaceGame(
      league,
      progress.nextGame.id,
      namespace.Simulator.simulateGame(progress.nextGame, teamsById, playersByTeamId)
    );

    return nextGameState;
  }

  function simulateRound(game) {
    var nextGameState = clone(game);
    var league = getCurrentLeague(nextGameState);
    var teamsById = getTeamsById(nextGameState);
    var playersByTeamId = getPlayersByTeamIdMap(nextGameState);
    var targetRound = league.rounds.find(function (round) {
      return round.games.some(function (gameInRound) {
        return !gameInRound.played;
      });
    });

    if (!targetRound) {
      return nextGameState;
    }

    targetRound.games = targetRound.games.map(function (gameInRound) {
      if (gameInRound.played) {
        return gameInRound;
      }

      return namespace.Simulator.simulateGame(gameInRound, teamsById, playersByTeamId);
    });

    return nextGameState;
  }

  namespace.GameState = {
    createNewGame: createNewGame,
    createNextSeason: createNextSeason,
    normalizeGame: normalizeGame,
    getCoachesById: getCoachesById,
    getPlayersByTeamId: getPlayersByTeamId,
    getPlayersById: getPlayersById,
    getTeamsById: getTeamsById,
    getCurrentLeague: getCurrentLeague,
    getManager: getManager,
    getManagedTeam: getManagedTeam,
    getLeagueHistory: getLeagueHistory,
    getManagerChampionships: getManagerChampionships,
    setManagerTeam: setManagerTeam,
    setManagerName: setManagerName,
    getProgress: getProgress,
    simulateNextGame: simulateNextGame,
    simulateRound: simulateRound
  };
})(window.HockeyManager = window.HockeyManager || {});
