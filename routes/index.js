var express = require('express');
var router = express.Router();
var pg = require('pg');
var connection = process.env.DATABASE_URL || "postgres://postgres:KVTWN78mpostgres@localhost:5432/postgres";

/* GET home page. */
router.get('/', function(req, res) {
	res.render('index');
});

/* GET best score. */
router.get('/bestscore', function(req, res) {
	pg.connect(connection, function(err, client, done) {
	    client.query('SELECT score FROM ecoracer_table ORDER BY score ASC', function(err, result) {
	      done();
	      if (err)
	       { console.error(err); res.send("Error " + err); }
	      else
	       { res.send( result.rows ); }
	    });
	  });	
  
});

/* GET all data. */
router.get('/db', function (req, res) {
  pg.connect(connection, function(err, client, done) {
    client.query('SELECT * FROM ecoracer_table', function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       { res.send( result.rows ); }
    });
  });
})

/* POST user data. */
router.post('/adddata', function(req, res) {
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        client.query('INSERT INTO ecoracer_table (name, score, info) VALUES ($1, $2, $3)',
            [req.body.name, req.body.score, req.body.info], 
            function(err, result) {
                done();
                if(err) { 
                	console.error(err); res.send("Error " + err); }
                else { 
                	client.query('SELECT * FROM ecoracer_table ORDER BY score ASC'),function(err, result) {
                		res.send( result.rows ); 
                	}
                }
        	});
    });
});

module.exports = router;
