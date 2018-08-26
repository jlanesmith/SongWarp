const http = require('http');

function addSong(songs, newSong, previousFlag) {
	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].name == newSong.name) && (songs[i].artist['#text'] == newSong.artist['#text']) ) {
			if (previousFlag) {
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

	if (previousFlag) {
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
	  	if (previousFlag) {
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

console.log("\nWelcome to SongRediscoverer! This app finds songs that you listened to at " + 
	"least a given number of times during a given time period, but have listened to no more " +
	 "than a given number of times since that time period to the present. These values will be provided by you.");

rl.question('\nEnter your username:', (username1) => {
    rl.question('Enter a start date for the time period in the form 2018-12-25:', (startDate1) => {
    	rl.question('Enter an end date for the time period in the form 2018-12-25:', (endDate1) => {
    		rl.question('Enter a previous limit (The minimum for how many times you listened to this song during the time period):', (previousLimit1) => {
    			rl.question('Enter a current limit (The maximum for how many times you listened to this song since the time period):', (currentLimit1) => {
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
			if (previousDates.length > 0) {
				getSongs(0, true, function() {
					if (currentDates.length > 0) {
						getSongs(0, false, function() {
							outputResults();
						})
					} else {
						outputResults();
					}
				});
			} else {
				outputResults();
			}
		});
	});
}

function outputResults() {

	for (var i = 0; i < songs.length; i++) {
		if ( (songs[i].previousTotal >= previousLimit) && (songs[i].currentTotal <= currentLimit)) {
			results.push(songs[i]);
		}
	}

	if (results.length == 0) {
		console.log("\nThere are no results with the parameters given. Sorry!");
	} else {
		console.log("\nResults:");
		results = sortBySongPreviousTotal(results);
		for (var i = 0; i < results.length; i++) {
			console.log( (i+1) + ". Song title: " + results[i].name + ", Artist: " + results[i].artist['#text'] + 
				"\n        Times listened during time period: " + results[i].previousTotal + ", Times listened after time period: " + results[i].currentTotal);
		}
	}
}