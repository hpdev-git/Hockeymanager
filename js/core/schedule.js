(function (namespace) {
  function generateRoundRobin(teamIds, gamesAgainstEachOpponent) {
    var ids = teamIds.slice();
    var cycles = Math.max(1, gamesAgainstEachOpponent || 1);
    var rounds = [];
    var nextGameNumber = 1;

    if (ids.length < 2) {
      return rounds;
    }

    if (ids.length % 2 !== 0) {
      ids.push(null);
    }

    for (var cycle = 0; cycle < cycles; cycle += 1) {
      var rotation = ids.slice();
      var roundsInCycle = rotation.length - 1;

      for (var roundIndex = 0; roundIndex < roundsInCycle; roundIndex += 1) {
        var games = [];
        var roundNumber = rounds.length + 1;

        for (var pairIndex = 0; pairIndex < rotation.length / 2; pairIndex += 1) {
          var first = rotation[pairIndex];
          var second = rotation[rotation.length - 1 - pairIndex];

          if (!first || !second) {
            continue;
          }

          var flipHome = (roundIndex + cycle) % 2 === 1;
          var homeId = flipHome ? second : first;
          var awayId = flipHome ? first : second;

          games.push({
            id: "game-" + nextGameNumber,
            round: roundNumber,
            homeId: homeId,
            awayId: awayId,
            played: false,
            homeGoals: null,
            awayGoals: null,
            overtime: false
          });
          nextGameNumber += 1;
        }

        rounds.push({
          number: roundNumber,
          games: games
        });

        rotation = [rotation[0], rotation[rotation.length - 1]].concat(
          rotation.slice(1, rotation.length - 1)
        );
      }
    }

    return rounds;
  }

  function flatten(rounds) {
    return rounds.reduce(function (games, round) {
      return games.concat(round.games);
    }, []);
  }

  namespace.Schedule = {
    generateRoundRobin: generateRoundRobin,
    flatten: flatten
  };
})(window.HockeyManager = window.HockeyManager || {});
