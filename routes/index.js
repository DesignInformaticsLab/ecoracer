var express = require('express');
var bcrypt = require('bcrypt-nodejs');
var router = express.Router();
var pg = require('pg');

var connection = "postgres://postgres:GWC464doi@localhost:5432/postgres"; //postgres is the local server
var connection_online = process.env.DATABASE_URL || "postgres://postgres:GWC464doi@localhost:5432/idetc2014"; //idetc2014 is a backup from the online game before 11.27.2014
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
router.post('/getallresults', function(req, res) {
	  pg.connect(connection_online, function(err, client, done) {
		    client.query('SELECT * FROM ecoracer_games_me250_table ORDER BY id ASC', function(err, result) {
		      done();
		      if (err)
		       { console.error(err); res.send("Error " + err); }
		      else
		       { res.send( result.rows ); }
		    });
		  });
	});

router.post('/getperformance', function(req, res) {
	  pg.connect(connection_online, function(err, client, done) {
		    client.query('SELECT userid, score FROM ecoracer_games_me250_table ORDER BY id ASC', function(err, result) {
		      done();
		      if (err)
		       { console.error(err); res.send("Error " + err); }
		      else
		       { res.send( result.rows ); }
		    });
		  });
	});




/****************************************** Analysis Part LOCAL ONLY **********************************************************/
/* convert and store player data. */
router.post('/store_analysis_data', function(req, res) {
	var table = req.body.database;
	
    pg.connect(connection_online, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var insert_query = client.query('INSERT INTO '+table+' (score, consumption, control_data) VALUES ($1, $2, $3)',
            [req.body.score, req.body.consumption, req.body.control_data]);
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});
/* read converted player data. */
router.post('/read_analysis_data', function(req, res) {
	var table = req.body.database;
	var rv = {};
    pg.connect(connection_online, function(err, client, done) {
    	if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
        rv.data = [];
        var query = client.query('SELECT * FROM '+table+' ORDER BY id ASC');
        query.on('err', handle_error.bind(this, err));
		query.on('row', function(row, res) { 
			rv.data.push(row);
		});
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
    });
});


/* store player score after parameterization of control. */
router.post('/adddata_rerunplayer_parameters', function(req, res) {
	var database = req.body.database;
	
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var insert_query = client.query('INSERT INTO '+database+' (game_id, score, replay_score, keys, finaldrive) VALUES ($1, $2, $3, $4, $5)',
            [req.body.game_id, req.body.score, req.body.replay_score, req.body.keys, req.body.finaldrive]);
       
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});
/* read player score after parameterization of control. */
router.post('/read_rerunplayer_parameters', function(req, res) {
	var table = req.body.database;
	var rv = {};
	
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var query = client.query('SELECT * FROM '+table+' ORDER BY id ASC');
        rv.data = [];
        query.on('err', handle_error.bind(this, err));
        query.on('row', function(row, res) { 
			rv.data.push(row);
		});
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
    });
});





/****************************************** Learning Part LOCAL ONLY**********************************************************/
/******************** FOR GA/EGO *******************/
/* POST machine data. */
router.post('/adddata_learning', function(req, res) {
//	var database = "ecoracer_learning_ga_table";
//	var database = "ecoracer_learning_sqp_table";
//	var database = "ecoracer_learning_ego_table";
	var database = req.body.database;
	
	if (database==='ecoracer_analysis'){ // this is when simulation is related to real player data
		var c = connection_online;
	}
	else{
		var c = connection;
	}
	
    pg.connect(c, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var insert_query = client.query('INSERT INTO '+database+' (score, keys, finaldrive, iteration, method) VALUES ($1, $2, $3, $4, $5)',
            [req.body.score, req.body.keys, req.body.finaldrive, req.body.iteration, req.body.method]);
       
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});
/* READ machine data. */
router.post('/readdata_learning', function(req, res) {
	var table = req.body.database;
	var method = req.body.method;
	var rv = {};
    pg.connect(connection, function(err, client, done) {
    	if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
        rv.data = [];
        var query = client.query("SELECT * FROM "+table+" WHERE method='"+method+"'");
        query.on('err', handle_error.bind(this, err));
		query.on('row', function(row, res) { 
			rv.data.push(row);
		});
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
    });
});




/******************** FOR Q-Learning *******************/
/* POST Q data. */
router.post('/saveQ', function(req, res) {
	var database = "ecoracer_learning_q_table";
    pg.connect(connection, function(err, client, done) {
    	if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
        var update_query = client.query('UPDATE '+database+' SET q=$1, e=$2 WHERE distance=$3 AND speed=$4 AND action=$5',
        		[req.body.Q, req.body.e, req.body.distance, req.body.speed, req.body.action]);
        
        var insert_query = client.query('INSERT INTO '+database+' (distance, speed, action, q, e) SELECT $3, $4, $5, $1, $2 '+
        		'WHERE NOT EXISTS (SELECT * FROM '+database+' WHERE distance=$3 AND speed=$4 AND action=$5)',
            [req.body.Q, req.body.e, req.body.distance, req.body.speed, req.body.action]);
        
        update_query.on('err', handle_error.bind(this, err));
        insert_query.on('err', handle_error.bind(this, err));
        update_query.on('end', function(result){console.log('Data updated');res.status(202).send("Data updated");});
        insert_query.on('end', function(result){console.log('Data inserted');res.status(202).send("Data inserted");});
        done();
    });
});

/* UPDATE Q data. */
router.post('/updateQ', function(req, res) {
	var database = "ecoracer_learning_q_table";
    pg.connect(connection, function(err, client, done) {
    	if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
		var update_query = client.query('UPDATE '+database+' SET q=q+$1*e, e=$2*e WHERE e>0.001',
        		[req.body.Q, req.body.e_coef]);
       
        update_query.on('err', handle_error.bind(this, err));
        update_query.on('end', function(result){console.log('Data updated');res.status(202).send("Data updated");});
        done();
    });
});



/* GET Q. */
router.post('/getQ', function(req, res) {
	var database = "ecoracer_learning_q_table";
	var rv = {};
	pg.connect(connection, function(err, client, done) {
		if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
		rv.Q = [];
		rv.A = [];
		rv.E = [];
		var query = client.query("SELECT q, e, action FROM "+database+" WHERE distance=$1 AND speed=$2", 
				[req.body.distance, req.body.speed]);
		query.on('err', handle_error.bind(this, err));
		query.on('row', function(row, res) { 
			rv.Q.push(row.q);
			rv.A.push(row.action);
			rv.E.push(row.e);
		});
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
	});
});

/* GET best Q. */
router.post('/getBestQ', function(req, res) {
	var database = "ecoracer_learning_q_table";
	var rv = {};
	pg.connect(connection, function(err, client, done) {
		if(err) {
		      handle_error(res, err);
		      done();
		      return;
	    }
		rv.Q = [];
		var query = client.query("SELECT q FROM "+database+" WHERE distance=$1 AND speed=$2 ORDER BY q DESC LIMIT 1", 
				[req.body.distance, req.body.speed]);
		query.on('err', handle_error.bind(this, err));
		query.on('row', function(row, res) {rv.Q.push(row.q);} );
        client.once('drain', function() {
          done();
          res.status(202).send(rv);
        });
	});
});

/* POST episode data. */
router.post('/saveepisode', function(req, res) {
	var database = "ecoracer_learning_q_episode_table";
    pg.connect(connection, function(err, client, done) {
        if(err) res.send("Could not connect to DB: " + err);
        
        var insert_query = client.query('INSERT INTO '+database+' (episode, score) VALUES ($1, $2)',
            [req.body.episode, req.body.score]);
        insert_query.on('err', handle_error.bind(this, err));
        insert_query.on('end', function(result){res.status(202).send("Accepted data");});
        done();
    });
});
module.exports = router;
