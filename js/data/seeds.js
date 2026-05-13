(function () {
  window.HockeyManagerSeeds = {
    coaches: window.HockeyManagerCoaches || [],
    players: window.HockeyManagerPlayers || [],
    leagues: [
      {
            id: "liiga-1",
            logo: "logo_missing.svg",
        name: "Mestaruusliiga",
        country: "Suomi",
        level: "Päätaso",
        foundedYear: 1975,
        format: "Kaksinkertainen runkosarja",
        trophyName: "Kanada-malja",
        teamIds: ["karhut", "haukat", "salamat", "raudat"],
        settings: {
          gamesAgainstEachOpponent: 2,
          points: {
            win: 3,
            overtimeWin: 2,
            overtimeLoss: 1,
            loss: 0
          }
        },
        colors: {
            primary: "#000000",
            secondary: "#ffffff"
        }
      }
    ],
    teams: [
      {
        id: "karhut",
            name: "Pohjolan Karhut",
        logo: "logo_missing.svg",
        shortName: "KAR",
        city: "Oulu",
        foundedYear: 1988,
        arena: "Pohjola Areena",
        coachId: 1,
        colors: {
          primary: "#0d6b5f",
          secondary: "#f2c14e"
        },
        ratings: {
          attack: 76,
          defense: 71,
          goalie: 73
        }
      },
      {
        id: "haukat",
          name: "Rannan Haukat",
          logo: "logo_missing.svg",
        shortName: "HAU",
        city: "Turku",
        foundedYear: 1976,
        arena: "Sataman Jäähalli",
        coachId: 2,
        colors: {
          primary: "#1f5aa6",
          secondary: "#e7eef8"
        },
        ratings: {
          attack: 72,
          defense: 75,
          goalie: 70
        }
      },
      {
        id: "salamat",
          name: "Keskustan Salamat",
          logo: "logo_missing.svg",
        shortName: "SAL",
        city: "Tampere",
        foundedYear: 1995,
        arena: "Keskusareena",
        coachId: 3,
        colors: {
          primary: "#b5452f",
          secondary: "#f4dfcf"
        },
        ratings: {
          attack: 79,
          defense: 68,
          goalie: 69
        }
      },
      {
        id: "raudat",
          name: "Idän Raudat",
          logo: "logo_missing.svg",
        shortName: "RAU",
        city: "Kuopio",
        foundedYear: 1982,
        arena: "Rauta Areena",
        coachId: 4,
        colors: {
          primary: "#343a40",
          secondary: "#b7c5cf"
        },
        ratings: {
          attack: 69,
          defense: 78,
          goalie: 76
        }
      }
    ]
  };
})();
