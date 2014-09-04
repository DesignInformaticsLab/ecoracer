// *********************** VISUAL *************************** //
var scene_width = $(window).width();
var scene_height = 440;

//*********************** VISUAL *************************** //
var DISPLACEMENT = 0;
var MARGIN = 175;

var v = cp.v;
var GRABABLE_MASK_BIT = 1 << 31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;
var scene_widthx = 6800; // ???m
var scene_heightx = 280;
var started = false;


var wheel_speed;
var max_batt = 0.4; // Change this value



var acc_sig = false;
var brake_sig = false;

//************************************************///
var vehSpeedOld = 0;
//**************************************************///



var DP_x = new Float64Array([0, 82+9, 282+9, 400]);
var DP_comm = new Float64Array([1, 0, -1, -1]);


var fric = 2.8;
var timeout = 30; // 30s
var tstart = 0; // game starts after 5 sec
var indx = 0;
//var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var xstep = 200;
var ground = [];
var gndShape = [];
var finishFlag = [];
var finishShape = [];
var maxdist = 309;
$("#StartScreen").width($(window).width());
$("#wrapper").width($(window).width());


var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

var scene = function(){
	__ENVIRONMENT__.call(this);

	var space = this.space;
	var boxOffset;
	space.iterations = 10;
	space.gravity = v(0, -400);
	space.sleepTimeThreshold = 100;
	
	this.addFloor(data, scene_widthx, xstep);
	this.addTerminal(scene_widthx-3*xstep);
	
	$('#canvasbg')[0].width = scene_width;
	$('#canvasbg')[0].height = scene_height;
	
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
	
	wheel1moment = wheel1.i;
	wheel2moment = wheel2.i;
	
	// limits
	speed_limit = 56/px2m*t2t; // 100 m/s
	wheel1.w_limit = speed_limit/wheel1.shapeList[0].r;
	wheel2.w_limit = speed_limit/wheel2.shapeList[0].r;
	motorbar1.w_limit = 94*t2t; // max 700 rad/second
	motorbar2.w_limit = 94*t2t;
};

scene.prototype = Object.create(__ENVIRONMENT__.prototype);


scene.prototype.update = function (dt) {
    var steps = 1;
    dt = dt / steps;

    for (var i = 0; i < steps; i++) {
        this.space.step(dt);
    }
    
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    $("#timer").html(Math.round(timeout-$("#runner").text()));
    
    if(start_race == 1){
	    
	    //////////// Success ////////////
	    if (car_pos>=maxdist){
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.v_limit = Infinity;
			wheel2.v_limit = Infinity;
			wheel1.setMoment(1e10);
			wheel2.setMoment(1e10);
			brake_sig = false;
			acc_sig = false;
	    	$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox('',true);
	    }
	    /////////////////////////////////
	    
	    ///// Fail Check ////////////////
	    if ((chassis.p.x<10)){
	    	demo.stop();
	    	$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("Can't go back! Please restart.",false);
	    }
	    if (($('#runner').text()-tstart)>timeout){
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.v_limit = Infinity;
			wheel2.v_limit = Infinity;
			wheel1.setMoment(1e10);
			wheel2.setMoment(1e10);
			brake_sig = false;
			acc_sig = false;
	    	$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("Time out! Please restart.",false);
	    }
	    if (chassis.rot.x < 0){
	    	$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("The driver is too drunk!",false);
	    }
	    if (battstatus < 0.01){
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.v_limit = Infinity;
			wheel2.v_limit = Infinity;
			wheel1.setMoment(1e10);
			wheel2.setMoment(1e10);
			brake_sig = false;
			acc_sig = false;
	    	$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("The battery is messed up!",false);
	    }
		//vehSpeed = motor1speed/fr*Math.PI/30*wheel1.shapeList[0].r*px2m*2.23694;
		fricImpl = -1*fric*(chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m)*wheel1.shapeList[0].r/tstep*wheel1.w/(Math.abs(wheel1.w)+0.0001);
		wheel1.w += fricImpl*wheel1.i_inv;
		wheel2.w += fricImpl*wheel2.i_inv;
		var pBar = document.getElementById("pbar");
		pBar.value = (car_pos-9)/(maxdist-9)*100;
		battstatus = 100-(consumption/3600/1000/max_batt*100);
		document.getElementById("battvalue").style.width= battstatus + "%";
		
		$('#batttext').html(Math.round(battstatus*10)/10 + "%");
		
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
			}
			else{motor1.rate=0; motor2.rate = 0; wheel1.setAngVel(0); wheel2.setAngVel(0);}
			if (wheel_speed>1){
			}
			else{
				wheel1.setMoment(5e1);
				wheel2.setMoment(5e1);
			}
		}
		else if (acc_sig) {
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
//    	cv = $('#canvasbg')[0].getContext('2d');
//    	cv.beginPath();
//    	cv.fillStyle = color_background;
//    	cv.rect(scene_width/2-2*buttonR,scene_height/2-2*buttonR,4*buttonR, 4*buttonR);
//    	cv.fill();
//    	cv.font = "60px Arial";
//    	cv.globalAlpha=1;
//    	cv.lineWidth = "3";
//    	cv.strokeStyle = color_timer;
//    	if ($('#runner').text()<=tstart-0.6){
//    		cv.strokeText(String(Math.round(tstart-($('#runner').text()))),scene_width/2-buttonR/3, scene_height/2+buttonR/3);
//    	}
//    	else{
//    		cv.strokeText("Go!",scene_width/2-buttonR/3, scene_height/2+buttonR/3);
//    	}
    	$('#batttext').html(Math.round(battstatus*10)/10 + "%");
    };

};

//Run
demo = new scene();
demo.run();
var keys = [];

//buttons
$(document).on("pageinit",function(event){
	$("#brake").addClass("enabled");
	$("#acc").addClass("enabled");
	$("#brake").on("touchstart",function(event){
		event.preventDefault();
		if($("#brake").hasClass("enabled")){
			brake_sig = true;
			$('#brake').addClass('activated');			
		}
	});
	$("#acc").on("touchstart",function(event){
		event.preventDefault();
		if($("#acc").hasClass("enabled")){
			acc_sig = true;
			$('#acc').addClass('activated');
		}
	});
	$("#brake").on("touchend",function(event){
		event.preventDefault();
		if($("#brake").hasClass("enabled")){
			brake_sig = false;
			$('#brake').removeClass('activated');
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.v_limit = Infinity;
			wheel2.v_limit = Infinity;
			wheel1.setMoment(wheel1moment);
			wheel2.setMoment(wheel2moment);
			brake_sig = false;
			acc_sig = false;
		}
	});
	$("#acc").on("touchend",function(event){
		event.preventDefault();
		if($("#acc").hasClass("enabled")){
			acc_sig = false;
			$('#acc').removeClass('activated');
			motor1.rate = 0;
			motor2.rate = 0;
			wheel1.setAngVel(0);
			wheel2.setAngVel(0);
			wheel1.v_limit = Infinity;
			wheel2.v_limit = Infinity;
			wheel1.setMoment(wheel1moment);
			wheel2.setMoment(wheel2moment);
			brake_sig = false;
			acc_sig = false;
		}
	});
	$("#ok").on("tap",function(event){
		event.preventDefault();
		$("#messagebox").hide();
		restart();
	});
	$("#restart").on("tap",function(event){
		event.preventDefault();
		$("#messagebox").hide();
		restart();
	});
	$("#StartScreen").on("tap", function(event){
		event.preventDefault();
		if ($(window).width()>$(window).height()){
			$("#StartScreen").hide(500, function(){
				$("#brake").removeClass("locked");
				$("#acc").removeClass("locked");
				$('#runner').runner();
				$('#runner').runner('start');
				start_race = 1;
				getBestScore();
			});
		}
		else{
			$('#landscape').show();
			lockScroll();
		}
	});
});

window.onorientationchange = function() { 
	  //Need at least 800 milliseconds
	  setTimeout(changeOrientation, 500);
};

demo.canvas.style.position = "absolute";
demo.canvas.style.left = "0px";