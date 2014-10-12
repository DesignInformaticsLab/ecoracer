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
	    client.query('SELECT score FROM ecoracer_me250_table ORDER BY score ASC', function(err, result) {
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
    client.query('SELECT * FROM ecoracer_me250_table', function(err, result) {
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
        
        client.query('INSERT INTO ecoracer_me250_table (id, score, keys, date, finaldrive) VALUES ($1, $2, $3, $4, $5)',
            [
             req.headers['x-forwarded-for'] || 
             req.connection.remoteAddress || 
             req.socket.remoteAddress ||
             req.connection.socket.remoteAddress, 
//			'',
             req.body.score, req.body.keys, req.body.date, req.body.finaldrive], 
            function(err, result) {
                if(err) { 
                	console.error(err); res.send("Error " + err);
                }
                done();
        });
    });
});

/* GET user ranking. */
router.post('/getscore', function(req, res) {
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        var current_score = req.body.score;
        var worse = 0;
    	var queryText = 'SELECT * FROM ecoracer_me250_table WHERE score > ' + current_score;
        client.query(queryText, function(err, result) {
    		if(err) {
    			console.error(err); res.send("Error " + err);
    		}
    		else{
    			res.send( result.rows );
    		}
    		done();
        });
    });
});

/* GET all user data. */
router.get('/results', function(req, res) {
	res.render('results');
});
router.post('/getresults', function(req, res) {
  pg.connect(connection, function(err, client, done) {
	    client.query('SELECT * FROM ecoracer_me250_table', function(err, result) {
	      done();
	      if (err)
	       { console.error(err); res.send("Error " + err); }
	      else
	       { res.send( result.rows ); }
	    });
	  });
});

module.exports = router;
