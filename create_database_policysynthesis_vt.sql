-- psql -U postgres -d postgres -a -f create_database_policysynthesis_vt.sql
DROP TABLE ecoracer_learning_ps_value_table;
CREATE TABLE ecoracer_learning_ps_value_table(
  id SERIAL,
  speed REAL,
  ctime REAL,
  slope REAL,
  distance REAL,
  v REAL,
  p boolean,
  PRIMARY KEY(id)
);

