var scene_width = $(window).width();
var scene_height = $(window).height();
$("#wrapper").width(scene_width);
$("#wrapper").height(scene_height);

var __ENVIRONMENT__ = defineSpace("canvas1", scene_width, scene_heightx);

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
    	if(acc_sig && !battempty){
        	$("#effval").html("Motor Efficiency: "+Math.round(motor2eff*100)+'%');
    	}
    	else{
        	$("#effval").html("Motor Efficiency: "+'--%');
    	}
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
		
	    
/////////////////////////////DP simulation //////////////////////////////////////////
        if (control && (car_pos <= maxdist)){
		    if (car_pos<=control_x[indx+1]){
	        	if (control_comm[indx]==1){
	    	    	acc_sig = true;
	    	    	brake_sig = false;

	        	}
	        	else if(control_comm[indx]==0){
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
				$("#effval").html("Motor Efficiency: "+Math.round(motor2eff*100)+'%');
			}
			else if (wheel1.w>3){
				motor1.rate = 2*Math.min(wheel1.w,2)*max_rate1;
				motor2.rate = 2*Math.min(wheel1.w,2)*max_rate1;
                consumption = -1*updateConsumption(-1*consumption);
				$("#effval").html("Motor Efficiency: "+"--%"); motor2eff = 0;
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
			$("#effval").html("Motor Efficiency: "+Math.round(motor2eff*100)+'%');
		}
		else {
			$("#effval").html("Motor Efficiency: "+"--%"); motor2eff = 0;motor1.rate = 0;motor2.rate = 0;
		}
	////////////////////////////////////////////////////////////////////////////
	
	lockScroll();
    }
    else {
    	battstatus = Math.round(1000-(consumption/3600/1000/max_batt*1000))/10;
		document.getElementById("battvalue").style.width= battstatus + "%";
    	$('#batttext').html(battstatus + "%");
        $("#speedval").html('Speed: 0mph');
        $("#effval").html("Motor Efficiency: "+"--%");
    };

};

//Run
var start_race = true;
var DPon = true;
//var DP_x = new Float64Array([0,210,215,230,245,255,295,305,330,335,345,350,385,410,415,420,475,480,540,545,845,850,860, 950]);
var DP_x = new Float64Array([0,210,215,230,245,255,295,305,330,335,345,350,385,410,415,420,475,480,540,545,845,850,860, 950]);
var DP_comm = new Float64Array([1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,1,0,-1,0,-1,-1]);
var DP_fr = 18;
var user;
var user_fr;
var user_x;
var user_comm;
//for now, just use the best player at 11.09.2014
//{"acc":[179,2375,2768,5794,11352,12419],"brake":[15599,16044,17102]}
user = false;
user_fr = 18;
//var x = [179,2375,2768,5794,11352,12419,  15599,16044,17102,  909*20];
var x = [179,2375+20,2768,5794,11352,12419,  15599,16044,17102+20,  909*20];
user_x = [];
$.each(x,function(i,d){
	var a = Math.round(d*px2m); //-9.03
	a = a -9;
	user_x.push(a);});
user_comm = [1,0,1,0,1,0,-1,0,-1,-1];

if (user){
	var control = user;
	var control_x = user_x;
	var control_comm = user_comm;
	var fr = user_fr;	
}
else if (DPon){
	var control = DPon;
	var control_x = DP_x;
	var control_comm = DP_comm;
	var fr = DP_fr;		
}
		

demo = new scene();
demo.run();

$(document).on("pageinit",function(event){
	wheel1moment = Jw1;
	wheel2moment = Jw2;
	wheel1.setMoment(wheel1moment);
	wheel2.setMoment(wheel2moment);
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
	drawLandscape();
	
//	$.post('/getresults',{'n':1}, function(data){
//		user = true;
//		var d = $.parseJSON(data[0].keys);
//		var acc = d.acc;
//		var brake = d.brake;
//		user_fr = d.finaldrive;
//		// fix double click issue
//		if (acc[1]==acc[0]){//data corrupted by double clicks
//			acc_copy = [];
//			brake_copy = [];
//			for(j=0;j<acc.length;j++){
//				if ((j+2)%2==0){
//					acc_copy.push(acc[j]);
//				}
//			}
//			for(j=0;j<brake.length;j++){
//				if ((j+2)%2==0){
//					brake_copy.push(brake[j]);
//				}
//			}
//			acc = acc_copy;
//			brake = brake_copy;
//		}
//		// convert to the same format as for DP
//	});	
});

demo.canvas.style.position = "absolute";
demo.canvas.style.left = "0px";



$(window).resize(function(){
	scene_width = $(window).width();
	scene_height = $(window).height();
	$("#wrapper").width(scene_width);
	$("#wrapper").height(scene_height);
	$('#canvasbg')[0].width = scene_width;
	$('#canvasbg')[0].height = 40;
	w = demo.width = demo.canvas.width = scene_width;
});