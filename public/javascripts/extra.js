/************************ USER INTERFACE **********************************************/
// create a timer at the beginning
//function drawTimer(maxTime, now, delay){
//	var timerX = scene_width/2;
//	var timerY = buttonR*3;
//	var time = maxTime-Math.floor(now-delay);
//	cv = $('#canvasbg')[0].getContext('2d');
//	cv.globalAlpha=1;
//	cv.beginPath();
//	cv.rect(timerX-2*buttonR,0,4*buttonR, 5*buttonR);
//	cv.fillStyle = color_background;
//	cv.fill();
//	cv.beginPath(); 
//	cv.strokeStyle = color_timer;
//	cv.lineWidth = "8";
//	cv.arc(timerX, timerY, buttonR, 0, Math.PI*2*((now-delay))/maxTime, true);
//	cv.stroke();
//	cv.font = "40px Arial";
//	cv.fillStyle = color_timer;
//	cv.fillText(("0" + time).slice(-2),timerX-buttonR/1.8,timerY+buttonR/5);
//	cv.font = "20px Arial";
//	cv.fillText("sec",timerX-buttonR/2.7,timerY+buttonR/1.7);
//};

// message box
function messagebox(msg, win){
	$("#messagebox").show();
	$("#acc").removeClass("enabled");
	$("#brake").removeClass("enabled");
	$("#acc").removeClass("activated");
	$("#brake").removeClass("activated");
	if(win){
		submitResult();
		$("#ok-container").show();
	}
	else{
		$("#textmessage").html(msg);
		$("#restart-container").show();
	}
}

// restart
function restart(){
	
}


/************************ GAME ENGINE **********************************************/
// physics for this game
function maxTrqlerp(spd){
	var maxTrq = 8000;
	if (spd>0){
		for (var i=0; i<(spdLookup.length-1); i++){
			if(spdLookup[i]<=spd && spdLookup[i+1]>spd){
				maxTrq = (spd - spdLookup[i])/500*(trqLookup[i+1]-trqLookup[i])+trqLookup[i];
			}			
		}
	}
	else{
		maxTrq = 200;
	}	
	return maxTrq;
}

function efflerp(spd, trq){
	
	/*var posspd = Math.abs(spd);
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
	var efflerp = 0.95*((delspd+500)*(deltrq+10)/(5000)*Q11 - (delspd)*(deltrq+10)/(5000)*Q21 - (delspd+500)*(deltrq)/(5000)*Q12 + (delspd)*(deltrq)/(5000)*Q22); */
	
	var absspd = Math.abs(spd);
	var efflerp = 0.7;
	for (var i=0; i<(spdLookup.length-1); i++){
		if(spdLookup[i]<=absspd && spdLookup[i+1]>absspd){
			 efflerp = ((absspd - spdLookup[i])/500*(motoreff[i+1]-motoreff[i])+motoreff[i])*0.95;
		}			
	}
	
	if (spd*trq > 0){
		efflerp = 1/efflerp;
	}
	
	return efflerp;
}

function updateConsumption(consumption) {
    motor1speed = -1*wheel1.w/t2t*fr/2/Math.PI*60; //RPM;
    maxTrq1 = maxTrqlerp(motor1speed)/m2m/px2m/px2m*t2t*t2t; //Nm
    motor2speed = -1*wheel2.w/t2t*fr/2/Math.PI*60; //RPM;
    maxTrq2 = maxTrqlerp(motor2speed)/m2m/px2m/px2m*t2t*t2t; //Nm
	motor2.maxForce = maxTrq2*fr;
	motor1.maxForce = maxTrq1*fr;
	motor1torque = -1*Math.min(motor1.jAcc*tstep/fr,maxTrq1)*m2m*px2m*px2m/t2t/t2t;
	motor2torque = -1*Math.min(motor2.jAcc*tstep/fr,maxTrq2)*m2m*px2m*px2m/t2t/t2t;
	motor1eff = efflerp(motor1speed,motor1torque);
	motor2eff = efflerp(motor2speed,motor2torque);
	con1 = motor1torque/tstep*motor1speed*Math.PI/30*motor1eff;
	if (Math.abs(con1)> 216000){con1=1000;}
	con2 = motor2torque/tstep*motor2speed*Math.PI/30*motor2eff;
	if (Math.abs(con2)> 216000){con2=1000;}
	consumption += (con1 + con2);
	
	return consumption;
}

//An example of how to define a space,
//but if you just want to add bodies, shapes, etc and 
//do stuff with them then you should play with the code above.
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

 __ENVIRONMENT__.prototype.addFloor = function(data, scene_widthx, xstep) {
 	var space = this.space;
	var staticBody = space.staticBody;

	for (var i=0;i<scene_widthx/xstep-3;i++){
		gndShape[i] = new cp.SegmentShape(staticBody, v(i*xstep,data[i]), v((i+1)*xstep,data[i+1]), 0);
		ground[i] = space.addShape(gndShape[i]);
		ground[i].setElasticity(0);
		ground[i].setFriction(0.1);
		ground[i].layers = NOT_GRABABLE_MASK;		
	}
	
	// extra floor to complete the scene
	for (var j=i; j<i+6; j++){
		gndShape[j] = new cp.SegmentShape(staticBody, v(j*xstep,data[i]), v((j+1)*xstep,data[i+1]), 0);
		ground[j] = space.addShape(gndShape[j]);
		ground[j].setElasticity(0);
		ground[j].setFriction(0.1);
		ground[j].layers = NOT_GRABABLE_MASK;		
	}
 };
 
 __ENVIRONMENT__.prototype.addTerminal = function(distance){
	var space = this.space;
	var staticBody = space.staticBody;
	finishShape[0] = new cp.SegmentShape(staticBody, v(distance,0), v(distance,280), 0);
	finishFlag[0] = space.addShape(finishShape[0]);
	finishFlag[0].sensor = true;
}
 
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

// var springPoints = [
// 	v(0.00, 0.0),
// 	v(0.20, 0.0),
// 	v(0.25, 3.0),
// 	v(0.30,-6.0),
// 	v(0.35, 6.0),
// 	v(0.40,-6.0),
// 	v(0.45, 6.0),
// 	v(0.50,-6.0),
// 	v(0.55, 6.0),
// 	v(0.60,-6.0),
// 	v(0.65, 6.0),
// 	v(0.70,-3.0),
// 	v(0.75, 6.0),
// 	v(0.80, 0.0),
// 	v(1.00, 0.0)
// ];

 var drawSpring = function(ctx, scale, point2canvas, a, b) {
// 	a = point2canvas(a); b = point2canvas(b);
// 	
// 	ctx.beginPath();
// 	ctx.moveTo(a.x - DISPLACEMENT, a.y);
//
// 	var delta = v.sub(b, a);
// 	var len = v.len(delta);
// 	var rot = v.mult(delta, 1/len);
//
// 	for(var i = 1; i < springPoints.length; i++) {
//
// 		var p = v.add(a, v.rotate(v(springPoints[i].x * len, springPoints[i].y * scale), rot));
//
// 		//var p = v.add(a, v.rotate(springPoints[i], delta));
// 		
// 		ctx.lineTo(p.x - DISPLACEMENT, p.y);
// 	}
//
// 	ctx.stroke();
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
     
     if(this.sensor){
     	ctx.fillStyle = "rgba(0,0,0, 0.2)";
     	ctx.strokeStyle = "rgba(0,0,0, 0.2)";
 	}
 	else{
 		// car shape
// 		ctx.lineWidth = 5;
 		ctx.fillStyle = '#222222'; // max changed the color to fit the other elements
// 		ctx.strokeStyle = '#f9f9f9';
 	}
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
     if (this.sensor){
    	ctx.lineWidth = 10;
     	ctx.strokeStyle = "rgba(255,0,0, 0.2)";
     }
     else{
     	ctx.strokeStyle = "rgba(0,0,0, 1)";
     }
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
     ctx.fillStyle = "rgba(0,0,0, 1)";
     ctx.lineWidth = 5;
     ctx.strokeStyle = '#e9e9e9';
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
// 	var a = this.a.local2World(this.grv_a);
// 	var b = this.a.local2World(this.grv_b);
// 	var c = this.b.local2World(this.anchr2);
// 	
// 	ctx.strokeStyle = "grey";
// 	//drawLine(ctx, point2canvas, a, b);
// 	drawCircle(ctx, scale, point2canvas, c, 3);
 };

 cp.DampedSpring.prototype.draw = function(ctx, scale, point2canvas) {
// 	var a = this.a.local2World(this.anchr1);
// 	var b = this.b.local2World(this.anchr2);
//
// 	ctx.strokeStyle = "grey";
// 	drawSpring(ctx, scale, point2canvas, a, b);
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


/************************ UTILITIES **********************************************/
function getNumberArray(arr){
    var newArr = new Array();
    for(var i = 0; i < arr.length; i++){
        if(typeof arr[i] == "number"){
            newArr[newArr.length] = arr[i];
        }
    }
    return newArr;
}

function sign(x) { return x ? x < 0 ? -1 : 1 : 0; }

function changeOrientation(){
	switch(window.orientation) {
	case 0: // portrait, home bottom
      window.scrollTo(1,1);
      $('#landscape').show();
      lockScroll();
	  break;
	case 180: // portrait, home bottom
          window.scrollTo(1,1);
          $('#landscape').show();
          lockScroll();
		  break;
	 case -90: // landscape, home left
           $('#landscape').hide();
              lockScroll();
              break;
	 case 90: // landscape, home right
           $('#landscape').hide();
            lockScroll();
	 		break;
	  }
}

function lockScroll()
{
     $(document).bind("touchmove",function(event){
                        event.preventDefault();
     });
}


/************************ DYNAMIC PROGRAMMING SIMULATION **********************************************/
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