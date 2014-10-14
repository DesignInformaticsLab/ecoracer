CREATE TABLE ecoracer_users_me250_table(
   id SERIAL,
   name VARCHAR(50) UNIQUE NOT NULL,
   pass CHAR(60),
   PRIMARY KEY(id)
);
CREATE TABLE ecoracer_games_me250_table(
  id SERIAL,
  userid INTEGER,
  score INTEGER,
  keys TEXT,
  time TIMESTAMP WITH TIME ZONE,
  finaldrive INTEGER,
  ranking_percentage INTEGER,
  ranking_scoreboard INTEGER,
  PRIMARY KEY(id)
);	