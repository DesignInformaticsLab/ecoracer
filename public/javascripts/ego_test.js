/**
 * Created by p2admin on 7/27/2015.
 */

/****************************************** ALGORITHM **********************************************************/
var n_var = 10;
var iter = 0;
var max_iter = 200;
var obj_set = [];
var sample_size = 5;
var sample_set = [];
var best_obj = [];
var model = {'R':[],'b':[],'X':[],'y':[], 'r':[], 'R_y':[], 'y_b':[]};
var range = 3; // range of the control parameter space
var user_model = {'X':[], 'n':0, 'w':[], 'b':0, 'gamma':0};
var SCORE;

function run(){
    initial();
}
function initial(){
    // random initial sample set
    for(var i=0;i<sample_size;i++){
        var g = [];
        for(var j=0;j<n_var;j++){
            var r = (Math.random()-0.5)*2*range;
            g.push(r);
        }
        sample_set.push(g);
    }
    calculate_obj(sample_set, iterate);
};
function iterate(){
    if(converge()){
        var wait = 1
    }
    else{
        var obj_set_sort = obj_set.slice(0);
        sortWithIndeces(obj_set_sort, 'asc');

        // update plot
        best_obj.push(obj_set[obj_set_sort.sortIndices[0]]);
        plot_status();

        // get new sample
        regression();
        var s = sample();
        iter+=1;

        sample_set.push(s.slice(0));

        // run with new sample
        calculate_obj([s], iterate);
    }
};

function regression(){
    var n = sample_set.length;
    var X = new Array(n);
    $.each(sample_set, function(i,d){X[i] = sample_set[i].slice(0);});

    if (model.R.length == 0){
        var R = new Array(n);
        for (var i=0;i<n;i++){R[i] = new Array(n);}
        for (var i=0;i<n;i++){
            R[i][i] = 1;
            for(var j=i+1;j<n;j++){
                var sim = kernel(X[i],X[j]);
                R[i][j] = sim;
                R[j][i] = sim;
            }
        }
    }
    else {
        var R = model.R;
        R.push([]);
        for (var i=0;i<n-1;i++){
            var sim = kernel(X[i],X[X.length-1]);
            R[i].push(sim);
            R[n-1].push(sim);
        }
        R[n-1].push(1);
    }
    var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
    var R_y = numeric.ccsLUPSolve(LUP,obj_set);
    var R_1 = numeric.ccsLUPSolve(LUP,ones(n));
    var b = vprod(ones(n), R_y)/vprod(ones(n), R_1);
    model.R = R;
    model.b = b;
    model.X = X;
    model.y = obj_set.slice(0);
}
function kernel(v1,v2){// gaussian kernel
    var f = 0;
    $.each(v1, function(i,d){f+= (v1[i]-v2[i])*(v1[i]-v2[i]);});
    f = Math.exp(-f/v1.length/range/range); // the space is from -range to range, normalize by range^2 to make the regression function smooth enough
    return f;
}
function vprod(v1,v2){// vector product
    var f = 0;
    $.each(v1, function(i,d){f+=v1[i]*v2[i];});
    return f;
}
function ones(n){// create an array of n ones
    var o = new Array(n);
    $.each(o, function(i,d){o[i]=1;});
    return o;
}

function sample(){
    var R = model.R;
    var b = model.b;
    var opt = {'obj':ego_obj,'pop_size':10,'n_var':n_var,'max_iter':1000,'max_no_improvement':200,'elite_rate':0.1,'cross_rate':0,'mutate_rate':0.9};
    var ga = new GA(opt);
    var next_sample = ga.solve();
    return next_sample;
}
function ego_obj(x){
    var y_min = best_obj[iter];
    var y_hat = kriging(x);
    var s = mse(x)*sigma();

    var violation = 0;
    if(user_model.n>0){ // if user model exists, use it to constrain the search space
        violation = calculate_violation(x);
    }

    return (y_min-y_hat)*Phi((y_min-y_hat)/s)+s*phi((y_min-y_hat)/s) + violation;
}
function sigma(){

    return Math.sqrt(vprod(model.y_b,model.R_y)/model.R.length);
}
function kriging(x){ // kriging function with b = constant
    var b = model.b;
    var R = model.R;
    var X = model.X;
    var y = model.y;
    var n = R.length;
    var r = new Array(n);
    var y_b = new Array(n);
    $.each(r, function(i,d){r[i] = kernel(x,X[i]);y_b[i] = y[i]-b;});
    model.r = r; // save r for mse
    var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
    var R_y = numeric.ccsLUPSolve(LUP,y_b);
    model.y_b = y_b;
    model.R_y = R_y;
    return b+vprod(r,R_y);
}
function mse(x){ // kriging mse function
    var R = model.R;
    var r = model.r;
    var n = R.length;
    var LUP = numeric.ccsLUP(numeric.ccsSparse(R));
    var R_r = numeric.ccsLUPSolve(LUP,r);
    var R_1 = numeric.ccsLUPSolve(LUP,ones(n));
    return Math.sqrt(1-vprod(r,R_r)+(1-vprod(ones(n),R_r))*(1-vprod(ones(n),R_r))/vprod(ones(n),R_1));
}
function Phi(x){ // normal cdf
    var z = x/Math.sqrt(2);
    var t = 1/(1+0.3275911*Math.abs(z));
    var a1 =  0.254829592;
    var a2 = -0.284496736;
    var a3 =  1.421413741;
    var a4 = -1.453152027;
    var a5 =  1.061405429;
    var erf = 1-(((((a5*t + a4)*t) + a3)*t + a2)*t + a1)*t*Math.exp(-z*z);
    var sign = 1;
    if(z < 0)
    {
        sign = -1;
    }
    return (1/2)*(1+sign*erf);
}
function phi(x){ // normal pdf
    return 1/Math.sqrt(2*Math.PI)*Math.exp(-1/2*x*x);
}

function calculate_obj(set, callback){
    var x = set.slice(0);

    var f2 = function(i){
        obj_set.push(SCORE);
        if(obj_set.length<sample_set.length){
            obj(x[obj_set.length], f2);
        }
        else{
            // recursively call iterate
            if (typeof(callback) == 'function') {
                callback();
            }
        }
    }
    obj(x[0], f2);
};
function obj(x, callback){
    //SCORE = (1-x[0])*(1-x[0]) + 100*(x[1]-x[0]*x[0])*(x[1]-x[0]*x[0]);
    SCORE = 0;
    for(var i=0;i<x.length;i++){
        SCORE += (x[i]-0.1)*(x[i]-0.1);
    }
    if (typeof(callback) == 'function') {
        callback();
    }
}


function converge(){
    // criterion 1: max iter
    if (iter>max_iter){
        return true;
    }
    return false;
};

function plot_status(){
    $("#statusplot").html("");
    var padding = 40;//px
    var svg_length = $("#statusplot").width();//px
    var svg_height = $("#statusplot").height();//px
    var num_play = iter+sample_size;
    var upper_bound = 0, lower_bound = -1000, range = upper_bound-lower_bound;

    var optimal_score = 0;

    var data = [];
    for (var i=0;i<best_obj.length;i++){
        data.push({"x": i+sample_size, "y": -best_obj[i]}); // convert minimization to maximization
    }
    bm = [];
    bm.push({"x": sample_size, "y": optimal_score});
    bm.push({"x": iter+sample_size, "y": optimal_score});

    var lineFunction = d3.svg.line()
        .x(function(d) { return (d.x-sample_size)/(iter+1e-6)*(svg_length-padding*2)+padding; })
        .y(function(d) { return (1-(d.y-lower_bound)/range)*(svg_height-padding*2)+padding; })
        .interpolate("linear");
    var xScale = d3.scale.linear()
        .domain([sample_size, sample_size+iter])
        .range([padding, svg_length-padding]);
    var yScale = d3.scale.linear()
        .domain([lower_bound, upper_bound])
        .range([svg_height-padding, padding]);

    var xAxis = d3.svg.axis()
        .scale(xScale)
        .orient("bottom")
        .ticks(Math.min(50,iter));
    var yAxis = d3.svg.axis()
        .scale(yScale)
        .orient("left")
        .ticks(10);

    var svgContainer = d3.select("#statusplot").append("svg")
        .attr("width", svg_length)
        .attr("height", svg_height);

//	 plot user performance
    svgContainer.append("path")
        .attr("d", lineFunction(data))
        .attr("stroke", 'black')
        .attr("stroke-width", 2)
        .attr("fill", "none");

    svgContainer.append("path")
        .attr("d", lineFunction(bm))
        .attr("stroke", 'black')
        .attr("stroke-dasharray", ("3, 3"))
        .attr("stroke-width", 2)
        .attr("fill", "none");
    svgContainer.append("g")
        .attr("transform", "translate(0," + (svg_height - padding) + ")")
        .attr("class", "x axis")
        .style("font-size", "6px")
        .call(xAxis);
    svgContainer.append("g")
        .attr("transform", "translate(" + padding +",0)")
        .attr("class", "y axis")
        .style("font-size", "6px")
        .call(yAxis);

    svgContainer.append("text")
        .attr("x", svg_length/2-padding)
        .attr("y", padding/2)
        .attr("text-anchor", "middle")
        .style("font-size", "14px")
        .text("Learning Performance");
};

/****************************************** UTILITY **********************************************************/
function sortWithIndeces(toSort, order) {
    for (var i = 0; i < toSort.length; i++) {
        toSort[i] = [toSort[i], i];
    }
    if (order=='asc'){// low to high
        toSort.sort(function(left, right) {
            return left[0] < right[0] ? -1 : 1;
        });
    }
    else if (order=='dsc'){// high to low
        toSort.sort(function(left, right) {
            return left[0] > right[0] ? -1 : 1;
        });
    }

    toSort.sortIndices = [];
    for (var j = 0; j < toSort.length; j++) {
        toSort.sortIndices.push(toSort[j][1]);
        toSort[j] = toSort[j][0];
    }
    return toSort;
}

//+ Jonas Raoni Soares Silva
//@ http://jsfromhell.com/array/shuffle [v1.0]
function shuffle(o){ //v1.0
    for(var j, x, i = o.length; i; j = Math.floor(Math.random() * i), x = o[--i], o[i] = o[j], o[j] = x);
    return o;
};

// genetic algorithm
function GA(opt){
    this.pop_size = opt.pop_size;
    this.n_var = opt.n_var;
    this.iter = 0;
    this.no_improvement = 0;
    this.max_iter = opt.max_iter;
    this.max_no_improvement = opt.max_no_improvement;
    this.fitness = [];
    this.bestfitness = [];
    this.pop = [];
    this.elite_rate = opt.elite_rate;
    this.cross_rate = opt.cross_rate;
    this.mutate_rate = opt.mutate_rate;
    this.n_elite = Math.round(this.pop_size*this.elite_rate);
    this.n_cross = Math.round(this.pop_size*this.cross_rate);
    this.n_mutate = Math.round(this.pop_size*this.mutate_rate);
    this.fitness_sorted = [];
    this.obj = opt.obj;
}
GA.prototype.solve = function(){
    this.initial();
    this.calculate_fitness();
    while (!this.converge()){
        this.parentselection();
        this.crossover();
        this.mutation();
//			pop.push(elite_pop.concat(cross_pop).concat(mutate_pop));
        this.pop.push(this.elite_pop.concat(this.mutate_pop));
        this.iter+=1;
        this.calculate_fitness();
    }
    return this.elite_pop[0];
}
GA.prototype.initial = function(){
    // primitive initial population
    var p = [];
//	for(var i=0;i<this.pop_size;i++){
//		var g = [];
//		g.push(Math.random());
//		for(var j=1;j<this.n_var;j++){
//			var r = (Math.random()-0.5)*2*range; // from -range to range
//			g.push(r);
//		}
//		p.push(g);
//	}

    // use the best samples as initial guesses
    if(obj_set>this.pop_size){
        var sort_obj_set = sortWithIndeces(obj_set, 'asc'); // sort obj from low to high because obj are the lower the better
        var pop_id = sort_obj_set.sortIndices.slice(0,this.pop_size);
        $.each(pop_id, function(i,d){p.push(sample_set[d].slice(0));});
    }
    else{
        for(var i=0;i<this.pop_size;i++){
            var random_id = Math.floor(Math.random()*obj_set.length);
            p.push(sample_set[random_id].slice(0));
        }
    }
    this.pop.push(p);
};

GA.prototype.parentselection = function(){
    var f = this.fitness[this.iter].slice(0);
    sortWithIndeces(f, 'dsc');//sorted from high to low because we are maximizing the expected improvement
    var elite_pop_id = f.sortIndices.slice(0,this.n_elite);
    var e = this;
    this.elite_pop = []; $.each(elite_pop_id, function(i,eid){e.elite_pop.push(e.pop[e.iter][eid]);});

//	var non_elite_pop_id = f.sortIndices.slice(n_elite);
    var non_elite_pop_id = f.sortIndices.slice(0,this.pop_size-1); // remove the worst
    var non_elite_pop = []; $.each(non_elite_pop_id, function(i,eid){non_elite_pop.push(e.pop[e.iter][eid]);});

    var parent = [], parent_fitness = [], p = [], bar, id, max_fit;
    $.each(non_elite_pop_id, function(i,n){
        p.push((non_elite_pop_id.length-i-1)*(non_elite_pop_id.length-i)/2);
    });
    max_fit = (non_elite_pop_id.length-1)*(non_elite_pop_id.length)/2;
    for(var i=0;i<non_elite_pop.length;i++){
        bar = Math.random()*max_fit;
        id = $.grep(non_elite_pop_id, function( n, i ) {
            return ( p[i] > bar && p[i+1] <= bar);
        });
        parent.push(this.pop[this.iter][id].slice(0));
        parent_fitness.push(this.fitness[this.iter][id]);
    }

    parent = shuffle(parent);
//	cross_pop = parent.slice(0,n_cross);
//	mutate_pop = parent.slice(n_cross);
    this.mutate_pop = parent.slice(0);
};
GA.prototype.crossover = function(){
    var new_cross_pop = [];
    for(var i=0;i<this.n_cross/2;i++){
        var p1,p2,c1,c2,split_point;
        p1 = this.cross_pop[i*2];
        p2 = this.cross_pop[i*2+1];
        split_point = Math.ceil(Math.random()*this.n_var);
        c1 = p1.slice(0,split_point).concat(p2.slice(split_point));
        c2 = p2.slice(0,split_point).concat(p1.slice(split_point));
        new_cross_pop.push(c1);
        new_cross_pop.push(c2);
    }
    this.cross_pop = new_cross_pop.slice(0);
};
GA.prototype.mutation = function(){
    var mutation_rate = 1.0/Math.sqrt(Math.sqrt(this.iter+1));
    for(var i=0;i<this.n_mutate;i++){
        if(Math.random()<mutation_rate){
            this.mutate_pop[i][0] += (Math.random()-0.5)*0.2;
            this.mutate_pop[i][0] = Math.min(Math.max(this.mutate_pop[i][0], 0), 1);
        }
        for(var j=1;j<n_var;j++){
            if(Math.random()<mutation_rate){
                this.mutate_pop[i][j] += (Math.random()-0.5)*0.2;
                this.mutate_pop[i][j] = Math.min(Math.max(this.mutate_pop[i][j], -range), range);
            }
        }
    }
};
GA.prototype.calculate_fitness = function(){
    var x = this.pop[this.iter].slice(0);
    var f = new Array(this.pop_size);
    var e = this;
    $.each(x, function(i,d){
        f[i] = e.obj(d);
    });
    this.fitness.push(f);
};
GA.prototype.converge = function(){
    // criterion 1: max iter
    if (this.iter>this.max_iter){
        return true;
    }
    // criterion 2: no improvement
    if (this.bestfitness[this.iter]==this.bestfitness[this.iter-1]){
        this.no_improvement += 1;
    }
    else {
        this.no_improvement = 0;
    }
    if (this.no_improvement > this.max_no_improvement){
        return true;
    }
    return false;
};

