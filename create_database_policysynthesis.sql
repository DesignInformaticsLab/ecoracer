DROP TABLE ecoracer_learning_ps_table;
CREATE TABLE ecoracer_learning_ps_table(
  id SERIAL,
  speed_ini REAL,
  time_ini REAL,
  slope_ini REAL,
  distance_ini REAL,
  act INTEGER,
  reward REAL,
  speed_end REAL,
  time_end REAL,
  slope_end REAL,
  distance_end REAL,
  winning boolean,
  used boolean,
  PRIMARY KEY(id)
);