function submitResult(){
	$.post('/adddata',{'id':[],
					   'name':[],
					   'score':consumption,
					   'info':JSON.stringify({'solution':[],
						   					  'date':[],
						   					  'interaction':[]}),
	}, function(data){
		$("#rank").html(JSON.parse(data).score);
	});
}