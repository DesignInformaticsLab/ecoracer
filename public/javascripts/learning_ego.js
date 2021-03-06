var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
// states: slope (s), remaining_distance (d), remaining_time (t), speed (v)
// acc (s +, d/t +, v-): 0.33*(1 + w_1 * s + w_2 * d/t - w_3 * v)
// brk (s -, d/t -, v+): 0.33*(1 - w_1 * s - w_2 * d/t + w_3 * v)

var n_var = 9+1;
var iter = 0;
var max_iter = 200;
var obj_set = [];
var sample_size = 5;
var sample_set = [];
var best_obj = [];
var model = {'R':[],'b':[],'X':[],'y':[], 'r':[], 'R_y':[], 'y_b':[]};
var range = 3; // range of the control parameter space
var user_model = {'X':[], 'n':0, 'w':[], 'b':0, 'gamma':0};
var multitrack = 5;


function generate_policy(w, s, d, t, v){
	var s_, d_, t_, d_t, v_, p_acc, p_brk, bar,
	s_ = s;
	d_ = d/900/multitrack; // divided by multitrack for longer track
	t_ = (t+1)/36/multitrack; // divided by multitrack for longer track
	d_t = d_/t_;
	v_ = v/80;
	
//	p_acc = (1 + w[0]*s_ + w[1]*d_t + w[2]*v_)/3;
//	p_brk = (1 - (w[0]*s_ + w[1]*d_t + w[2]*v_))/3;
	p_acc = (1 + w[0]*s_ + w[1]*d_ + w[2]*t_ + w[3]*v_ + w[4]*d_t + w[5]*s_*v_ + w[6]*s_*d_ + w[7]*d_*d_ + w[8]*d_*d_*d_)/3;
	p_brk = (1 - (w[0]*s_ + w[1]*d_ + w[2]*t_ + w[3]*v_ + w[4]*d_t + w[5]*s_*v_ + w[6]*s_*d_ + w[7]*d_*d_ + w[8]*d_*d_*d_))/3;
	
	if (p_acc>0.5){return 1;}
	else if(p_brk>0.5){return -1;}
	else {return 0;}
}

function run(){
	//initial();
	initial_with_user();
}
function initial_with_user(){
	$.ajax({
	    url: "/data/player_model_500.json",
	    dataType: "text",
	    success: function(data) {
	    	data = JSON.parse(data);
	    	data = data.model;
	    	user_model.X = data.SVs;
	    	user_model.w = data.sv_coef;
	    	user_model.b = -data.rho;
	    	user_model.n = data.totalSV;
	    	user_model.gamma = data.Parameters[3][0];
	    	
	    	// randomly choose sample_size samples from user_model.X, because we know these samples can finish with positive score
	    	var id_set = [];
	    	for(var i=0;i<user_model.n;i++){id_set.push(i);}
	    	for(var i=0;i<sample_size;i++){
	    		var id_set_id = Math.floor(Math.random()*id_set.length);
	    		var rand_id = id_set[id_set_id];
	    		var g = user_model.X[rand_id].slice(0);
	    		id_set.splice(id_set_id,1);
	    		sample_set.push(g);
	    	}
	    	calculate_obj(sample_set, iterate);
	    }
	});
}
function initial(){
	// random initial sample set
	for(var i=0;i<sample_size;i++){
//		var g = [0.2667, 0.1116, 2.4773, -2.4967] the best user:1463 in 2391 (id:1517) for player data
		var g = [Math.random()];
		for(var j=1;j<n_var;j++){
			var r = (Math.random()-0.5)*2*range;
			g.push(r);
		}
		sample_set.push(g);
	}
	calculate_obj(sample_set, iterate);
};
function iterate(){
	if(converge()){
		//***do some data saving
	}
	else{
		var obj_set_sort = obj_set.slice(0);
		sortWithIndeces(obj_set_sort, 'asc');

		// update plot
		best_obj.push(obj_set[obj_set_sort.sortIndices[0]]);
		plot_status();
		
		// get new sample
		regression();
		var s = sample();
		iter+=1;

		sample_set.push(s.slice(0));
		
		// run with new sample
		calculate_obj([s], iterate);		
	}
};

function regression(){
	var n = sample_set.length;
	var X = new Array(n);
	$.each(sample_set, function(i,d){X[i] = sample_set[i].slice(0);});
	
	if (model.R.length == 0){
		var R = new Array(n);
		for (var i=0;i<n;i++){R[i] = new Array(n);}
		for (var i=0;i<n;i++){
			R[i][i] = 1;
			for(var j=i+1;j<n;j++){
				var sim = kernel(X[i],X[j]);
				R[i][j] = sim;
				R[j][i] = sim;
			}
		}		
	}
	else {
		var R = model.R;
		R.push([]);
		for (var i=0;i<n-1;i++){
			var sim = kernel(X[i],X[X.length-1]);
			R[i].push(sim);
			R[n-1].push(sim);
		}
		R[n-1].push(1);
	}
	var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
	var R_y = numeric.ccsLUPSolve(LUP,obj_set);
	var R_1 = numeric.ccsLUPSolve(LUP,ones(n));
	var b = vprod(ones(n), R_y)/vprod(ones(n), R_1);
	model.R = R;
	model.b = b;
	model.X = X;
	model.y = obj_set.slice(0);
}
function kernel(v1,v2){// gaussian kernel
	var f = 0;
	$.each(v1, function(i,d){f+= (v1[i]-v2[i])*(v1[i]-v2[i]);});
	f = Math.exp(-f/v1.length/range/range); // the space is from -range to range, normalize by range^2 to make the regression function smooth enough
	return f;
}
function vprod(v1,v2){// vector product
	var f = 0;
	$.each(v1, function(i,d){f+=v1[i]*v2[i];});
	return f;
}
function ones(n){// create an array of n ones
	var o = new Array(n);
	$.each(o, function(i,d){o[i]=1;});
	return o;
}

function sample(){
	var R = model.R;
	var b = model.b;
	var opt = {'obj':ego_obj,'pop_size':10,'n_var':n_var,'max_iter':1000,'max_no_improvement':200,'elite_rate':0.1,'cross_rate':0,'mutate_rate':0.9};
	var ga = new GA(opt);
	var next_sample = ga.solve();
	return next_sample;
}
function ego_obj(x){
	var y_min = best_obj[iter];
	var y_hat = kriging(x);
	var s = mse(x)*sigma();
	
	var violation = 0;
	if(user_model.n>0){ // if user model exists, use it to constrain the search space
		violation = calculate_violation(x);
	}
	
	return (y_min-y_hat)*Phi((y_min-y_hat)/s)+s*phi((y_min-y_hat)/s) + violation;
}
function sigma(){

	return Math.sqrt(vprod(model.y_b,model.R_y)/model.R.length);
}
function kriging(x){ // kriging function with b = constant
	var b = model.b;
	var R = model.R;
	var X = model.X;
	var y = model.y;
	var n = R.length;
	var r = new Array(n);
	var y_b = new Array(n);
	$.each(r, function(i,d){r[i] = kernel(x,X[i]);y_b[i] = y[i]-b;});
	model.r = r; // save r for mse
	var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
	var R_y = numeric.ccsLUPSolve(LUP,y_b);
	model.y_b = y_b;
	model.R_y = R_y;
	return b+vprod(r,R_y);
}
function mse(x){ // kriging mse function
	var R = model.R;
	var r = model.r;
	var n = R.length;
	var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
	var R_r = numeric.ccsLUPSolve(LUP,r);
	var R_1 = numeric.ccsLUPSolve(LUP,ones(n));
	return Math.sqrt(1-vprod(r,R_r)+(1-vprod(ones(n),R_r))*(1-vprod(ones(n),R_r))/vprod(ones(n),R_1));
}
function Phi(x){ // normal cdf
	var z = x/Math.sqrt(2);
    var t = 1/(1+0.3275911*Math.abs(z));
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var erf = 1-(((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
    var sign = 1;
    if(z < 0)
    {
        sign = -1;
    }
    return (1/2)*(1+sign*erf);	
}
function phi(x){ // normal pdf
	return 1/Math.sqrt(2*Math.PI)*Math.exp(-1/2*x*x);
}

function calculate_obj(set, callback){
	var x = set.slice(0);
	
	var f2 = function(i){
		obj_set.push(SCORE);
		if(obj_set.length<sample_set.length){
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
function calculate_violation(x){
	var p = 0;
	for (var i=0;i<user_model.n;i++){
		var f = 0;
		var v = user_model.X[i];
		$.each(x, function(j,d){f+= (d-v[j])*(d-v[j]);});
		f = Math.exp(-f*user_model.gamma);
		p += user_model.w[i]*f;
	}
	p += user_model.b;
	if(p>0){return 0;}
	else{return 1e6*p;}// put a high penalty on violation
}


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
        	SCORE =  -((Math.round(1000-(consumption/3600/1000/max_batt*1000))/10)*(car_pos9-900*multitrack>=0) + (car_pos9-900*multitrack)/9); //lower is better
        	$.post('/adddata_learning',{
				   'score':-SCORE,
				   'keys':JSON.stringify(w),
				   'finaldrive':fr,
				   'iteration':iter,
//				   'method':'user_model_1_1',
				   'method':'longtrack_data_user_model500_5', // ego: normal ego algoirthm;  player_parameter: to rerun all players using the parametric control model
				   // user_model_1 is based on plays with performance better than 0, and uses the 9 control parameter fit, one-class svm,
				   // plays with negative simulated scores are removed, so as those with parameter values greater than 10

				   // inverse_data_no_user is a new game (inverse track) without using user model
				   // inverse_data_user_model is a new game (inverse track) with user model

				   // hill_data_no_user is a new game (hill track) without using user model
				   // hill_data_user_model is a new game (hill track) with user model

				   // zigzag_data_no_user is a new game (zigzag track) without using user model
				   // zigzag_data_user_model is a new game (zigzag track) with user model

                   // longtrack_data_no_user is a new game (long track) without using user model
                   // longtrack_data_user_model is a new game (long track) with using user model
                   // longtrack_data_user_model500 is a new game (long track) with using user model trained with the first 500 plays
                   // longtrack_data_EGO use EGO results from the original game to play longtrack

				   //NOTE for all future runs, change the last method digit to indicate the experiment ID!!!

				   'database':'ecoracer_learning_ego_table'},
				   function(){
			        	if (typeof(callback) == 'function') {
			                callback();
			            }
				   });
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
        	
        	var d = 900*multitrack-car_pos9;
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

// genetic algorithm
function GA(opt){
	this.pop_size = opt.pop_size;
	this.n_var = opt.n_var;
	this.iter = 0;
	this.no_improvement = 0;
	this.max_iter = opt.max_iter;
	this.max_no_improvement = opt.max_no_improvement;
	this.fitness = [];
	this.bestfitness = [];
	this.pop = [];
	this.elite_rate = opt.elite_rate;
	this.cross_rate = opt.cross_rate;
	this.mutate_rate = opt.mutate_rate;
	this.n_elite = Math.round(this.pop_size*this.elite_rate);
	this.n_cross = Math.round(this.pop_size*this.cross_rate);
	this.n_mutate = Math.round(this.pop_size*this.mutate_rate);
	this.fitness_sorted = [];
	this.obj = opt.obj;
}
GA.prototype.solve = function(){
	this.initial();
	this.calculate_fitness();
	while (!this.converge()){
		this.parentselection();
		this.crossover();
		this.mutation();
//			pop.push(elite_pop.concat(cross_pop).concat(mutate_pop));
		this.pop.push(this.elite_pop.concat(this.mutate_pop));
		this.iter+=1;
		this.calculate_fitness();
	}
	return this.elite_pop[0];
}
GA.prototype.initial = function(){
	// primitive initial population
	var p = [];
//	for(var i=0;i<this.pop_size;i++){
//		var g = [];
//		g.push(Math.random());
//		for(var j=1;j<this.n_var;j++){
//			var r = (Math.random()-0.5)*2*range; // from -range to range
//			g.push(r);
//		}
//		p.push(g);
//	}
	
	// use the best samples as initial guesses
	if(obj_set>this.pop_size){
		var sort_obj_set = sortWithIndeces(obj_set, 'asc'); // sort obj from low to high because obj are the lower the better
		var pop_id = sort_obj_set.sortIndices.slice(0,this.pop_size);
		$.each(pop_id, function(i,d){p.push(sample_set[d].slice(0));});		
	}
	else{
		for(var i=0;i<this.pop_size;i++){
			var random_id = Math.floor(Math.random()*obj_set.length);
			p.push(sample_set[random_id].slice(0));
		}
	}
	this.pop.push(p);
};

GA.prototype.parentselection = function(){
	var f = this.fitness[this.iter].slice(0);
	sortWithIndeces(f, 'dsc');//sorted from high to low because we are maximizing the expected improvement
	var elite_pop_id = f.sortIndices.slice(0,this.n_elite);
	var e = this;
	this.elite_pop = []; $.each(elite_pop_id, function(i,eid){e.elite_pop.push(e.pop[e.iter][eid]);});
	
//	var non_elite_pop_id = f.sortIndices.slice(n_elite);
	var non_elite_pop_id = f.sortIndices.slice(0,this.pop_size-1); // remove the worst
	var non_elite_pop = []; $.each(non_elite_pop_id, function(i,eid){non_elite_pop.push(e.pop[e.iter][eid]);});
	
	var parent = [], parent_fitness = [], p = [], bar, id, max_fit;
	$.each(non_elite_pop_id, function(i,n){
		p.push((non_elite_pop_id.length-i-1)*(non_elite_pop_id.length-i)/2);
	});
	max_fit = (non_elite_pop_id.length-1)*(non_elite_pop_id.length)/2;
	for(var i=0;i<non_elite_pop.length;i++){
		bar = Math.random()*max_fit;
		id = $.grep(non_elite_pop_id, function( n, i ) {
			  return ( p[i] > bar && p[i+1] <= bar);
			});
		parent.push(this.pop[this.iter][id].slice(0));
		parent_fitness.push(this.fitness[this.iter][id]);
	}

	parent = shuffle(parent);
//	cross_pop = parent.slice(0,n_cross);
//	mutate_pop = parent.slice(n_cross);
	this.mutate_pop = parent.slice(0);
};
GA.prototype.crossover = function(){
	var new_cross_pop = [];
	for(var i=0;i<this.n_cross/2;i++){
		var p1,p2,c1,c2,split_point;
		p1 = this.cross_pop[i*2];
		p2 = this.cross_pop[i*2+1];
		split_point = Math.ceil(Math.random()*this.n_var);
		c1 = p1.slice(0,split_point).concat(p2.slice(split_point));
		c2 = p2.slice(0,split_point).concat(p1.slice(split_point));
		new_cross_pop.push(c1);
		new_cross_pop.push(c2);
	}
	this.cross_pop = new_cross_pop.slice(0);
};
GA.prototype.mutation = function(){
	var mutation_rate = 1.0/Math.sqrt(Math.sqrt(this.iter+1));
	for(var i=0;i<this.n_mutate;i++){
		if(Math.random()<mutation_rate){
			this.mutate_pop[i][0] += (Math.random()-0.5)*0.2;
			this.mutate_pop[i][0] = Math.min(Math.max(this.mutate_pop[i][0], 0), 1);
		}
		for(var j=1;j<n_var;j++){
			if(Math.random()<mutation_rate){
				this.mutate_pop[i][j] += (Math.random()-0.5)*0.2;
				this.mutate_pop[i][j] = Math.min(Math.max(this.mutate_pop[i][j], -range), range);
			}
		}
	}
};
GA.prototype.calculate_fitness = function(){
	var x = this.pop[this.iter].slice(0);
	var f = new Array(this.pop_size);
	var e = this;
	$.each(x, function(i,d){
		f[i] = e.obj(d);
	});
	this.fitness.push(f);
};
GA.prototype.converge = function(){
	// criterion 1: max iter
	if (this.iter>this.max_iter){
		return true;
	}
	// criterion 2: no improvement
	if (this.bestfitness[this.iter]==this.bestfitness[this.iter-1]){
		this.no_improvement += 1;
	}
	else {
		this.no_improvement = 0;
	}
	if (this.no_improvement > this.max_no_improvement){
		return true;
	}
	return false;
};


/****************************************** TEST PLAYER DATA **********************************************************/
//check if the converted control parameters will result in the same score as the original control signals
var CONTROL_DATA, SCORE;
var controlparameter_data, current_id;
var player_w,player_score;
var num_plays = 2391;
var simulate_parameterized_user = function(id){
	if (id<500){
		data_address = "/data/controlparameter_score_1_500.json";
		current_id = id;
	}
	else if(id<1000){
		data_address = "/data/controlparameter_score_501_1000.json";
		current_id = id-500;
	}
	else if(id<1500){
		data_address = "/data/controlparameter_score_1001_1500.json";
		current_id = id-1000;
	}
	else if(id<2000){
		data_address = "/data/controlparameter_score_1501_2000.json";
		current_id = id-1500;
	}
	else{
		data_address = "/data/controlparameter_score_2001_2391.json";
		current_id = id-2000;
	}
	if (typeof controlparameter_data == 'undefined' || controlparameter_data.w.length < id){
		$.ajax({
			url: data_address,
			dataType: "text",
			success: function(data){
				controlparameter_data = data;
				controlparameter_data = JSON.parse(controlparameter_data).controlparameter;
				player_w = controlparameter_data.w[current_id];
				run_game(player_w, function(){
					id++;
					if(id<num_plays){
						simulate_parameterized_user(id);
					}		
				});
			}
		});		
	}
	else{
		player_w = controlparameter_data.w[current_id];
		run_game(player_w, function(){
			id++;
			if(id<alluser_control.length){
				simulate_parameterized_user(id);
			}		
		});
	}

};