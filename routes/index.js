var express = require('express');
var router = express.Router();

/* GET home page. */
router.get('/', function(req, res) {
  res.render('index', { title: 'Express' });
});

/* GET Hello World page. */
router.get('/ecoracer', function(req, res) {
    res.render('ecoracer', { title: 'Hello, World!' })
});


var pg = require('pg');
var connection = process.env.DATABASE_URL;
//var connection = "postgres://postgres:KVTWN78mpostgres@localhost:5432/YourDatabase";

router.get('/db', function (req, res) {
  pg.connect(connection, function(err, client, done) {
    client.query('SELECT * FROM test_table', function(err, result) {
      done();
      if (err)
       { console.error(err); res.send("Error " + err); }
      else
       { res.render('db',{ data: JSON.stringify(result) }); }
    });
  });
})

//router.post('/newdata', function(request, response) {
//    pg.connect(process.env.DATABASE_URL, function(err, client, done) {
//        if(err) response.send("Could not connect to DB: " + err);
//        client.query('INSERT INTO test_table (id, name) VALUES ($1, $2)',
//            [request.query.id, request.query.name], 
//            function(err, result) {
//                done();
//                if(err) return response.send(err);
//                response.send('OK');
//        });
//    });
//});

///* GET Userlist page. */
//router.get('/userlist', function(req, res) {
//    var db = req.db;
//    var collection = db.get('usercollection');
//    collection.find({},{},function(e,docs){
//        res.render('userlist', {
//            "userlist" : docs
//        });
//    });
//});
//
///* GET New User page. */
//router.get('/newuser', function(req, res) {
//    res.render('newuser', { title: 'Add New User' });
//});
//
///* POST to Add User Service */
//router.post('/adduser', function(req, res) {
//
//    // Set our internal DB variable
//    var db = req.db;
//
//    // Get our form values. These rely on the "name" attributes
//    var userName = req.body.username;
//    var userEmail = req.body.useremail;
//
//    // Set our collection
//    var collection = db.get('usercollection');
//
//    // Submit to the DB
//    collection.insert({
//        "username" : userName,
//        "email" : userEmail
//    }, function (err, doc) {
//        if (err) {
//            // If it failed, return error
//            res.send("There was a problem adding the information to the database.");
//        }
//        else {
//            // If it worked, set the header so the address bar doesn't still say /adduser
//            res.location("userlist");
//            // And forward to success page
//            res.redirect("userlist");
//        }
//    });
//});

module.exports = router;
