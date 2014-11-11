var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

/****************************************** ALGORITHM **********************************************************/
function ga(){
	this.pop_size = 10;
	var step = 10;
	this.n_var = 900/step;// at the starting loc, one should always acc
	this.iter = 0;
	this.no_improvement = 0;
	this.max_iter = 100;
	this.max_no_improvement = 20;
}
ga.prototype.run = function(){
	this.initial();
	this.fitness = [];
	this.bestfitness = [];
	this.calculate_fitness();
	while (true){
		this.parentselection();
		this.crossover();
		this.mutation();
		this.pop.push(this.elite_pop.concatenate(this.cross_pop).concatenate(this.mutate_pop));
		this.iter+=1;
		this.calculate_fitness();
		if(this.converge()){
			break;
		}
	}
}
ga.prototype.initial = function(){
	// primitive initial population
	this.pop = [];
	var pop = [];
	for(var i=0;i<this.pop_size;i++){
		var g = [];
		for(var j=0;j<this.n_var;j++){
			var a = 0;
			var r = Math.random();
			if (r<1/3){a=-1;}
			else if(r>2/3){a=1;}
			g.push(a);
		}
		pop.push(g);
	}
	this.pop.push(pop);
};
ga.prototype.parentselection = function(){
	var elite_rate = 0.2;
	var cross_rate = 0.6;
	var mutate_rate = 0.2;
	var n_elite = Math.round(this.pop_size*elite_rate);
	var n_cross = Math.round(this.pop_size*cross_rate);
	var n_mutate = Math.round(this.pop_size*mutate_rate);
	
	var f = this.fitness[this.iter].slice(0);
	sortWithIndeces(f);
	this.elite_pop = this.pop[f.sortIndices.slice(0,n_elite)];
	this.non_elite_pop = this.pop[f.sortIndices.slice(n_elite)];
	this.non_elite_pop = shuffle(this.non_elite_pop);
	this.cross_pop = this.non_elite_pop.slice(0,n_cross);
	this.mutate_pop = this.non_elite_pop.slice(n_cross);
};
ga.prototype.crossover = function(){
	var new_cross_pop = [];
	for(var i=0;i<this.n_cross/2;i++){
		var p1,p2,c1,c2,split_point;
		p1 = this.cross_pop[i*2];
		p2 = this.cross_pop[i*2+1];
		split_point = Math.ceil(Math.random()*this.n_var);
		c1 = p1.slice(0,split_point).concatenate(p2.slice(split_point));
		c2 = p2.slice(0,split_point).concatenate(p1.slice(split_point));
		new_cross_pop.push(c1);
		new_cross_pop.push(c2);
	}
	this.cross_pop = new_cross_pop.slice(0);
};
ga.prototype.mutation = function(){
	var mutation_rate = 0.5/Math.sqrt(this.iter);
	for(var i=0;i<this.n_mutate;i++){
		for(var j=0;j<this.n_var;j++){
			if(Math.random()<mutation_rate){
				var c = $([-1,0,1]).not(this.mutate_pop[i][j]).get();
				var r = Math.random();
				if (r<0.5){this.mutate_pop[i][j] = c[0];}
				else {this.mutate_pop[i][j] = c[1];}
			}
		}
	}
};
ga.prototype.calculate_fitness = function(){
	var x = this.pop[this.iter].slice(0);
	this.fitness.push([]);
	for(var i=0;i<this.pop_size;i++){
		this.fitness[this.iter].push(run_game(this.pop[this.iter][i]));
	}
	this.bestfitness.push(this.fitness[this.iter].sort(function(a, b){return b-a})[0]);
}
ga.converge = function(){
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
}


var state = [];
for (var i=1;i<=90;i++){
	state.push(i*10);
}
state.push(950);

function run_game(control){
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
	
	counter = 0;
	vehSpeed = 0;
	motor2eff = 0;
	car_posOld = 0;
	var pBar = document.getElementById("pbar");
	pBar.value = 0;
	drawLandscape();

	// set new input
	control.push(-1);// put brake at 950
	
	//Run
	var start_race = true;
	demo.run();
	
	//Wait
	while (start_race){
		setTimeout(
				  function() 
				  {
				    //do something special
				  }, 1000);
	}
	
	var score =  Math.round(1000-(consumption/3600/1000/max_batt*1000))/10 + (car_pos9-900)/9 - (timeout-cTime)/timeout*100; //higher is better
	return score;
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
    	start_race = 0;
    }
    if(start_race == 1){
    	$("#speedval").html("Speed: "+vehSpeed + 'mph');

        counter+=1;
        ////// Save Results /////////////
        if (car_pos >= car_posOld+10){
			car_posOld = car_pos;
			save_x.push(car_pos);
			save_v.push(vehSpeed);
			save_eff.push(Math.round(motor2eff*100));
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
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    }
	    /////////////////////////////////

	    ///// Fail Check ////////////////
	    if ((chassis.p.x<10)){
	    	demo.stop();
	    	//$('#runner').runner('stop');
	    	start_race = 0;
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
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    }
	    if (chassis.rot.x < 0){
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    }
	    if (battstatus < 0.01){
	    	battempty = true;
	    	if ((Math.abs(chassis.vx)<=2) && (car_pos<maxdist)){
	    		start_race = 0;
	    	}
	    }
	    else {
	    	battempty = false;
	    }
		
	    
///////////////////////////// use control //////////////////////////////////////////
        if (car_pos <= maxdist){
		    if (car_pos<=state[indx+1]){
	        	if (control[indx]==1){
	    	    	acc_sig = true;
	    	    	brake_sig = false;
	        	}
	        	else if(control[indx]==0){
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
	        }
	        else{
	    		indx = indx+1;
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
	
	GA = new ga(); // run ga
//	GA.run();
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