function submitResult(){
	$.post('/adddata',{'id':[],
					   'name':[],
					   'info':JSON.stringify({'score':consumption,
						   					  'solution':[],
						   					  'date':[],
						   					  'interaction':[]}),
	});
}