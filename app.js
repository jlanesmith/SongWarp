const http = require('http');

function addSong(songs, newSong, previousFlag) {
	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
			if (previousFlag == true) {
				songs[i].previousTotal += parseInt(newSong.playcount, 10);
			} else {
				songs[i].currentTotal += parseInt(newSong.playcount, 10);
			}
			return songs;
		}
	}
	songs.push(newSong);
	return songs;
}

function sortBySongPreviousTotal(songs) {
	return songs.sort(function(a,b){return b.previousTotal - a.previousTotal});
}

function dateToTS(dateText) {
	var date = new Date(dateText);
	return Math.round(date.getTime()/1000);
}

function getDates(startDate, endDate, callback) {

	var dates = [];
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
		'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  let data = '';
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });
	  resp.on('end', () => {
	  	let list = JSON.parse(data).weeklychartlist;
	  	for (var i = 0; i < list.chart.length; i++) {
	  		if ((list.chart[i].from > startDate) && (list.chart[i].to < endDate)) {
	  			dates.push(new Array(list.chart[i].from, list.chart[i].to));
	  		}
	  	}
	  	callback(dates);
	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}

function getSongs(dateNumber, previousFlag, callback) {

	var start;
	var end;
	let progress = dateNumber + 1 + (previousFlag ? 0 : previousDates.length);
	console.log("Progress: " + progress + " of " + (previousDates.length + currentDates.length));

	if (previousFlag == true) {
		start = previousDates[dateNumber][0];
		end = previousDates[dateNumber][1];
	} else {
		start = currentDates[dateNumber][0];
		end = currentDates[dateNumber][1];
	}

	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
		'&from=' + start + '&to=' + end + '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  let data = '';
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });
	  resp.on('end', () => {
	  	var chart = JSON.parse(data).weeklytrackchart;
	  	for (var i = 0; i < chart.track.length; i++) {
	  		var song = chart.track[i];
	  		song["previousTotal"] = 0;
	  		song["currentTotal"] = 0;
	  		songs = addSong(songs, song, previousFlag);
	  	}
	  	var datesToCompare;
	  	if (previousFlag == true) {
	  		datesToCompare = previousDates;
	  	} else {
	  		datesToCompare = currentDates;
	  	}
	  	if (dateNumber + 1 == datesToCompare.length) {
	  		callback();
	  	} else {
	  		getSongs(dateNumber + 1, previousFlag, callback);
	  	}

	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}

var username;
var startDate;
var endDate;
var previousLimit;
var currentLimit;

const readline = require('readline');

const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout
});

rl.question('Enter your username:', (username1) => {
    rl.question('Enter a start date in the form 2018-12-25:', (startDate1) => {
    	rl.question('Enter an end date in the form 2018-12-25:', (endDate1) => {
    		rl.question('Enter a previous limit:', (previousLimit1) => {
    			rl.question('Enter a current limit:', (currentLimit1) => {
        			username=username1;
        			startDate=dateToTS(startDate1);
        			endDate=dateToTS(endDate1);
        			previousLimit=previousLimit1;
        			currentLimit=currentLimit1;
        			rl.close();
        			calculateDates();
        		});
        	});
        });
    });
});

var previousDates = [];
var currentDates = [];
var songs = [];
var results = [];

function calculateDates() {
	
	getDates(startDate, endDate, function(previousDates1){
		getDates(endDate, new Date(), function(currentDates1){
			previousDates = previousDates1;
			currentDates = currentDates1;
			getSongs(0, true, function() {
				getSongs(0, false, function() {
					outputResults();
				})
			});
		});
	});
}

function outputResults() {


	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].previousTotal >= previousLimit) && (songs[i].currentTotal <= currentLimit)) {
			results.push(songs[i]);
		}
	}

	console.log("\nResults:");
	results = sortBySongPreviousTotal(results);
	for (var i = 0; i < results.length; i++) {
		console.log("Song title: " + results[i].name + ", Artist: " + results[i].artist['#text']);
	}
}