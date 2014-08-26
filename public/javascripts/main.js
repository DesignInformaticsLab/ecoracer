var DISPLACEMENT = 0;
var MARGIN = 175;

var v = cp.v;
var GRABABLE_MASK_BIT = 1 << 31;
var NOT_GRABABLE_MASK = ~GRABABLE_MASK_BIT;
var scene_width = 1280;
var scene_widthx = 6800; // ???m
var scene_heightx = 400;
var scene_height = 550;
var started = false;
var spdLookup = new Float64Array([0, 500, 1000, 1500, 2000, 2500, 3000, 3500, 4000, 4500, 5000, 5500, 6000, 6500, 7000, 7500, 8000, 8500, 9000]);
var trqLookup = new Float64Array([200,200,200,200,200,194,186,161,142,122,103,90,77.5,70,63.5,58,52,49,45]);
var tstep = 48;
var start_race = 0;
var wheel_speed;

var buttonR = 40;
var brakeX = 200;
var brakeY = 480;
var accX = scene_width-brakeX;
var accY = brakeY;
var accelerate_motor = false;
var brake = false;

//************************************************///
var chart1;
var chart2;
var chart3;
var gaugeData1;
var gaugeData2;
var gaugeData3;
var gaugeOptions1;
var gaugeOptions2;
var gaugeOptions3;
var vehSpeedOld = 0;
//**************************************************///

var motoreff = [];
/*motoreff[0] = new Float64Array([0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000,0.2000]);
motoreff[1] = new Float64Array([0.4600,0.5400,0.5800,0.6000,0.6000,0.6000,0.6100,0.6350,0.6500,0.6600,0.6800,0.6950,0.7000,0.7100,0.7200,0.7200,0.7200,0.7100,0.6800,0.6000,0.4000,0.6000,0.6800,0.7100,0.7200,0.7200,0.7200,0.7100,0.7000,0.6950,0.6800,0.6600,0.6500,0.6350,0.6100,0.6000,0.6000,0.6000,0.5800,0.5400,0.4600]);
motoreff[2] = new Float64Array([0.6500,0.6600,0.7000,0.7200,0.7420,0.7500,0.7650,0.7800,0.7860,0.8000,0.8040,0.8200,0.8250,0.8270,0.8270,0.8250,0.8220,0.8150,0.7850,0.7200,0.5000,0.7200,0.7850,0.8150,0.8220,0.8250,0.8270,0.8270,0.8250,0.8200,0.8040,0.8000,0.7860,0.7800,0.7650,0.7500,0.7420,0.7200,0.7000,0.6600,0.6500]);
motoreff[3] = new Float64Array([0.7350,0.7400,0.7690,0.7800,0.7980,0.8090,0.8210,0.8270,0.8400,0.8430,0.8500,0.8550,0.8540,0.8630,0.8650,0.8640,0.8580,0.8480,0.8200,0.7680,0.5300,0.7680,0.8200,0.8480,0.8580,0.8640,0.8650,0.8630,0.8540,0.8550,0.8500,0.8430,0.8400,0.8270,0.8210,0.8090,0.7980,0.7800,0.7690,0.7400,0.7350]);
motoreff[4] = new Float64Array([0.7940,0.7940,0.8110,0.8200,0.8400,0.8500,0.8690,0.8670,0.8770,0.8780,0.8820,0.8830,0.8810,0.8870,0.8880,0.8860,0.8820,0.8720,0.8590,0.8000,0.6200,0.8000,0.8590,0.8720,0.8820,0.8860,0.8880,0.8870,0.8810,0.8830,0.8820,0.8780,0.8770,0.8670,0.8690,0.8500,0.8400,0.8200,0.8110,0.7940,0.7940]);
motoreff[5] = new Float64Array([0.8460,0.8460,0.8500,0.8560,0.8680,0.8760,0.8830,0.8880,0.8940,0.8970,0.9010,0.9040,0.9020,0.9070,0.9060,0.9040,0.8960,0.8830,0.8610,0.8100,0.6400,0.8100,0.8610,0.8830,0.8960,0.9040,0.9060,0.9070,0.9020,0.9040,0.9010,0.8970,0.8940,0.8880,0.8830,0.8760,0.8680,0.8560,0.8500,0.8460,0.8460]);
motoreff[6] = new Float64Array([0.8860,0.8860,0.8860,0.8860,0.8920,0.8970,0.9010,0.9070,0.9080,0.9140,0.9170,0.9200,0.9230,0.9210,0.9180,0.9150,0.9080,0.8970,0.8720,0.8220,0.7000,0.8220,0.8720,0.8970,0.9080,0.9150,0.9180,0.9210,0.9230,0.9200,0.9170,0.9140,0.9080,0.9070,0.9010,0.8970,0.8920,0.8860,0.8860,0.8860,0.8860]);
motoreff[7] = new Float64Array([0.9130,0.9130,0.9130,0.9130,0.9130,0.9130,0.9120,0.9170,0.9210,0.9270,0.9300,0.9310,0.9310,0.9300,0.9270,0.9240,0.9160,0.9050,0.8800,0.8400,0.7200,0.8400,0.8800,0.9050,0.9160,0.9240,0.9270,0.9300,0.9310,0.9310,0.9300,0.9270,0.9210,0.9170,0.9120,0.9130,0.9130,0.9130,0.9130,0.9130,0.9130]);
motoreff[8] = new Float64Array([0.9220,0.9220,0.9220,0.9220,0.9220,0.9220,0.9220,0.9260,0.9320,0.9350,0.9400,0.9400,0.9400,0.9380,0.9360,0.9320,0.9250,0.9120,0.8860,0.8420,0.7500,0.8420,0.8860,0.9120,0.9250,0.9320,0.9360,0.9380,0.9400,0.9400,0.9400,0.9350,0.9320,0.9260,0.9220,0.9220,0.9220,0.9220,0.9220,0.9220,0.9220]);
motoreff[9] = new Float64Array([0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9410,0.9440,0.9460,0.9470,0.9480,0.9460,0.9430,0.9360,0.9210,0.9000,0.8590,0.6800,0.8590,0.9000,0.9210,0.9360,0.9430,0.9460,0.9480,0.9470,0.9460,0.9440,0.9410,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380]);
motoreff[10] = new Float64Array([0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9480,0.9510,0.9520,0.9510,0.9500,0.9470,0.9310,0.9090,0.8520,0.5800,0.8520,0.9090,0.9310,0.9470,0.9500,0.9510,0.9520,0.9510,0.9480,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460,0.9460]);
motoreff[11] = new Float64Array([0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9450,0.9510,0.9520,0.9480,0.9380,0.9100,0.8600,0.5700,0.8600,0.9100,0.9380,0.9480,0.9520,0.9510,0.9450,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400]);
motoreff[12] = new Float64Array([0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9450,0.9510,0.9530,0.9480,0.9400,0.9100,0.8500,0.5400,0.8500,0.9100,0.9400,0.9480,0.9530,0.9510,0.9450,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380,0.9380]);
motoreff[13] = new Float64Array([0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9470,0.9530,0.9500,0.9410,0.9200,0.8700,0.5800,0.8700,0.9200,0.9410,0.9500,0.9530,0.9470,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430,0.9430]);
motoreff[14] = new Float64Array([0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9500,0.9500,0.9430,0.9250,0.8820,0.6000,0.8820,0.9250,0.9430,0.9500,0.9500,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450]);
motoreff[15] = new Float64Array([0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9460,0.9400,0.9210,0.8820,0.5600,0.8820,0.9210,0.9400,0.9460,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450,0.9450]);
motoreff[16] = new Float64Array([0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9430,0.9380,0.9200,0.8800,0.5400,0.8800,0.9200,0.9380,0.9430,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400,0.9400]);
motoreff[17] = new Float64Array([0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9390,0.9340,0.9170,0.8800,0.5400,0.8800,0.9170,0.9340,0.9390,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370,0.9370]);
motoreff[18] = new Float64Array([0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9360,0.9320,0.9140,0.8800,0.5600,0.8800,0.9140,0.9320,0.9360,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350,0.9350]);*/
var DP_x = new Float64Array([0, 82+9, 282+9, 400]);
var DP_comm = new Float64Array([1, 0, -1, -1]);

var px2m = 1/20; // 1 pixel == 1/20 meter
var m2m = 500; // 1 mass in game to 500 kg
var t2t = 1; // 1 time step == 1/120 second
var consumption = 0;
var fr = 10; // final drive ratio
var fric = 2.8;
var timeout = 45; // 30s
var tstart = 5; // game starts after 5 sec
var indx = 0;
var data = [0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0,10,20,30,40,50,60,70,80,90,45,0,0,0,0,0,0];
var xstep = 200;
var ground = [];
var gndShape = [];

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
	$('#canvasbg')[0].style.position = "absolute";
	$('#canvasbg')[0].style.left = "0px";
	var cv = $('#canvasbg')[0].getContext('2d');
	cv.fillStyle = '#ffffff';
	cv.rect(0,0,scene_width,scene_height);
	cv.fill();
	
	
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
		
		var shape = space.addShape(new cp.BoxShape(body, width, height));
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
	max_torque1_br = 1000/m2m/px2m/px2m*t2t*t2t; // generator 400 Nm, mass *distance^2/time^2  
	max_torque2_br = 1000/m2m/px2m/px2m*t2t*t2t; 
	max_torque1 = 200/m2m/px2m/px2m*t2t*t2t; // motor 400 Nm, mass *distance^2/time^2  
	max_torque2 = 200/m2m/px2m/px2m*t2t*t2t; 
	//motor1.maxForce = max_torque1;
	//motor2.maxForce = max_torque2;
	
	max_power1 = 50e3/m2m/px2m/px2m*t2t*t2t*t2t; // motor 50kw, Tw = mass *distance^2/time^2 *round /time
	max_power2 = 50e3/m2m/px2m/px2m*t2t*t2t*t2t;
	wheel1moment = wheel1.i;
	wheel2moment = wheel2.i;
	
	// limits
	speed_limit = 100/px2m*t2t; // 100 m/s
	wheel1.w_limit = speed_limit/wheel1.shapeList[0].r;
	wheel2.w_limit = speed_limit/wheel2.shapeList[0].r;
	motorbar1.w_limit = 3000*t2t; // max 700 rad/second
	motorbar2.w_limit = 3000*t2t;
};

function updateGround(space, data){
	var staticBody = space.staticBody;
	//var step = 200;

	for (var i=0;i<scene_widthx/xstep-3;i++){
		gndShape[i] = new cp.SegmentShape(staticBody, v(i*xstep,data[i]), v((i+1)*xstep,data[i+1]), 0);
		ground[i] = space.addShape(gndShape[i]);
		ground[i].setElasticity(0);
		ground[i].setFriction(0.1);
		ground[i].layers = NOT_GRABABLE_MASK;		
	}
}

scene.prototype = Object.create(__ENVIRONMENT__.prototype);

scene.prototype.update = function (dt) {
    var steps = 1;
    dt = dt / steps;

    for (var i = 0; i < steps; i++) {
        this.space.step(dt);
    }
    if (chassis.p.x>scene_widthx){
    	this.stop();
    	$('#runner').runner('stop');
    	/*if (consumption<opt_consumption || isNaN(opt_consumption)){
    		$("#submit").show();
    		$("#thanks").html("<a>You beat the best score! HOW?!?!?!</a>");
    	}
    	else{
    		$("#thanks").html("<a>Nice try! Try HARDER!!!!!</a>");
    	}*/
    	submitResult();
    }
    else if (chassis.p.x<10){
    	this.stop();
    	$('#runner').runner('stop');
    }
    
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
    drawButtons(0.3, 0.3);
    drawTimer(timeout, $('#runner').text(), tstart);
    start_race = 1;
    if (car_pos>=309 || (($('#runner').text()-5)>timeout)){
    	this.stop();
    	$('#runner').runner('stop');
    	submitResult();
    }
	
    motor1speed = -1*wheel1.w/t2t*fr/2/Math.PI*60; //RPM;
    maxTrq1 = maxTrqlerp(motor1speed)/m2m/px2m/px2m*t2t*t2t; //Nm
    motor2speed = -1*wheel2.w/t2t*fr/2/Math.PI*60; //RPM;
    maxTrq2 = maxTrqlerp(motor2speed)/m2m/px2m/px2m*t2t*t2t; //Nm
	motor2.maxForce = maxTrq2*fr;
	motor1.maxForce = maxTrq1*fr;
	motor1torque = -1*Math.min(motor1.jAcc*tstep/fr,maxTrq1)*m2m*px2m*px2m/t2t/t2t;
	motor2torque = -1*Math.min(motor2.jAcc*tstep/fr,maxTrq2)*m2m*px2m*px2m/t2t/t2t;
	motor1eff = 1;
	motor2eff = 1;
	//motor1eff = efflerp(motor1speed,motor1torque);
	//motor2eff = efflerp(motor2speed,motor2torque);
	con1 = motor1torque/tstep*motor1speed*Math.PI/30*motor1eff;
	//con2 = motor2torque/tstep*motor2speed*Math.PI/30*motor2eff;
	con2 = 0;
	vehSpeed = motor1speed/fr*Math.PI/30*wheel1.shapeList[0].r*px2m*2.23694;
	consumption += (con1 + con2);
	fricImpl = -1*fric*(chassis.m + wheel1.m + wheel2.m + motorbar1.m + motorbar2.m)*wheel1.shapeList[0].r/tstep*wheel1.w/(Math.abs(wheel1.w)+0.0001);
	wheel1.w += fricImpl*wheel1.i_inv;
	wheel2.w += fricImpl*wheel2.i_inv;
	
	/////////////////////Motor Control/////////////////////////////////
	if (brake) {
	 	drawButtons(1, 0.3);
	 	motor1.rate = 0;
	 	motor2.rate = 0;
		wheel_speed = Math.abs(wheel1.w);
		//$('#position').html(sign(wheel1.w));
		if(wheel1.w<-1){
			motor1.rate = 1*Math.max(wheel1.w,-3)*max_rate1;
			motor2.rate = 1*Math.max(wheel1.w,-3)*max_rate1;
		}
		else if (wheel1.w>1){
			motor1.rate = 2*Math.min(wheel1.w,3)*max_rate1;
			motor2.rate = 2*Math.min(wheel1.w,3)*max_rate1;
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
	    drawButtons(0.3, 1);
		motor1.rate += acc_rate;
		if(motor1.rate>max_rate1){motor1.rate=max_rate1;}
	}
	////////////////////////////////////////////////////////////////////////////
	
	//$('#position').html(Math.round(consumption/3600/1000*10000)/10000);
	//$('#commnd').html(DP_comm[indx]);
	//$('#commnd').html(Math.round(motor1.rate));
	lockScroll();
    }
    else {
    	cv = $('#canvasbg')[0].getContext('2d');
    	cv.beginPath();
    	cv.fillStyle = "#ffffff";
    	cv.rect(scene_width/2-2*buttonR,scene_height/2-2*buttonR,4*buttonR, 4*buttonR);
    	cv.fill();
    	cv.font = "60px Arial";
    	cv.globalAlpha=1;
    	cv.lineWidth = "3";
    	cv.strokeStyle = "blue";
    	if ($('#runner').text()<=tstart-0.6){
    		cv.strokeText(String(Math.round(tstart-($('#runner').text()))),scene_width/2-buttonR/3, scene_height/2+buttonR/3);
    	}
    	else{
    		cv.strokeText("Go!",scene_width/2-buttonR/3, scene_height/2+buttonR/3);
    	}
    };
	//***************************************************************************************************************************************//

};
/*function getscore(){
	data = "action=get";
	var request = getRequestObject();
	request.onreadystatechange = function(){
		if ((request.readyState == 4) && (request.status == 200)) {
			var rawdata = request.responseText;
			if (rawdata === ""){opt_consumption = NaN;}
			else{
				var data = eval("(" + rawdata + ")");
				$("#rank").html("<a> Least consumption: "+ Math.round(data.score/3600)/1000 + "KWh by "+data.name+"</a>");
				opt_consumption = parseFloat(data.score);			
			}
		}
	};
	request.open("POST", "main", true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.send(data);	
}
$(function(){
	$(".button").click(function(e){
		e.preventDefault();
		uploadscore();
	});
});
function uploadscore(){
	var data = {"score":consumption,"name":$("#name")[0].value,"type":"test0114"};
	data = JSON.stringify(data);
	data = "data="+data+"&action=store";
	var request = getRequestObject();
	request.onreadystatechange = function(){
		if ((request.readyState == 4) && (request.status == 200)) {
			$("#submit").hide();
			$("#thanks").html("<a>Thank you! How about one more game!?!?!?</a>");
		}
	};
	request.open("POST", "main", true);
	request.setRequestHeader("Content-Type","application/x-www-form-urlencoded");
	request.send(data);		
}*/


//Run
var demo = new scene();
demo.run();
var keys = [];


document.body.addEventListener('touchstart', function(e){
	var touchobj = e.changedTouches[0]; // reference first touch point (ie: first finger)
	 startx = parseInt(touchobj.clientX); // get x position of touch point relative to left edge of browser
	 starty = parseInt(touchobj.clientY); // get y position of touch point relative to left edge of browser
	 e.preventDefault();
	 var distB = Math.max(Math.abs(startx-brakeX), Math.abs(starty-brakeY));
	 var distA = Math.max(Math.abs(startx-accX), Math.abs(starty-accY));
	 
	//$('#position').html(Math.round(startx));
	//$('#commnd').html(Math.round(starty));
	 
	 //var accelerate_motor = (startx>2*scene_width/3) && ($('#runner').text()>=5);
	 //var brake = (startx<=scene_width/3) && ($('#runner').text()>=5);
	 accelerate_motor = (distA<=3*buttonR) && ($('#runner').text()>=5);
	 brake = (distB<=3*buttonR) && ($('#runner').text()>=5);
	 }, false);

document.body.addEventListener('touchend', function(e){
	    drawButtons(0.3, 0.3);
		motor1.rate = 0;
		motor2.rate = 0;
		wheel1.setAngVel(0);
		wheel2.setAngVel(0);
		wheel1.v_limit = Infinity;
		wheel2.v_limit = Infinity;
		wheel1.setMoment(wheel1moment);
		wheel2.setMoment(wheel2moment);
		//motor1.maxForce = maxTrq1*fr;
		//motor2.maxForce = maxTrq2*fr;
		brake = false;
		accelerate_motor = false;
	 }, false);

function drawTimer(maxTime, now, delay){
	var timerX = scene_width/2;
	var timerY = buttonR*3;
	var time = maxTime-Math.floor(now-delay);
	cv = $('#canvasbg')[0].getContext('2d');
	cv.globalAlpha=1;
	//cv.clearRect(timerX-2*buttonR,0,4*buttonR, 5*buttonR);
	//cv.fillStyle = "#ffffff";
	cv.beginPath();
	cv.rect(timerX-2*buttonR,0,4*buttonR, 5*buttonR);
	cv.fillStyle = "#ffffff";
	cv.fill();
	cv.beginPath(); 
	cv.strokeStyle = "blue";
	cv.lineWidth = "8";
	cv.arc(timerX, timerY, buttonR, 0, Math.PI*2*((now-delay))/maxTime, true);
	cv.stroke();
	cv.font = "40px Arial";
	cv.fillStyle = "blue";
	cv.fillText(("0" + time).slice(-2),timerX-buttonR/1.8,timerY+buttonR/5);
	cv.font = "20px Arial";
	cv.fillText("sec",timerX-buttonR/2.7,timerY+buttonR/1.7);
};

function drawButtons(brakeTrans, accTrans){
	cv = $('#canvasbg')[0].getContext('2d');
	cv.fillStyle = "#ffffff";
	cv.beginPath();
	cv.rect(0,brakeY-buttonR*1.5,scene_width, 3*buttonR);
	cv.fill();
	cv.beginPath(); 
	cv.strokeStyle = "red";
	cv.globalAlpha=brakeTrans;
	cv.lineWidth = "6";
	cv.arc(brakeX, brakeY, buttonR, 0, Math.PI*2, true);
	cv.stroke();
	cv.font = "40px Arial";
	cv.fillStyle = "red";
	cv.fillText("B",brakeX-buttonR/3,brakeY+buttonR/3);
	cv.globalAlpha=Math.round(brakeTrans);
	cv.arc(brakeX, brakeY, 1.2*buttonR, 0, Math.PI*2, true);
	cv.stroke();
	cv.arc(brakeX, brakeY, 1.4*buttonR, 0, Math.PI*2, true);
	cv.stroke();

	cv.beginPath(); 
	cv.strokeStyle = "green";
	cv.globalAlpha=accTrans;
	cv.lineWidth = "6";
	cv.arc(accX, accY, buttonR, 0, Math.PI*2, true); 
	cv.stroke();
	cv.fillStyle = "green";
	cv.fillText("A",accX-buttonR/3,accY+buttonR/3);

	cv.globalAlpha=Math.round(accTrans);
	cv.arc(accX, accY, 1.2*buttonR, 0, Math.PI*2, true);
	cv.arc(accX, accY, 1.4*buttonR, 0, Math.PI*2, true);
	cv.stroke();
};

function getNumberArray(arr){
    var newArr = new Array();
    for(var i = 0; i < arr.length; i++){
        if(typeof arr[i] == "number"){
            newArr[newArr.length] = arr[i];
        }
    }
    return newArr;
}

function maxTrqlerp(spd){
	var maxTrq = 8000;
	//var spdRan = 8000;
	if (spd>0){
		for (var i=0; i<(spdLookup.length-1); i++){
			if(spdLookup[i]<=spd && spdLookup[i+1]>spd){
				maxTrq = (spd - spdLookup[i])/500*(trqLookup[i+1]-trqLookup[i])+trqLookup[i];
				//spdRan = spdLookup[i];
			}			
		}
	}
	else{
		maxTrq = 200;
	}	
	return maxTrq;
}

function efflerp(spd, trq){
	var posspd = Math.abs(spd);
	var spdind = Math.min(Math.floor(posspd/500),17);
	var spdlow = spdind*500;
	var trqind = Math.min(Math.floor(trq/10),19);
	var trqlow = trqind*10;
	var Q11 = motoreff[spdind][trqind+20];
	var Q12 = motoreff[spdind][trqind+21];

	var Q21 = motoreff[spdind+1][trqind+20];

	var Q22 = motoreff[spdind+1][trqind+21];
	var delspd = spdlow - posspd;
	var deltrq = trqlow - trq;
	var efflerp = 0.95*((delspd+500)*(deltrq+10)/(5000)*Q11 - (delspd)*(deltrq+10)/(5000)*Q21 - (delspd+500)*(deltrq)/(5000)*Q12 + (delspd)*(deltrq)/(5000)*Q22); 
	
	if (spd*trq > 0){
		efflerp = 1/efflerp;
	}
	
	return efflerp;
}

function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

demo.canvas.style.position = "absolute";
demo.canvas.style.left = "0px";


// An example of how to define a space,
// but if you just want to add bodies, shapes, etc and 
// do stuff with them then you should play with the code above.
function defineSpace(canvas_id, width, height) {
    var __ENVIRONMENT__ = function () {
        //Initialize
        var space = this.space = new cp.Space();
        this.mouse = v(0, 0);

        var self = this;
        var canvas2point = this.canvas2point = function (x, y) {
            var rect = canvas.getBoundingClientRect(); //so canvas can be anywhere on the page
            return v((x / self.scale) - rect.left, height - y / self.scale + rect.top);
        };

        this.point2canvas = function (point) {
            return v(point.x * self.scale, (height - point.y) * self.scale);
        };

        this.canvas.onmousemove = function (e) {
            self.mouse = canvas2point(e.clientX, e.clientY);
        };

        var mouseBody = this.mouseBody = new cp.Body(Infinity, Infinity);
        this.canvas.oncontextmenu = function (e) {
            return false;
        };

        this.canvas.onmousedown = function (e) {
            e.preventDefault();
            var rightclick = e.which === 3; // or e.button === 2;
            self.mouse = canvas2point(e.clientX, e.clientY);

            if (!rightclick && !self.mouseJoint) {
                var point = canvas2point(e.clientX, e.clientY);

                var shape = space.pointQueryFirst(point, GRABABLE_MASK_BIT, cp.NO_GROUP);
                if (shape) {
                    var body = shape.body;
                    var mouseJoint = self.mouseJoint = new cp.PivotJoint(mouseBody, body, v(0, 0), body.world2Local(point));

                    mouseJoint.maxForce = 50000;
                    mouseJoint.errorBias = Math.pow(1 - 0.15, 60);
                    space.addConstraint(mouseJoint);
                }
            }

            if (rightclick) {
                self.rightClick = true;
            }
        };

        this.canvas.onmouseup = function (e) {
            var rightclick = e.which === 3; // or e.button === 2;
            self.mouse = canvas2point(e.clientX, e.clientY);

            if (!rightclick) {
                if (self.mouseJoint) {
                    space.removeConstraint(self.mouseJoint);
                    self.mouseJoint = null;
                }
            }

            if (rightclick) {
                self.rightClick = false;
            }
        };
    };

    
    var canvas = __ENVIRONMENT__.prototype.canvas = document.getElementById(canvas_id);
    var ctx = __ENVIRONMENT__.prototype.ctx = canvas.getContext('2d');

    
    //Resize
    var w = __ENVIRONMENT__.prototype.width = canvas.width = width;
    var h = __ENVIRONMENT__.prototype.height = canvas.height = height;
    __ENVIRONMENT__.prototype.scale = 1.0;
    __ENVIRONMENT__.resized = true;


    // Update, should be overridden by the demo itself.
    __ENVIRONMENT__.prototype.update = function (dt) {
        this.space.step(dt);
    };


    // Draw
    __ENVIRONMENT__.prototype.draw = function () {
    	
    	DISPLACEMENT = chassis.p.x - MARGIN;
    	
        var ctx = this.ctx;
        var self = this;

        // Draw shapes
        ctx.strokeStyle = 'black';
        ctx.clearRect(0, 0, this.width, this.height);

        this.space.eachShape(function (shape) {
            ctx.fillStyle = shape.style();
            shape.draw(ctx, self.scale, self.point2canvas);
        });

        if (this.mouseJoint) {
            ctx.beginPath();
            var c = this.point2canvas(this.mouseBody.p);
            ctx.arc(c.x, c.y, this.scale * 5, 0, 2 * Math.PI, false);
            ctx.fill();
            ctx.stroke();
        }

        this.space.eachConstraint(function (c) {
            if (c.draw) {
                c.draw(ctx, self.scale, self.point2canvas);
            }
        });
    };


    // Run
    __ENVIRONMENT__.prototype.run = function () {
        this.running = true;

        var self = this;

        var lastTime = 0;
        var step = function (time) {
            self.step(time - lastTime);
            lastTime = time;

            if (self.running) {
                requestAnimationFrame(step);
            }
        };

        step(0);
    };


    // Stop
    __ENVIRONMENT__.prototype.stop = function () {
        this.running = false;
    };


    // Step
    __ENVIRONMENT__.prototype.step = function (dt) {
        // Move mouse body toward the mouse
        var newPoint = v.lerp(this.mouseBody.p, this.mouse, 0.25);
        this.mouseBody.v = v.mult(v.sub(newPoint, this.mouseBody.p), 60);
        this.mouseBody.p = newPoint;

        var lastNumActiveShapes = this.space.activeShapes.count;

        var now = Date.now();
        this.update(1/tstep);
        this.simulationTime += Date.now() - now;

        // Only redraw if the simulation isn't asleep.
        if (lastNumActiveShapes > 0 || __ENVIRONMENT__.resized) {
            now = Date.now();
            this.draw();
            this.drawTime += Date.now() - now;
            __ENVIRONMENT__.resized = false;
        }
    };

    __ENVIRONMENT__.prototype.addFloor = function() {
    	var space = this.space;
    	var floor = space.addShape(new cp.SegmentShape(space.staticBody, v(0, 0), v(1000, 0), 0));
    	floor.setElasticity(1);
    	floor.setFriction(1);
    	floor.setLayers(NOT_GRABABLE_MASK);
    };
    
 // Drawing helper methods

    var drawCircle = function(ctx, scale, point2canvas, c, radius) {
    	var c = point2canvas(c);
    	ctx.beginPath();
    	ctx.arc(c.x - DISPLACEMENT, c.y, scale * radius, 0, 2*Math.PI, false);
    	ctx.fill();
    	ctx.stroke();
    };

    var drawLine = function(ctx, point2canvas, a, b) {
    	a = point2canvas(a); b = point2canvas(b);

    	ctx.beginPath();
    	ctx.moveTo(a.x - DISPLACEMENT, a.y);
    	ctx.lineTo(b.x - DISPLACEMENT, b.y);
    	ctx.stroke();
    };

    var drawRect = function(ctx, point2canvas, pos, size) {
    	var pos_ = point2canvas(pos);
    	var size_ = cp.v.sub(point2canvas(cp.v.add(pos, size)), pos_);
    	ctx.fillRect(pos_.x - DISPLACEMENT, pos_.y, size_.x - DISPLACEMENT, size_.y);
    };

    var springPoints = [
    	v(0.00, 0.0),
    	v(0.20, 0.0),
    	v(0.25, 3.0),
    	v(0.30,-6.0),
    	v(0.35, 6.0),
    	v(0.40,-6.0),
    	v(0.45, 6.0),
    	v(0.50,-6.0),
    	v(0.55, 6.0),
    	v(0.60,-6.0),
    	v(0.65, 6.0),
    	v(0.70,-3.0),
    	v(0.75, 6.0),
    	v(0.80, 0.0),
    	v(1.00, 0.0)
    ];

    var drawSpring = function(ctx, scale, point2canvas, a, b) {
    	a = point2canvas(a); b = point2canvas(b);
    	
    	ctx.beginPath();
    	ctx.moveTo(a.x - DISPLACEMENT, a.y);

    	var delta = v.sub(b, a);
    	var len = v.len(delta);
    	var rot = v.mult(delta, 1/len);

    	for(var i = 1; i < springPoints.length; i++) {

    		var p = v.add(a, v.rotate(v(springPoints[i].x * len, springPoints[i].y * scale), rot));

    		//var p = v.add(a, v.rotate(springPoints[i], delta));
    		
    		ctx.lineTo(p.x - DISPLACEMENT, p.y);
    	}

    	ctx.stroke();
    };

    
    // **** Draw methods for Shapes
    cp.PolyShape.prototype.draw = function (ctx, scale, point2canvas) {
        ctx.beginPath();

        var verts = this.tVerts;
        var len = verts.length;
        var lastPoint = point2canvas(new cp.Vect(verts[len - 2], verts[len - 1]));
        ctx.moveTo(lastPoint.x - DISPLACEMENT, lastPoint.y);

        for (var i = 0; i < len; i += 2) {
            var p = point2canvas(new cp.Vect(verts[i], verts[i + 1]));
            ctx.lineTo(p.x - DISPLACEMENT, p.y);
        }
        ctx.fillStyle = "aqua";
        ctx.fill();
        ctx.stroke();
    };

    cp.SegmentShape.prototype.draw = function (ctx, scale, point2canvas) {
        var oldLineWidth = ctx.lineWidth;
        //ctx.lineWidth = Math.max(1, this.r * scale * 2);
        ctx.lineWidth = 10;
        var a = this.ta;
        var b = this.tb;
        a = point2canvas(a);
        b = point2canvas(b);
        ctx.beginPath();
        ctx.moveTo(a.x - DISPLACEMENT, a.y);
        ctx.lineTo(b.x - DISPLACEMENT, b.y);
        ctx.stroke();

        ctx.lineWidth = oldLineWidth;
    };

    cp.CircleShape.prototype.draw = function (ctx, scale, point2canvas) {
        var c = point2canvas(this.tc);
        ctx.beginPath();
        ctx.arc(c.x - DISPLACEMENT, c.y, scale * this.r, 0, 2*Math.PI, false);
        ctx.fillStyle = "grey"
        ctx.fill();
        ctx.stroke();
        
        // And draw a little radian so you can see the circle roll.
        a = point2canvas(this.tc); b = point2canvas(cp.v.mult(this.body.rot, this.r).add(this.tc));
        ctx.beginPath();
        ctx.moveTo(a.x - DISPLACEMENT, a.y);
        ctx.lineTo(b.x - DISPLACEMENT, b.y);
        ctx.stroke();
    };

    cp.GrooveJoint.prototype.draw = function(ctx, scale, point2canvas) {
    	var a = this.a.local2World(this.grv_a);
    	var b = this.a.local2World(this.grv_b);
    	var c = this.b.local2World(this.anchr2);
    	
    	ctx.strokeStyle = "grey";
    	//drawLine(ctx, point2canvas, a, b);
    	drawCircle(ctx, scale, point2canvas, c, 3);
    };

    cp.DampedSpring.prototype.draw = function(ctx, scale, point2canvas) {
    	var a = this.a.local2World(this.anchr1);
    	var b = this.b.local2World(this.anchr2);

    	ctx.strokeStyle = "grey";
    	drawSpring(ctx, scale, point2canvas, a, b);
    };
    
    // Color
    var randColor = function () {
        return Math.floor(Math.random() * 256);
    };

    var styles = [];
    for (var i = 0; i < 100; i++) {
        styles.push("rgb(" + randColor() + ", " + randColor() + ", " + randColor() + ")");
    }

    cp.Shape.prototype.style = function () {
        var body;
        if (this.sensor) {
            return "rgba(255,255,255,0)";
        } else {
            body = this.body;
            if (body.isSleeping()) {
                return "rgb(50,50,50)";
            } else if (body.nodeIdleTime > this.space.sleepTimeThreshold) {
                return "rgb(170,170,170)";
            } else {
                return styles[this.hashid % styles.length];
            }
        }
    };
    
    return __ENVIRONMENT__;
}


function getRequestObject() {
	  if (window.XMLHttpRequest) {
	    return(new XMLHttpRequest());
	  } else if (window.ActiveXObject) { 
	    return(new ActiveXObject("Microsoft.XMLHTTP"));
	  } else {
	    return(null); 
	  }
}