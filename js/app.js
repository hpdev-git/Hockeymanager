(function (namespace, seeds) {
  var root = document.getElementById("app");
  var savedGame = namespace.Storage.load();
  var game = namespace.GameState.normalizeGame(savedGame, seeds);
  var uiState = {
    selectedManager: false,
    selectedCoachId: null,
    selectedPlayerId: null,
    selectedTeamId: null,
    selectedLeagueId: null
  };

  function commit(nextGame) {
    game = nextGame;
    namespace.Storage.save(game);
    draw();
  }

  function startNextSeason() {
    uiState.selectedManager = false;
    uiState.selectedCoachId = null;
    uiState.selectedPlayerId = null;
    uiState.selectedTeamId = null;
    uiState.selectedLeagueId = null;
    commit(namespace.GameState.createNextSeason(game, seeds));
  }

  function restartGame() {
    var confirmed = window.confirm(
      "Aloitetaanko koko peli alusta? Tämä nollaa kaudet, mestarit ja joukkuevalinnan."
    );

    if (!confirmed) {
      return;
    }

    uiState.selectedTeamId = null;
    uiState.selectedLeagueId = null;
    uiState.selectedManager = false;
    uiState.selectedCoachId = null;
    uiState.selectedPlayerId = null;
    namespace.Storage.clear();
    commit(namespace.GameState.createNewGame(seeds));
  }

  function draw() {
    namespace.Renderer.render(root, game, {
      selectTeam: function (button) {
        var managerNameInput = root.querySelector("#manager-name");
        var nextGame = namespace.GameState.setManagerName(
          game,
          managerNameInput ? managerNameInput.value : ""
        );

        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedTeamId = null;
        uiState.selectedLeagueId = null;
        commit(namespace.GameState.setManagerTeam(nextGame, button.getAttribute("data-team-id")));
      },
      openTeam: function (button) {
        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedLeagueId = null;
        uiState.selectedTeamId = button.getAttribute("data-team-id");
        draw();
      },
      openCoach: function (button) {
        uiState.selectedManager = false;
        uiState.selectedCoachId = button.getAttribute("data-coach-id");
        uiState.selectedPlayerId = null;
        uiState.selectedLeagueId = null;
        draw();
      },
      openPlayer: function (button) {
        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = button.getAttribute("data-player-id");
        uiState.selectedTeamId = button.getAttribute("data-team-id");
        uiState.selectedLeagueId = null;
        draw();
      },
      openLeague: function (button) {
        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedTeamId = null;
        uiState.selectedLeagueId = button.getAttribute("data-league-id");
        draw();
      },
      openManager: function () {
        uiState.selectedManager = true;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedTeamId = null;
        uiState.selectedLeagueId = null;
        draw();
      },
      backToTeam: function () {
        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedLeagueId = null;
        draw();
      },
      backToDashboard: function () {
        uiState.selectedManager = false;
        uiState.selectedCoachId = null;
        uiState.selectedPlayerId = null;
        uiState.selectedTeamId = null;
        uiState.selectedLeagueId = null;
        draw();
      },
      simulateNext: function () {
        commit(namespace.GameState.simulateNextGame(game));
      },
      simulateRound: function () {
        commit(namespace.GameState.simulateRound(game));
      },
      startNextSeason: startNextSeason,
      restartGame: restartGame
    }, uiState);
  }

  namespace.Storage.save(game);
  draw();
})(window.HockeyManager = window.HockeyManager || {}, window.HockeyManagerSeeds);
