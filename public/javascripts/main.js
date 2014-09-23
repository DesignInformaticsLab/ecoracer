$("#StartScreen").width(scene_width);
$("#StartScreen").height(scene_height);
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

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
	//for (var i=0; i<stationPosX.length; i++){this.addStation(stationPosX[i],0);}
	
	
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
	
	Jw1 = wheel1.i;
	Jw2 = wheel2.i;
	
	wheel1moment = 1e10;
	wheel2moment = 1e10;
	
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
	
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
    
    cTime = Math.floor(counter/tstep);
    car_pos = Math.round(chassis.p.x*px2m); //-9.03
    car_pos9 = car_pos-9;
    // vehSpeed = Math.round(motor1speed/fr*Math.PI/30*wheel1.shapeList[0].r*px2m*2.23694*10)/10;
    // vehSpeed = Math.round(Math.sqrt(Math.pow(chassis.vx,2)+Math.pow(chassis.vy,2))*px2m*2.23694*10)/10;
    $("#timer").html(timeout-cTime);
    
    if(chassis.p.y<0){
    	demo.stop();
    	start_race = 0;
    	messagebox("Oops...",false);
    }
    if(start_race == 1){
        counter+=1;
        ////// Save Results /////////////
        /* if (car_pos9 >= car_posOld+5){
			car_posOld = car_pos9;
			save_x.push(car_pos9);
			save_v.push(vehSpeed);
		}
		if (car_pos9 >= 430){
			demo.stop();
		}*/
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
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    	if (!battempty){
	    		messagebox("Congratulations!",true);
	    	}
	    	else{
	    		messagebox("Good job but try to save battery!",false);
	    	}
	    }
	    /////////////////////////////////

	    ///// Fail Check ////////////////
	    if ((chassis.p.x<10)){
	    	demo.stop();
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("Can't go back! Please restart.",false);
	    }
	    if (cTime>timeout){
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
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("Time out! Please restart.",false);
	    }
	    if (chassis.rot.x < 0){
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("The driver is too drunk!",false);
	    }
	    //// Old Battery Check ////
	    /*if (battstatus < 0.01){
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
	    	//$('#runner').runner('stop');
	    	start_race = 0;
	    	messagebox("The battery is messed up!",false);
	    }*/
	    /////////////////////////
	    if (battstatus < 0.01){
	    	battempty = true;
	    	if ((Math.abs(chassis.vx)<=2) && (car_pos<maxdist)){
	    		start_race = 0;
		    	messagebox("The battery is messed up!",false);
	    	}
	    }
	    else {
	    	battempty = false;
	    }
		
	    
/////////////////////////////DP simulation //////////////////////////////////////////
        if (DPon){
		    if (car_pos<=DP_x[indx+1]){
	        	if (DP_comm[indx]==1){
	    	    	motor1.rate += acc_rate;
	    			motor2.rate += acc_rate;
	    			if(motor2.rate>max_rate1){motor2.rate=max_rate1;}
	    			if(motor1.rate>max_rate1){motor1.rate=max_rate1;}
	    			consumption = updateConsumption(consumption);
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
	    				wheel1.setMoment(wheel1moment);
	    				wheel2.setMoment(wheel2moment);
	    			}
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
		
		
		/*for (var i=0; i<stationPosX.length; i++){
			if (!isCharging && (chassis.p.x>=stationPosX[i]) && (chassis.p.x<stationPosX[i]+100)){
				isCharging = true;
				consumption = consumption - 10*3600*1000*max_batt/100; // add 10 percent battery
				
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
				
				
				lastCharingX = chassis.p.x;
			}
		}
		
		if (isCharging && (chassis.p.x > (lastCharingX+200))){
			isCharging = false;
		}*/
		battstatus = 100-(consumption/3600/1000/max_batt*100);
		document.getElementById("battvalue").style.width= battstatus + "%";
		
		$('#batttext').html(Math.round(battstatus*10)/10*(battstatus>0) + "%");

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
    	battstatus = 100-(consumption/3600/1000/max_batt*100);
		document.getElementById("battvalue").style.width= battstatus + "%";
    	$('#batttext').html(Math.round(battstatus*10)/10*(battstatus>0) + "%");
    };

};

//Run
demo = new scene();
demo.run();
var acc_keys = [];
var brake_keys = [];

//buttons
$(document).on("tap",function(event){
	event.preventDefault();
});
$(document).on("pageinit",function(event){
	$("#brake").addClass("enabled");
	$("#acc").addClass("enabled");
	$("#brake").on("touchstart",function(event){
		event.preventDefault();
		if($("#brake").hasClass("enabled")){
			brake_sig = true;
			$('#brake').addClass('activated');		
			brake_keys.push(Math.round(chassis.p.x));
		}
	});
	$("#acc").on("touchstart",function(event){
		event.preventDefault();
		if($("#acc").hasClass("enabled")){
			acc_sig = true;
			start_race = tap_start;
			$('#acc').addClass('activated');
			acc_keys.push(Math.round(chassis.p.x));
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
			brake_keys.push(Math.round(chassis.p.x));
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
			acc_keys.push(Math.round(chassis.p.x));
		}
	});
	$("#ok").on("tap",function(event){
		event.preventDefault();
		$("#messagebox").hide();
		$("#scorebox").hide();
		restart();
	});
	$("#restart").on("tap",function(event){
		event.preventDefault();
		$("#messagebox").hide();
		$("#scorebox").hide();
		restart();
	});
	$("#StartScreen").on("tap", function(event){
		event.preventDefault();
		if ($(window).width()>$(window).height()){
			$("#StartScreen").hide(500, function(){
				$("#brake").removeClass("locked");
				$("#acc").removeClass("locked");
				tap_start = 1;
				wheel1moment = Jw1;
				wheel2moment = Jw2;
				wheel1.setMoment(wheel1moment);
				wheel2.setMoment(wheel2moment);
				getBestScore();
			});
		}
		else{
			$('#landscape').show();
			lockScroll();
		}
	});
	
	initialize_design();
	$("#designbutton").on("tap", function(){
		$("#design").show();
	});
	$("#designed").on("tap", function(){
		$("#design").hide();
		restart();
	});	
});

demo.canvas.style.position = "absolute";
demo.canvas.style.left = "0px";