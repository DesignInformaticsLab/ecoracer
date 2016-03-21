DROP TABLE ecoracer_learning_ga_table;
CREATE TABLE ecoracer_learning_ga_table(
  id SERIAL,
  score REAL,
  keys TEXT,
  finaldrive INTEGER,
  iteration INTEGER,
  PRIMARY KEY(id)
);

DROP TABLE ecoracer_learning_ego_table;
CREATE TABLE ecoracer_learning_ego_table(
  id SERIAL,
  score REAL,
  keys TEXT,
  finaldrive INTEGER,
  iteration INTEGER,
  method TEXT,
  PRIMARY KEY(id)
);