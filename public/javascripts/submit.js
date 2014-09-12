function submitResult(){
	
	// get date
	var date = new Date();
	
	// post results
	$.post('/adddata',{'score':consumption,
					   'keys':JSON.stringify({'acc':acc_keys,'brake':brake_keys}),
   					   'date':date});

	$.post('/getscore',{'score':consumption,}, function(data){
		$("#textmessage").html("You spent "+ Math.round(consumption/1000/3600*1000)/1000 + 
				" kWh of energy, that's better than "+ Math.round(data.length/total_num_user*100) + "% of players!");
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