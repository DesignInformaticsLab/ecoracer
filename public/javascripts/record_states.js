/**
 * Created by p2admin on 3/7/2016.
 */
// This code records "sars" from existing plays
var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
var sample_size = 2;
var sample_set = [];

var basis = []; // learned principal components from all players
var bias = []; // ica means
var transform_bias = [];
var transform_scale = [];

var control_signal = [];
var fr;

var cTime;
var vehSpeed;

var best_obj = [];
var multitrack = 1;

// NOTE: Thurston's files have gear ratio as the last element, this code assumes that it's the first
// so I changed all the following files manually when necessary.
var basis_url = "/data/p2_ICA_transform.json"; // from all players
var parameter_url = "/data/p2_slsqp_sigma.json"; // from best player 2
var range_url = "data/p2_range_transform.json"; // from best player 2
var initial_guess_url = "data/mix_scaled_p2_init.txt"; // from best player 2

function generate_policy(x){ // in DETC2016, this is a one-time calculation for each play
    // x is the low-dim control
    // AI*x is the control signal in the distance space

    var y = transform(x.slice(1,31)); // inverse transform the variables before applying to the basis
    fr = Math.floor((x[0]+1)/2*30)+10; // fr ranges from -1 to 1

    // create a zero vector
    control_signal = Array(basis.length);
    $.each(control_signal, function(i,s){
        control_signal[i] = bias[i];
    });
    $.each(basis, function(i,row){ // i = 0..~18k
        $.each(row, function(j,e){ // j = 0..29
            //if (sigma_inv[j]>0) { // only consider non-zero sigma_inv related variables
            control_signal[i] += e*y[j];
            //}
        });
        if (control_signal[i]>=0.5){
            control_signal[i] = 1;
        }
        else if (control_signal[i]<=-0.5){
            control_signal[i] = -1;
        }
        else {
            control_signal[i] = 0;
        }
    });
}

function transform(x){ // inverse transform from [-1,1] to original reduced space
    var y = Array(x.length);
    $.each(x, function(i,s){
        y[i] = (x[i]-transform_bias[i])/transform_scale[i];
    });
    return y;
}

function run(){
    initial();
}
function initial(){
    $.ajax({
        url: initial_guess_url,
        dataType: "text",
        success: function(data) {
            var res = data.split(" ");
            $.each(res, function(i,e){
                res[i] = Number(e);
            });
            sample_set.push(res.slice(0,res.length/2));
            sample_set.push(res.slice(res.length/2,res.length));

            $.ajax({
                url: basis_url,
                dataType: "text",
                success: function (data) {
                    data = JSON.parse(data);
                    basis = data.mix; // for ICA only
                    bias = data.mean; // for ICA mean

                    $.ajax({
                        url: range_url,
                        dataType: "text",
                        success: function (data) {
                            data = JSON.parse(data);
                            transform_bias = data.min;
                            transform_scale = data.range;

                            calculate_obj(sample_set);
                        }
                    });
                }
            });
        }
    });
}

var iter = 1;
function calculate_obj(set, callback){
    var x = set.slice(0);
    var f2 = function(i){
        if(iter<sample_size){
            run_game(x[iter], f2);
            iter += 1;
        }
        else{
            // recursively call iterate
            if (typeof(callback) == 'function') {
                callback();
            }
        }
    };
    run_game(x[0], f2);
};

function converge(){
    // criterion 1: max iter
    if (iter>max_iter){
        return true;
    }
    return false;
};

function plot_status(){
    $("#statusplot").html("");
    var padding = 40;//px
    var svg_length = $("#statusplot").width();//px
    var svg_height = $("#statusplot").height();//px
    var num_play = iter+sample_size;
    var upper_bound = 45, lower_bound = -100, range = upper_bound-lower_bound;

    var optimal_score = 43.8;

    var data = [];
    for (var i=0;i<best_obj.length;i++){
        data.push({"x": i+sample_size, "y": -best_obj[i]}); // convert minimization to maximization
    }
    bm = [];
    bm.push({"x": sample_size, "y": optimal_score});
    bm.push({"x": iter+sample_size, "y": optimal_score});

    var lineFunction = d3.svg.line()
        .x(function(d) { return (d.x-sample_size)/(iter+1e-6)*(svg_length-padding*2)+padding; })
        .y(function(d) { return (1-(d.y-lower_bound)/range)*(svg_height-padding*2)+padding; })
        .interpolate("linear");
    var xScale = d3.scale.linear()
        .domain([sample_size, sample_size+iter])
        .range([padding, svg_length-padding]);
    var yScale = d3.scale.linear()
        .domain([lower_bound, upper_bound])
        .range([svg_height-padding, padding]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .ticks(Math.min(50,iter));
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(10);

    var svgContainer = d3.select("#statusplot").append("svg")
        .attr("width", svg_length)
        .attr("height", svg_height);

//	 plot user performance
    svgContainer.append("path")
        .attr("d", lineFunction(data))
        .attr("stroke", 'black')
        .attr("stroke-width", 2)
        .attr("fill", "none");

    svgContainer.append("path")
        .attr("d", lineFunction(bm))
        .attr("stroke", 'black')
        .attr("stroke-dasharray", ("3, 3"))
        .attr("stroke-width", 2)
        .attr("fill", "none");
    svgContainer.append("g")
        .attr("transform", "translate(0," + (svg_height - padding) + ")")
        .attr("class", "x axis")
        .style("font-size", "6px")
        .call(xAxis);
    svgContainer.append("g")
        .attr("transform", "translate(" + padding +",0)")
        .attr("class", "y axis")
        .style("font-size", "6px")
        .call(yAxis);

    svgContainer.append("text")
        .attr("x", svg_length/2-padding)
        .attr("y", padding/2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Learning Performance");
};

var w;
var c = 0;
var SCORE = 0;
function run_game(input, callback){
    // generate control policy for given variable values
    generate_policy(input);
    fr = 18; // fix it to the optimal one for policy synthesis

    if (!not_gonna_run()){ // run the game only if it is going to run
        // reset the game
        consumption = 0;
        battstatus = 100;
        if(typeof demo != 'undefined'){demo.stop();}
        demo = new scene();
        demo.canvas.style.position = "absolute";
        demo.canvas.style.left = "0px";

        wheel1moment = Jw1;
        wheel2moment = Jw2;
        wheel1.setMoment(wheel1moment);
        wheel2.setMoment(wheel2moment);
        $("#timer").show();

        // initial states
        cTime = 0.0;
        con1 = 0; con2 = 0;
        car_pos = Math.round(chassis.p.x*px2m); //-9.03
        car_pos9 = car_pos-9;
        counter = 0;
        vehSpeed = 0.0;
        motor2eff = 0;
        car_posOld = 0;
        var pBar = document.getElementById("pbar");
        pBar.value = 0;
        drawLandscape();
        c = 0;

        indx = 0;

        //Run
        start_race = true;
        demo.running = true;
        var step = function () {
            var speed_ini = vehSpeed;
            var distance_ini = 900*multitrack-car_pos9;
            var time_ini = timeout-cTime;
            var ind = Math.floor(car_pos9/10)+1;
            var slope_ini = data[ind+1]>data[ind]? 1:-1;
            if(data[ind+1] == data[ind]){slope_ini=0;}
            var act = control_signal[Math.round(chassis.p.x)];
            act = typeof(act)=='undefined'? 0:act;
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
                            step(0);
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
                        'playID': iter}, // ID for tracking with play this data comes from
                        function(){
                            callback();
                        });
            }
        };
        step(0);
    }
}
function not_gonna_run(){
    var start_location = 9/px2m;
    if (control_signal[start_location]<1){
        return true;
    }
    else return false;
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

            //var d = 900*multitrack-car_pos9;
            //var t = timeout-cTime;
            //var v = vehSpeed;
            //var ind = Math.floor(car_pos9/10)+1;
            //var s = data[ind+1]>data[ind]? 1:-1;
            //if(data[ind+1] == data[ind]){s=0;}
            c = control_signal[Math.round(chassis.p.x)];

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

$(document).on("pageinit",function(event){
//	run();
});

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