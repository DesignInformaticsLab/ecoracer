var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var pg = require('pg');

var connection = process.env.DATABASE_URL || "postgres://postgres:54093960@localhost:5432/postgres";
function handle_error(res, err) {
	  console.error(err);
	  res.status(500).send("Error " + err);
	}

/* default GET register. */
router.get('/', function(req, res) {
	res.render('index');
});

/* GET register. */
router.get('/register', function(req, res) {
	res.render('index');
});

/* GET analysis. */
router.get('/analysis', function(req, res) {
	res.render('analysis');
});

/* GET learning. */
router.get('/learning', function(req, res) {
	res.render('learning');
});

/* GET learning. */
router.get('/policysynthesis', function(req, res) {
    res.render('policysynthesis');
});


/* GET best user. */
router.post('/getBestUser', function(req, res) {
	var rv = [];
	pg.connect(connection, function(err, client, done) {
	    if(err) {
	      handle_error(res, err);
	      done();
	      return;
	    }
	    var name_query = client.query("SELECT ecoracer_users_me250_table.name FROM ecoracer_games_me250_table " +
	    "LEFT JOIN ecoracer_users_me250_table ON ecoracer_games_me250_table.userid = ecoracer_users_me250_table.id " +
	    "WHERE ecoracer_games_me250_table.score > 0 ORDER BY ecoracer_games_me250_table.score ASC LIMIT 1 ");
	    name_query.on('err', handle_error.bind(this, res));
		name_query.on('row', function(row, res) {rv.push(row.name);});
		client.once('drain', function() {
	          done();
	          res.status(202).send(rv);
	    });
	});	
});

/* GET user. */
router.post('/getUser', function(req, res) {
  var rv = {};
  pg.connect(connection, function(err, client, done) {
    if(err) {
      handle_error(res, err);
      done();
      return;
    }
    var query = client.query("SELECT * FROM ecoracer_users_me250_table WHERE name = $1", [req.body.username]);
    query.on('error', handle_error.bind(this, res));
    query.on('row', function(row, result) {
      result.addRow(row);
    });
    query.on('end', function(result) {
      if(result.rows.length === 0) {
    	done();
	    console.log("Error: User does not exist");
        res.send("");
      } else if(!bcrypt.compareSync(req.body.password, result.rows[0].pass)) {
    	done();
    	console.log("Error: Incorrect password");
        res.send("");
      } else if(result.rowCount > 1) {
        //this should really never happen, login code
        //should take care of it and we should be getting
        //a unique user ID here
    	done();
    	console.log("Error: duplicate users"); 
        res.status(403).send("Error: duplicate users");
      } else {
        rv.id = result.rows[0].id;
        rv.name = result.rows[0].name;
        rv.bestscore = 0;
        
        var best_score = client.query("SELECT score FROM ecoracer_games_me250_table WHERE userid = $1 AND score > 0 ORDER BY score ASC LIMIT 1",
                [result.rows[0].id]);
        best_score.on('err', handle_error.bind(this, err));
        best_score.on('row', function(res) { rv.bestscore = res.score; });
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
      }
    });
  });
});

/* POST user signup */
router.post('/signup', function(req, res) {
  /* this handler adds a user to the database
     we need not check if the user is already
     in the database since there is a unique
     constraint on the username */
  pg.connect(connection, function(err, client, done) {
    //using the sync versions because
    //bcrypt is not a IO operation and I can not deal
    //with any more callbacks
    var salt = bcrypt.genSaltSync(10);
    //console.log(req.body);
    var hash = bcrypt.hashSync(req.body.password, salt);
    var query = client.query("INSERT INTO ecoracer_users_me250_table (name, pass) VALUES ($1,$2)", [req.body.username, hash]);
    query.on('error', handle_error.bind(this, res));
    query.on('end', function(result){res.status(202).send("User Created");});
    done();
  });
});

/* GET top 5 scores from the population and count the number of plays. */
router.get('/bestscore', function(req, res) {
	var rv = {};
	pg.connect(connection, function(err, client, done) {
		if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
		rv.bestscore = [];
		rv.finaldrive = [];
		rv.total_num_user = 0;
		var best_score_all = client.query("SELECT score, finaldrive FROM ecoracer_games_me250_table WHERE score>0 ORDER BY score ASC LIMIT 5");
		best_score_all.on('err', handle_error.bind(this, err));
		best_score_all.on('row', function(row, res) { rv.bestscore.push(row.score); rv.finaldrive.push(row.finaldrive); });
		var total_num_user = client.query("SELECT COUNT(*) AS total_num_user FROM ecoracer_games_me250_table WHERE score>0");
		total_num_user.on('err', handle_error.bind(this, err));
		total_num_user.on('row', function(res) { rv.total_num_user = res.total_num_user; });		
		
        client.once('drain', function() {
          done();
//          console.log('drained...');
          res.status(202).send(rv);
        });
	});
	
});

/* GET all game data. for debug only */
router.get('/db', function (req, res) {
  pg.connect(connection, function(err, client, done) {
    client.query('SELECT * FROM ecoracer_games_me250_table', function(err, result) {
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
        
        var insert_query = client.query('INSERT INTO ecoracer_games_me250_table (userid, score, keys, time, finaldrive, ranking_percentage, ranking_scoreboard) VALUES ($1, $2, $3, now(), $4, $5, $6)',
            [
//             req.headers['x-forwarded-for'] || 
//             req.connection.remoteAddress || 
//             req.socket.remoteAddress ||
//             req.connection.socket.remoteAddress, 
////			'',
             req.body.userid, req.body.score, req.body.keys, req.body.finaldrive, req.body.ranking_percentage, req.body.ranking_scoreboard]);
       
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});

/* GET user ranking. */
router.post('/getscore', function(req, res) {
    pg.connect(connection, function(err, client, done) {
        if(err) res.status(500).send("Could not connect to DB: " + err);
        var current_score = req.body.score;
        var worse = 0;
    	var queryText = 'SELECT COUNT(*) FROM ecoracer_games_me250_table WHERE score > ' + current_score;
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
	    client.query('SELECT * FROM ecoracer_games_me250_table WHERE score > 0 ORDER BY score ASC LIMIT $1', [req.body.n], function(err, result) {
	      done();
	      if (err)
	       { console.error(err); res.send("Error " + err); }
	      else
	       { res.send( result.rows ); }
	    });
	  });
});

router.post('/getperformance', function(req, res) {
	  pg.connect(connection, function(err, client, done) {
		    client.query('SELECT userid, score FROM ecoracer_games_me250_table ORDER BY id ASC', function(err, result) {
		      done();
		      if (err)
		       { console.error(err); res.send("Error " + err); }
		      else
		       { res.send( result.rows ); }
		    });
		  });
	});











/****************************************** Machine Part LOCAL ONLY**********************************************************/

/* POST machine data. */
router.post('/adddata_learning', function(req, res) {
	var database = "ecoracer_learning_ga_table";
	
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var insert_query = client.query('INSERT INTO '+database+' (score, keys, finaldrive, iteration) VALUES ($1, $2, $3, $4)',
            [req.body.score, req.body.keys, req.body.finaldrive, req.body.iteration]);
       
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});

module.exports = router;


/* POST sars data. */
router.post('/adddata_sars', function(req, res) {
    var database = "ecoracer_learning_ps_table";

    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        var insert_query = client.query('INSERT INTO '+database+' (speed_ini, time_ini, slope_ini, distance_ini,' +
            'act, reward, speed_end, time_end, slope_end, distance_end, winning, used, initial, playID) VALUES ($1, $2, $3, $4,' +
            '$5, $6, $7, $8, $9, $10, $11, $12, $13, $14)',
            [req.body.speed_ini, req.body.time_ini, req.body.slope_ini, req.body.distance_ini,
             req.body.act, req.body.reward, req.body.speed_end, req.body.time_end,
             req.body.slope_end, req.body.distance_end, req.body.winning, req.body.used, req.body.initial, req.body.playID]);

        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});

/* READ sars data close to the query state. */
router.post('/get_action', function(req, res) {
    var database = "ecoracer_learning_ps_table";
    pg.connect(connection, function(err, client, done) {
        var distance = req.body.distance;
        var time = req.body.time;
        client.query('SELECT * FROM '+database+' WHERE @(distance_ini - $1)<5 AND @(time_ini -$2)<1 AND winning=true AND used=true',
            [distance, time], function(err, result) {
            done();
            if (err)
            { console.error(err); res.send("Error " + err); }
            else
            { res.send( result.rows ); }
        });
    });
});