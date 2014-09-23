function submitResult(){
	// get date
	var date = new Date();
	consumption = Math.round(consumption);
	// post results
	$.post('/adddata',{'score':consumption,
					   'keys':JSON.stringify({'acc':acc_keys,'brake':brake_keys}),
   					   'date':date,
   					   'finaldrive':fr});

	$.post('/getscore',{'score':consumption,}, function(data){
		$("#textmessage").html("You spent "+ Math.round(consumption/1000/3600*1000)/1000 + 
				" kWh of energy, that's better than "+ Math.round(data.length/total_num_user*100) + "% of players!");
		// show top 5 scores
		$("#scorebox").empty();
		$("#scorebox").append("TOP SCORES");
		var count = 1;
		var addedyou = false;
		for(var i=0;i<Math.min(5,score.length);i++){
			if (count<=5){
				if (score[i].score<consumption || addedyou){
					$("#scorebox").append("<div class='score'>"+(count)+". " + Math.round(score[i].score/1000/3600*1000)/1000 + "kWh<\div>");
				}
				else{
					$("#scorebox").append("<div class='score'>"+(count)+". " + Math.round(consumption/1000/3600*1000)/1000 + "kWh (YOU)<\div>");
					addedyou = true;
				}
				count += 1;		
			}
		}
		if(score.length<5 && !addedyou){
			$("#scorebox").append("<div class='score'>"+(score.length+1)+". " + Math.round(consumption/1000/3600*1000)/1000 + "kWh (YOU)<\div>");
		}
	});
}

function getBestScore(){
	total_num_user = 0;
	best_score = 0;
	score = [];
	$.get('/bestscore',{}, function(data){
		score = data;
		total_num_user = score.length;
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

$(".data").click(function(){
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