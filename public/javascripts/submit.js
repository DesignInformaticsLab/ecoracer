function submitResult(c){
	// get date
	var date = new Date();
	var ranking_percentage = 0;
	var ranking_scoreboard = -1;
	if(c>0){// successful
		c = Math.round(c);
		$.post('/getscore',{'score':c}, function(data){
			ranking_percentage = Math.round(parseInt(data[0].count)/total_num_user*100)||0;
			$("#textmessage").html("You saved "+ Math.round(100-(c/3600/1000/max_batt*100)) + 
					" % of energy, that's better than "+ ranking_percentage + "% of plays!");
			// show top 5 scores
			$("#scorebox").empty();
			$("#scorebox").append("TOP SCORES");
			var count = 1;
			var addedyou = false;
			if(typeof score !== "undefined"){
				for(var i=0;i<Math.min(5,score.length);i++){
					if (count<=5){
						if (score[i]<c || addedyou){
							$("#scorebox").append("<div class='score'>"+(count)+". " + Math.round(1000-(score[i]/3600/1000/max_batt*1000))/10 + "%<\div>");
						}
						else{
							$("#scorebox").append("<div class='score'>"+(count)+". " + Math.round(1000-(c/3600/1000/max_batt*1000))/10 + "% (YOU)<\div>");
							ranking_scoreboard = count;
							addedyou = true;
						}
						count += 1;		
					}
				}
				if(score.length<5 && !addedyou){
					$("#scorebox").append("<div class='score'>"+(score.length+1)+". " + Math.round(1000-(c/3600/1000/max_batt*1000))/10 + "% (YOU)<\div>");
				}			
			}

			// post results
			$.post('/adddata',{'userid':U.id,
							   'score':c,
							   'keys':JSON.stringify({'acc':acc_keys,'brake':brake_keys}),
		   					   'finaldrive':fr,
		   					   'ranking_percentage': ranking_percentage, 
		   					   'ranking_scoreboard': ranking_scoreboard});	
		});		
	}
	else{// failed
		c=-1;
		// show top 5 scores
		$("#scorebox").empty();
		$("#scorebox").append("TOP SCORES");
		if(typeof score !== "undefined"){
			for(var i=0;i<Math.min(5,score.length);i++){
				$("#scorebox").append("<div class='score'>"+(i)+". " + Math.round(1000-(score[i]/3600/1000/max_batt*1000))/10 + "%<\div>");
			}
		}
		// post results
		$.post('/adddata',{'userid':U.id,
						   'score':c,
						   'keys':JSON.stringify({'acc':acc_keys,'brake':brake_keys}),
	   					   'finaldrive':fr,
	   					   'ranking_percentage': ranking_percentage, 
	   					   'ranking_scoreboard': ranking_scoreboard});	
	}
}

function getBestScore(){
	total_num_user = 0;
	score = [];
	$.get('/bestscore',{}, function(data){
		score = data.bestscore;
		total_num_user = parseInt(data.total_num_user);
	});	
}

var userData;
function getAllResults(){
	var d, i;
	$.post('/getresults',{}, function(data){
		userData = data;
		for(i=0;i<data.length;i++){
			d = data[i];
			$("#results").append("<div class=data id=data"+i+"></div>");
			plot(d,i);
		}
	});	
}

$(".data").on('tap', function(){
	var id = parseInt($(this).id.slice(4));
//	simulate(userData[id]);
});


// plot user control strategy and consumption
function plot(d,i){
	var padding = 20;//px
	var svg_length = $("#data"+i).width();//px
	var svg_height = $("#data"+i).height();//px
	
	var j;
	var data = $.parseJSON(d.keys);
	var acc = data.acc;
	var brake = data.brake;
	
	// fix double click issue
	if (acc[1]==acc[0]){//data corrupted by double clicks
		acc_copy = [];
		brake_copy = [];
		for(j=0;j<acc.length;j++){
			if ((j+2)%2==0){
				acc_copy.push(acc[j]);
			}
		}
		for(j=0;j<brake.length;j++){
			if ((j+2)%2==0){
				brake_copy.push(brake[j]);
			}
		}
		acc = acc_copy;
		brake = brake_copy;
	}
	
	
	var total_distance = 909*20; // *** change this to an equation
	var accData = [];
	for (j=0;j<Math.floor(acc.length/2);j++){
		accData.push({"x": acc[2*j], "y": 0});
		accData.push({"x": acc[2*j], "y": 1});
		accData.push({"x": acc[2*j+1], "y": 1});
		accData.push({"x": acc[2*j+1], "y": 0});
	}
	if (acc.length%2 != 0){// one extra acc
		accData.push({"x": acc[acc.length-1], "y": 0});
		accData.push({"x": acc[acc.length-1], "y": 1});
		accData.push({"x": total_distance, "y": 1});
		accData.push({"x": total_distance, "y": 0});		
	}

	var brakeData = [];
	for (j=0;j<Math.floor(brake.length/2);j++){
		brakeData.push({"x": brake[2*j], "y": 0});
		brakeData.push({"x": brake[2*j], "y": 1});
		brakeData.push({"x": brake[2*j+1], "y": 1});
		brakeData.push({"x": brake[2*j+1], "y": 0});
	}
	if (brake.length%2 != 0){// one extra brake
		brakeData.push({"x": brake[brake.length-1], "y": 0});
		brakeData.push({"x": brake[brake.length-1], "y": 1});
		brakeData.push({"x": total_distance, "y": 1});
		brakeData.push({"x": total_distance, "y": 0});		
	}
	
	var lineFunction = d3.svg.line()
	                    .x(function(d) { return d.x/total_distance*(svg_length-padding*2)+padding; })
                        .y(function(d) { return (1-d.y)*(svg_height-padding*2)+padding; })
                        .interpolate("linear");
	var xScale = d3.scale.linear()
                        .domain([0, total_distance])
                        .range([padding, svg_length-padding]);
	var yScale = d3.scale.linear()
						.domain([0, 1])
						.range([padding, svg_height-padding]);
	var xAxis = d3.svg.axis()
						.scale(xScale)
						.orient("bottom")
						.ticks(5);
	var yAxis = d3.svg.axis()
						.scale(yScale)
						.orient("left")
						.ticks(2);
	var svgContainer = d3.select("#data"+i).append("svg")
                        .attr("width", svg_length)
                        .attr("height", svg_height);
    svgContainer.append("path")
						.attr("d", lineFunction(accData))
						.attr("stroke", "blue")
					    .attr("stroke-width", 2)
					    .attr("fill", "none")
    svgContainer.append("path")
                    	.attr("d", lineFunction(brakeData))
                    	.attr("stroke", "red")
	                    .attr("stroke-width", 2)
	                    .attr("fill", "none")
	svgContainer.append("g")
						.attr("transform", "translate(0," + (svg_height - padding) + ")")
	                    .attr("class", "x axis")
	                    .call(xAxis)
	svgContainer.append("text")
	                    .attr("x", svg_length/2-padding)             
				        .attr("y", padding/2)
				        .attr("text-anchor", "middle")  
				        .style("font-size", "14px") 
				        .text(d.score+" from ip: " + d.id + " with finaldrive: " + d.finaldrive);
}

function drawHistory(){
	
//	var save_x = [0,5,10,15,20,25,30];
//	var save_v = [2,4,5,6,7,8,10];
//	var save_eff = [0,9,0.9,0.8,0.7,0.8,0.9,0.9];
	var padding = 60;//px
	var svg_length = $("#history").width();//px
	var svg_height = $("#history").height();//px
	
	var j;
	
	var total_distance = 909; // 909*20 *** change this to an equation
	var speedData = [];
	var effData = [];
	for (j=0;j<save_v.length;j++){
		speedData.push({"x": save_x[j], "y": save_v[j]});
		effData.push({"x": save_x[j], "y": save_eff[j]});
	}
	var max_speed = 100;
	var max_eff = 100;

	var speedLineFunction = d3.svg.line()
	                    .x(function(d) { return d.x/total_distance*(svg_length-padding*2)+padding; })
                        .y(function(d) { return (1-d.y/max_speed)*(svg_height-padding*2)+padding; })
                        .interpolate("linear");
	var effLineFunction = d3.svg.line()
						.x(function(d) { return d.x/total_distance*(svg_length-padding*2)+padding; })
					    .y(function(d) { return (1-d.y/max_eff)*(svg_height-padding*2)+padding; })
					    .interpolate("linear");
						
	var xScale = d3.scale.linear()
                        .domain([0, total_distance])
                        .range([padding, svg_length-padding]);
	var yScaleEff = d3.scale.linear()
						.domain([0, max_eff])
						.range([svg_height-padding, padding]);
	var yScaleSpeed = d3.scale.linear()
						.domain([0, max_speed])
						.range([svg_height-padding, padding]);
	var xAxis = d3.svg.axis()
						.scale(xScale)
						.orient("bottom")
						.ticks(10);
	var yAxisSpeed = d3.svg.axis()
						.scale(yScaleSpeed)
						.orient("left")
						.ticks(10);
	var yAxisEff = d3.svg.axis()
						.scale(yScaleEff)
						.orient("right")
						.ticks(10);
	var svgContainer = d3.select("#history").append("svg")
                        .attr("width", svg_length)
                        .attr("height", svg_height);
    svgContainer.append("path")
						.attr("d", speedLineFunction(speedData))
						.attr("stroke", "blue")
					    .attr("stroke-width", 2)
					    .attr("fill", "none");
    svgContainer.append("path")
                    	.attr("d", effLineFunction(effData))
                    	.attr("stroke", "red")
	                    .attr("stroke-width", 2)
	                    .attr("fill", "none");
	svgContainer.append("g")
						.attr("transform", "translate(0," + (svg_height - padding) + ")")
	                    .attr("class", "x axis")
	                    .call(xAxis);
	svgContainer.append("g")
						.attr("transform", "translate(" + padding +",0)")
	                    .attr("class", "y axis")
	                    .style("fill", "blue")
	                    .call(yAxisSpeed);
	svgContainer.append("g")
						.attr("transform", "translate("+ (svg_length - padding) + ",0)")
	                    .attr("class", "y axis")
	                    .style("fill", "red")
	                    .call(yAxisEff);
	svgContainer.append("text")
	                    .attr("x", svg_length/2-padding)             
				        .attr("y", svg_height-10)
				        .attr("text-anchor", "middle")  
				        .style("font-size", "20px") 
				        .text("Distance (meter)");
	svgContainer.append("text")
						.attr("transform", "rotate(-90)")
					    .attr("y", padding/2-10)             
					    .attr("x", -svg_height/2)
					    .attr("text-anchor", "middle")  
					    .style("font-size", "20px") 
					    .text("Speed (mph)");
	svgContainer.append("text")
						.attr("transform", "rotate(90)")
					    .attr("y", -svg_length+padding/2-10)             
					    .attr("x", svg_height/2)
					    .attr("text-anchor", "middle")  
					    .style("font-size", "20px") 
					    .text("Efficiency (%)"); 
	svgContainer.append("text")
	                    .attr("x", svg_length/2-padding)             
				        .attr("y", padding/2)
				        .attr("text-anchor", "middle")  
				        .style("font-size", "28px") 
				        .text("Driving statistics");
	
}