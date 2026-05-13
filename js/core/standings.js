(function (namespace) {
  function createRow(team) {
    return {
        teamId: team.id,
        logo: team.logo,
      teamName: team.name,
      shortName: team.shortName,
      played: 0,
      wins: 0,
      overtimeWins: 0,
      overtimeLosses: 0,
      losses: 0,
      goalsFor: 0,
      goalsAgainst: 0,
      points: 0
    };
  }

  function addResult(row, goalsFor, goalsAgainst) {
    row.played += 1;
    row.goalsFor += goalsFor;
    row.goalsAgainst += goalsAgainst;
  }

  function applyGame(rowsByTeamId, game, points) {
    if (!game.played) {
      return;
    }

    var home = rowsByTeamId[game.homeId];
    var away = rowsByTeamId[game.awayId];
    var homeWon = game.homeGoals > game.awayGoals;
    var winner = homeWon ? home : away;
    var loser = homeWon ? away : home;

    addResult(home, game.homeGoals, game.awayGoals);
    addResult(away, game.awayGoals, game.homeGoals);

    if (game.overtime) {
      winner.overtimeWins += 1;
      winner.points += points.overtimeWin;
      loser.overtimeLosses += 1;
      loser.points += points.overtimeLoss;
      return;
    }

    winner.wins += 1;
    winner.points += points.win;
    loser.losses += 1;
    loser.points += points.loss;
  }

  function goalDiff(row) {
    return row.goalsFor - row.goalsAgainst;
  }

  function totalWins(row) {
    return row.wins + row.overtimeWins;
  }

  function calculate(league, teamsById) {
    var points = league.settings.points;
    var rowsByTeamId = {};
    var rows = league.teamIds.map(function (teamId) {
      var row = createRow(teamsById[teamId]);
      rowsByTeamId[teamId] = row;
      return row;
    });

    namespace.Schedule.flatten(league.rounds).forEach(function (game) {
      applyGame(rowsByTeamId, game, points);
    });

    return rows.sort(function (a, b) {
      return (
        b.points - a.points ||
        totalWins(b) - totalWins(a) ||
        goalDiff(b) - goalDiff(a) ||
        b.goalsFor - a.goalsFor ||
        a.teamName.localeCompare(b.teamName)
      );
    });
  }

  namespace.Standings = {
    calculate: calculate,
    goalDiff: goalDiff
  };
})(window.HockeyManager = window.HockeyManager || {});
