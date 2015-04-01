var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
// states: slope (s), remaining_distance (d), remaining_time (t), speed (v)
// acc (s +, d/t +, v-): 0.33*(1 + w_1 * s + w_2 * d/t - w_3 * v)
// brk (s -, d/t -, v+): 0.33*(1 - w_1 * s - w_2 * d/t + w_3 * v)

var n_var = 3+1;
var iter = 0;
var max_iter = 200;
var obj_set = [];
var sample_size = 20;
var sample_set = [];
var all_samples = [];
var all_obj = [];
var best_obj = [];
var model;

function generate_policy(w, s, d, t, v){
	var s_, d_, t_, d_t, v_, p_acc, p_brk, bar,
	s_ = s;
	d_ = d/900;
	t_ = (t+1)/36;
	d_t = d_/t_;
	v_ = v/80;
	
	p_acc = (1 + Math.max(Math.min(w[0]*s_ + w[1]*d_t - w[2]*v_, 1),-1))/3;
	p_brk = (1 - Math.max(Math.min(w[0]*s_ + w[1]*d_t - w[2]*v_, 1),-1))/3;
	
//	bar = Math.random();
//	if (bar>2/3){return 0;}
//	else if (bar>p_acc && bar<=2/3){return -1;}
//	else {return 1;}
	
	if (p_acc>0.5){return 1;}
	else if(p_brk>0.5){return -1;}
	else {return 0;}
}



function run(){
	initial();
	calculate_obj(sample_set, iterate);
}
function initial(){
	// random initial sample set
	for(var i=0;i<sample_size;i++){
//		var g = [0.259,0.1575,2.2399,2.1787];
		var g = [];
		for(var j=0;j<n_var;j++){
			var r = Math.random();
			g.push(r);
		}
		sample_set.push(g);
	}
	$.each(sample_set, function(i,d){all_samples.push(sample_set[i].slice(0))});
};
function iterate(){
	if(converge()){
		//***do some data saving
	}

	var obj_set_sort = obj_set.slice(0);
	sortWithIndeces(obj_set_sort);

	// update plot
	best_obj.push(obj_set[obj_set_sort.sortIndices[0]]);
	plot_status();
	
	// replace the worst with the new sample
	sample_set.splice(obj_set_sort.sortIndices[sample_size-1],1); 
	obj_set.splice(obj_set_sort.sortIndices[sample_size-1],1); 
	
	// get new sample
	regression();
	var s = sample();
	iter+=1;

	sample_set.push(s.slice(0));
	
	all_samples.push(s.slice(0));
	
	// run with new sample
	calculate_obj([s], iterate);
};

function regression(){
	var X = new Array(sample_size-1);
	$.each(sample_set, function(i,d){X[i] = sample_set[i].slice(0);});
	for (var i=0;i<sample_size-1;i++){
		for (var j=0;j<n_var;j++){
			for (var k=j;k<n_var;k++){
				X[i].push(X[i][j]*X[i][k]);
			}
		}
	}
	var XTX = [];
	var p = X[0].length;
	for (var i=0;i<p;i++){
		XTX.push([]);
		for (var j=0;j<p;j++){
			var prod = 0;
			for (var k=0;k<sample_size-1;k++){
				prod += X[k][i]*X[k][j];
			}
			XTX[i].push(prod);
		}
	}
	
	var LUP = numeric.ccsLUP(numeric.ccsSparse(XTX));
	var XTy = [];
	for (var i=0;i<p;i++){
		var prod = 0;
		for (var j=0;j<sample_size-1;j++){
			prod += X[j][i]*obj_set[j];
		}	
		XTy.push(prod);
	}
	model = numeric.ccsLUPSolve(LUP,XTy);
}

function sample(){
	var f = model.slice(0,n_var);
	var q = model.slice(n_var);
	var Q = new Array(n_var);
	for (var i=0;i<n_var;i++){
		Q[i] = new Array(n_var);
	}
	var count = 0;
	for (var i=0;i<n_var;i++){
		Q[i][i] = q[count];
		count++;
		for (var j=i+1;j<n_var;j++){
			Q[i][j] = q[count]/2;
			Q[j][i] = q[count]/2;
			count++;
		}
	}
	
	// x = -1/2*Q\f
	var LUP = numeric.ccsLUP(numeric.ccsSparse(Q));
	next_sample = numeric.ccsLUPSolve(LUP,f);
	$.each(next_sample,function(i,d){
		if(i==0){// fr has an upper bound
			next_sample[i]=Math.min(Math.max(-next_sample[i]/2,0),1);
		}
		else{
			next_sample[i]=Math.max(-next_sample[i]/2,0);
		}
	});
	return next_sample;
}


function calculate_obj(set, callback){
	var x = set.slice(0);
	
	var f2 = function(i){
		obj_set.push(SCORE);
		all_obj.push(SCORE);
		if(obj_set.length<sample_size){
			run_game(x[obj_set.length], f2);
		}
		else{
			// recursively call iterate
			if (typeof(callback) == 'function') {
		        callback();
		    }
		}
	}
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
		data.push({"x": i+sample_size, "y": best_obj[i]});
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

	// reset the game
	w = input.slice(1);
	fr = Math.floor(input[0]*31)+10;
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
	
	counter = 0;
	vehSpeed = 0;
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
    var lastTime = 0;
    var step = function (time) {
        demo.step(time - lastTime);
        lastTime = time;
        if (start_race) {
            requestAnimationFrame(step);
        }
        else{
        	SCORE =  (Math.round(1000-(consumption/3600/1000/max_batt*1000))/10)*(car_pos9-900>=0) + (car_pos9-900)/9; //higher is better
        	$.post('/adddata_learning',{
				   'score':SCORE,
				   'keys':JSON.stringify(w),
				   'finaldrive':fr,
				   'iteration':iter,
				   'method':'sqp'});	

        	if (typeof(callback) == 'function') {
                callback();
            }
        }
    };
    step(0);
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
    
    cTime = Math.floor(counter/tstep);
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694);
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
        	
        	var d = 900-car_pos9;
        	var t = timeout-cTime;
        	var v = vehSpeed;
        	var ind = Math.floor(car_pos9/10)+1;
        	var s = data[ind+1]>data[ind]? 1:-1;
        	if(data[ind+1] == data[ind]){s=0;}
        	
        	c = generate_policy(w, s, d, t, v);


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
	    return left[0] > right[0] ? -1 : 1;
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