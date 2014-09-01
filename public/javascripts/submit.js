function submitResult(){
	$.post('/adddata',{'id':[],
					   'name':[],
					   'score':consumption,
					   'info':JSON.stringify({'solution':[],
						   					  'date':[],
						   					  'interaction':[]}),
	});
	$.post('/getscore',{'score':consumption,}, function(data){
		$("#textmessage").html("You spent "+ Math.round(consumption/1000/3600*1000)/1000 + 
				" kWh of energy, that's better than "+ Math.round(data.length/(total_num_user+1)*100) + "% of players!");
	});
}

function getBestScore(){
	total_num_user = 0;
	best_score = 0;
	score = [];
	$.get('/bestscore',{}, function(data){
		score = data;
		total_num_user = score.length;
		best_score = score[0];
		$("#rank").html(best_score);
	});	
}