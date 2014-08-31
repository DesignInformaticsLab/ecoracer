// *********************** VISUAL *************************** //
var scene_width = $(window).width();
var scene_height = 440;

color_background = '#e9e9e9';
color_timer = '#000000';
var buttonR = 40;
var brakeX = 200;
var brakeY = 320;
var accX = scene_width-brakeX;
var accY = brakeY;
$('#brake-container').css('left',brakeX+'px');
$('#acc-container').css('right',brakeX+'px');
//*********************** VISUAL *************************** //


var DISPLACEMENT = 0;
var MARGIN = 175;

var v = cp.v;
var GRABABLE_MASK_BIT = 1 << 31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;
var scene_widthx = 6800; // ???m
var scene_heightx = 320;
var started = false;
var spdLookup = new Float64Array([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000]);
var trqLookup = new Float64Array([200,200,200,200,200,194,186,161,142,122,103,90,77.5,70,63.5,58,52,49,45]);
var tstep = 60;
var start_race = 0;
var wheel_speed;
var max_batt = 0.4; // Change this value
var battstatus = 100;

var accelerate_motor = false;
var brake = false;

//************************************************///
var vehSpeedOld = 0;
//**************************************************///

var motoreff = new Float64Array([0.2,0.46,0.65,0.735,0.794,0.846,0.886,0.913,0.922,0.938,0.946,0.94,0.93975,0.943,0.945,0.945,0.94,0.9372,0.9355]);

var DP_x = new Float64Array([0, 82+9, 282+9, 400]);
var DP_comm = new Float64Array([1, 0, -1, -1]);

var px2m = 1/20; // 1 pixel == 1/20 meter
var m2m = 500; // 1 mass in game to 500 kg
var t2t = 1; // 1 time step == 1/120 second
var consumption = 0;
var fr = 10; // final drive ratio
var fric = 2.8;
var timeout = 30; // 30s
var tstart = 5; // game starts after 5 sec
var indx = 0;
//var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var xstep = 200;
var ground = [];
var gndShape = [];
var finishFlag = [];
var finishShape = [];
var maxdist = 309;
$("#wrapper").width($(window).width());

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

var scene = function(){
	__ENVIRONMENT__.call(this);

	var space = this.space;
	var boxOffset;
	space.iterations = 10;
	space.gravity = v(0, -400);
	space.sleepTimeThreshold = 100;
	
	updateGround(space,data);
	
	$('#canvasbg')[0].width = scene_width;
	$('#canvasbg')[0].height = scene_height;
//	$('#canvasbg')[0].style.position = "absolute";
//	$('#canvasbg')[0].style.left = "0px";
//	var cv = $('#canvasbg')[0].getContext('2d');
//	cv.fillStyle = '#f9f9f9';
//	cv.rect(0,0,scene_width,scene_height);
//	cv.fill();
	
	
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
	boxOffset = v(100, 100);
	var POS_A = function() { return v.add(boxOffset, posA); };
	var POS_B = function() { return v.add(boxOffset, posB); };
	
	motorbar1 = addBar(posA);
	motorbar2 = addBar(posB);
	motorbar3 = addBar(posA);
	motorbar4 = addBar(posB);
	wheel1 = addWheel(posA);
	wheel2 = addWheel(posB);
	chassis = addChassis(v(80, 40));
	
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
	
	$('#runner').runner();
	$('#runner').runner('start');
	
	// parameters
	max_rate1 = 1e7; // motor 1 rate
	max_rate2 = 1e7; // motor 2 rate
	acc_rate = 1e7; // instant rate increment
	w_limit_rate = 1;
	
	wheel1moment = wheel1.i;
	wheel2moment = wheel2.i;
	
	// limits
	speed_limit = 56/px2m*t2t; // 100 m/s
	wheel1.w_limit = speed_limit/wheel1.shapeList[0].r;
	wheel2.w_limit = speed_limit/wheel2.shapeList[0].r;
	motorbar1.w_limit = 94*t2t; // max 700 rad/second
	motorbar2.w_limit = 94*t2t;
};

function updateGround(space, data){
	var staticBody = space.staticBody;
	var finishHeight = 200;
	
	for (var i=0;i<scene_widthx/xstep-3;i++){
		gndShape[i] = new cp.SegmentShape(staticBody, v(i*xstep,data[i]), v((i+1)*xstep,data[i+1]), 0);
		ground[i] = space.addShape(gndShape[i]);
		ground[i].setElasticity(0);
		ground[i].setFriction(0.1);
		ground[i].layers = NOT_GRABABLE_MASK;		
	}
	
	finishShape[0] = new cp.SegmentShape(staticBody, v(i*xstep,0), v((i)*xstep,finishHeight), 0);
	finishFlag[0] = space.addShape(finishShape[0]);
	finishFlag[0].sensor = true;
	finishShape[1] = new cp.SegmentShape(staticBody, v(i*xstep,finishHeight), v((i)*xstep+xstep/2,finishHeight), 0);
	finishFlag[1] = space.addShape(finishShape[1]);
	finishFlag[1].sensor = true;
	finishShape[2] = new cp.SegmentShape(staticBody, v(i*xstep,finishHeight/2), v((i)*xstep+xstep/3.5,finishHeight/2), 0);
	finishFlag[2] = space.addShape(finishShape[2]);
	finishFlag[2].sensor = true;
	
	for (var j=i; j<i+6; j++){
		gndShape[j] = new cp.SegmentShape(staticBody, v(j*xstep,data[i]), v((j+1)*xstep,data[i+1]), 0);
		ground[j] = space.addShape(gndShape[j]);
		ground[j].setElasticity(0);
		ground[j].setFriction(0.1);
		ground[j].layers = NOT_GRABABLE_MASK;		
	}
}

scene.prototype = Object.create(__ENVIRONMENT__.prototype);


scene.prototype.update = function (dt) {
    var steps = 1;
    dt = dt / steps;

    for (var i = 0; i < steps; i++) {
        this.space.step(dt);
    }
    /*if (chassis.p.x>scene_widthx){
    	this.stop();
    	$('#runner').runner('stop');
    	if (consumption<opt_consumption || isNaN(opt_consumption)){
    		$("#submit").show();
    		$("#thanks").html("<a>You beat the best score! HOW?!?!?!</a>");
    	}
    	else{
    		$("#thanks").html("<a>Nice try! Try HARDER!!!!!</a>");
    	}
    }*/
    
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    /////////////////////////////DP simulation //////////////////////////////////////////
    /*if($('#runner').text()>=5){
	    if (car_pos<=DP_x[indx+1]){
	    	if (DP_comm[indx]==1){
		    	motor1.rate += acc_rate;
				if(motor1.rate>max_rate1){motor1.rate=max_rate1;}
	    	}
	    	else if(DP_comm[indx]==0){
	    		motor1.rate = 0;
	    		motor2.rate = 0;
	    		wheel1.v_limit = Infinity;
	    		wheel2.v_limit = Infinity;
	    		wheel1.setMoment(wheel1moment);
	    		wheel2.setMoment(wheel2moment);
	    	}
	    	else{
	    		motor1.rate=0;
				motor2.rate=0;
				if(wheel1.w<-1){motor1.rate = 1*Math.max(wheel1.w,-3)*max_rate1;}
				else{motor1.rate=0; wheel1.setAngVel(0);}
				if (wheel1.w<-1 && wheel2.w<-1){
				/*	var con1 = Math.abs(motor1.jAcc*wheel1.w);
				    var con2 = Math.abs(motor2.jAcc*wheel2.w);
				    consumption -= (con1 + con2)*m2m*px2m*px2m/t2t/t2t; // T *dt * rad/s mass*distance^2/time^2			
				}
				else{
					wheel1.setMoment(7e1);
					wheel2.setMoment(7e1);
				}
	    	}
	    }
	    else{
			indx = indx+1;
	    }
    }*/
    if($('#runner').text()>=tstart){
    
    	if(!start_race){
    		cv = $('#canvasbg')[0].getContext('2d');
    		cv.beginPath();
    		cv.fillStyle = "#ffffff";
    		cv.rect(scene_width/2-2*buttonR,scene_height/2-2*buttonR,4.5*buttonR, 4*buttonR);
    		cv.fill();
    	}
//    	drawButtons(0.3, 0.3);
	    drawTimer(timeout, $('#runner').text(), tstart);
	    start_race = 1;
	    
	    //////////// Success ////////////
	    if (car_pos>=maxdist){
	    	this.stop();
	    	$('#runner').runner('stop');
	    }
	    /////////////////////////////////
	    
	    ///// Fail Check ////////////////
	    if ((chassis.p.x<10)){
	    	alert("Can't go back! Please restart.");
	    	this.stop();
	    	$('#runner').runner('stop');
	    }
	    if (($('#runner').text()-tstart)>timeout){
	    	alert("Time out! Please restart.");
	    	this.stop();
	    	$('#runner').runner('stop');
	    }
	    if (chassis.rot.x < 0){
	    	alert("Car flipped! Please restart.");
	    	this.stop();
	    	$('#runner').runner('stop');
	    }
	    if (battstatus < 0){
	    	alert("Battery dead! Please restart.");
	    	this.stop();
	    	$('#runner').runner('stop');
	    }
		//vehSpeed = motor1speed/fr*Math.PI/30*wheel1.shapeList[0].r*px2m*2.23694;
		fricImpl = -1*fric*(chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m)*wheel1.shapeList[0].r/tstep*wheel1.w/(Math.abs(wheel1.w)+0.0001);
		wheel1.w += fricImpl*wheel1.i_inv;
		wheel2.w += fricImpl*wheel2.i_inv;
		var pBar = document.getElementById("pbar");
		pBar.value = (car_pos-9)/(maxdist-9)*100;
		battstatus = 100-(consumption/3600/1000/max_batt*100);
		document.getElementById("battvalue").style.height= battstatus + "%";
		$('#batttext').html(Math.round(battstatus*10)/10 + "%");
		
		/////////////////////Motor Control/////////////////////////////////
		if (brake) {
			$('#brake').addClass('activated');
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
			}
			else{motor1.rate=0; motor2.rate = 0; wheel1.setAngVel(0); wheel2.setAngVel(0);}
			if (wheel_speed>1){
			}
			else{
				wheel1.setMoment(5e1);
				wheel2.setMoment(5e1);
			}
		}
		else if (accelerate_motor) {
			$('#acc').addClass('activated');
		    motor1.rate += acc_rate;
			motor2.rate += acc_rate;
			if(motor2.rate>max_rate1){motor2.rate=max_rate1;}
			if(motor1.rate>max_rate1){motor1.rate=max_rate1;}
			consumption = updateConsumption(consumption);
		}
	////////////////////////////////////////////////////////////////////////////
	
	lockScroll();
    }
    else {
    	cv = $('#canvasbg')[0].getContext('2d');
    	cv.beginPath();
    	cv.fillStyle = color_background;
    	cv.rect(scene_width/2-2*buttonR,scene_height/2-2*buttonR,4*buttonR, 4*buttonR);
    	cv.fill();
    	cv.font = "60px Arial";
    	cv.globalAlpha=1;
    	cv.lineWidth = "3";
    	cv.strokeStyle = color_timer;
    	if ($('#runner').text()<=tstart-0.6){
    		cv.strokeText(String(Math.round(tstart-($('#runner').text()))),scene_width/2-buttonR/3, scene_height/2+buttonR/3);
    	}
    	else{
    		cv.strokeText("Go!",scene_width/2-buttonR/3, scene_height/2+buttonR/3);
    	}
    	$('#batttext').html(Math.round(battstatus*10)/10 + "%");
    };

};

//Run
var demo = new scene();
demo.run();
var keys = [];

window.onorientationchange = function() { 
	  //Need at least 800 milliseconds
	  setTimeout(changeOrientation, 100);
	  };

document.body.addEventListener('touchstart', function(e){
	var touchobj = e.changedTouches[0]; // reference first touch point (ie: first finger)
	 startx = parseInt(touchobj.clientX); // get x position of touch point relative to left edge of browser
	 starty = parseInt(touchobj.clientY); // get y position of touch point relative to left edge of browser
	 e.preventDefault();
	 var distB = Math.max(Math.abs(startx-brakeX), Math.abs(starty-brakeY));
	 var distA = Math.max(Math.abs(startx-accX), Math.abs(starty-accY));
	 
	 accelerate_motor = (distA<=3*buttonR) && ($('#runner').text()>=5);
	 brake = (distB<=3*buttonR) && ($('#runner').text()>=5);
	 }, false);

document.body.addEventListener('touchend', function(e){
		$('#acc').removeClass('activated');
		$('#brake').removeClass('activated');
		motor1.rate = 0;
		motor2.rate = 0;
		wheel1.setAngVel(0);
		wheel2.setAngVel(0);
		wheel1.v_limit = Infinity;
		wheel2.v_limit = Infinity;
		wheel1.setMoment(wheel1moment);
		wheel2.setMoment(wheel2moment);
		brake = false;
		accelerate_motor = false;
	 }, false);

demo.canvas.style.position = "absolute";
demo.canvas.style.left = "0px";