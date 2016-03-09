/**
 * Created by p2admin on 3/7/2016.
 */
    // This code runs the policy synthesis algorithm modified from the paper:
    // Dyanmics Terrain Traversal Skills Using Reinforcement Learning
var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
// Game related
var fr = 18;
var cTime;
var vehSpeed;
var multitrack = 1;

// Reinforcement learning related
var epsilon = 0.1;
var alpha = 0.5;
var iter = 0;
var max_iter = 10; // number of exploration
var act = 0;

function start_exploration(){
    // initialize the game
    initialize();

    var explore = function(epsilon){
        // get current state
        var s = get_current_state();
        // get action
        $.post('get_action', {
            'speed':s[0],
            'distance':s[1],
            'time':s[2],
            'slope':s[3]
            }, function(res){
                approximate_policy(res);
                // do epsilon-greedy
                var u = Math.random();
                if (u<(1-epsilon)){
                    // use a
                }
                else{
                    // do exploration, i.e., randomly pick the other two
                    if (act==-1){
                        act = Math.random()>0.5? 0:1;
                    }
                    else if(act==0){
                        act = Math.random()>0.5? -1:1;
                    }
                    else{
                        act = Math.random()>0.5? -1:0;
                    }
                }
                // step game with action
                step(function(){
                    if (start_race==false){
                        if (iter<max_iter) {
                            iter += 1;
                            start_exploration();
                        }
                    }
                    else{
                        explore(epsilon);
                    }
                });
        });
    };
    explore(epsilon);
}

function approximate_policy(res){
    // do majority vote
    var vote = [0,0,0]; // count the votes for the three actions -1, 0, 1
    $.each(res, function(i,r){
        if (r.act==-1){
            vote[0] += 1;
        }
        else if(r.act==0){
            vote[1] += 1;
        }
        else if(r.act==1){
            vote[2] += 1;
        }
    });
    var a_set = [-1,0,1];
    var vote_sorted = sortWithIndeces(vote,'dsc');
    act =  a_set[vote_sorted.sortIndices[0]];
}

function get_current_state(){
    var speed = vehSpeed;
    var distance = 900*multitrack-car_pos9;
    var time = timeout-cTime;
    var ind = Math.floor(car_pos9/10)+1;
    var slope = data[ind+1]>data[ind]? 1:-1;
    if(data[ind+1] == data[ind]){slope_ini=0;}
    return [speed, distance, time, slope];
}

function initialize() {
    consumption = 0;
    battstatus = 100;
    if (typeof demo != 'undefined') {
        demo.stop();
    }
    demo = new scene();
    demo.canvas.style.position = "absolute";
    demo.canvas.style.left = "0px";

    wheel1moment = Jw1;
    wheel2moment = Jw2;
    wheel1.setMoment(wheel1moment);
    wheel2.setMoment(wheel2moment);
    $("#timer").show();

    // initial states
    cTime = 0;
    con1 = 0; con2 = 0;
    car_pos = Math.round(chassis.p.x * px2m); //-9.03
    car_pos9 = car_pos - 9;
    counter = 0;
    vehSpeed = 0;
    motor2eff = 0;
    car_posOld = 0;
    var pBar = document.getElementById("pbar");
    pBar.value = 0;
    drawLandscape();
    start_race = true;
    demo.running = true;
}

function step(callback){
    //Run
    var speed_ini = vehSpeed;
    var distance_ini = 900*multitrack-car_pos9;
    var time_ini = timeout-cTime;
    var ind = Math.floor(car_pos9/10)+1;
    var slope_ini = data[ind+1]>data[ind]? 1:-1;
    if(data[ind+1] == data[ind]){slope_ini=0;}
    demo.step();

    if (start_race) {
        var speed_end = vehSpeed;
        var distance_end = 900*multitrack-car_pos9;
        var time_end = timeout-cTime;
        var ind = Math.floor(car_pos9/10)+1;
        var slope_end = data[ind+1]>data[ind]? 1:-1;
        if(data[ind+1] == data[ind]){slope_end=0;}
        var reward = -((con1 + con2)/3600./1000./max_batt) + ((car_pos9-900*multitrack)/900>=0); //lower is better

        $.post('/adddata_sars',{
                'speed_ini':speed_ini,
                'time_ini':time_ini,
                'slope_ini':slope_ini,
                'distance_ini':distance_ini,
                'act':act,
                'reward':reward,
                'speed_end':speed_end,
                'time_end':time_end,
                'slope_end':slope_end,
                'distance_end':distance_end,
                'winning':false, // will be modified by value iteration
                'used':true, // in case there are too many data entries and things get slow
                'initial': true, // if this data entry belongs to the initial set
                'playID': iter // ID for tracking with play this data comes from
            },
            function(){
                callback();
            });
    }
    else{
        var speed_end = vehSpeed;
        var distance_end = 900*multitrack-car_pos9;
        var time_end = timeout-cTime;
        var ind = Math.floor(car_pos9/10)+1;
        var slope_end = data[ind+1]>data[ind]? 1:-1;
        if(data[ind+1] == data[ind]){slope_end=0;}
        var reward = -((con1 + con2)/3600./1000./max_batt) + ((car_pos9-900*multitrack)/900>=0); //lower is better

        $.post('/adddata_sars',{
                'speed_ini':speed_ini,
                'time_ini':time_ini,
                'slope_ini':slope_ini,
                'distance_ini':distance_ini,
                'act':act,
                'reward':reward,
                'speed_end':speed_end,
                'time_end':time_end,
                'slope_end':slope_end,
                'distance_end':distance_end,
                'winning':false, // will be modified by value iteration
                'used':true, // in case there are too many data entries and things get slow
                'initial': true, // if this data entry belongs to the initial set
                'playID': iter // ID for tracking with play this data comes from
            },
            function(){
                callback();
            });
    }
}

/****************************************** GAME **********************************************************/
var scene = function(){
    __ENVIRONMENT__.call(this);

    var space = this.space;
    var boxOffset;
    space.iterations = 10;
    space.gravity = v(0, -400);
    space.sleepTimeThreshold = 100;


    this.addFloor(data, scene_widthx, xstep);
    this.addTerminal(scene_widthx-3*xstep);
    //for (var i=0; i<stationPosX.length; i++){this.addStation(stationPosX[i],0);}


    $('#canvasbg')[0].width = scene_width;
    $('#canvasbg')[0].height = 40;

    var addBar = function(pos)
    {
        var mass = 1/m2m; // 1kg
        var a = v(0,  10);
        var b = v(0, -10);

        var body = space.addBody(new cp.Body(mass, cp.momentForSegment(mass, a, b)));
        body.setPos(v.add(pos, boxOffset));

        var shape = space.addShape(new cp.SegmentShape(body, a, b, 1));
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding
        return body;
    };

    var addWheel = function(pos)
    {
        var radius = 12;
        var mass = 20/m2m; // 20kg
        var body = space.addBody(new cp.Body(mass, cp.momentForCircle(mass, 0, radius, v(0,0))));
        body.setPos(v.add(pos, boxOffset));

        var shape = space.addShape(new cp.CircleShape(body, radius, v(0,0)));
        shape.setElasticity(0);
        shape.setFriction(1e1);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    var addChassis = function(pos)
    {
        var mass = 1500/m2m; // 1500 kg
        var width = 4/px2m; // --> 3.5m length
        var height = 1.8/px2m; // --> 1.0m height

        var body = space.addBody(new cp.Body(mass, cp.momentForBox(mass, width, height)));
        body.setPos(v.add(pos, boxOffset));

        var shape = space.addShape(new cp.BoxShape(body, width, height, v(0,0)));
        shape.setElasticity(0);
        shape.setFriction(0.7);
        shape.group = 1; // use a group to keep the car parts from colliding

        return body;
    };

    var posA = v( 50, 0);
    var posB = v(110, 0);
    boxOffset = v(100, 10);
    var POS_A = function() { return v.add(boxOffset, posA); };
    var POS_B = function() { return v.add(boxOffset, posB); };

    chassis = addChassis(v(80, 10));
    motorbar1 = addBar(posA);
    motorbar2 = addBar(posB);
    motorbar3 = addBar(posA);
    motorbar4 = addBar(posB);
    wheel1 = addWheel(posA);
    wheel2 = addWheel(posB);

    joint1 = new cp.GrooveJoint(chassis, wheel1, v(-30, -10), v(-30, -20), v(0,0));
    joint2 = new cp.GrooveJoint(chassis, wheel2, v( 30, -10), v( 30, -20), v(0,0));
    space.addConstraint(joint1);
    space.addConstraint(joint2);
    space.addConstraint(new cp.DampedSpring(chassis, wheel1, v(-30, 0), v(0,0), 20, 10, 5)); // stiffness f/dx, damping f/v
    space.addConstraint(new cp.DampedSpring(chassis, wheel2, v( 30, 0), v(0,0), 20, 10, 5));
    space.addConstraint(new cp.PivotJoint(motorbar1, wheel1, POS_A()));
    space.addConstraint(new cp.PivotJoint(motorbar2, wheel2, POS_B()));
    space.addConstraint(new cp.PivotJoint(motorbar3, wheel1, POS_A()));
    space.addConstraint(new cp.PivotJoint(motorbar4, wheel2, POS_B()));
    motor1 = new cp.SimpleMotor(motorbar1, wheel1, 0);
    motor2 = new cp.SimpleMotor(motorbar2, wheel2, 0);
    space.addConstraint(motor1);
    space.addConstraint(motor2);

    // parameters
    max_rate1 = 1e7; // motor 1 rate
    max_rate2 = 1e7; // motor 2 rate
    acc_rate = 1e7; // instant rate increment
    w_limit_rate = 1;

    Jw1 = wheel1.i;
    Jw2 = wheel2.i;

    wheel1moment = 1e10;
    wheel2moment = 1e10;

    wheel1.setMoment(wheel1moment);
    wheel2.setMoment(wheel2moment);

    // limits
    speed_limit = 9200*pi/30/fr*(wheel1.shapeList[0].r)*t2t; // Max motor speed is 9000 but 9200 gives better results.
    wheel1.v_limit = speed_limit;
    wheel1.v_limit = speed_limit;
    wheel1.w_limit = speed_limit/wheel1.shapeList[0].r*1.5; // This 1.5 has to be here! (experimental)
    wheel2.w_limit = speed_limit/wheel1.shapeList[0].r*1.5; // (experimental)
    motorbar1.w_limit = wheel1.w_limit;
    motorbar2.w_limit = wheel2.w_limit;
};

scene.prototype = Object.create(__ENVIRONMENT__.prototype);

scene.prototype.update = function (dt) {
    var steps = 1;
    dt = dt / steps;
    for (var i = 0; i < steps; i++) {
        this.space.step(dt);
    }

    cTime = (counter/tstep);
    car_pos = (chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    vehSpeed = (Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694);
    $("#timer").html(timeout-cTime);

    if(chassis.p.y<0){
        demo.stop();
        start_race = false;
    }
    if(start_race){
        $("#speedval").html("Speed: "+vehSpeed + 'mph');

        counter+=1;
        ////// Save Results /////////////
        if (car_pos >= car_posOld+10){
            car_posOld = car_pos;
        }
        //////////// Success ////////////

        if (car_pos>=maxdist){
            motor1.rate = 0;
            motor2.rate = 0;
            wheel1.setAngVel(0);
            wheel2.setAngVel(0);
            //wheel1.v_limit = Infinity;
            //wheel2.v_limit = Infinity;
            wheel1.setMoment(1e10);
            wheel2.setMoment(1e10);
            brake_sig = false;
            acc_sig = false;
            start_race = false;
        }
        /////////////////////////////////

        ///// Fail Check ////////////////
        if ((chassis.p.x<10)){
            demo.stop();
            start_race = false;
        }
        if (cTime>timeout){
            motor1.rate = 0;
            motor2.rate = 0;
            wheel1.setAngVel(0);
            wheel2.setAngVel(0);
            //wheel1.v_limit = Infinity;
            //wheel2.v_limit = Infinity;
            wheel1.setMoment(1e10);
            wheel2.setMoment(1e10);
            brake_sig = false;
            acc_sig = false;
            start_race = false;
        }
        if (chassis.rot.x < 0){
            start_race = false;
        }
        if (battstatus < 0.12){
            battempty = true;
            if ((Math.abs(chassis.vx)<=2) && (car_pos<maxdist)){
                start_race = false;
            }
        }
        else {
            battempty = false;
        }


///////////////////////////// use control //////////////////////////////////////////
        if (car_pos <= maxdist){

            c = act;

            if (c>0){
                acc_sig = true;
                brake_sig = false;
            }
            else if(c==0){
                acc_sig = false;
                brake_sig = false;
                motor1.rate = 0;
                motor2.rate = 0;
                //wheel1.v_limit = Infinity;
                //wheel2.v_limit = Infinity;
                wheel1.setMoment(wheel1moment);
                wheel2.setMoment(wheel2moment);
            }
            else{
                brake_sig = true;
                acc_sig = false;
            }
        };

        fricImpl = -1*fric*(chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m)*wheel1.shapeList[0].r/tstep*wheel1.w/(Math.abs(wheel1.w)+0.0001);
        wheel1.w += fricImpl*wheel1.i_inv;
        wheel2.w += fricImpl*wheel2.i_inv;
        var pBar = document.getElementById("pbar");
        pBar.value = (car_pos-9)/(maxdist-9)*100;

        battstatus = Math.round(1000-(consumption/3600/1000/max_batt*1000))/10;
        document.getElementById("battvalue").style.width= battstatus + "%";
        $('#batttext').html(battstatus + "%");

        /////////////////////Motor Control/////////////////////////////////
        if (brake_sig) {
            motor1.rate = 0;
            motor2.rate = 0;
            wheel_speed = Math.abs(wheel1.w);
            if(wheel1.w<-1){
                motor1.rate = 1*Math.max(wheel1.w,-1.5)*max_rate1;
                motor2.rate = 1*Math.max(wheel1.w,-1.5)*max_rate1;
                consumption = updateConsumption(consumption);
            }
            else if (wheel1.w>3){
                motor1.rate = 2*Math.min(wheel1.w,2)*max_rate1;
                motor2.rate = 2*Math.min(wheel1.w,2)*max_rate1;
                consumption = -1*updateConsumption(-1*consumption);
            }
            else{motor1.rate=0; motor2.rate = 0; wheel1.setAngVel(0); wheel2.setAngVel(0);}
            if (wheel_speed>1){
            }
            else{
                wheel1.setMoment(wheel1moment);
                wheel2.setMoment(wheel2moment);
            }
        }
        else if (acc_sig && !battempty) {
            motor1.rate += acc_rate;
            motor2.rate += acc_rate;
            if(motor2.rate>max_rate1){motor2.rate=max_rate1;}
            if(motor1.rate>max_rate1){motor1.rate=max_rate1;}
            consumption = updateConsumption(consumption);
        }
        else {
            motor2eff = 0;motor1.rate = 0;motor2.rate = 0;
        }
        ////////////////////////////////////////////////////////////////////////////

        lockScroll();
    }
    else {
        battstatus = Math.round(1000-(consumption/3600/1000/max_batt*1000))/10;
        document.getElementById("battvalue").style.width= battstatus + "%";
        $('#batttext').html(battstatus + "%");
        $("#speedval").html('Speed: 0mph');
    };

};
var drawLandscape = function(){
    // draw the landscape
    var canvas = document.getElementById("canvasbg");
    var ctx = canvas.getContext('2d');
    ctx.lineWidth = 2;
    ctx.strokeStyle = "rgba(0,0,0, 1)";
    ctx.beginPath();
    ctx.moveTo(0,39);
    for (var i=1;i<data.length;i++){
        ctx.lineTo(i/(data.length-1)*scene_width,39-data[i]/100*39);
    }
    ctx.stroke();
    ctx.closePath();
};

$(window).resize(function(){
    scene_width = $(window).width();
    scene_height = $(window).height();
    $("#wrapper").width(scene_width);
    $("#wrapper").height(scene_height);
    $('#canvasbg')[0].width = scene_width;
    $('#canvasbg')[0].height = 40;
    w = demo.width = demo.canvas.width = scene_width;
});

/****************************************** UTILITY **********************************************************/
function sortWithIndeces(toSort, order) {
    for (var i = 0; i < toSort.length; i++) {
        toSort[i] = [toSort[i], i];
    }
    if (order=='asc'){// low to high
        toSort.sort(function(left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
    }
    else if (order=='dsc'){// high to low
        toSort.sort(function(left, right) {
            return left[0] > right[0] ? -1 : 1;
        });
    }

    toSort.sortIndices = [];
    for (var j = 0; j < toSort.length; j++) {
        toSort.sortIndices.push(toSort[j][1]);
        toSort[j] = toSort[j][0];
    }
    return toSort;
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};