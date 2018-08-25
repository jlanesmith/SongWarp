const http = require('http');

function addSong(songs, newSong, previousFlag) {
	let numSongs = songs.length;
	for (song in songs) {
		if ( (song.name == newSong.name) && (song.artist = newSong.artist) ) {
			if (previousFlag) {
				song.previousTotal++;
			} else {
				song.currentTotal++;
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

function getDates(username, startDate, endDate) {

	var dates = [];
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklychartlist&user='+ username +
		'&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  let data = '';
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });
	  resp.on('end', () => {
	  	for (chart in JSON.parse(data).weeklychartlist.chart.length) {
	  		if ((chart.from > startDate) && (chart.to < endDate)) {
	  			dates.push(new Array(chart.from, chart.to));
	  		}
	  	}
	  	return dates;
	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}

function getNumSongs(username, startDate, endDate) {

	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
		'&from=' + startDate + '&to=' + endDate + '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  let data = '';
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });
	  resp.on('end', () => {
	  	return JSON.parse(data).weeklytrackchart.track.length;
	  }); 
	}).on("error", (err) => {
	  console.log("Error: " + err.message);
	});
}

function getSong(username, startDate, endDate, number) {
	http.get('http://ws.audioscrobbler.com/2.0/?method=user.getweeklytrackchart&user='+ username +
		'&from=' + startDate + '&to=' + endDate + '&api_key=67d2877611ab7f461bda654cb05b53ae&format=json', (resp) => {
	  let data = '';
	  resp.on('data', (chunk) => {
	    data += chunk;
	  });
	  resp.on('end', () => {
	  	var song = JSON.parse(data).weeklytrackchart.track[number];
	  	song["previousTotal"] = 0;
	  	song["currentTotal"] = 0;
	  	return song;
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
        			calculate();
        		});
        	});
        });
    });
});

function calculate() {
	
}