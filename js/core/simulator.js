(function (namespace) {
  function clamp(value, min, max) {
    return Math.max(min, Math.min(max, value));
  }

  function poisson(lambda) {
    var limit = Math.exp(-lambda);
    var product = 1;
    var count = 0;

    do {
      count += 1;
      product *= Math.random();
    } while (product > limit);

    return Math.max(0, count - 1);
  }

  function expectedGoals(team, opponent, homeBonus) {
    var attackEdge = (team.ratings.attack - opponent.ratings.defense) / 42;
    var goalieEdge = (team.ratings.attack - opponent.ratings.goalie) / 58;
    return clamp(2.55 + attackEdge + goalieEdge + homeBonus, 1.35, 4.8);
  }

  function winChance(homeTeam, awayTeam) {
    var homeTotal = homeTeam.ratings.attack + homeTeam.ratings.defense + homeTeam.ratings.goalie + 5;
    var awayTotal = awayTeam.ratings.attack + awayTeam.ratings.defense + awayTeam.ratings.goalie;
    return clamp(homeTotal / (homeTotal + awayTotal), 0.38, 0.62);
  }

  function expectedShots(team, opponent, homeBonus) {
    var attackEdge = (team.ratings.attack - opponent.ratings.defense) / 4.8;
    return clamp(30 + attackEdge + homeBonus, 20, 44);
  }

  function simulateShots(team, opponent, goals, homeBonus) {
    var shots = poisson(expectedShots(team, opponent, homeBonus));
    return Math.round(clamp(shots, Math.max(goals, 12), 58));
  }

  function padTimePart(value) {
    return value < 10 ? "0" + value : String(value);
  }

  function randomEventTime() {
    var totalSeconds = Math.floor(Math.random() * 3600);
    var minutes = Math.floor(totalSeconds / 60);
    var seconds = totalSeconds % 60;

    return padTimePart(minutes) + ":" + padTimePart(seconds);
  }

  function sortByEventTime(a, b) {
    return a.time.localeCompare(b.time);
  }

  function eventTimeToSeconds(time) {
    var parts = String(time || "00:00").split(":");
    var minutes = parseInt(parts[0], 10) || 0;
    var seconds = parseInt(parts[1], 10) || 0;

    return minutes * 60 + seconds;
  }

  function isPenaltyActiveAt(penalty, time) {
    var penaltyStart = eventTimeToSeconds(penalty.time);
    var penaltyEnd = penaltyStart + (penalty.minutes || 0) * 60;

    return time >= penaltyStart && time < penaltyEnd;
  }

  function countActivePenalties(teamId, time, penaltyEvents) {
    return penaltyEvents.filter(function (penalty) {
      return penalty.teamId === teamId && isPenaltyActiveAt(penalty, time);
    }).length;
  }

  function annotateGoalStrength(scoringEvents, penaltyEvents, homeTeamId, awayTeamId) {
    return scoringEvents.map(function (event) {
      var time = eventTimeToSeconds(event.time);
      var opponentTeamId = event.teamId === homeTeamId ? awayTeamId : homeTeamId;
      var ownPenalties = countActivePenalties(event.teamId, time, penaltyEvents);
      var opponentPenalties = countActivePenalties(opponentTeamId, time, penaltyEvents);
      var strength = "even";

      if (opponentPenalties > ownPenalties) {
        strength = "powerPlay";
      } else if (ownPenalties > opponentPenalties) {
        strength = "shortHanded";
      }

      return Object.assign({}, event, {
        strength: strength,
        isPowerPlayGoal: strength === "powerPlay",
        isShortHandedGoal: strength === "shortHanded"
      });
    });
  }

  function isGoalie(player) {
    return player.type === "goalie" || player.position === "G";
  }

  function attribute(player, key) {
    return (player.attributes && player.attributes[key]) || 0;
  }

  function weightedRandom(items, weightFn) {
    var total = items.reduce(function (sum, item) {
      return sum + Math.max(0.1, weightFn(item));
    }, 0);
    var target = Math.random() * total;

    for (var i = 0; i < items.length; i += 1) {
      target -= Math.max(0.1, weightFn(items[i]));

      if (target <= 0) {
        return items[i];
      }
    }

    return items[items.length - 1] || null;
  }

  function chooseGoalie(players) {
    var goalies = (players || []).filter(isGoalie);

    if (!goalies.length) {
      return null;
    }

    return weightedRandom(goalies, function (goalie) {
      return 2 +
        attribute(goalie, "saving") * 1.4 +
        attribute(goalie, "reactions") +
        attribute(goalie, "agility") * 0.8;
    });
  }

  function getSkaters(players) {
    return (players || []).filter(function (player) {
      return !isGoalie(player);
    });
  }

  function scorerWeight(player) {
    var forwardBonus = player.position === "D" ? 0.7 : 1.1;

    return forwardBonus * (
      1 +
      attribute(player, "shooting") * 1.5 +
      attribute(player, "skating") * 0.5 +
      attribute(player, "stickhandling") * 0.7 +
      attribute(player, "vision") * 0.4
    );
  }

  function assistWeight(player) {
    return 1 +
      attribute(player, "passing") * 1.4 +
      attribute(player, "vision") * 1.2 +
      attribute(player, "stickhandling") * 0.5;
  }

  function pickAssists(skaters, scorer) {
    var candidates = skaters.filter(function (player) {
      return player.id !== scorer.id;
    });
    var assists = [];
    var firstAssist = null;
    var secondAssist = null;

    if (candidates.length && Math.random() < 0.82) {
      firstAssist = weightedRandom(candidates, assistWeight);
      assists.push(firstAssist);
      candidates = candidates.filter(function (player) {
        return player.id !== firstAssist.id;
      });
    }

    if (candidates.length && Math.random() < 0.55) {
      secondAssist = weightedRandom(candidates, assistWeight);
      assists.push(secondAssist);
    }

    return assists;
  }

  function createScoringEvents(teamId, goals, players) {
    var skaters = getSkaters(players);
    var events = [];

    for (var i = 0; i < goals; i += 1) {
      var scorer = weightedRandom(skaters, scorerWeight);
      var assists = scorer ? pickAssists(skaters, scorer) : [];

      events.push({
        type: "goal",
        time: randomEventTime(),
        teamId: teamId,
        scorerId: scorer ? scorer.id : null,
        scorerName: scorer ? scorer.name : "Tuntematon",
        assistIds: assists.map(function (player) {
          return player.id;
        }),
        assistNames: assists.map(function (player) {
          return player.name;
        })
      });
    }

    return events;
  }

  function penaltyWeight(player) {
    return 1 +
      attribute(player, "checking") * 1.2 +
      (10 - attribute(player, "stamina")) * 0.4 +
      (player.position === "D" ? 1.5 : 0);
  }

  function penaltyMinutes() {
    var roll = Math.random();

    if (roll < 0.88) {
      return 2;
    }

    if (roll < 0.98) {
      return 4;
    }

    return 5;
  }

  function penaltyReason() {
    var reasons = [
      "Koukkaaminen",
      "Kampitus",
      "Kiinnipitäminen",
      "Poikittainen maila",
      "Estäminen",
      "Korkea maila",
      "Väkivaltaisuus"
    ];

    return reasons[Math.floor(Math.random() * reasons.length)];
  }

  function createPenaltyEvents(teamId, players) {
    var skaters = getSkaters(players);
    var penaltyCount = Math.round(clamp(poisson(2.7), 0, 8));
    var events = [];

    for (var i = 0; i < penaltyCount; i += 1) {
      var player = weightedRandom(skaters, penaltyWeight);

      if (player) {
        events.push({
          type: "penalty",
          time: randomEventTime(),
          teamId: teamId,
          playerId: player.id,
          playerName: player.name,
          minutes: penaltyMinutes(),
          reason: penaltyReason()
        });
      }
    }

    return events;
  }

  function createGoalieStats(goalie, shotsAgainst, goalsAgainst, minutes) {
    var saves = Math.max(0, shotsAgainst - goalsAgainst);
    var savePercentage = shotsAgainst > 0 ? Math.round((saves / shotsAgainst) * 1000) / 10 : 0;
    var goalsAgainstAverage = minutes > 0 ? Math.round((goalsAgainst * 60 / minutes) * 100) / 100 : goalsAgainst;

    return {
      playerId: goalie ? goalie.id : null,
      goalieName: goalie ? goalie.name : "Tuntematon",
      shotsAgainst: shotsAgainst,
      saves: saves,
      goalsAgainst: goalsAgainst,
      minutes: minutes,
      savePercentage: savePercentage,
      goalsAgainstAverage: goalsAgainstAverage
    };
  }

  function simulateGame(game, teamsById, playersByTeamId) {
    var homeTeam = teamsById[game.homeId];
    var awayTeam = teamsById[game.awayId];
    var homePlayers = (playersByTeamId && playersByTeamId[game.homeId]) || [];
    var awayPlayers = (playersByTeamId && playersByTeamId[game.awayId]) || [];
    var homeGoals = poisson(expectedGoals(homeTeam, awayTeam, 0.25));
    var awayGoals = poisson(expectedGoals(awayTeam, homeTeam, 0));
    var overtime = false;

    if (homeGoals === awayGoals) {
      overtime = true;
      if (Math.random() <= winChance(homeTeam, awayTeam)) {
        homeGoals += 1;
      } else {
        awayGoals += 1;
      }
    }

    var homeShots = simulateShots(homeTeam, awayTeam, homeGoals, 1.8);
    var awayShots = simulateShots(awayTeam, homeTeam, awayGoals, 0);
    var minutes = overtime ? 65 : 60;
    var penaltyEvents = createPenaltyEvents(game.homeId, homePlayers).concat(
      createPenaltyEvents(game.awayId, awayPlayers)
    ).sort(sortByEventTime);
    var scoringEvents = annotateGoalStrength(
      createScoringEvents(game.homeId, homeGoals, homePlayers).concat(
        createScoringEvents(game.awayId, awayGoals, awayPlayers)
      ).sort(sortByEventTime),
      penaltyEvents,
      game.homeId,
      game.awayId
    );

    return Object.assign({}, game, {
      played: true,
      homeGoals: homeGoals,
      awayGoals: awayGoals,
      overtime: overtime,
      shots: {
        home: homeShots,
        away: awayShots
      },
      scoringEvents: scoringEvents,
      penaltyEvents: penaltyEvents,
      goalieStats: {
        home: createGoalieStats(chooseGoalie(homePlayers), awayShots, awayGoals, minutes),
        away: createGoalieStats(chooseGoalie(awayPlayers), homeShots, homeGoals, minutes)
      }
    });
  }

  namespace.Simulator = {
    simulateGame: simulateGame
  };
})(window.HockeyManager = window.HockeyManager || {});
