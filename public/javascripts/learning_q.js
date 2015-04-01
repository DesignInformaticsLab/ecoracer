var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
// Peng and Williams' Q(lambda) http://www.ai.rug.nl/~mwiering/GROUP/ARTICLES/fast_q.pdf

var n_state = 90;
var episode = 0;
var max_episode = 500;
var alpha = 0.2;
var gamma = 1;
var lambda = 0.9;
var eps = 0.3;
var current_step = 0;
var state, new_state, action, e, q, V, new_action, score = [];
var game_finished = false;
var distance = [];
var car_pos, car_pos9;
for (var i=1;i<=90;i++){
	distance.push(i*10);
}
var success = false;
var penalty = 0;
var a_set = [1,0,-1];// three actions to choose from
var m = a_set.length; 

function run(){
	state = {'distance':car_pos9, 'speed':vehSpeed, 'time':Math.round(cTime*100)/100};
//	state = {'distance':car_pos9, 'speed':vehSpeed};
	egreedy(step);// call step after finding the action with egreedy
}

function egreedy(step){
	$.post('/getQ', state, function(response){
		var Q, A, E, a_miss, p, aa, ee, qq, bar;
		
		if(current_step == 0){
			Q = response.Q;
			A = response.A;
			E = response.E;
			a_miss = $(a_set).not(A).get();
			A = A.concat(a_miss);
			$.each(a_miss, function(){Q.push(0);E.push(0);});
			sortWithIndeces(Q);// sort from small to large
			var a_copy = [], e_copy = [];
			$.each(Q.sortIndices, function(i,d){a_copy.push(A[d]); e_copy.push(E[d]);});
			A = a_copy.slice();
			E = e_copy.slice();

			p = [];
			for(var i=0;i<m;i++){p.push(eps/m*i);}
			p.push(1);
			bar = Math.random();
			aa = $.grep(A, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			ee = $.grep(E, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			qq = $.grep(Q, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			action = aa[0];
			e = ee[0];
			q = qq[0];
			V = Q[Q.length-1];
			step();
		}
		else{
			step();
		}
	});
}

function step(){
	var old_consumption = consumption;
	step_game(function(){
		new_state = {'distance':car_pos9, 'speed':vehSpeed, 'time':Math.round(cTime*100)/100};
//		new_state = {'distance':car_pos9, 'speed':vehSpeed};

		$.post('/getQ',new_state, function(response){
			var Q, A, E, a_miss, p, aa, ee, qq, bar, action_p, e_p, q_p, delta, delta_p;
			Q = response.Q;
			A = response.A;
			E = response.E;
			a_miss = $(a_set).not(A).get();
			A = A.concat(a_miss);
			$.each(a_miss, function(){Q.push(0);E.push(0);});
			sortWithIndeces(Q);// sort from small to large
			var a_copy = [], e_copy = [];
			$.each(Q.sortIndices, function(i,d){a_copy.push(A[d]); e_copy.push(E[d]);});
			A = a_copy.slice();
			E = e_copy.slice();

			p = [];
			for(var i=0;i<m;i++){p.push(eps/m*i);}
			p.push(1);
			bar = Math.random();
			aa = $.grep(A, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			ee = $.grep(E, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			qq = $.grep(Q, function( n, i ) {
				  return ( p[i+1] > bar && p[i] <= bar);});
			action_p = aa[0];
			e_p = ee[0];
			q_p = qq[0];
			V = Q[Q.length-1];
						
			var reward = -(Math.round((consumption-old_consumption)/3600/1000/max_batt*1000)/10)
			 + (car_pos9 - state.distance)
			 + success*100*(1+Math.round(1000-consumption/3600/1000/max_batt*1000)/10) - penalty;
			
			delta_p = reward + gamma*Q[Q.length-1] - q;
			delta = reward + gamma*Q[Q.length-1] - V;

			$.post('/updateQ', {'Q': alpha*delta, 'e_coef': gamma*lambda}, function(){
				q = q + alpha*delta_p;
				e = e+1;
				$.post('/saveQ', {'Q':q, 'e':e, 'distance':state.distance, 'speed':state.speed, 'time':state.time, 'action':action}, function(){
					if(!game_finished){
						current_step += 1;
						
						// move to the new state
						state = new_state;
						action = action_p;
						if(battempty && action==1){action = 0;}//cannot acc when battery is empty
						q = q_p + alpha*delta*e_p;
						
						egreedy(step);					
					}
					else if(episode<max_episode){
						if (success){
							score.push((Math.round(1000-(consumption/3600/1000/max_batt*1000))/10)); // for plot_status
						}
						else{
							score.push(0);
						}
						$.post('/saveepisode', {'episode':episode, 'score':score[episode]}, function(){
							plot_status();
							episode += 1;
							restartQ();
						});
					}
				});				
			});
		});
	});
}

function step_game(callback){
    var lastTime = 0;
    var step = function () {
        demo.step(0);
        var state_change = cTime>=state.time+1 || game_finished;
        if (!state_change) {
            requestAnimationFrame(step);
        }
        else{callback();}
    };
    step(0);
}

function restartQ(){
	consumption = 0;
	battstatus = 100;
	game_finished = false;
	if(typeof demo != 'undefined'){demo.stop();}
	demo = new scene();
	wheel1moment = Jw1;
	wheel2moment = Jw2;
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
	counter = 0;
	cTime = 0;
	vehSpeed = 0;
	motor2eff = 0;
	car_posOld = 0;
	var pBar = document.getElementById("pbar");
	pBar.value = 0;
	drawLandscape();
	success = false;
	car_posOld = 0;
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694);
    
	run();
}

function plot_status(){
	$("#statusplot").html("");
	var padding = 40;//px
	var svg_length = $("#statusplot").width();//px
	var svg_height = $("#statusplot").height();//px
	var num_play = episode+1;
	var upper_bound = 45, lower_bound = 0, range = upper_bound-lower_bound;
	
	var optimal_score = 43.8;
	
	var data = [];
	for (var i=0;i<score.length;i++){
		data.push({"x": i+1, "y": score[i]});
	}
	bm = [];
	bm.push({"x": 1, "y": optimal_score});
	bm.push({"x": num_play, "y": optimal_score});
	
	var lineFunction = d3.svg.line()
	    .x(function(d) { return d.x/num_play*(svg_length-padding*2)+padding; })
	    .y(function(d) { return (1-(d.y-lower_bound)/range)*(svg_height-padding*2)+padding; })
	    .interpolate("linear");
	var xScale = d3.scale.linear()
	    .domain([0, num_play])
	    .range([padding, svg_length-padding]);
	var yScale = d3.scale.linear()
		.domain([lower_bound, upper_bound])
		.range([svg_height-padding, padding]);
	
	var xAxis = d3.svg.axis()
		.scale(xScale)
		.orient("bottom")
		.ticks(Math.min(50,num_play));
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
    
    cTime = Math.floor(counter/tstep);
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694);
    $("#timer").html(timeout-cTime);
    
    penalty = 0;
    
    if(chassis.p.y<0){
    	game_finished = true;
    	demo.stop();
    	penalty = 1000;
    }
    if(!game_finished){
    	$("#speedval").html("Speed: "+vehSpeed + 'mph');

        counter+=1;
	    
///////////////////////////// use control //////////////////////////////////////////
        if (car_pos <= maxdist){
        	if (action>0){
    	    	acc_sig = true;
    	    	brake_sig = false;
        	}
        	else if(action==0){
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
	    //////////// Success ////////////
	    if (car_pos>=maxdist && cTime<=timeout){
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
	    	//$('#runner').runner('stop');
			game_finished = true;
			success = true;
	    }
	    /////////////////////////////////

	    ///// Fail Check ////////////////
	    if ((chassis.p.x<10)){
	    	demo.stop();
	    	//$('#runner').runner('stop');
	    	game_finished = true;
	    	penalty = 1000;
	    }
	    if (cTime>timeout){
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.setMoment(1e10);
			wheel2.setMoment(1e10);
			brake_sig = false;
			acc_sig = false;
			game_finished = true;
	    }
	    if (chassis.rot.x < 0 || chassis.p.y<10 ){//roll over
	    	game_finished = true;
	    }
	    if (battstatus < 0.20){
	    	battempty = true;
	    	if ((Math.abs(chassis.vx)<=2) && (car_pos<maxdist)){
	    		game_finished = true;
	    		penalty = 1000;
	    	}
	    }
	    else {
	    	battempty = false;
	    }
		
	lockScroll();
    }
    else {
    	battstatus = Math.round(1000-(consumption/3600/1000/max_batt*1000))/10;
		document.getElementById("battvalue").style.width= battstatus + "%";
    	$('#batttext').html(battstatus + "%");
        $("#speedval").html('Speed: 0mph');
    };
};

$(document).on("pageinit",function(event){
	drawLandscape = function(){
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
	
	
	
	consumption = 0;
	battstatus = 100;
	demo = new scene();
	demo.canvas.style.position = "absolute";
	demo.canvas.style.left = "0px";
	
	wheel1moment = Jw1;
	wheel2moment = Jw2;
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
	
	counter = 0;
	vehSpeed = 0;
	motor2eff = 0;
	car_posOld = 0;
	var pBar = document.getElementById("pbar");
	pBar.value = 0;
	drawLandscape();
	
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694);
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
	run();
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
function sortWithIndeces(toSort) {
	  for (var i = 0; i < toSort.length; i++) {
	    toSort[i] = [toSort[i], i];
	  }
	  toSort.sort(function(left, right) {
	    return left[0] < right[0] ? -1 : 1;
	  });
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